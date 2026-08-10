import { useMemo, useState } from 'react';
import { Button, cn } from '@mai-habi/ui';
import { X } from 'lucide-react';

export interface SourceViewProps {
  files: Record<string, string>;
  onClose: () => void;
}

/**
 * A read-only secondary state, shown only when a share grants source access.
 *
 * Deliberately not Monaco — the viewer stays small, and the running application
 * remains the primary thing on the page.
 */
export function SourceView({ files, onClose }: SourceViewProps) {
  const paths = useMemo(() => Object.keys(files).sort(), [files]);
  const [selected, setSelected] = useState(paths[0] ?? '');

  return (
    <div className="z-overlay absolute inset-0 flex bg-background">
      <div
        className="w-56 shrink-0 overflow-y-auto border-r border-border py-2"
        role="listbox"
        aria-label="Project files"
      >
        {paths.map((path) => (
          <button
            key={path}
            type="button"
            role="option"
            aria-selected={path === selected}
            onClick={() => setSelected(path)}
            title={path}
            className={cn(
              'block w-full truncate px-3 py-1 text-left font-mono text-code font-light outline-none',
              'transition-colors duration-[--duration-fast]',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
              path === selected
                ? 'bg-surface-active text-foreground'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
            )}
          >
            {path}
          </button>
        ))}
      </div>

      <div className="relative min-w-0 flex-1 overflow-auto bg-surface">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Close source"
          className="absolute right-3 top-3"
          onClick={onClose}
        >
          <X />
        </Button>

        <pre className="min-h-full whitespace-pre-wrap break-words p-6 font-mono text-code font-light leading-relaxed text-foreground">
          {files[selected] ?? ''}
        </pre>
      </div>
    </div>
  );
}
