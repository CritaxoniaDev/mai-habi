'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DeviceId, PlaygroundSnapshot } from '@mai-habi/types';
import { DEVICE_PRESETS } from '@mai-habi/types';
import {
  PREVIEW_SANDBOX,
  buildPlaceholderDocument,
  buildPreviewDocument,
  isPreviewMessage,
  type CompileDiagnostic,
  type CompileResult,
} from '@mai-habi/compiler';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorNotice,
  Skeleton,
  ThemeToggle,
  Tooltip,
  TooltipProvider,
  cn,
} from '@mai-habi/ui';
import {
  ArrowLeft,
  ChevronDown,
  Code2,
  ExternalLink,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  RotateCw,
} from 'lucide-react';
import { getCompiler, prepareSnapshotCompile } from '../lib/compile';
import { cspNonce } from '../lib/csp-nonce';
import { resolveViewerSource } from '../lib/viewer-source';
import { SourceView } from '../components/viewer/SourceView';

interface State {
  status: 'loading' | 'compiling' | 'ready' | 'missing' | 'failed';
  snapshot: PlaygroundSnapshot | null;
  js: string;
  css: string;
  errors: CompileDiagnostic[];
  sourceVisible: boolean;
  editable: boolean;
}

const INITIAL: State = {
  status: 'loading',
  snapshot: null,
  js: '',
  css: '',
  errors: [],
  sourceVisible: false,
  editable: false,
};

/**
 * The viewer module.
 *
 * It shows the running application and nothing else — no explorer, no Monaco,
 * no console, no project settings. The project is compiled here in the visitor's
 * own browser, so sharing a link costs the server a static response.
 */
export default function ViewerShell({ id }: { id: string }) {
  const [state, setState] = useState<State>(INITIAL);
  const [device, setDevice] = useState<DeviceId>('full');
  const [generation, setGeneration] = useState(0);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const hideTimer = useRef<number | null>(null);

  /*
   * The toolbar floats over the preview and hides itself. It reveals on a
   * hover handle, stays while the pointer is on it, and — because a touch has
   * no hover to leave — falls back to an idle timer so it never gets stuck open.
   */
  const AUTO_HIDE_MS = 3000;

  const cancelHide = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(
    (delay: number) => {
      cancelHide();
      hideTimer.current = window.setTimeout(() => setToolbarOpen(false), delay);
    },
    [cancelHide],
  );

  const revealToolbar = useCallback(() => {
    setToolbarOpen(true);
    scheduleHide(AUTO_HIDE_MS);
  }, [scheduleHide]);

  useEffect(() => cancelHide, [cancelHide]);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading' }));
    setRuntimeError(null);

    const source = await resolveViewerSource(id).catch(() => null);
    if (!source) {
      setState({ ...INITIAL, status: 'missing' });
      return;
    }

    setState({
      ...INITIAL,
      status: 'compiling',
      snapshot: source.snapshot,
      sourceVisible: source.sourceVisible,
      editable: source.editable,
    });

    // Resolve the entry the same way the editor does: a Next.js project (or any
    // import with no explicit mount) has an empty entry, so a mount is
    // synthesised rather than compiling "" and failing.
    const prepared = prepareSnapshotCompile(source.snapshot.files, source.snapshot.entryFile);
    if (!prepared) {
      setState({
        status: 'failed',
        snapshot: source.snapshot,
        sourceVisible: source.sourceVisible,
        editable: source.editable,
        js: '',
        css: '',
        errors: [
          {
            message:
              'This project has no entry file. Add index.html, src/main.tsx, or a component the platform can mount.',
            location: null,
          },
        ],
      });
      setGeneration((value) => value + 1);
      return;
    }

    let result: CompileResult;
    try {
      result = await getCompiler().compile(prepared.files, prepared.entry, true);
    } catch (error) {
      // A newer load() started a fresh compile and superseded this one. That
      // load owns the state now, so this one bows out silently rather than
      // surfacing the cancellation as an error. (React StrictMode runs the
      // effect twice in development, which is a common way to hit this.)
      if (error instanceof Error && error.name === 'SupersededError') return;

      // A genuine failure — e.g. the worker could not start. Show it as a
      // failed build instead of letting it reach the error overlay.
      setState({
        status: 'failed',
        snapshot: source.snapshot,
        sourceVisible: source.sourceVisible,
        editable: source.editable,
        js: '',
        css: '',
        errors: [
          {
            message: error instanceof Error ? error.message : 'The compiler could not start.',
            location: null,
          },
        ],
      });
      setGeneration((value) => value + 1);
      return;
    }

    setState({
      status: result.ok ? 'ready' : 'failed',
      snapshot: source.snapshot,
      sourceVisible: source.sourceVisible,
      editable: source.editable,
      js: result.ok ? result.js : '',
      css: result.ok ? result.css : '',
      errors: result.ok ? [] : result.errors,
    });

    setGeneration((value) => value + 1);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // The preview has an opaque origin, so the source window is its identity.
      if (event.source !== frame.current?.contentWindow) return;
      if (!isPreviewMessage(event.data)) return;
      if (event.data.type === 'preview:error') setRuntimeError(event.data.message);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // The browser is the source of truth for fullscreen (Escape exits it too), so
  // the immersive flag follows the event rather than being toggled optimistically.
  useEffect(() => {
    const onChange = () => setImmersive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleImmersive = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void stage.current?.requestFullscreen?.().catch(() => {});
  }, []);

  const preset = useMemo(
    () => DEVICE_PRESETS.find((entry) => entry.id === device) ?? DEVICE_PRESETS[0],
    [device],
  );

  const document_ = useMemo(() => {
    if (state.status === 'ready') {
      return buildPreviewDocument({
        js: state.js,
        css: state.css,
        tailwind: state.snapshot?.tailwind ?? false,
        fonts: state.snapshot?.fonts ?? [],
        origin: window.location.origin,
        title: state.snapshot?.name,
        nonce: cspNonce(),
      });
    }
    return buildPlaceholderDocument(
      state.status === 'compiling' ? 'Compiling…' : 'Nothing to render.',
    );
  }, [state]);

  const name = state.snapshot?.name ?? 'Viewer';

  /*
   * A shared link shows only the app — the toolbar is for the author. It appears
   * when the current browser can open the project in the editor (`editable`), and
   * the project setting can still hide it there too.
   */
  const showToolbar =
    Boolean(state.snapshot) && state.editable && (state.snapshot?.viewerToolbar ?? true);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background">
        {state.status === 'failed' && !immersive && (
          <div className="shrink-0 border-b border-border bg-surface px-3 py-2">
            <ErrorNotice
              title="This project did not compile"
              detail={state.errors
                .map((error) =>
                  error.location
                    ? `${error.location.file}:${error.location.line}:${error.location.column}  ${error.message}`
                    : error.message,
                )
                .join('\n')}
              reassurance="Nothing was changed. The author can fix this in the editor."
            />
          </div>
        )}

        {runtimeError && !immersive && (
          <div className="shrink-0 border-b border-border bg-surface px-3 py-2">
            <ErrorNotice
              title="The application reported an error"
              detail={runtimeError}
              reassurance="This came from the project's own code."
              onDismiss={() => setRuntimeError(null)}
              actions={
                <Button size="sm" variant="outline" onClick={() => void load()}>
                  Reload
                </Button>
              }
            />
          </div>
        )}

        <div ref={stage} className="relative min-h-0 flex-1 bg-background">
          {state.status === 'loading' && (
            <div className="grid h-full place-items-center p-6" aria-busy="true">
              <Skeleton className="h-40 w-full max-w-2xl" />
            </div>
          )}

          {state.status === 'missing' && (
            <div className="grid h-full place-items-center px-6">
              <div className="max-w-md text-center">
                <p className="text-section font-light">Nothing to show</p>
                <p className="mt-1.5 text-secondary font-light text-muted-foreground">
                  This link is not available. It may have expired, or the project may only exist in
                  another browser.
                </p>
                <Button className="mt-5" variant="outline" asChild>
                  <a href="/">Go to the playground</a>
                </Button>
              </div>
            </div>
          )}

          {(state.status === 'ready' ||
            state.status === 'compiling' ||
            state.status === 'failed') && (
            <div
              className={cn(
                'h-full w-full',
                preset.width && !immersive ? 'grid place-items-center overflow-auto p-6' : '',
              )}
            >
              {/*
                A white ground on purpose: the project defines its own
                appearance and must not inherit the viewer's theme.
              */}
              <div
                className={cn(
                  'bg-white',
                  preset.width && !immersive
                    ? 'overflow-hidden rounded-lg border border-border shadow-overlay'
                    : 'h-full w-full',
                )}
                style={
                  preset.width && !immersive
                    ? { width: preset.width, height: preset.height ?? undefined, maxWidth: '100%' }
                    : undefined
                }
              >
                <iframe
                  ref={frame}
                  key={generation}
                  title={`${name} preview`}
                  sandbox={PREVIEW_SANDBOX}
                  srcDoc={document_}
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          )}

          {showToolbar && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-header flex justify-center">
              {/* The pull-down handle is the only always-present affordance. */}
              <button
                type="button"
                aria-label={toolbarOpen ? 'Hide toolbar' : 'Show toolbar'}
                aria-expanded={toolbarOpen}
                onPointerEnter={revealToolbar}
                onFocus={revealToolbar}
                onClick={() => (toolbarOpen ? setToolbarOpen(false) : revealToolbar())}
                className={cn(
                  'group pointer-events-auto absolute left-1/2 top-0 grid h-6 w-11 -translate-x-1/2 place-items-center',
                  'rounded-b-lg border border-t-0 border-border bg-surface/85 text-muted-foreground shadow-overlay backdrop-blur',
                  'transition-[opacity,color,transform] duration-[--duration-normal] ease-[--ease-standard]',
                  'hover:text-foreground',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                  toolbarOpen ? 'pointer-events-none -translate-y-1 opacity-0' : 'opacity-60 hover:opacity-100',
                )}
              >
                <ChevronDown
                  className="size-4 transition-transform duration-[--duration-fast] ease-[--ease-standard] group-hover:translate-y-0.5"
                  aria-hidden="true"
                />
              </button>

              <div
                onPointerEnter={cancelHide}
                onPointerLeave={() => scheduleHide(700)}
                className={cn(
                  'no-scrollbar pointer-events-auto mt-3 flex max-w-[calc(100%-1rem)] items-center gap-0.5 overflow-x-auto',
                  'rounded-full border border-border bg-surface/95 px-1.5 py-1 shadow-overlay backdrop-blur',
                  'origin-top will-change-[transform,opacity] transition-[transform,opacity]',
                  'duration-[--duration-slow] ease-[--ease-standard]',
                  toolbarOpen
                    ? 'translate-y-0 scale-100 opacity-100'
                    : 'pointer-events-none -translate-y-6 scale-95 opacity-0',
                )}
              >
                {state.editable ? (
                  <Button variant="ghost" size="sm" className="touch-target" asChild>
                    <a href={`/editor/${id}`}>
                      <ArrowLeft /> <span className="hidden sm:inline">Editor</span>
                    </a>
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="touch-target" asChild>
                    <a href="/">
                      <ArrowLeft /> <span className="hidden sm:inline">Playground</span>
                    </a>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="touch-target"
                  onClick={() => void load()}
                >
                  <RotateCw /> <span className="hidden sm:inline">Refresh</span>
                </Button>

                <div
                  className="mx-1 hidden items-center gap-0.5 md:flex"
                  role="radiogroup"
                  aria-label="Viewport"
                >
                  {DEVICE_PRESETS.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      role="radio"
                      aria-checked={device === entry.id}
                      onClick={() => setDevice(entry.id)}
                      className={cn(
                        'rounded-sm px-2 py-1 text-label font-light outline-none',
                        'transition-colors duration-[--duration-fast] ease-[--ease-standard]',
                        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
                        device === entry.id
                          ? 'bg-surface-active text-foreground'
                          : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                      )}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>

                <span className="hidden min-w-0 truncate px-1 text-label font-light text-muted-foreground lg:inline">
                  {name}
                  {preset.width ? ` · ${preset.width} × ${preset.height}` : ''}
                </span>

                <span aria-hidden="true" className="mx-0.5 h-4 w-px shrink-0 bg-border" />

                {state.sourceVisible && state.snapshot && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden touch-target sm:inline-flex"
                    onClick={() => setShowSource((value) => !value)}
                    aria-pressed={showSource}
                  >
                    <Code2 /> {showSource ? 'Hide source' : 'View source'}
                  </Button>
                )}

                <ThemeToggle className="touch-target" />

                <Tooltip label={immersive ? 'Exit fullscreen' : 'Fullscreen'}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="touch-target"
                    aria-label={immersive ? 'Exit fullscreen' : 'Enter fullscreen'}
                    onClick={toggleImmersive}
                  >
                    {immersive ? <Minimize2 /> : <Maximize2 />}
                  </Button>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="touch-target md:hidden"
                      aria-label="More viewer actions"
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Viewport</DropdownMenuLabel>
                    {DEVICE_PRESETS.map((entry) => (
                      <DropdownMenuItem key={entry.id} onSelect={() => setDevice(entry.id)}>
                        {entry.label}
                        {entry.width && (
                          <span className="ml-auto text-micro text-muted-foreground">
                            {entry.width} × {entry.height}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                    {state.sourceVisible && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setShowSource((value) => !value)}>
                          <Code2 /> {showSource ? 'Hide source' : 'View source'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip label="Open in a new window">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hidden touch-target md:inline-flex"
                    aria-label="Open in a new window"
                    onClick={() => window.open(window.location.href, '_blank')}
                  >
                    <ExternalLink />
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}

          {showSource && state.snapshot && (
            <SourceView files={state.snapshot.files} onClose={() => setShowSource(false)} />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
