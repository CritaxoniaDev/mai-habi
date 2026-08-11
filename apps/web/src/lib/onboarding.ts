/**
 * Onboarding state deliberately lives outside the workspace store.
 *
 * It has to survive the full page navigation from the dashboard into the
 * editor, and it is a per-browser preference rather than per-project data — so
 * it belongs in web storage, not in React state that is recreated on load.
 *
 *   - a *fresh* marker (sessionStorage) says "this project was just created",
 *     and is read exactly once so a later refresh no longer counts as fresh.
 *   - a *seen* flag (localStorage) records that the tour has been offered, so
 *     the welcome never nags on the next project the visitor creates.
 */

const FRESH_KEY = 'mai-habi:fresh-project';
const SEEN_KEY = 'mai-habi:tour-seen';

/** Marks a just-created project so the editor knows to offer the tour. */
export function markProjectFresh(projectId: string): void {
  try {
    sessionStorage.setItem(FRESH_KEY, projectId);
  } catch {
    // Private mode or storage disabled: the welcome simply won't auto-open.
  }
}

/**
 * True at most once per created project. The marker is cleared on read, so
 * reloading the same project — or opening it again later — is not "fresh".
 */
export function consumeFreshProject(projectId: string): boolean {
  try {
    if (sessionStorage.getItem(FRESH_KEY) !== projectId) return false;
    sessionStorage.removeItem(FRESH_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Whether the tour has already been offered (taken or skipped). */
export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Best effort; worst case the welcome is offered again next time.
  }
}
