import { useCallback, useSyncExternalStore } from 'react';
import {
  type ThemeMode,
  type ThemeState,
  getThemeState,
  setThemeMode,
  startThemeController,
  subscribeTheme,
} from './controller';

const SERVER_STATE: ThemeState = { mode: 'system', resolved: 'light' };

/**
 * Reads appearance from the shared controller.
 *
 * `useSyncExternalStore` keeps every island — header, settings, viewer toolbar,
 * Monaco — on exactly one source of truth, including when the operating system
 * changes underneath them.
 */
export function useTheme(): ThemeState & { setMode: (mode: ThemeMode) => void } {
  const subscribe = useCallback((notify: () => void) => {
    startThemeController();
    return subscribeTheme(notify);
  }, []);

  const state = useSyncExternalStore(subscribe, getThemeState, () => SERVER_STATE);

  return { ...state, setMode: setThemeMode };
}
