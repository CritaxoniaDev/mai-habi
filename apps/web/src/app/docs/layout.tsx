import type { ReactNode } from 'react';
import { SquareTerminal } from 'lucide-react';
import ThemeControl from '../../islands/ThemeControl';
import DocsSidebar from '../../components/docs/DocsSidebar';
import MobileSidebar from '../../components/docs/MobileSidebar';
import DocsSearch from '../../components/docs/DocsSearch';
import { getSearchIndex } from '../../lib/docs/content';

/**
 * Chrome for the documentation — a sticky top bar, the section sidebar, and the
 * page. Rendered on the server; the sidebar, search and appearance control are
 * the only interactive pieces.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  const searchDocs = getSearchIndex();

  return (
    <div className="min-h-screen bg-background">
      <header className="z-header sticky top-0 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-4 px-6">
          <a
            href="/docs"
            className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
            aria-label="HABI documentation home"
          >
            <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground transition-transform duration-[--duration-normal] ease-[--ease-standard] group-hover:-rotate-6">
              <SquareTerminal className="size-4" aria-hidden="true" />
            </span>
            <span className="text-body font-normal tracking-[0.18em] text-foreground">HABI</span>
            <span className="rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-micro text-muted-foreground">
              docs
            </span>
          </a>

          <div className="ml-auto flex items-center gap-2.5">
            <DocsSearch docs={searchDocs} />
            <span aria-hidden="true" className="hidden h-4 w-px bg-border sm:block" />
            <a
              href="/"
              className="hidden rounded-sm px-1 text-secondary font-light text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:inline"
            >
              Back to HABI
            </a>
            <ThemeControl />
            <a
              href="/projects"
              className="hidden h-8 items-center rounded-md bg-accent px-3.5 text-secondary font-normal text-accent-foreground transition-colors duration-[--duration-fast] hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:inline-flex"
            >
              Open playground
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[90rem] grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-border lg:block">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-8">
            <DocsSidebar />
          </div>
        </aside>

        <div className="min-w-0">
          <MobileSidebar />
          {children}
        </div>
      </div>
    </div>
  );
}
