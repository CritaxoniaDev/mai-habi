import type { ReactNode } from "react";
import { ArrowUpRight, SquareTerminal } from "lucide-react";
import ThemeControl from "../../islands/ThemeControl";

// Everything is one app now: the playground at /projects, docs at /docs.
const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#limits", label: "Limits" },
  { href: "/changelog", label: "Changelog" },
  { href: "/docs", label: "Docs" },
];

/**
 * Chrome for the public marketing surfaces — the landing page (/) and the
 * changelog. The interactive editor and dashboard have their own chrome, so
 * this header/footer stays scoped to the (marketing) route group rather than
 * living in the root layout.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-header focus:rounded-md focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-secondary"
      >
        Skip to content
      </a>

      <header className="z-header sticky top-0 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
          <a
            href="/"
            className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
            aria-label="HABI home"
          >
            <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground transition-transform duration-[--duration-normal] ease-[--ease-standard] group-hover:-rotate-6">
              <SquareTerminal className="size-4" aria-hidden="true" />
            </span>
            <span className="text-body font-normal tracking-[0.18em] text-foreground">
              HABI
            </span>
          </a>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 md:flex"
          >
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="mk-navlink rounded-sm text-secondary text-muted-foreground outline-none transition-colors duration-[--duration-fast] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <ThemeControl />
            <a
              href="/projects"
              className="group inline-flex h-8 items-center gap-1.5 rounded-md bg-accent pl-3.5 pr-3 text-secondary font-normal text-accent-foreground transition-colors duration-[--duration-fast] hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              Open playground
              <ArrowUpRight
                className="mk-nudge size-3.5 opacity-80"
                aria-hidden="true"
              />
            </a>
          </div>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="border-t border-border bg-surface-secondary/40">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground">
                  <SquareTerminal className="size-4" aria-hidden="true" />
                </span>
                <span className="text-body font-normal tracking-[0.18em] text-foreground">
                  HABI
                </span>
              </div>
              <p className="mt-3 text-label font-light leading-relaxed text-muted-foreground">
                A browser workspace for frontends, API experiments and
                user-owned backend services. Build locally, then deploy only
                when you choose.
              </p>
            </div>

            <nav
              aria-label="Footer"
              className="grid grid-cols-2 gap-x-12 gap-y-2.5 sm:grid-cols-3"
            >
              <a
                href="/projects"
                className="rounded-sm text-label text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Playground
              </a>
              <a
                href="/changelog"
                className="rounded-sm text-label text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Changelog
              </a>
              <a
                href="/docs"
                className="rounded-sm text-label text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Documentation
              </a>
              <a
                href="/docs/reference/security"
                className="rounded-sm text-label text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Security
              </a>
              <a
                href="/rest"
                className="rounded-sm text-label text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                REST client
              </a>
              <a
                href="/api-builder"
                className="rounded-sm text-label text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                API Builder
              </a>
            </nav>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <p className="text-micro font-light text-subtle-foreground">
              © {year} HABI
            </p>
            <p className="font-mono text-micro text-subtle-foreground">
              Compiled locally · esbuild-wasm
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
