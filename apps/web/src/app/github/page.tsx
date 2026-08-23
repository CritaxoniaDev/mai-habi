import type { Metadata } from 'next';
import { SquareTerminal, Webhook } from 'lucide-react';
import AuthMenu from '../../islands/AuthMenu';
import GitHubBrowser from '../../components/github/GitHubBrowser';
import ThemeControl from '../../islands/ThemeControl';

export const metadata: Metadata = {
  title: 'Repositories',
};

/**
 * The chrome matches the dashboard so moving between the two does not feel like
 * two different products. Everything that talks to GitHub is in the island.
 */
export default function GitHubPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="z-header sticky top-0 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <a
            href="/"
            className="flex items-center gap-2.5 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground">
              <SquareTerminal className="size-4" aria-hidden="true" />
            </span>
            <span className="text-secondary font-normal text-foreground">Playground</span>
          </a>

          <div className="flex items-center gap-1">
            <a
              href="/rest"
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-label font-light text-muted-foreground outline-none transition-colors duration-[--duration-fast] hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:inline-flex"
            >
              <Webhook className="size-3.5" aria-hidden="true" />
              REST client
            </a>
            <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-border sm:block" />
            <ThemeControl />
            <AuthMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-20">
        <GitHubBrowser />
      </main>
    </div>
  );
}
