import { toast } from '@mai-habi/ui';
import { useWorkspace } from '../state/workspace';

/**
 * "Run" opens the viewer module.
 *
 * The viewer compiles the project itself from the same origin, so nothing is
 * handed over — a link is all it needs. Called straight from the click so the
 * popup blocker sees the gesture.
 */

export function viewerPath(projectId: string): string {
  return `/view/${projectId}`;
}

export function editorPath(projectId: string): string {
  return `/editor/${projectId}`;
}

export function openViewer(): void {
  const { project, flushSave } = useWorkspace.getState();
  if (!project) return;

  // The viewer reads the saved project, so make sure the latest edit is in.
  flushSave();

  const opened = window.open(viewerPath(project.id), `mai-habi-view-${project.id}`);
  if (!opened) {
    toast.error('The viewer was blocked', { description: 'Allow pop-ups for this site.' });
  }
}

export function recompile(): void {
  void useWorkspace.getState().compile();
}
