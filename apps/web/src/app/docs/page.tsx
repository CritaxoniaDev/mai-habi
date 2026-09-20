import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { getDocIndex } from '../../lib/docs/content';

export const metadata: Metadata = {
  title: { absolute: 'HABI Documentation' },
  description: 'Documentation for HABI, a code playground that compiles in your browser.',
};

export default async function DocsHome() {
  const { hero, html } = await getDocIndex();

  return (
    <div className="px-6 py-14 xl:px-10">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-micro uppercase tracking-[0.18em] text-muted-foreground">
          HABI
        </p>
        <h1 className="mt-4 text-headline font-light text-foreground">Documentation</h1>

        {hero?.tagline ? (
          <p className="mt-5 max-w-2xl text-lead font-light text-foreground-secondary">
            {hero.tagline}
          </p>
        ) : null}

        {hero && hero.actions.length > 0 ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {hero.actions.map((action, i) =>
              i === 0 ? (
                <a
                  key={action.href}
                  href={action.href}
                  className="group inline-flex h-10 items-center gap-1.5 rounded-md bg-accent pl-5 pr-4 text-body font-normal text-accent-foreground transition-colors duration-[--duration-fast] hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  {action.text}
                  <ArrowRight className="mk-nudge size-4 opacity-80" aria-hidden="true" />
                </a>
              ) : (
                <a
                  key={action.href}
                  href={action.href}
                  className="inline-flex h-10 items-center rounded-md border border-border px-5 text-body font-normal text-foreground transition-colors duration-[--duration-fast] hover:border-border-strong hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  {action.text}
                </a>
              ),
            )}
          </div>
        ) : null}

        <div
          className="doc-prose mt-14 border-t border-border pt-10"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
