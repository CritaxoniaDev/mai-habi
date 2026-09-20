import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getDoc } from '../../../lib/docs/content';
import { docHref, flatDocs, getAdjacent } from '../../../lib/docs/nav';
import DocsToc from '../../../components/docs/DocsToc';

interface Params {
  slug: string[];
}

export function generateStaticParams() {
  return flatDocs().map((doc) => ({ slug: doc.slug.split('/') }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const slug = (await params).slug.join('/');
  const entry = flatDocs().find((d) => d.slug === slug);
  if (!entry) return {};
  const doc = await getDoc(slug);
  return {
    title: { absolute: `${doc.title} — HABI Docs` },
    description: doc.description || undefined,
  };
}

export default async function DocPage({ params }: { params: Promise<Params> }) {
  const slug = (await params).slug.join('/');
  const entry = flatDocs().find((d) => d.slug === slug);
  if (!entry) notFound();

  const doc = await getDoc(slug);
  const { prev, next } = getAdjacent(slug);

  return (
    <div className="grid grid-cols-1 gap-x-12 px-6 py-10 xl:grid-cols-[minmax(0,1fr)_14rem] xl:px-10">
      <article className="min-w-0 max-w-3xl">
        <header>
          <p className="font-mono text-micro uppercase tracking-[0.16em] text-muted-foreground">
            {entry.group}
          </p>
          <h1 className="mt-3 text-page font-light tracking-tight text-foreground">{doc.title}</h1>
          {doc.description ? (
            <p className="mt-3 text-lead font-light text-foreground-secondary">{doc.description}</p>
          ) : null}
        </header>

        <div
          className="doc-prose mt-9 border-t border-border pt-9"
          dangerouslySetInnerHTML={{ __html: doc.html }}
        />

        {(prev || next) && (
          <nav
            aria-label="Pagination"
            className="mt-16 grid gap-4 border-t border-border pt-8 sm:grid-cols-2"
          >
            {prev ? (
              <a
                href={docHref(prev.slug)}
                className="group flex flex-col gap-1 rounded-lg border border-border p-4 transition-colors duration-[--duration-fast] hover:border-border-strong hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                <span className="inline-flex items-center gap-1 text-label font-light text-muted-foreground">
                  <ArrowLeft className="size-3.5" aria-hidden="true" /> Previous
                </span>
                <span className="text-secondary font-normal text-foreground">{prev.label}</span>
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a
                href={docHref(next.slug)}
                className="group flex flex-col items-end gap-1 rounded-lg border border-border p-4 text-right transition-colors duration-[--duration-fast] hover:border-border-strong hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:col-start-2"
              >
                <span className="inline-flex items-center gap-1 text-label font-light text-muted-foreground">
                  Next <ArrowRight className="mk-nudge size-3.5" aria-hidden="true" />
                </span>
                <span className="text-secondary font-normal text-foreground">{next.label}</span>
              </a>
            ) : null}
          </nav>
        )}
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto py-1">
          <DocsToc items={doc.toc} />
        </div>
      </aside>
    </div>
  );
}
