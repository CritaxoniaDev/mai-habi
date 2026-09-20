import {
  ChevronDown,
  Command as CommandIcon,
  FilePlus,
  FolderPlus,
  PanelLeftClose,
  Play,
  RotateCw,
  SunMedium,
  X,
} from 'lucide-react';
import { FileTypeIcon } from '../../lib/file-icons';

/**
 * A static picture of the product, shown in the landing hero.
 *
 * Hand-built to mirror the real editor (apps/web/src/app/editor): the same
 * header, sidebar tabs, file tree, editor tabs, code surface and bottom panel.
 * No screenshot to go stale, no JavaScript, and it inherits the real theme, so
 * it reads correctly in light and dark. It even borrows the editor's own
 * FileTypeIcon so the tree shows the exact language marks.
 */

// One entry per line so the gutter and the active-line highlight line up. The
// caret on the active line reuses the `.habi-caret` blink from global.css.
const CODE_LINES: string[] = [
  `<span class="text-code-keyword">import</span> { useState } <span class="text-code-keyword">from</span> <span class="text-code-string">'react'</span>;`,
  ``,
  `<span class="text-code-keyword">export default function</span> <span class="text-code-type">App</span>() {`,
  `  <span class="text-code-keyword">const</span> [count, setCount] = useState(<span class="text-code-number">0</span>);<span class="habi-caret text-foreground">|</span>`,
  ``,
  `  <span class="text-code-keyword">return</span> (`,
  `    <span class="text-code-tag">&lt;button</span> onClick={() =&gt; setCount(count + <span class="text-code-number">1</span>)}<span class="text-code-tag">&gt;</span>`,
  `      Clicked {count} times`,
  `    <span class="text-code-tag">&lt;/button&gt;</span>`,
  `  );`,
  `}`,
];

const ACTIVE_LINE = 3; // the `const [count, …]` line

const FILES = [
  { name: 'App.tsx', path: 'src/App.tsx', active: true, last: false },
  { name: 'main.tsx', path: 'src/main.tsx', active: false, last: false },
  { name: 'styles.css', path: 'src/styles.css', active: false, last: true },
];

/** A ghost icon button, matching the header controls. */
function HeaderIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="hidden size-7 place-items-center rounded-md text-muted-foreground sm:grid">
      {children}
    </span>
  );
}

export default function EditorMock() {
  return (
    <div
      aria-hidden="true"
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-overlay"
    >
      {/* Header — mirrors WorkspaceHeader */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="px-1 text-secondary font-normal text-foreground">Playground</span>
        <span className="text-border-strong">/</span>
        <span className="px-1 text-secondary font-light text-foreground">counter</span>
        <span className="hidden text-label font-light text-muted-foreground sm:inline">
          Saved locally
        </span>
        <span className="hidden text-label font-light text-muted-foreground lg:inline">
          Built in 34 ms
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <HeaderIcon>
            <CommandIcon className="size-4" aria-hidden="true" />
          </HeaderIcon>
          <HeaderIcon>
            <SunMedium className="size-4" aria-hidden="true" />
          </HeaderIcon>
          <HeaderIcon>
            <RotateCw className="size-4" aria-hidden="true" />
          </HeaderIcon>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-secondary font-normal text-accent-foreground">
            <Play className="size-3.5" aria-hidden="true" />
            Open viewer
          </span>
          <span className="hidden h-8 items-center rounded-md border border-border px-3 text-secondary font-normal text-foreground sm:inline-flex">
            Share
          </span>
        </div>
      </div>

      {/* Body: explorer | (tabs + code + bottom panel) */}
      <div className="flex min-h-0 flex-1 items-stretch">
        {/* Sidebar */}
        <div className="flex w-40 shrink-0 flex-col border-r border-border sm:w-48">
          <div className="flex h-8 shrink-0 items-center gap-2 px-2">
            <span className="text-micro font-normal uppercase tracking-[0.08em] text-foreground">
              Files
            </span>
            <span className="text-micro font-normal uppercase tracking-[0.08em] text-muted-foreground">
              Search
            </span>
            <span className="ml-auto flex items-center gap-0.5 text-muted-foreground">
              <FilePlus className="size-3.5" aria-hidden="true" />
              <FolderPlus className="size-3.5" aria-hidden="true" />
              <PanelLeftClose className="size-3.5" aria-hidden="true" />
            </span>
          </div>

          <div className="min-h-0 flex-1 py-1 text-secondary font-light">
            {/* src folder */}
            <div className="flex h-7 items-center gap-1 px-1.5 text-foreground-secondary">
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              src
            </div>

            {FILES.map((file) => (
              <div
                key={file.path}
                className={`group relative flex h-7 items-center gap-1 pr-2 ${
                  file.active ? 'bg-surface-active text-foreground' : 'text-foreground-secondary'
                }`}
              >
                {file.active && (
                  <span className="absolute inset-y-0 left-0 w-0.5 bg-foreground" aria-hidden="true" />
                )}
                {/* Tree connector guide */}
                <span className="flex shrink-0 self-stretch pl-1.5" aria-hidden="true">
                  <span
                    className={`relative w-3 before:absolute before:left-1/2 before:top-0 before:w-px before:bg-border-strong before:content-[''] after:absolute after:left-1/2 after:top-1/2 after:h-px after:w-1/2 after:bg-border-strong after:content-[''] ${
                      file.last ? 'before:h-1/2' : 'before:bottom-0'
                    }`}
                  />
                </span>
                <FileTypeIcon path={file.path} className="size-3.5" />
                <span className="truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Editor + bottom panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Editor tabs */}
          <div className="flex h-9 shrink-0 items-stretch border-b border-border">
            <div className="relative flex items-center gap-2 border-r border-border bg-surface px-3 text-secondary font-light text-foreground">
              <span className="absolute inset-x-0 top-0 h-px bg-foreground" aria-hidden="true" />
              <FileTypeIcon path="src/App.tsx" className="size-3.5" />
              App.tsx
              <X className="size-3 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="hidden items-center gap-2 border-r border-border bg-background px-3 text-secondary font-light text-muted-foreground sm:flex">
              <FileTypeIcon path="src/main.tsx" className="size-3.5" />
              main.tsx
            </div>
          </div>

          {/* Code */}
          <div className="min-w-0 flex-1 overflow-x-auto bg-surface py-2 font-mono text-code leading-[1.75]">
            {CODE_LINES.map((line, i) => (
              <div key={i} className={`flex ${i === ACTIVE_LINE ? 'bg-surface-secondary/70' : ''}`}>
                <span
                  className={`w-10 shrink-0 select-none pr-3 text-right tabular-nums ${
                    i === ACTIVE_LINE ? 'text-muted-foreground' : 'text-subtle-foreground/60'
                  }`}
                >
                  {i + 1}
                </span>
                <code
                  className="whitespace-pre pr-4"
                  dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                />
              </div>
            ))}
          </div>

          {/* Bottom panel */}
          <div className="flex h-40 shrink-0 flex-col border-t border-border">
            <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-2">
              <span className="rounded-sm px-2 py-1 text-label font-light text-muted-foreground">
                Console
              </span>
              <span className="rounded-sm px-2 py-1 text-label font-light text-muted-foreground">
                Problems
              </span>
              <span className="rounded-sm bg-surface-active px-2 py-1 text-label font-light text-foreground">
                Preview
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 pr-1 text-micro text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                No problems
              </span>
            </div>

            {/*
              White on purpose: a user's project never inherits the product theme,
              so the running output does not either.
            */}
            <div className="flex min-h-0 flex-1 items-center justify-center bg-white p-6">
              <div className="flex flex-col items-center gap-2.5">
                <button className="rounded-lg border border-[color:#e5e5e5] bg-white px-4 py-2 text-secondary text-[color:#171717] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                  Clicked 3 times
                </button>
                <span className="font-mono text-micro text-[color:#8f8f8f]">click to increment</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
