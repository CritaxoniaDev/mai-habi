import type { FileMap } from '@mai-habi/types';
import { kvGet, kvSet } from '@mai-habi/shared';
import { listFiles } from '@mai-habi/filesystem';

/**
 * Local version history for a project.
 *
 * Snapshots are full copies of the file map, kept in the IndexedDB key/value
 * store under `snapshots:<projectId>`. They are a lightweight undo across
 * sessions — take one automatically on an interval (only when something
 * changed), before a restore, or by hand. The list is capped so storage stays
 * bounded.
 */

export interface Snapshot {
  id: string;
  at: number;
  note: string;
  files: FileMap;
}

const MAX_SNAPSHOTS = 25;
const key = (projectId: string) => `snapshots:${projectId}`;

/** A cheap content signature, to skip snapshots identical to the last one. */
function signature(files: FileMap): string {
  const parts: string[] = [];
  for (const node of listFiles(files)) {
    if (node.type === 'file') parts.push(`${node.path}:${node.size}:${node.content.length}`);
  }
  return parts.sort().join('|');
}

export async function loadSnapshots(projectId: string): Promise<Snapshot[]> {
  return (await kvGet<Snapshot[]>(key(projectId))) ?? [];
}

/**
 * Record a snapshot. Returns the new one, or null when nothing changed since
 * the most recent snapshot (so the interval does not fill history with copies).
 */
export async function createSnapshot(
  projectId: string,
  files: FileMap,
  note: string,
): Promise<Snapshot | null> {
  const list = await loadSnapshots(projectId);

  if (list[0] && signature(list[0].files) === signature(files)) return null;

  const snapshot: Snapshot = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    note,
    // A structured clone so later edits to the live map never mutate history.
    files: structuredClone(files),
  };

  const next = [snapshot, ...list].slice(0, MAX_SNAPSHOTS);
  await kvSet(key(projectId), next);
  return snapshot;
}

export async function deleteSnapshot(projectId: string, id: string): Promise<Snapshot[]> {
  const next = (await loadSnapshots(projectId)).filter((snapshot) => snapshot.id !== id);
  await kvSet(key(projectId), next);
  return next;
}

export interface SnapshotDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

/** What restoring `snapshot` would change, relative to `current`. */
export function diffAgainst(current: FileMap, snapshot: FileMap): SnapshotDiff {
  const diff: SnapshotDiff = { added: [], removed: [], modified: [] };

  const currentFiles = new Map(
    listFiles(current).flatMap((node) => (node.type === 'file' ? [[node.path, node.content]] : [])),
  );
  const snapshotFiles = new Map(
    listFiles(snapshot).flatMap((node) => (node.type === 'file' ? [[node.path, node.content]] : [])),
  );

  for (const [path, content] of snapshotFiles) {
    if (!currentFiles.has(path)) diff.added.push(path);
    else if (currentFiles.get(path) !== content) diff.modified.push(path);
  }
  for (const path of currentFiles.keys()) {
    if (!snapshotFiles.has(path)) diff.removed.push(path);
  }

  diff.added.sort();
  diff.removed.sort();
  diff.modified.sort();
  return diff;
}
