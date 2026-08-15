import { useEffect, useMemo, useRef } from 'react';
import type { FontConfig } from '@mai-habi/types';
import {
  PREVIEW_SANDBOX,
  buildPlaceholderDocument,
  buildPreviewDocument,
  isPreviewMessage,
} from '@mai-habi/compiler';
import { cn } from '@mai-habi/ui';
import { useWorkspace } from '../../state/workspace';

/** Stable empty reference so the selector never churns re-renders. */
const NO_FONTS: FontConfig[] = [];

/**
 * Hosts the compiled application.
 *
 * The iframe stays mounted for the whole session, even when another panel tab
 * is showing, so console output and runtime errors keep flowing. User code is
 * never evaluated in this document — no `eval`, no `new Function`, no injected
 * script tags.
 */
export function PreviewPane({ visible }: { visible: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);

  const preview = useWorkspace((state) => state.preview);
  const compileState = useWorkspace((state) => state.compileState);
  const tailwind = useWorkspace((state) => state.project?.settings.tailwind ?? false);
  const fonts = useWorkspace((state) => state.project?.settings.fonts) ?? NO_FONTS;
  const name = useWorkspace((state) => state.project?.name ?? 'Preview');

  const document = useMemo(() => {
    if (!preview) {
      return buildPlaceholderDocument(
        compileState === 'error' ? 'Fix the errors to see the app.' : 'Compiling…',
      );
    }

    return buildPreviewDocument({
      js: preview.js,
      css: preview.css,
      tailwind,
      fonts,
      origin: window.location.origin,
      title: name,
    });
  }, [preview, tailwind, fonts, name, compileState]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      /*
       * The preview has an opaque origin, so `event.origin` is "null" and
       * cannot identify it. Matching the source window is what proves the
       * message came from our own frame rather than any other embedder.
       */
      if (event.source !== frame.current?.contentWindow) return;
      if (!isPreviewMessage(event.data)) return;

      const message = event.data;
      const store = useWorkspace.getState();

      if (message.type === 'preview:console') {
        store.appendConsole({ level: message.level, text: message.text, at: message.at });
        return;
      }

      if (message.type === 'preview:error') {
        store.appendConsole({
          level: 'error',
          text: message.message,
          stack: message.stack,
          at: message.at,
          runtime: true,
        });
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className={cn('h-full w-full bg-white', visible ? 'block' : 'hidden')}>
      <iframe
        ref={frame}
        // Remounting on each successful build is what "refresh" means here.
        key={preview?.generation ?? 0}
        title={`${name} preview`}
        sandbox={PREVIEW_SANDBOX}
        srcDoc={document}
        className="h-full w-full border-0"
      />
    </div>
  );
}
