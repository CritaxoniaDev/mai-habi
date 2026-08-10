/**
 * The single owner of appearance for both applications.
 *
 * No component detects the theme for itself: they read the resolved value from
 * here, and this module is the only thing that touches the root element.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mai-habi:theme';

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

const DARK_QUERY = '(prefers-color-scheme: dark)';

type Listener = (state: ThemeState) => void;

export interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
}

const listeners = new Set<Listener>();
let started = false;
let current: ThemeState | null = null;

function isMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getStoredMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system';

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isMode(stored) ? stored : 'system';
  } catch {
    // Storage can be blocked entirely; the default still works.
    return 'system';
  }
}

export function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return 'light';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function resolveMode(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemTheme() : mode;
}

/** Writes the resolved theme onto the root element. */
function paint(state: ThemeState): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const dark = state.resolved === 'dark';

  // Suppress transitions for one frame so the swap does not smear.
  root.setAttribute('data-theme-switching', '');

  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
  root.style.colorScheme = state.resolved;
  root.dataset.themeMode = state.mode;
  root.dataset.theme = state.resolved;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.removeAttribute('data-theme-switching'));
  });
}

function publish(state: ThemeState, repaint = true): void {
  current = state;
  if (repaint) paint(state);
  for (const listener of listeners) listener(state);
}

export function getThemeState(): ThemeState {
  if (current) return current;

  const mode = getStoredMode();
  current = { mode, resolved: resolveMode(mode) };
  return current;
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Preference is not persisted, but the session still honours it.
  }

  publish({ mode, resolved: resolveMode(mode) });
}

/**
 * Begins watching the operating system and other tabs.
 *
 * Idempotent, so every island can call it without coordinating.
 */
export function startThemeController(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  // Re-resolve and repaint instead of assuming the inline head script ran.
  // Storage may be blocked, scripts can be deferred by extensions, and the OS
  // appearance may have changed between the first paint and hydration.
  const initial = getThemeState();
  publish({ mode: initial.mode, resolved: resolveMode(initial.mode) });

  const query = window.matchMedia(DARK_QUERY);
  const onSystemChange = (event: MediaQueryListEvent) => {
    const state = getThemeState();
    if (state.mode !== 'system') return;
    publish({ mode: 'system', resolved: event.matches ? 'dark' : 'light' });
  };

  query.addEventListener('change', onSystemChange);

  // Keep tabs on the same origin in step.
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    const mode = isMode(event.newValue) ? event.newValue : 'system';
    publish({ mode, resolved: resolveMode(mode) });
  });
}

export function subscribeTheme(listener: Listener): () => void {
  startThemeController();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};
