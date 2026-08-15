import { useEffect, useRef, useState } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from 'react-resizable-panels';
import { Button, Skeleton, Toaster, TooltipProvider, cn } from '@mai-habi/ui';
import { FilePlus, FolderPlus, PanelLeftClose, TerminalSquare, X } from 'lucide-react';
import { useWorkspace } from '../state/workspace';
import { useShortcuts } from '../lib/shortcuts';
import { promptNewFile, promptNewFolder } from '../lib/create-node';
import { disposeCompiler } from '../lib/compile';
import { CodeEditor } from '../components/workspace/CodeEditor';
import { EditorTabs } from '../components/workspace/EditorTabs';
import { FileExplorer } from '../components/workspace/FileExplorer';
import { BottomPanel } from '../components/workspace/BottomPanel';
import { CommandPalette } from '../components/CommandPalette';
import { ShareDialog } from '../components/dialogs/ShareDialog';
import { SettingsDialog } from '../components/dialogs/SettingsDialog';
import { FontsDialog } from '../components/dialogs/FontsDialog';
import { PromptDialog } from '../components/dialogs/PromptDialog';
import { OnboardingWelcome } from '../components/OnboardingWelcome';

type Layout = 'mobile' | 'tablet' | 'desktop';

/**
 * The interactive region of the editor.
 *
 * The page around it stays static Astro. Explorer, tabs, Monaco and the bottom
 * panel share one hydration root because the resizable layout couples them;
 * splitting them would mean re-implementing panel sizing across island
 * boundaries for no benefit.
 */
export default function Workspace({ projectId }: { projectId: string }) {
  const phase = useWorkspace((state) => state.phase);
  const explorerCollapsed = useWorkspace((state) => state.explorerCollapsed);
  const panelCollapsed = useWorkspace((state) => state.panelCollapsed);

  const explorerRef = useRef<ImperativePanelHandle>(null);
  const bottomRef = useRef<ImperativePanelHandle>(null);
  const layout = useLayout();
  const [mobileView, setMobileView] = useState<'files' | 'code' | 'console'>('code');

  useShortcuts();

  useEffect(() => {
    void useWorkspace.getState().load(projectId);
  }, [projectId]);

  useEffect(() => {
    const onBeforeUnload = () => useWorkspace.getState().flushSave();
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      disposeCompiler();
    };
  }, []);

  useEffect(() => {
    if (layout !== 'desktop') return;
    const panel = explorerRef.current;
    if (!panel) return;
    if (explorerCollapsed) panel.collapse();
    else panel.expand();
  }, [explorerCollapsed, layout]);

  useEffect(() => {
    if (layout !== 'desktop') return;
    const panel = bottomRef.current;
    if (!panel) return;
    if (panelCollapsed) panel.collapse();
    else panel.expand();
  }, [panelCollapsed, layout]);

  if (phase === 'loading') return <WorkspaceSkeleton />;

  if (phase === 'missing') {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <p className="text-section font-light">This project could not be found</p>
          <p className="mt-1.5 text-secondary font-light text-muted-foreground">
            It may have been created in a different browser, or deleted.
          </p>
          <Button className="mt-5" variant="outline" asChild>
            <a href="/">Back to projects</a>
          </Button>
        </div>
      </div>
    );
  }

  const sidebar = (
    <div
      data-tour="files"
      className="flex h-full flex-col overflow-hidden border-r border-border bg-surface"
    >
      <div className="flex h-8 shrink-0 items-center gap-1 px-2">
        <span className="text-micro font-normal uppercase tracking-[0.08em] text-muted-foreground">
          Files
        </span>
        <div className="ml-auto flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            className="touch-target"
            aria-label="New file"
            onClick={promptNewFile}
          >
            <FilePlus />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="touch-target"
            aria-label="New folder"
            onClick={promptNewFolder}
          >
            <FolderPlus />
          </Button>
          {layout !== 'mobile' && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="touch-target"
              aria-label="Hide files"
              onClick={() => useWorkspace.getState().toggleExplorer()}
            >
              {layout === 'tablet' ? <X /> : <PanelLeftClose />}
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <FileExplorer />
      </div>
    </div>
  );

  const editorArea = (
    <div data-tour="editor" className="flex h-full flex-col">
      <EditorTabs />
      <div className="min-h-0 flex-1">
        <CodeEditor />
      </div>
    </div>
  );

  const dialogs = (
    <>
      <CommandPalette />
      <ShareDialog />
      <SettingsDialog />
      <FontsDialog />
      <PromptDialog />
      <OnboardingWelcome />
      <Toaster />
    </>
  );

  /* ------------------------------------------------------------------ mobile */

  if (layout === 'mobile') {
    return (
      <TooltipProvider>
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1">
            {mobileView === 'files' && sidebar}
            {mobileView === 'code' && editorArea}
            {/* Kept mounted so the preview keeps running and logging. */}
            <div className={cn('h-full', mobileView === 'console' ? 'block' : 'hidden')}>
              <BottomPanel />
            </div>
          </div>

          <nav
            className="flex h-14 shrink-0 items-stretch border-t border-border bg-surface"
            aria-label="Workspace views"
          >
            {(['files', 'code', 'console'] as const).map((view) => (
              <button
                key={view}
                type="button"
                aria-current={mobileView === view}
                onClick={() => setMobileView(view)}
                className={cn(
                  'flex-1 text-label font-light capitalize outline-none',
                  'transition-colors duration-[--duration-fast]',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                  mobileView === view ? 'bg-surface-active text-foreground' : 'text-muted-foreground',
                )}
              >
                {view}
              </button>
            ))}
          </nav>
        </div>
        {dialogs}
      </TooltipProvider>
    );
  }

  /* ------------------------------------------------------------------ tablet */

  if (layout === 'tablet') {
    return (
      <TooltipProvider>
        <div className="relative h-full">
          {editorArea}

          {!explorerCollapsed && (
            <Drawer onClose={() => useWorkspace.getState().toggleExplorer()} side="left">
              <div className="h-full w-72">{sidebar}</div>
            </Drawer>
          )}

          <div
            className={cn(
              'absolute inset-x-0 bottom-0 h-72 border-t border-border',
              panelCollapsed && 'pointer-events-none h-0 overflow-hidden opacity-0',
            )}
          >
            <BottomPanel />
          </div>

          {panelCollapsed && <PanelFab />}
        </div>
        {dialogs}
      </TooltipProvider>
    );
  }

  /* ----------------------------------------------------------------- desktop */

  return (
    <TooltipProvider>
      <PanelGroup direction="horizontal" className="h-full">
        <Panel
          ref={explorerRef}
          defaultSize={18}
          minSize={12}
          maxSize={34}
          collapsible
          collapsedSize={0}
          onCollapse={() => {
            if (!useWorkspace.getState().explorerCollapsed) useWorkspace.getState().toggleExplorer();
          }}
        >
          {sidebar}
        </Panel>

        <PanelResizeHandle
          className={cn(
            'w-px bg-border outline-none transition-colors duration-[--duration-fast]',
            'hover:bg-border-strong focus-visible:bg-focus-ring',
            'data-[resize-handle-state=drag]:bg-focus-ring',
          )}
        />

        <Panel minSize={40}>
          <PanelGroup direction="vertical">
            <Panel minSize={20} className="flex flex-col">
              {editorArea}
            </Panel>

            <PanelResizeHandle
              className={cn(
                'h-px bg-border outline-none transition-colors duration-[--duration-fast]',
                'hover:bg-border-strong focus-visible:bg-focus-ring',
                'data-[resize-handle-state=drag]:bg-focus-ring',
              )}
            />

            {/*
              Never unmounted, only collapsed: the preview frame inside is what
              produces console output and runtime errors.
            */}
            <Panel
              ref={bottomRef}
              defaultSize={30}
              minSize={12}
              collapsible
              collapsedSize={0}
              onCollapse={() => {
                if (!useWorkspace.getState().panelCollapsed) useWorkspace.getState().togglePanel();
              }}
            >
              <BottomPanel />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {panelCollapsed && <PanelFab />}
      {dialogs}
    </TooltipProvider>
  );
}

function PanelFab() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="z-header fixed bottom-4 right-4 shadow-overlay"
      onClick={() => useWorkspace.getState().togglePanel('console')}
    >
      <TerminalSquare /> Console
    </Button>
  );
}

/** Overlay panel used at tablet width, where docking everything is too dense. */
function Drawer({
  side,
  onClose,
  children,
}: {
  side: 'left' | 'bottom';
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="z-overlay absolute inset-0 bg-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'z-dialog absolute bg-surface shadow-overlay',
          side === 'left' ? 'inset-y-0 left-0' : 'inset-x-0 bottom-0',
        )}
      >
        {children}
      </div>
    </>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-full" aria-busy="true" aria-label="Loading project">
      <div className="hidden w-56 shrink-0 flex-col gap-2 border-r border-border bg-surface p-3 md:flex">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-9 items-center gap-2 border-b border-border bg-surface px-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        {/* No skeleton inside the editor surface itself — Monaco owns that area. */}
        <div className="flex-1 bg-surface" />
      </div>
    </div>
  );
}

function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>('desktop');

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const tablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');

    const update = () => setLayout(mobile.matches ? 'mobile' : tablet.matches ? 'tablet' : 'desktop');

    update();
    mobile.addEventListener('change', update);
    tablet.addEventListener('change', update);
    return () => {
      mobile.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
    };
  }, []);

  return layout;
}
