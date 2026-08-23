/**
 * Custody of the GitHub access token that Supabase hands back after an OAuth
 * sign-in.
 *
 * Supabase surfaces `provider_token` on the session **once** — in the redirect
 * that completes sign-in — and never again: it is not persisted with the
 * session and does not survive a token refresh. Anything that wants to call the
 * GitHub API later therefore has to catch it as it goes past and keep it, which
 * is what this module is for.
 *
 * SECURITY. The token carries the `repo` scope, which GitHub does not offer in
 * a read-only form: it grants read *and write* to every private repository the
 * account can reach, organisation repositories included. It is held in
 * `localStorage`, which is readable by any script running on this origin, so a
 * single XSS bug is enough to leak it. That is the trade Supabase's own guidance
 * makes, and it is what keeps the token available across tabs and reloads, but
 * it means:
 *
 *   - the token is cleared on sign-out, and
 *   - a leak should be treated as a full account compromise: revoke the
 *     authorisation at https://github.com/settings/applications.
 *
 * Moving custody server-side (a row keyed by user id, read through an
 * authenticated route) removes the XSS exposure and is the right shape if this
 * ever holds more than one person's token.
 */

const TOKEN_KEY = 'mai-habi.github-token';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Private modes and blocked-cookie settings throw on access rather than
    // returning null.
    return null;
  }
}

export function readGitHubToken(): string | null {
  const value = storage()?.getItem(TOKEN_KEY);
  return value && value.length > 0 ? value : null;
}

/** Passing `null` forgets the token, which is what sign-out wants. */
export function storeGitHubToken(token: string | null | undefined): void {
  const store = storage();
  if (!store) return;

  try {
    if (token && token.length > 0) store.setItem(TOKEN_KEY, token);
    else store.removeItem(TOKEN_KEY);
  } catch {
    // A full or locked-down store is not worth failing a sign-in over; the
    // GitHub panes degrade to "reconnect" on their own.
  }
}

export function hasGitHubToken(): boolean {
  return readGitHubToken() !== null;
}
