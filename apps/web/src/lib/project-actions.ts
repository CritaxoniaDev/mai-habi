import type { FileMap, Project, TemplateId } from '@mai-habi/types';
import {
  createProject,
  deleteLocalProject,
  getGuestIdentity,
  getLocalFiles,
  isCloudEnabled,
  listCloudProjects,
  listLocalProjects,
  pickInitialTabs,
  projectId as newProjectId,
  saveLocalProjectWithFiles,
} from '@mai-habi/shared';
import { detectEntryFile, downloadProject } from '@mai-habi/filesystem';

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
  window.location.href = projectHref(project.id);
}

export async function importAndOpen(name: string, files: FileMap): Promise<void> {
  const guest = await getGuestIdentity();
  const { project } = createProject({ name, templateId: 'import', guestId: guest.id });
  const tabs = pickInitialTabs(files);

  const imported: Project = {
    ...project,
    settings: {
      ...project.settings,
      entryFile: detectEntryFile(files) ?? project.settings.entryFile,
    },
    openTabs: tabs,
    activeTab: tabs[0] ?? null,
  };

  await saveLocalProjectWithFiles(imported, files);
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
  return copy;
}

export async function exportProject(project: Project): Promise<void> {
  const files = await getLocalFiles(project.id);
  await downloadProject(files, project.name);
}

export async function removeProject(id: string): Promise<void> {
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
