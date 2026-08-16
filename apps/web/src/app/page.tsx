import type { Metadata } from 'next';
import { Boxes, Cpu, Share2, SquareTerminal, Webhook } from 'lucide-react';
import AuthMenu from '../islands/AuthMenu';
import DashboardActions from '../islands/DashboardActions';
import ProjectList from '../islands/ProjectList';
import ThemeControl from '../islands/ThemeControl';
import MigrationPrompt from '../islands/MigrationPrompt';

export const metadata: Metadata = {
  // The root-segment page sits alongside the layout that defines the title
  // template, so the template does not apply here — set the full title outright.
  title: { absolute: 'Projects — Playground' },
};

/**
 * What the playground is, in three lines. Static content, so it lives in the
 * server-rendered chrome rather than an island.
 */
const FEATURES = [
  {
    icon: Cpu,
    title: 'Compiles locally',
    body: 'esbuild and your code run in the browser — no servers, no build queue, no waiting.',
  },
  {
    icon: Share2,
    title: 'Share with a link',
    body: 'Send a live preview. Small projects travel inside the URL itself.',
  },
  {
    icon: Boxes,
    title: 'Start anywhere',
    body: 'React, Next.js, or plain HTML — from a template or an imported project.',
  },
];

/*
 * A Server Component: the chrome (header, hero, footer) is rendered to HTML on
 * the server with no client JS. The interactive widgets are client components —
 * they still server-render their initial frame (skeletons, buttons, the "Sign
 * in" affordance) and then hydrate to read the browser's project store and
 * session. No Monaco, compiler or WebAssembly loads on this page.
 */
export default function ProjectsPage() {
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
        <section className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6 pt-14">
          <div className="max-w-2xl">
            <p className="text-micro font-normal uppercase tracking-[0.12em] text-muted-foreground">
              Browser playground
            </p>
            <h1 className="mt-3 text-page font-light">Projects</h1>
            <p className="mt-2 max-w-xl text-body font-light text-muted-foreground">
              Write HTML, CSS, JavaScript, React or Next.js in the browser — compiled on your
              machine and shared with a link.
            </p>
          </div>
          <DashboardActions />
        </section>

        <ProjectList />
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground">
                  <feature.icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-secondary font-normal text-foreground">{feature.title}</p>
                  <p className="mt-1 text-label font-light leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <p className="text-label font-light text-muted-foreground">
              Projects are stored in this browser. Sign in only if you want them somewhere else.
            </p>
            <a
              href="/rest"
              className="inline-flex items-center gap-1.5 rounded-sm text-label font-light text-muted-foreground outline-none transition-colors duration-[--duration-fast] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <Webhook className="size-3.5" aria-hidden="true" />
              Open the REST client
            </a>
          </div>
        </div>
      </footer>

      <MigrationPrompt />
    </div>
  );
}
