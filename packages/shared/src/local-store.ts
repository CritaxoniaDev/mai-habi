import type { FileMap, Project } from '@mai-habi/types';
import { STORE_FILES, STORE_PROJECTS, idbDelete, idbGet, idbGetAll, idbPut } from './idb';

interface FilesRecord {
  projectId: string;
  files: FileMap;
}

/**
 * Guest persistence. Metadata and file contents live in separate stores so the
 * dashboard can list projects without pulling every file into memory.
 */

export async function listLocalProjects(): Promise<Project[]> {
  const projects = await idbGetAll<Project>(STORE_PROJECTS);
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getLocalProject(id: string): Promise<Project | undefined> {
  return idbGet<Project>(STORE_PROJECTS, id);
}

export async function getLocalFiles(id: string): Promise<FileMap> {
  const record = await idbGet<FilesRecord>(STORE_FILES, id);
  return record?.files ?? {};
}

export async function saveLocalProject(project: Project): Promise<void> {
  await idbPut(STORE_PROJECTS, project);
}

export async function saveLocalFiles(projectId: string, files: FileMap): Promise<void> {
  await idbPut<FilesRecord>(STORE_FILES, { projectId, files });
}

export async function deleteLocalProject(id: string): Promise<void> {
  await idbDelete(STORE_PROJECTS, id);
  await idbDelete(STORE_FILES, id);
}

export async function saveLocalProjectWithFiles(project: Project, files: FileMap): Promise<void> {
  await saveLocalProject(project);
  await saveLocalFiles(project.id, files);
}
