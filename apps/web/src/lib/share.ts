import type { PlaygroundSnapshot, Share, Visibility } from '@mai-habi/types';
import {
  EDITOR_ORIGIN,
  LIMITS,
  compressToBase64UrlSync,
  getGuestIdentity,
  isCloudEnabled,
  publishToCloud,
  toSnapshot,
} from '@mai-habi/shared';
import { useWorkspace } from '../state/workspace';

export class ShareError extends Error {}

/**
 * Share links point at the viewer module.
 *
 * With cloud storage configured a project gets a short, durable id. Without it
 * the snapshot travels inside the link fragment, which never reaches a server
 * and still works for anyone who opens it.
 */
export interface ShareOptions {
  visibility: Exclude<Visibility, 'private'>;
  expiresAt: number | null;
}

function inlineUrl(snapshot: PlaygroundSnapshot): string {
  const encoded = compressToBase64UrlSync(JSON.stringify(snapshot));

  if (encoded.length > LIMITS.maxInlineShareBytes) {
    throw new ShareError(
      'This project is too large for a self-contained link. Configure Supabase to publish it.',
    );
  }

  return `${EDITOR_ORIGIN}/view/shared#${encoded}`;
}

export async function shareProject(options: ShareOptions): Promise<Share> {
  const { project, files } = useWorkspace.getState();
  if (!project) throw new ShareError('No project is open.');

  useWorkspace.getState().flushSave();
  const snapshot = toSnapshot(project, files);

  if (isCloudEnabled()) {
    const guest = await getGuestIdentity();
    const share = await publishToCloud({
      project,
      snapshot,
      visibility: options.visibility,
      expiresAt: options.expiresAt,
      guestId: guest.id,
    });

    if (share) {
      useWorkspace.getState().updateSettings({});
      return share;
    }
  }

  return {
    shareId: '',
    url: inlineUrl(snapshot),
    visibility: options.visibility,
    expiresAt: options.expiresAt,
    inline: true,
  };
}
