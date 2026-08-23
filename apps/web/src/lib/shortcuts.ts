import { useEffect } from 'react';
import { useWorkspace } from '../state/workspace';
import { useUi } from '../state/ui';
import { openViewer, recompile } from './run';

function isModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

/**
 * Global editor shortcuts.
 *
 * In-file find and replace are deliberately absent — Monaco already owns Cmd+F
 * and Cmd+H whenever the editor has focus. Cmd+Shift+F is the project-wide
 * search, which Monaco does not provide.
 */
export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const workspace = useWorkspace.getState();
      const ui = useUi.getState();

      if (event.key === 'Escape' && ui.palette) {
        ui.setPalette(null);
        return;
      }

      if (!isModifier(event)) return;

      const key = event.key.toLowerCase();

      if (key === 's') {
        event.preventDefault();
        workspace.flushSave();
        void workspace.compile();
        return;
      }

      if (key === 'p') {
        event.preventDefault();
        ui.setPalette(event.shiftKey ? 'commands' : 'files');
        return;
      }

      if (key === 'f' && event.shiftKey) {
        event.preventDefault();
        workspace.openSearch();
        return;
      }

      if (key === 'b') {
        event.preventDefault();
        workspace.toggleExplorer();
        return;
      }

      if (key === '`') {
        event.preventDefault();
        workspace.togglePanel('console');
        return;
      }

      // Rebuild, rather than reloading the whole editor.
      if (key === 'r' && !event.shiftKey) {
        event.preventDefault();
        recompile();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        openViewer();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
