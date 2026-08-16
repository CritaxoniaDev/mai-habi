'use client';

import dynamic from 'next/dynamic';
import WorkspaceHeader from '../../../islands/WorkspaceHeader';
import { useFullscreenBody } from '../../../lib/use-fullscreen-body';

/*
 * The header server-renders (it is a plain client component, imported directly),
 * so the toolbar is in the initial HTML. Only the workspace body stays
 * client-only: Monaco and the compiler worker touch browser APIs at module load,
 * so they cannot render on the server.
 */
const Workspace = dynamic(() => import('../../../islands/Workspace'), { ssr: false });

export function EditorClient({ projectId }: { projectId: string }) {
  useFullscreenBody();

  return (
    <div className="flex h-screen flex-col">
      <WorkspaceHeader />
      <div className="min-h-0 flex-1">
        <Workspace projectId={projectId} />
      </div>
    </div>
  );
}
