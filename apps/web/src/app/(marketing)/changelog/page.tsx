import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getChangelog, type ChangelogKind } from "../../../lib/changelog";

const appHref = "/projects";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "What has changed in HABI: the browser code playground that compiles on your own machine.",
};

const KIND_LABEL: Record<ChangelogKind, string> = {
  added: "Added",
  improved: "Improved",
  fixed: "Fixed",
};

// A dot carries the category; the label stays in the calm foreground palette.
const KIND_DOT: Record<ChangelogKind, string> = {
  added: "bg-success",
  improved: "bg-border-strong",
  fixed: "bg-warning",
};

const dateFormat = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function ChangelogPage() {
  const releases = getChangelog();

  return (
    <>
      <section className="mx-auto max-w-4xl px-6 pb-14 pt-16 sm:pt-20">
        <div className="flex items-center gap-3 font-mono text-micro uppercase tracking-[0.18em] text-muted-foreground">
          <span aria-hidden="true" className="h-px w-8 bg-border-strong" />
          <span>Changelog</span>
        </div>

        <h1 className="mt-5 max-w-2xl text-headline font-light text-foreground">
          What has changed
        </h1>

        <p className="mt-5 max-w-2xl text-body font-light text-foreground-secondary">
          HABI is pre-release, so versions below are development milestones
          rather than published packages. Everything listed is in the product
          today.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        {releases.length === 0 ? (
          <p className="border-t border-border py-12 text-body font-light text-muted-foreground">
            Nothing released yet.
          </p>
        ) : (
          <ol className="relative">
            {releases.map(
              ({ id, version, date, title, summary, kinds, html }, i) => (
                <li
                  key={id}
                  className={`relative pb-14 pl-7 last:pb-0 sm:pl-9 ${
                    i === releases.length - 1
                      ? "border-l border-transparent"
                      : "border-l border-border"
                  }`}
                >
                  {/* Node on the rule. */}
                  <span
                    aria-hidden="true"
                    className="absolute -left-[6px] top-1 size-3 rounded-full border-2 border-background bg-border-strong"
                  />

                  <article
                    className="grid gap-4 md:grid-cols-[10rem_1fr] md:gap-10"
                    aria-labelledby={`release-${id}`}
                  >
                    <div className="md:sticky md:top-20 md:self-start md:pt-0.5">
                      <p className="font-mono text-body text-foreground">
                        {version}
                      </p>
                      <time
                        className="mt-1 block text-label font-light text-muted-foreground"
                        dateTime={date.toISOString().slice(0, 10)}
                      >
                        {dateFormat.format(date)}
                      </time>

                      {kinds.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {kinds.map((kind) => (
                            <li
                              key={kind}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-micro font-light text-foreground-secondary"
                            >
                              <span
                                aria-hidden="true"
                                className={`size-1.5 rounded-full ${KIND_DOT[kind]}`}
                              />
                              {KIND_LABEL[kind]}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2
                        id={`release-${id}`}
                        className="text-section font-light tracking-tight text-foreground"
                      >
                        {title}
                      </h2>

                      <p className="mt-2 text-body font-light text-muted-foreground">
                        {summary}
                      </p>

                      <div
                        className="release-notes mt-6 text-secondary font-light"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    </div>
                  </article>
                </li>
              ),
            )}
          </ol>
        )}
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-surface-secondary/50 px-6 py-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-section font-light text-foreground">
                Try the latest
              </h2>
              <p className="mt-1.5 text-body font-light text-muted-foreground">
                Everything above is live. Nothing to install, nothing to sign up
                for.
              </p>
            </div>
            <a
              href={appHref}
              className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-accent pl-5 pr-4 text-body font-normal text-accent-foreground transition-colors duration-[--duration-fast] hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              Open the playground
              <ArrowRight
                className="mk-nudge size-4 opacity-80"
                aria-hidden="true"
              />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
