import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, cn } from '@mai-habi/ui';
import {
  CaseSensitive,
  ChevronDown,
  ChevronRight,
  FoldVertical,
  Regex,
  Search,
  UnfoldVertical,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../state/workspace';
import type { SearchMatch } from '../../lib/project-search';
import { FileTypeIcon } from '../../lib/file-icons';

/** Long enough that a fast typist does not trigger a scan per character. */
const DEBOUNCE_MS = 140;

function basename(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? path : path.slice(index + 1);
}

function dirname(path: string): string {
  const index = path.lastIndexOf('/');
  return index <= 0 ? '' : path.slice(0, index);
}

/** The matched run, marked inside its line of context. */
function Highlighted({ match }: { match: SearchMatch }) {
  const before = match.text.slice(0, match.start);
  const hit = match.text.slice(match.start, match.start + match.length);
  const after = match.text.slice(match.start + match.length);

  return (
    <span className="truncate font-mono text-code">
      {before}
      <mark className="rounded-[2px] bg-warning-surface px-0.5 text-foreground">{hit}</mark>
      {after}
    </span>
  );
}

/**
 * Project-wide search, in the sidebar beside the file tree.
 *
 * Monaco already owns Cmd+F inside the open file, so this covers the other
 * half: a keyword across every file, grouped by the files that matched.
 *
 * Laid out for a narrow column — the field, its options and the summary each
 * take a row rather than competing for one. Vertical space is the cheap axis
 * here; horizontal is not.
 */
export function SearchPanel() {
  const search = useWorkspace((state) => state.search);
  const activeTab = useWorkspace((state) => state.activeTab);
  const input = useRef<HTMLInputElement>(null);

  /* Local, so typing stays responsive; the store holds the committed query. */
  const [draft, setDraft] = useState(search.query);

  useEffect(() => {
    input.current?.focus();
    // Focus once on mount, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (draft === search.query) return;

    const timer = setTimeout(() => useWorkspace.getState().setSearch({ query: draft }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, search.query]);

  const grouped = useMemo(() => {
    const byFile = new Map<string, SearchMatch[]>();
    for (const match of search.matches) {
      const list = byFile.get(match.path);
      if (list) list.push(match);
      else byFile.set(match.path, [match]);
    }
    return [...byFile.entries()];
  }, [search.matches]);

  /* Every group shut means the next press should open them again. */
  const allCollapsed = search.files.length > 0 && search.collapsed.length >= search.files.length;

  const summary = search.error
    ? search.error
    : search.query.length === 0
      ? 'Search every file in this project.'
      : search.matches.length === 0
        ? 'No matches.'
        : `${search.matches.length} ${search.matches.length === 1 ? 'match' : 'matches'} in ` +
          `${search.files.length} ${search.files.length === 1 ? 'file' : 'files'}` +
          (search.truncated ? ' (partial)' : '');

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-1.5 border-b border-border px-2 pb-2">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setDraft('');
            }}
            placeholder="Search"
            aria-label="Search every file in this project"
            className="h-7 pl-7 pr-7"
          />
          {draft && (
            <button
              type="button"
              onClick={() => {
                setDraft('');
                input.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground outline-none transition-colors duration-[--duration-fast] hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Match case"
            aria-pressed={search.caseSensitive}
            className={cn(search.caseSensitive && 'bg-surface-active text-foreground')}
            onClick={() =>
              useWorkspace.getState().setSearch({ caseSensitive: !search.caseSensitive })
            }
          >
            <CaseSensitive />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Use a regular expression"
            aria-pressed={search.regex}
            className={cn(search.regex && 'bg-surface-active text-foreground')}
            onClick={() => useWorkspace.getState().setSearch({ regex: !search.regex })}
          >
            <Regex />
          </Button>

          {search.files.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto"
              aria-label={allCollapsed ? 'Expand all files' : 'Collapse all files'}
              onClick={() => useWorkspace.getState().setSearchCollapsed(!allCollapsed)}
            >
              {allCollapsed ? <UnfoldVertical /> : <FoldVertical />}
            </Button>
          )}
        </div>

        {/* Announced, so the result count reaches a screen reader as it changes. */}
        <p
          aria-live="polite"
          className={cn(
            'text-micro font-light',
            search.error ? 'text-danger' : 'text-muted-foreground',
          )}
        >
          {summary}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {grouped.map(([path, matches]) => {
          const open = !search.collapsed.includes(path);

          return (
            <div key={path}>
              {/*
                The whole heading toggles, which is a bigger target than a
                chevron alone and is what a file row in a tree behaves like.
              */}
              <button
                type="button"
                aria-expanded={open}
                onClick={() => useWorkspace.getState().toggleSearchFile(path)}
                title={path}
                className={cn(
                  'sticky top-0 z-10 flex w-full items-center gap-1.5 bg-surface px-2 py-1.5 text-left',
                  'outline-none transition-colors duration-[--duration-fast]',
                  'hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                )}
              >
                {open ? (
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <FileTypeIcon path={path} className="size-3.5" />
                <span
                  className={cn(
                    'shrink-0 text-label font-normal text-foreground',
                    path === activeTab && 'underline decoration-border-strong underline-offset-4',
                  )}
                >
                  {basename(path)}
                </span>
                {dirname(path) && (
                  <span className="truncate text-micro font-light text-muted-foreground">
                    {dirname(path)}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-micro font-light tabular-nums text-muted-foreground">
                  {matches.length}
                </span>
              </button>

              {open && (
                <ul>
                  {matches.map((match) => (
                    <li key={`${match.line}:${match.column}`}>
                      <button
                        type="button"
                        onClick={() =>
                          useWorkspace.getState().reveal(match.path, match.line, match.column)
                        }
                        title={`${match.path}:${match.line}`}
                        className={cn(
                          'flex w-full items-baseline gap-2 py-0.5 pl-4 pr-2 text-left outline-none',
                          'transition-colors duration-[--duration-fast]',
                          'hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                        )}
                      >
                        <span className="w-6 shrink-0 text-right text-micro font-light tabular-nums text-muted-foreground">
                          {match.line}
                        </span>
                        <Highlighted match={match} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
