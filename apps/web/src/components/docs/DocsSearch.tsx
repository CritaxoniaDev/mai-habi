"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@mai-habi/ui";
import type { SearchDoc } from "../../lib/docs/content";
import { docHref } from "../../lib/docs/nav";

const SEARCH_EXIT_DURATION_MS = 180;

interface Scored {
  doc: SearchDoc;
  score: number;
  snippet: string;
}

/** Rank a doc against the query; 0 means "no match". */
function score(doc: SearchDoc, query: string): number {
  const q = query.toLowerCase();
  const title = doc.title.toLowerCase();
  let s = 0;
  if (title.includes(q)) s += title.startsWith(q) ? 60 : 40;
  if (doc.description.toLowerCase().includes(q)) s += 15;
  for (const h of doc.headings) if (h.toLowerCase().includes(q)) s += 12;
  if (doc.text.toLowerCase().includes(q)) s += 6;
  return s;
}

/** A short excerpt of the body around the first match, for the result row. */
function snippetFor(doc: SearchDoc, query: string): string {
  const text = doc.text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return doc.description || text.slice(0, 100);
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + text.slice(start, start + 120).trim() + "…";
}

export default function DocsSearch({ docs }: { docs: SearchDoc[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openFrameRef = useRef<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSearch = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (openFrameRef.current) cancelAnimationFrame(openFrameRef.current);

    setMounted(true);
    openFrameRef.current = requestAnimationFrame(() => {
      setOpen(true);
      openFrameRef.current = null;
    });
  }, []);

  const hideSearch = useCallback(() => {
    if (openFrameRef.current) cancelAnimationFrame(openFrameRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    setOpen(false);
    triggerRef.current?.focus();
    closeTimerRef.current = setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, SEARCH_EXIT_DURATION_MS);
  }, []);

  const results = useMemo<Scored[]>(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return docs
      .map((doc) => ({
        doc,
        score: score(doc, q),
        snippet: snippetFor(doc, q),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [docs, query]);

  useEffect(() => setCursor(0), [query]);

  // ⌘K / Ctrl+K toggles the palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) hideSearch();
        else showSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hideSearch, open, showSearch]);

  useEffect(
    () => () => {
      if (openFrameRef.current) cancelAnimationFrame(openFrameRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!mounted) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (open) {
      setQuery("");
      // Focus after the dialog paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const go = useCallback(
    (slug: string) => {
      hideSearch();
      router.push(docHref(slug));
    },
    [hideSearch, router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      hideSearch();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      go(results[cursor].doc.slug);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={showSearch}
        className="flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-label font-light text-muted-foreground outline-none transition-colors duration-[--duration-fast] hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        aria-label="Search documentation"
      >
        <Search className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-border bg-surface-secondary px-1 font-mono text-micro text-subtle-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      {mounted &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-dialog overscroll-contain",
              open ? "pointer-events-auto" : "pointer-events-none",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Search documentation"
            aria-hidden={open ? undefined : true}
          >
            <div
              className={cn(
                "absolute inset-0 bg-backdrop transition-opacity duration-[--duration-normal] ease-[--ease-standard] motion-reduce:transition-none",
                open ? "opacity-100" : "opacity-0",
              )}
              aria-hidden="true"
              onMouseDown={hideSearch}
            />

            <div className="pointer-events-none absolute inset-0 flex items-start justify-center p-4 pt-[12vh]">
              <div
                className={cn(
                  "pointer-events-auto w-full max-w-xl origin-top overflow-hidden rounded-xl border border-border bg-surface shadow-overlay",
                  "transition-[opacity,transform] duration-[--duration-normal] ease-[--ease-standard] motion-reduce:transition-none motion-reduce:transform-none",
                  open
                    ? "translate-y-0 scale-100 opacity-100"
                    : "-translate-y-2 scale-[0.98] opacity-0",
                )}
                onKeyDown={onKeyDown}
              >
                <div className="flex items-center gap-2.5 border-b border-border px-4">
                  <Search
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search the docs…"
                    className="h-12 w-full bg-transparent text-body font-light text-foreground outline-none placeholder:text-subtle-foreground"
                  />
                  <kbd className="rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-mono text-micro text-subtle-foreground">
                    Esc
                  </kbd>
                </div>

                <div className="max-h-[52vh] overflow-y-auto p-2">
                  {query.trim().length < 2 ? (
                    <p className="px-3 py-6 text-center text-secondary font-light text-muted-foreground">
                      Type to search the documentation.
                    </p>
                  ) : results.length === 0 ? (
                    <p className="px-3 py-6 text-center text-secondary font-light text-muted-foreground">
                      No matches for “{query.trim()}”.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-0.5">
                      {results.map((r, i) => (
                        <li key={r.doc.slug}>
                          <button
                            type="button"
                            onClick={() => go(r.doc.slug)}
                            onMouseMove={() => setCursor(i)}
                            className={`flex w-full flex-col gap-0.5 rounded-md px-3 py-2.5 text-left outline-none ${
                              i === cursor ? "bg-surface-active" : ""
                            }`}
                          >
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="text-secondary font-normal text-foreground">
                                {r.doc.title}
                              </span>
                              <span className="shrink-0 font-mono text-micro text-subtle-foreground">
                                {r.doc.group}
                              </span>
                            </span>
                            <span className="line-clamp-1 text-label font-light text-muted-foreground">
                              {r.snippet}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
