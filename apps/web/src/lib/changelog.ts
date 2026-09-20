import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

/** Keep a Changelog categories, used for the badges on each entry. */
export type ChangelogKind = 'added' | 'improved' | 'fixed';

export interface ChangelogEntry {
  id: string;
  version: string;
  date: Date;
  title: string;
  summary: string;
  kinds: ChangelogKind[];
  /** Rendered HTML of the release-note body. */
  html: string;
}

// Release notes are plain markdown so a release can be written without touching
// the page that renders them. They ship inside the app bundle and are read at
// build time, so the changelog page is fully static.
const CHANGELOG_DIR = join(process.cwd(), 'src/content/changelog');

/**
 * All release notes, newest first.
 *
 * The filename orders nothing — `date` does. Same-day releases fall back to
 * version order.
 */
export function getChangelog(): ChangelogEntry[] {
  const entries = readdirSync(CHANGELOG_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(join(CHANGELOG_DIR, file), 'utf8');
      const { data, content } = matter(raw);

      return {
        id: file.replace(/\.md$/, ''),
        version: String(data.version),
        date: new Date(data.date),
        title: String(data.title),
        summary: String(data.summary),
        kinds: (data.kinds ?? []) as ChangelogKind[],
        html: marked.parse(content, { async: false }),
      };
    });

  return entries.sort(
    (a, b) =>
      b.date.getTime() - a.date.getTime() ||
      b.version.localeCompare(a.version, undefined, { numeric: true }),
  );
}
