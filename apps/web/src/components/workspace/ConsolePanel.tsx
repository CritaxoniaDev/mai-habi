import { useEffect, useRef } from 'react';
import type { ConsoleLevel } from '@mai-habi/types';
import { cn } from '@mai-habi/ui';
import { useWorkspace } from '../../state/workspace';

const LEVEL_LABEL: Record<ConsoleLevel, string> = {
  log: 'log',
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};

const LEVEL_TONE: Record<ConsoleLevel, string> = {
  log: 'text-muted-foreground',
  info: 'text-muted-foreground',
  debug: 'text-muted-foreground',
  warn: 'text-warning',
  error: 'text-danger',
};

/**
 * The application's browser console.
 *
 * This is explicitly not a shell: there is no Node, no npm and no package
 * installation in this product, so the panel never pretends to accept commands.
 */
export function ConsolePanel() {
  const entries = useWorkspace((state) => state.console);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="px-4 py-6">
        <p className="text-label font-light text-muted-foreground">
          Nothing logged yet. <code className="font-mono">console.log</code> from your app appears
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto py-1" role="log" aria-label="Console output">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            'flex items-baseline gap-2.5 border-b border-border/60 px-4 py-1 last:border-b-0',
            entry.level === 'error' && 'bg-danger-surface',
            entry.level === 'warn' && 'bg-warning-surface',
          )}
        >
          <span
            className={cn(
              'w-10 shrink-0 font-mono text-micro uppercase',
              LEVEL_TONE[entry.level],
            )}
          >
            {LEVEL_LABEL[entry.level]}
          </span>

          <div className="min-w-0 flex-1">
            <pre className="whitespace-pre-wrap break-words font-mono text-code font-light text-foreground">
              {entry.text}
            </pre>
            {entry.stack && (
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-micro font-light text-muted-foreground">
                {entry.stack}
              </pre>
            )}
          </div>

          <time
            className="shrink-0 font-mono text-micro text-muted-foreground"
            dateTime={new Date(entry.at).toISOString()}
          >
            {new Date(entry.at).toLocaleTimeString(undefined, { hour12: false })}
          </time>
        </div>
      ))}
      <div ref={bottom} />
    </div>
  );
}
