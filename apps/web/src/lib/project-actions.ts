import type { FileMap, Project, TemplateId } from '@mai-habi/types';
import {
  createProject,
  deleteCloudProject,
  deleteLocalProject,
  getGuestIdentity,
  getLocalFiles,
  isCloudEnabled,
  listCloudProjects,
  listLocalProjects,
  pickInitialTabs,
  projectId as newProjectId,
  saveLocalProjectWithFiles,
  syncProjectToCloud,
} from '@mai-habi/shared';
import { detectEntryFile, detectRootComponent, downloadProject } from '@mai-habi/filesystem';
import { useSession } from '../state/session';
import { markProjectFresh } from './onboarding';

/**
 * Pushes a freshly created project to the cloud when signed in, so it is not
 * stranded in this browser until the first edit. IndexedDB stays the source of
 * truth, so a cloud failure only logs — it never blocks opening the project.
 */
async function syncNewProject(project: Project, files: FileMap): Promise<void> {
  if (!isCloudEnabled() || !useSession.getState().user) return;
  await syncProjectToCloud(project, files).catch((error) =>
    console.warn('Could not sync the new project to the cloud.', error),
  );
}

export function projectHref(id: string): string {
  return `/editor/${id}`;
}

export function viewerHref(id: string): string {
  return `/view/${id}`;
}

export async function createAndOpen(name: string, templateId: TemplateId): Promise<void> {
  const guest = await getGuestIdentity();
  const { project, files } = createProject({ name, templateId, guestId: guest.id });

  await saveLocalProjectWithFiles(project, files);
  await syncNewProject(project, files);
  markProjectFresh(project.id);
  window.location.href = projectHref(project.id);
}

/**
 * What an imported tree looks like, recorded once while the files are in hand.
 *
 * The dashboard shows a stack mark per project and cannot afford to read every
 * project's files to work one out, so the answer is stored on the project. Next
 * is identified by its route file: `detectEntryFile` deliberately returns null
 * for a Next project (there is no index.html or src/main), so only the root
 * component reveals it.
 */
function detectTemplate(files: FileMap, entry: string | null): TemplateId {
  const root = detectRootComponent(files);

  if (root && /(^|\/)(app|pages)\//.test(root)) return 'next';
  if (entry?.endsWith('.html')) return 'html-css-js';
  if (root?.endsWith('.tsx') || entry?.endsWith('.tsx')) return 'react-ts';
  if (root?.endsWith('.jsx') || entry?.endsWith('.jsx')) return 'react-js';

  return 'import';
}

export async function importAndOpen(name: string, files: FileMap): Promise<void> {
  const guest = await getGuestIdentity();
  const { project } = createProject({ name, templateId: 'import', guestId: guest.id });
  const tabs = pickInitialTabs(files);
  const entry = detectEntryFile(files);

  const imported: Project = {
    ...project,
    // Metadata only: the imported files are saved as-is either way.
    templateId: detectTemplate(files, entry),
    settings: {
      ...project.settings,
      entryFile: entry ?? project.settings.entryFile,
    },
    openTabs: tabs,
    activeTab: tabs[0] ?? null,
  };

  await saveLocalProjectWithFiles(imported, files);
  await syncNewProject(imported, files);
  markProjectFresh(imported.id);
  window.location.href = projectHref(imported.id);
}

export async function duplicateProject(source: Project): Promise<Project> {
  const files = await getLocalFiles(source.id);
  const now = Date.now();

  const copy: Project = {
    ...source,
    id: newProjectId(),
    name: `${source.name} copy`,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    visibility: 'private',
    origin: 'local',
  };

  await saveLocalProjectWithFiles(copy, files);
  await syncNewProject(copy, files);
  return copy;
}

export async function exportProject(project: Project): Promise<void> {
  const files = await getLocalFiles(project.id);
  await downloadProject(files, project.name);
}

/**
 * The account copy goes first, and a failure there aborts the whole delete.
 *
 * `loadProjects` re-adds any account project this browser does not have, so
 * dropping the local row while the cloud row survived would resurrect the
 * project on the next load — with whatever offline edits it held now gone. The
 * local copy is the safer thing to still be holding if this goes wrong.
 */
export async function removeProject(id: string): Promise<void> {
  if (isCloudEnabled() && useSession.getState().user) {
    await deleteCloudProject(id);
  }

  await deleteLocalProject(id);
}

/**
 * Local projects always win — they are the ones with unsynced edits. Anything
 * in the account that this browser has not seen is appended as a cloud entry.
 */
export async function loadProjects(): Promise<Project[]> {
  const local = await listLocalProjects();
  if (!isCloudEnabled()) return local;

  const cloud = await listCloudProjects().catch(() => []);
  const known = new Set(local.map((project) => project.id));

  return [...local, ...cloud.filter((project) => !known.has(project.id))].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}
