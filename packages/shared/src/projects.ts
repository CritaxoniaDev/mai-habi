import type {
  FileMap,
  PlaygroundSnapshot,
  Project,
  ProjectFile,
  ProjectSettings,
  TemplateId,
} from '@mai-habi/types';
import { projectId as newProjectId } from './ids';
import { getTemplate } from './templates';
import { utf8Size } from './utils';

export function defaultSettings(): ProjectSettings {
  return {
    entryFile: 'src/main.tsx',
    tailwind: false,
    tabSize: 2,
    wordWrap: false,
    minimap: false,
    autosave: true,
    autoCompile: true,
  };
}

export function textFile(path: string, content: string): ProjectFile {
  return { path, type: 'file', content, encoding: 'utf8', size: utf8Size(content) };
}

/** Materialises the directory entries implied by a set of file paths. */
export function withDirectories(files: FileMap): FileMap {
  const out: FileMap = { ...files };

  for (const path of Object.keys(files)) {
    const segments = path.split('/');
    segments.pop();
    let prefix = '';
    for (const segment of segments) {
      prefix = prefix ? `${prefix}/${segment}` : segment;
      if (!out[prefix]) out[prefix] = { path: prefix, type: 'directory' };
    }
  }

  return out;
}

export function filesFromRecord(record: Record<string, string>): FileMap {
  const files: FileMap = {};
  for (const [path, content] of Object.entries(record)) {
    files[path] = textFile(path, content);
  }
  return withDirectories(files);
}

export interface NewProjectInput {
  name: string;
  templateId: TemplateId;
  guestId: string | null;
  ownerId?: string | null;
}

export function createProject(input: NewProjectInput): { project: Project; files: FileMap } {
  const template = getTemplate(input.templateId);
  const now = Date.now();

  const files = template ? filesFromRecord(template.files) : {};
  const openTabs = pickInitialTabs(files);

  const project: Project = {
    id: newProjectId(),
    name: input.name.trim() || 'Untitled Project',
    templateId: input.templateId,
    settings: { ...defaultSettings(), ...(template?.settings ?? {}) },
    visibility: 'private',
    origin: 'local',
    ownerId: input.ownerId ?? null,
    guestId: input.guestId,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    openTabs,
    activeTab: openTabs[0] ?? null,
  };

  return { project, files };
}

/** Opens the component a user actually wants to edit, not the mount file. */
export function pickInitialTabs(files: FileMap): string[] {
  const preferred = [
    'index.html',
    'styles.css',
    'script.js',
    'src/App.tsx',
    'src/App.jsx',
    'src/styles.css',
    'src/main.tsx',
  ];
  const opened = preferred.filter((path) => files[path]?.type === 'file');
  if (opened.length > 0) return opened.slice(0, 2);

  const first = Object.values(files).find((node) => node.type === 'file');
  return first ? [first.path] : [];
}

export function touchProject(project: Project): Project {
  return { ...project, updatedAt: Date.now() };
}

/** Text-only view of a project, which is all the compiler and viewer need. */
export function toSourceMap(files: FileMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const node of Object.values(files)) {
    if (node.type !== 'file' || node.encoding !== 'utf8') continue;
    out[node.path] = node.content;
  }
  return out;
}

export function toSnapshot(project: Project, files: FileMap): PlaygroundSnapshot {
  return {
    id: project.id,
    name: project.name,
    entryFile: project.settings.entryFile,
    tailwind: project.settings.tailwind,
    files: toSourceMap(files),
    updatedAt: project.updatedAt,
  };
}

export function filesFromSnapshot(snapshot: PlaygroundSnapshot): FileMap {
  return filesFromRecord(snapshot.files);
}
