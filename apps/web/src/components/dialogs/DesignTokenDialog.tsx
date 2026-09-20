import { useMemo } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  cn,
  toast,
} from '@mai-habi/ui';
import { Copy, Palette } from 'lucide-react';
import { useUi } from '../../state/ui';
import { useWorkspace } from '../../state/workspace';
import {
  extractDesignTokens,
  type DesignToken,
  type DesignTokenCategory,
} from '../../lib/design-tokens';

const GROUPS: Array<{
  id: DesignTokenCategory;
  label: string;
  description: string;
}> = [
  {
    id: 'colors',
    label: 'Colors',
    description: 'Fills, text, borders, and custom properties',
  },
  {
    id: 'spacing',
    label: 'Spacing',
    description: 'Gaps, padding, margins, and layout lengths',
  },
  {
    id: 'fonts',
    label: 'Fonts',
    description: 'Font families and typography variables',
  },
  { id: 'radii', label: 'Radii', description: 'Corner treatments' },
  { id: 'shadows', label: 'Shadows', description: 'Box and text elevation' },
];

export function DesignTokenDialog() {
  const open = useUi((state) => state.dialog === 'design-tokens');
  const setDialog = useUi((state) => state.setDialog);
  const files = useWorkspace((state) => state.files);
  const report = useMemo(() => extractDesignTokens(files), [files]);
  const total = GROUPS.reduce(
    (count, group) => count + report[group.id].length,
    0,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => setDialog(next ? 'design-tokens' : null)}
    >
      <DialogContent className="flex max-h-[88vh] max-w-7xl flex-col">
        <DialogHeader>
          <DialogTitle>Design token explorer</DialogTitle>
          <DialogDescription>
            A generated style guide from declarations in this project’s CSS
            files. Repeated values are grouped so the underlying system is
            easier to see.
          </DialogDescription>
        </DialogHeader>

        {total === 0 ? (
          <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border px-6 text-center">
            <div>
              <Palette
                className="mx-auto size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 text-secondary font-normal text-foreground">
                No tokens found
              </p>
              <p className="mt-1 max-w-sm text-label font-light text-muted-foreground">
                Add declarations to a CSS, SCSS, Sass, or Less file. Colors,
                spacing, fonts, radii, and shadows will appear here
                automatically.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              {GROUPS.map((group) => (
                <TokenGroup
                  key={group.id}
                  category={group.id}
                  label={group.label}
                  description={group.description}
                  tokens={report[group.id]}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TokenGroup({
  category,
  label,
  description,
  tokens,
}: {
  category: DesignTokenCategory;
  label: string;
  description: string;
  tokens: DesignToken[];
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-surface',
        category === 'colors' && 'md:col-span-2',
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border bg-surface-secondary px-4 py-3">
        <div>
          <h3 className="text-panel font-normal text-foreground">{label}</h3>
          <p className="mt-0.5 text-micro font-light text-muted-foreground">
            {description}
          </p>
        </div>
        <Badge tone="neutral">{tokens.length}</Badge>
      </header>

      {tokens.length === 0 ? (
        <p className="px-4 py-6 text-center text-label font-light text-muted-foreground">
          None detected
        </p>
      ) : (
        <ul className={cn('grid', category === 'colors' && 'sm:grid-cols-2')}>
          {tokens.map((token) => (
            <TokenRow
              key={token.value.toLowerCase()}
              category={category}
              token={token}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TokenRow({
  category,
  token,
}: {
  category: DesignTokenCategory;
  token: DesignToken;
}) {
  const copy = async () => {
    await navigator.clipboard.writeText(token.value);
    toast.success('Token copied', { description: token.value });
  };

  return (
    <li className="group flex min-w-0 items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
      <TokenSample category={category} value={token.value} />
      <div className="min-w-0 flex-1">
        <p
          className="truncate font-mono text-code text-foreground"
          title={token.value}
        >
          {token.value}
        </p>
        <p className="mt-0.5 truncate text-micro font-light text-muted-foreground">
          {token.properties.join(', ')} · {token.uses} use
          {token.uses === 1 ? '' : 's'} · {token.files.length} file
          {token.files.length === 1 ? '' : 's'}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Copy ${token.value}`}
        className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        onClick={() => void copy()}
      >
        <Copy />
      </Button>
    </li>
  );
}

function TokenSample({
  category,
  value,
}: {
  category: DesignTokenCategory;
  value: string;
}) {
  if (category === 'colors') {
    return (
      <span
        className="size-8 shrink-0 rounded-md border border-border bg-surface-secondary"
        style={{ background: value }}
        aria-hidden="true"
      />
    );
  }
  if (category === 'radii') {
    return (
      <span
        className="size-8 shrink-0 border border-border-strong bg-surface-secondary"
        style={{ borderRadius: value }}
        aria-hidden="true"
      />
    );
  }
  if (category === 'shadows') {
    return (
      <span
        className="size-8 shrink-0 rounded-md border border-border bg-surface"
        style={{ boxShadow: value }}
        aria-hidden="true"
      />
    );
  }
  if (category === 'fonts') {
    return (
      <span
        className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface-secondary text-body text-foreground"
        style={{ fontFamily: value }}
        aria-hidden="true"
      >
        Aa
      </span>
    );
  }
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface-secondary"
      aria-hidden="true"
    >
      <span
        className="h-1 max-w-6 rounded-full bg-foreground"
        style={{ width: value }}
      />
    </span>
  );
}
