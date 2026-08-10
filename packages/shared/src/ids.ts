const ALPHABET = '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Identifiers are drawn from the CSPRNG rather than a counter — share ids are
 * guessable capability tokens otherwise.
 */
export function randomId(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function projectId(): string {
  return `pr_${randomId(14)}`;
}

export function shareId(): string {
  return randomId(12);
}

export function sessionId(): string {
  return randomId(8);
}

export function guestId(): string {
  return `guest_${randomId(16)}`;
}

/** Proof-of-ownership secret kept only in the browser, never in a URL. */
export function guestSecret(): string {
  return randomId(40);
}
