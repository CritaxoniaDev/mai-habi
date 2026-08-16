'use client';

import { useEffect, useRef, useState } from 'react';
import type { CompileState, SaveStatus } from '@mai-habi/types';
import { downloadProject } from '@mai-habi/filesystem';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  ThemeToggle,
  Tooltip,
  TooltipProvider,
  cn,
} from '@mai-habi/ui';
import {
  Command as CommandIcon,
  Download,
  MoreHorizontal,
  PanelLeft,
  Play,
  RotateCw,
  Settings,
  Webhook,
} from 'lucide-react';
import { useWorkspace } from '../state/workspace';
import { useUi } from '../state/ui';
import { useSession } from '../state/session';
import { openViewer, recompile } from '../lib/run';
import AuthMenu from './AuthMenu';

const SAVE_LABEL: Record<SaveStatus, string> = {
  'saved-locally': 'Saved locally',
  saving: 'Saving',
  saved: 'Saved',
  offline: 'Offline',
  syncing: 'Syncing',
  'save-failed': 'Save failed',
};

const COMPILE_LABEL: Record<CompileState, string> = {
  idle: '',
  'loading-compiler': 'Loading compiler',
  compiling: 'Compiling',
  ready: '',
  error: 'Build failed',
};

export default function WorkspaceHeader() {
  const project = useWorkspace((state) => state.project);
  const saveStatus = useWorkspace((state) => state.saveStatus);
  const compileState = useWorkspace((state) => state.compileState);
  const compileDurationMs = useWorkspace((state) => state.compileDurationMs);
  const errorCount = useWorkspace((state) => state.compileErrors.length);
  const initialise = useSession((state) => state.initialise);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  const busy = compileState === 'compiling' || compileState === 'loading-compiler';

  return (
    <TooltipProvider>
      <header className="z-header flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <Tooltip label="Toggle files (⌘B)">
          <Button
            variant="ghost"
            size="icon-sm"
            className="touch-target md:hidden"
            aria-label="Toggle files"
            onClick={() => useWorkspace.getState().toggleExplorer()}
          >
            <PanelLeft />
          </Button>
        </Tooltip>

        <a
          href="/"
          className={cn(
            'rounded-sm px-1 text-secondary font-normal text-foreground outline-none',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
          )}
        >
          Playground
        </a>

        <span aria-hidden="true" className="text-border-strong">
          /
        </span>

        <ProjectName />

        <span
          className="hidden text-label font-light text-muted-foreground sm:inline"
          role="status"
          aria-live="polite"
        >
          {SAVE_LABEL[saveStatus]}
        </span>

        <span
          className={cn(
            'hidden text-label font-light lg:inline',
            compileState === 'error' ? 'text-danger' : 'text-muted-foreground',
          )}
          role="status"
          aria-live="polite"
        >
          {compileState === 'error'
            ? `${COMPILE_LABEL.error}${errorCount > 1 ? ` · ${errorCount} errors` : ''}`
            : compileState === 'ready' && compileDurationMs > 0
              ? `Built in ${compileDurationMs} ms`
              : COMPILE_LABEL[compileState]}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip label="Command palette (⌘⇧P)">
            <Button
              variant="ghost"
              size="icon-sm"
              data-tour="command"
              className="touch-target hidden sm:inline-flex"
              aria-label="Command palette"
              onClick={() => useUi.getState().setPalette('commands')}
            >
              <CommandIcon />
            </Button>
          </Tooltip>

          <ThemeToggle className="touch-target" />

          <Tooltip label="Rebuild (⌘R)">
            <Button
              variant="ghost"
              size="icon-sm"
              className="touch-target"
              aria-label="Rebuild"
              onClick={recompile}
              loading={busy}
            >
              {!busy && <RotateCw />}
            </Button>
          </Tooltip>

          <Button variant="default" data-tour="viewer" onClick={openViewer}>
            <Play /> Open viewer
          </Button>

          <Button
            variant="outline"
            data-tour="share"
            onClick={() => useUi.getState().setDialog('share')}
          >
            Share
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="touch-target"
                aria-label="More actions"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  if (project) void downloadProject(useWorkspace.getState().files, project.name);
                }}
              >
                <Download /> Export as ZIP
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/rest">
                  <Webhook /> REST client
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => useUi.getState().setDialog('settings')}>
                <Settings /> Project settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => useUi.getState().setPalette('commands')}>
                <CommandIcon /> Command palette
                <DropdownMenuShortcut>⌘⇧P</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AuthMenu compact />
        </div>
      </header>
    </TooltipProvider>
  );
}

function ProjectName() {
  const project = useWorkspace((state) => state.project);
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  if (!project) {
    return <span className="text-secondary font-light text-muted-foreground">Loading</span>;
  }

  if (editing) {
    return (
      <input
        ref={input}
        defaultValue={project.name}
        aria-label="Project name"
        onBlur={(event) => {
          useWorkspace.getState().renameProject(event.target.value);
          setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setEditing(false);
        }}
        className={cn(
          'h-7 rounded-sm border border-border-strong bg-surface px-1.5',
          'text-secondary font-light text-foreground outline-none',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={`${project.name} — click to rename`}
      className={cn(
        'max-w-56 truncate rounded-sm px-1.5 py-1 text-secondary font-light text-foreground outline-none',
        'transition-colors duration-[--duration-fast] hover:bg-surface-hover',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
      )}
    >
      {project.name}
    </button>
  );
}
