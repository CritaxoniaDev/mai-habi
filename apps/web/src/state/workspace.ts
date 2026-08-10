import { create } from 'zustand';
import type {
  CompileState,
  ConsoleEntry,
  ConsoleLevel,
  FileMap,
  Problem,
  Project,
  ProjectSettings,
  SaveStatus,
} from '@mai-habi/types';
import type { CompileDiagnostic } from '@mai-habi/compiler';
import {
  debounce,
  fetchCloudProject,
  getLocalFiles,
  getLocalProject,
  saveLocalFiles,
  saveLocalProject,
  saveLocalProjectWithFiles,
  syncProjectToCloud,
} from '@mai-habi/shared';
import {
  createFile as fsCreateFile,
  createFolder as fsCreateFolder,
  deleteNode as fsDeleteNode,
  dirname,
  duplicateNode as fsDuplicateNode,
  isDescendant,
  joinPath,
  moveNode as fsMoveNode,
  renameNode as fsRenameNode,
  writeFile as fsWriteFile,
} from '@mai-habi/filesystem';
import { compileProject } from '../lib/compile';
import { useSession } from './session';

export type BottomTab = 'console' | 'problems' | 'preview';

export interface PreviewBundle {
  js: string;
  css: string;
  /** Bumped on every successful compile so the iframe remounts. */
  generation: number;
}

interface WorkspaceState {
  phase: 'loading' | 'ready' | 'missing';
  project: Project | null;
  files: FileMap;
  dirty: string[];
  saveStatus: SaveStatus;

  openTabs: string[];
  activeTab: string | null;

  explorerCollapsed: boolean;
  panelCollapsed: boolean;
  bottomTab: BottomTab;

  compileState: CompileState;
  compileErrors: CompileDiagnostic[];
  compileWarnings: CompileDiagnostic[];
  compileDurationMs: number;
  preview: PreviewBundle | null;

  console: ConsoleEntry[];
  problems: Problem[];

  load: (projectId: string) => Promise<void>;
  setContent: (path: string, content: string) => void;
  flushSave: () => void;

  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  cycleTab: (direction: 1 | -1) => void;

  createFile: (path: string, content?: string) => void;
  createFolder: (path: string) => void;
  renameNode: (path: string, name: string) => void;
  deleteNode: (path: string) => void;
  duplicateNode: (path: string) => void;
  moveNode: (from: string, to: string) => void;
  replaceFiles: (files: FileMap) => void;

  renameProject: (name: string) => void;
  updateSettings: (patch: Partial<ProjectSettings>) => void;

  toggleExplorer: () => void;
  togglePanel: (tab?: BottomTab) => void;
  setBottomTab: (tab: BottomTab) => void;

  compile: (options?: { silent?: boolean }) => Promise<void>;
  scheduleCompile: () => void;
  setCompileState: (state: CompileState) => void;

  appendConsole: (entry: Omit<ConsoleEntry, 'id'>) => void;
  clearConsole: () => void;
  setProblems: (problems: Problem[]) => void;
}

/* --------------------------------------------------------------- persistence */

const persistProject = debounce((project: Project) => {
  void saveLocalProject(project);
}, 400);

/**
 * Cloud sync sits behind local persistence: IndexedDB is the source of truth
 * while editing, and a signed-in user additionally gets a debounced push.
 */
const syncToCloud = debounce(() => {
  const { project, files } = useWorkspace.getState();
  if (!project || !useSession.getState().user) return;

  useWorkspace.setState({ saveStatus: 'syncing' });
  void syncProjectToCloud(project, files)
    .then(() => useWorkspace.setState({ saveStatus: 'saved' }))
    .catch(() => useWorkspace.setState({ saveStatus: 'save-failed' }));
}, 2500);

const persistFiles = debounce((projectId: string, files: FileMap) => {
  void saveLocalFiles(projectId, files)
    .then(() => {
      const signedIn = Boolean(useSession.getState().user);
      useWorkspace.setState({ saveStatus: signedIn ? 'saving' : 'saved-locally', dirty: [] });
      if (signedIn) syncToCloud();
    })
    .catch(() => useWorkspace.setState({ saveStatus: 'save-failed' }));
}, 500);

/**
 * Compilation waits for a pause in typing rather than racing every keystroke.
 */
const compileSoon = debounce(() => {
  void useWorkspace.getState().compile({ silent: true });
}, 300);

let consoleId = 0;

function commitFiles(files: FileMap, options: { dirtyPath?: string } = {}): void {
  const { project, dirty } = useWorkspace.getState();
  if (!project) return;

  const nextDirty =
    options.dirtyPath && !dirty.includes(options.dirtyPath)
      ? [...dirty, options.dirtyPath]
      : dirty;

  useWorkspace.setState({ files, dirty: nextDirty, saveStatus: 'saving' });
  persistFiles(project.id, files);

  if (project.settings.autoCompile) compileSoon();
}

function updateProject(patch: Partial<Project>): void {
  const { project } = useWorkspace.getState();
  if (!project) return;

  const next = { ...project, ...patch, updatedAt: Date.now() };
  useWorkspace.setState({ project: next });
  persistProject(next);
}

/* -------------------------------------------------------------------- store */

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  phase: 'loading',
  project: null,
  files: {},
  dirty: [],
  saveStatus: 'saved-locally',

  openTabs: [],
  activeTab: null,

  explorerCollapsed: false,
  panelCollapsed: false,
  bottomTab: 'console',

  compileState: 'idle',
  compileErrors: [],
  compileWarnings: [],
  compileDurationMs: 0,
  preview: null,

  console: [],
  problems: [],

  async load(projectId) {
    let project = await getLocalProject(projectId);
    let files = await getLocalFiles(projectId);

    // Not in this browser: it may belong to the signed-in account instead.
    if (!project) {
      const remote = await fetchCloudProject(projectId).catch(() => null);
      if (remote) {
        project = remote.project;
        files = remote.files;
        await saveLocalProjectWithFiles(project, files);
      }
    }

    if (!project) {
      set({ phase: 'missing' });
      return;
    }

    const openTabs = project.openTabs.filter((path) => files[path]?.type === 'file');

    set({
      phase: 'ready',
      project: { ...project, lastOpenedAt: Date.now() },
      files,
      openTabs,
      activeTab: openTabs.includes(project.activeTab ?? '')
        ? project.activeTab
        : (openTabs[0] ?? null),
      saveStatus: 'saved-locally',
    });

    persistProject({ ...project, lastOpenedAt: Date.now() });
    void get().compile({ silent: true });
  },

  setContent(path, content) {
    const { files } = get();
    const existing = files[path];
    if (!existing || existing.type !== 'file' || existing.content === content) return;

    commitFiles(fsWriteFile(files, path, content, existing.encoding), { dirtyPath: path });
  },

  flushSave() {
    const { project, files } = get();
    if (!project) return;

    persistFiles.cancel();
    persistProject.cancel();
    void saveLocalFiles(project.id, files).then(() =>
      set({ saveStatus: 'saved-locally', dirty: [] }),
    );
    void saveLocalProject(project);
  },

  openFile(path) {
    const { openTabs, files } = get();
    if (files[path]?.type !== 'file') return;

    const tabs = openTabs.includes(path) ? openTabs : [...openTabs, path];
    set({ openTabs: tabs, activeTab: path });
    updateProject({ openTabs: tabs, activeTab: path });
  },

  closeTab(path) {
    const { openTabs, activeTab } = get();
    const index = openTabs.indexOf(path);
    if (index === -1) return;

    const tabs = openTabs.filter((tab) => tab !== path);
    const nextActive = activeTab === path ? (tabs[index] ?? tabs[index - 1] ?? null) : activeTab;

    set({ openTabs: tabs, activeTab: nextActive });
    updateProject({ openTabs: tabs, activeTab: nextActive });
  },

  setActiveTab(path) {
    set({ activeTab: path });
    updateProject({ activeTab: path });
  },

  cycleTab(direction) {
    const { openTabs, activeTab } = get();
    if (openTabs.length < 2) return;

    const index = activeTab ? openTabs.indexOf(activeTab) : 0;
    const next = (index + direction + openTabs.length) % openTabs.length;
    get().setActiveTab(openTabs[next]);
  },

  createFile(path, content = '') {
    commitFiles(fsCreateFile(get().files, path, content));
    get().openFile(path);
  },

  createFolder(path) {
    commitFiles(fsCreateFolder(get().files, path));
  },

  renameNode(path, name) {
    const files = fsRenameNode(get().files, path, name);
    const target = joinPath(dirname(path), name.trim());

    const { openTabs, activeTab, project } = get();
    const remap = (tab: string) =>
      isDescendant(path, tab) ? `${target}${tab.slice(path.length)}` : tab;

    const tabs = openTabs.map(remap).filter((tab) => files[tab]?.type === 'file');
    const nextActive = activeTab ? remap(activeTab) : null;

    set({
      openTabs: tabs,
      activeTab: nextActive && files[nextActive]?.type === 'file' ? nextActive : (tabs[0] ?? null),
    });
    commitFiles(files);
    updateProject({ openTabs: tabs });

    // Keep the entry setting pointing at the file the user just renamed.
    if (project && isDescendant(path, project.settings.entryFile)) {
      get().updateSettings({ entryFile: remap(project.settings.entryFile) });
    }
  },

  deleteNode(path) {
    const files = fsDeleteNode(get().files, path);
    const tabs = get().openTabs.filter((tab) => files[tab]?.type === 'file');
    const activeTab = get().activeTab;

    set({
      openTabs: tabs,
      activeTab: tabs.includes(activeTab ?? '') ? activeTab : (tabs[0] ?? null),
    });
    commitFiles(files);
    updateProject({ openTabs: tabs });
  },

  duplicateNode(path) {
    commitFiles(fsDuplicateNode(get().files, path));
  },

  moveNode(from, to) {
    const files = fsMoveNode(get().files, from, to);
    const remap = (tab: string) => (isDescendant(from, tab) ? `${to}${tab.slice(from.length)}` : tab);
    const tabs = get().openTabs.map(remap).filter((tab) => files[tab]?.type === 'file');

    set({ openTabs: tabs, activeTab: get().activeTab ? remap(get().activeTab as string) : null });
    commitFiles(files);
    updateProject({ openTabs: tabs });
  },

  replaceFiles(files) {
    const tabs = get().openTabs.filter((tab) => files[tab]?.type === 'file');
    set({ openTabs: tabs, activeTab: tabs[0] ?? null });
    commitFiles(files);
  },

  renameProject(name) {
    updateProject({ name: name.trim() || 'Untitled Project' });
  },

  updateSettings(patch) {
    const { project } = get();
    if (!project) return;

    updateProject({ settings: { ...project.settings, ...patch } });

    // Tailwind and entry changes alter the output, so rebuild immediately.
    if ('tailwind' in patch || 'entryFile' in patch) compileSoon();
  },

  toggleExplorer() {
    set((state) => ({ explorerCollapsed: !state.explorerCollapsed }));
  },

  togglePanel(tab) {
    set((state) => ({
      panelCollapsed: tab && state.panelCollapsed ? false : !state.panelCollapsed,
      bottomTab: tab ?? state.bottomTab,
    }));
  },

  setBottomTab(tab) {
    set({ bottomTab: tab, panelCollapsed: false });
  },

  async compile(options = {}) {
    const { project, files } = get();
    if (!project) return;

    compileSoon.cancel();
    if (!options.silent) set({ compileState: 'compiling' });

    try {
      const result = await compileProject(project, files);

      if (result.ok) {
        set((state) => ({
          compileState: 'ready',
          compileErrors: [],
          compileWarnings: result.warnings,
          compileDurationMs: result.durationMs,
          preview: {
            js: result.js,
            css: result.css,
            generation: (state.preview?.generation ?? 0) + 1,
          },
        }));
        return;
      }

      set({
        compileState: 'error',
        compileErrors: result.errors,
        compileWarnings: result.warnings,
        compileDurationMs: result.durationMs,
      });
    } catch (error) {
      // A superseded build is normal during fast typing.
      if (error instanceof Error && error.name === 'SupersededError') return;

      set({
        compileState: 'error',
        compileErrors: [
          { message: error instanceof Error ? error.message : String(error), location: null },
        ],
      });
    }
  },

  scheduleCompile() {
    compileSoon();
  },

  setCompileState(compileState) {
    set({ compileState });
  },

  appendConsole(entry) {
    consoleId += 1;
    set((state) => ({ console: [...state.console.slice(-300), { ...entry, id: consoleId }] }));
  },

  clearConsole() {
    set({ console: [] });
  },

  setProblems(problems) {
    set({ problems });
  },
}));

/** Console levels that should pull attention to the panel. */
export function isProblemLevel(level: ConsoleLevel): boolean {
  return level === 'error' || level === 'warn';
}
