import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DeviceId, PlaygroundSnapshot } from '@mai-habi/types';
import { DEVICE_PRESETS } from '@mai-habi/types';
import {
  PREVIEW_SANDBOX,
  buildPlaceholderDocument,
  buildPreviewDocument,
  isPreviewMessage,
  type CompileDiagnostic,
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
  Code2,
  ExternalLink,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  RotateCw,
} from 'lucide-react';
import { getCompiler } from '../lib/compile';
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

  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);

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

    const result = await getCompiler().compile(
      source.snapshot.files,
      source.snapshot.entryFile,
      true,
    );

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && immersive) setImmersive(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [immersive]);

  const toggleImmersive = useCallback(() => {
    setImmersive((value) => {
      const next = !value;
      if (next) void stage.current?.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      return next;
    });
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
        origin: window.location.origin,
        title: state.snapshot?.name,
      });
    }
    return buildPlaceholderDocument(
      state.status === 'compiling' ? 'Compiling…' : 'Nothing to render.',
    );
  }, [state]);

  const name = state.snapshot?.name ?? 'Viewer';

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background">
        {!immersive && (
          <header className="z-header flex h-11 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-3">
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

            <Button variant="ghost" size="sm" className="touch-target" onClick={() => void load()}>
              <RotateCw /> <span className="hidden sm:inline">Refresh</span>
            </Button>

            <div
              className="mx-2 hidden items-center gap-0.5 md:flex"
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

            <span className="hidden min-w-0 truncate text-label font-light text-muted-foreground lg:inline">
              {name}
              {preset.width ? ` · ${preset.width} × ${preset.height}` : ''}
            </span>

            <div className="ml-auto flex items-center gap-1">
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

              <Tooltip label="Fullscreen">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="touch-target"
                  aria-label="Enter fullscreen"
                  onClick={toggleImmersive}
                >
                  <Maximize2 />
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
          </header>
        )}

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

          {immersive && (
            <Button
              variant="outline"
              size="icon-sm"
              className="z-header absolute right-3 top-3 touch-target opacity-60 shadow-overlay transition-opacity hover:opacity-100"
              aria-label="Exit fullscreen"
              onClick={toggleImmersive}
            >
              <Minimize2 />
            </Button>
          )}

          {showSource && state.snapshot && (
            <SourceView files={state.snapshot.files} onClose={() => setShowSource(false)} />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
