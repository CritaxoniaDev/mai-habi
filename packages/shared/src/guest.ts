import { guestId as newGuestId, guestSecret as newGuestSecret } from './ids';
import { kvGet, kvSet, isIndexedDbAvailable } from './idb';

export interface GuestIdentity {
  id: string;
  /** Never leaves the browser; proves ownership of anonymous cloud records. */
  secret: string;
  createdAt: number;
}

const KEY = 'guest-identity';

let cached: GuestIdentity | null = null;

/**
 * Guests are not fake registered users — they get a local identifier that is
 * only sent to the server when they explicitly publish something.
 */
export async function getGuestIdentity(): Promise<GuestIdentity> {
  if (cached) return cached;

  if (!isIndexedDbAvailable()) {
    cached = { id: newGuestId(), secret: newGuestSecret(), createdAt: Date.now() };
    return cached;
  }

  const existing = await kvGet<GuestIdentity>(KEY);
  if (existing?.id && existing.secret) {
    cached = existing;
    return existing;
  }

  const identity: GuestIdentity = {
    id: newGuestId(),
    secret: newGuestSecret(),
    createdAt: Date.now(),
  };
  await kvSet(KEY, identity);
  cached = identity;
  return identity;
}
