import type { Metadata } from "next";
import { ArrowLeft, Webhook } from "lucide-react";
import AuthMenu from "../../islands/AuthMenu";
import GitHubBrowser from "../../components/github/GitHubBrowser";
import ThemeControl from "../../islands/ThemeControl";

export const metadata: Metadata = {
  title: "Repositories",
};

/**
 * The chrome matches the dashboard so moving between the two does not feel like
 * two different products. Everything that talks to GitHub is in the island.
 */
export default function GitHubPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="z-header flex h-12 shrink-0 items-center border-b border-border bg-surface px-3">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <a
            href="/projects"
            className="touch-target flex items-center gap-2 rounded-md px-2 text-secondary font-light text-foreground outline-none transition-colors duration-[--duration-fast] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Playground</span>
          </a>

          <span aria-hidden="true" className="-ml-1 text-border-strong">
            /
          </span>

          <span className="mr-auto truncate text-secondary font-light text-foreground">
            GitHub repositories
          </span>

          <div className="flex items-center gap-1">
            <a
              href="/rest"
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-label font-light text-muted-foreground outline-none transition-colors duration-[--duration-fast] hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:inline-flex"
            >
              <Webhook className="size-3.5" aria-hidden="true" />
              REST client
            </a>
            <span
              aria-hidden="true"
              className="mx-1 hidden h-4 w-px bg-border sm:block"
            />
            <ThemeControl />
            <AuthMenu />
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <GitHubBrowser />
      </main>
    </div>
  );
}
