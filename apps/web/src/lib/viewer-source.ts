import type { PlaygroundSnapshot } from '@mai-habi/types';
import {
  decompressFromBase64Url,
  fetchCloudProject,
  fetchShared,
  getLocalFiles,
  getLocalProject,
  toSnapshot,
} from '@mai-habi/shared';

export interface ViewerSource {
  snapshot: PlaygroundSnapshot;
  /** Whether this viewer may offer a "view source" panel. */
  sourceVisible: boolean;
  /** Whether the current browser can open this project in the editor. */
  editable: boolean;
}

/**
 * Resolves what `/view/:id` should render.
 *
 * The same identifier can mean three things, checked cheapest first: a project
 * saved in this browser, a share stored in the cloud, or — for the sentinel
 * `shared` — a snapshot carried in the link fragment itself.
 */
export async function resolveViewerSource(id: string): Promise<ViewerSource | null> {
  if (id === 'shared') {
    const fragment = window.location.hash.replace(/^#/, '');
    if (!fragment) return null;

    try {
      const snapshot = JSON.parse(await decompressFromBase64Url(fragment)) as PlaygroundSnapshot;
      return { snapshot, sourceVisible: true, editable: false };
    } catch {
      return null;
    }
  }

  const local = await getLocalProject(id).catch(() => undefined);
  if (local) {
    const files = await getLocalFiles(id);
    return { snapshot: toSnapshot(local, files), sourceVisible: true, editable: true };
  }

  const shared = await fetchShared(id).catch(() => null);
  if (shared) {
    return {
      snapshot: shared.snapshot,
      sourceVisible: shared.visibility === 'unlisted-source',
      editable: false,
    };
  }

  const cloud = await fetchCloudProject(id).catch(() => null);
  if (cloud) {
    return {
      snapshot: toSnapshot(cloud.project, cloud.files),
      sourceVisible: true,
      editable: true,
    };
  }

  return null;
}
