import type { FileMap } from '@mai-habi/types';

/**
 * Project-wide text search.
 *
 * Monaco owns Cmd+F within the open file; this is the other half — finding a
 * keyword across every file without opening them. It runs over the in-memory
 * `FileMap`, so there is no index to build or keep fresh, and a project is
 * capped at 500 files and 12MB, which a linear scan handles in a few
 * milliseconds.
 */

export interface SearchMatch {
  path: string;
  /** 1-based, to match what the editor and the problems panel show. */
  line: number;
  column: number;
  /** The whole line, for context. Trimmed of leading blanks for display. */
  text: string;
  /** Offset of the match inside `text`, after trimming. */
  start: number;
  length: number;
}

export interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  regex: boolean;
}

export interface SearchOutcome {
  matches: SearchMatch[];
  /** Files that contained at least one match, in the order first seen. */
  files: string[];
  /** True when a cap was hit and the result is partial. */
  truncated: boolean;
  /** A malformed pattern, reported rather than thrown. */
  error: string | null;
}

/** Enough to be useful, few enough that the panel stays responsive. */
const MAX_MATCHES = 500;
const MAX_PER_FILE = 50;
/** Long minified lines are useless as context and expensive to render. */
const MAX_LINE_LENGTH = 400;

const EMPTY: SearchOutcome = { matches: [], files: [], truncated: false, error: null };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPattern(options: SearchOptions): RegExp | { error: string } {
  const flags = options.caseSensitive ? 'g' : 'gi';
  const source = options.regex ? options.query : escapeRegex(options.query);

  try {
    return new RegExp(source, flags);
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : 'Invalid pattern.' };
  }
}

export function searchProject(files: FileMap, options: SearchOptions): SearchOutcome {
  const query = options.query;
  if (query.length === 0) return EMPTY;

  const pattern = buildPattern(options);
  if ('error' in pattern) return { ...EMPTY, error: pattern.error };

  /*
   * An empty-matching pattern (`a*`, `^`) would advance zero characters and
   * spin forever. Rejecting it is clearer than silently returning nothing.
   */
  if (pattern.test('')) {
    return { ...EMPTY, error: 'That pattern matches an empty string.' };
  }

  const matches: SearchMatch[] = [];
  const withMatches: string[] = [];
  let truncated = false;

  // Sorted so results are stable between runs rather than following map order.
  const paths = Object.keys(files).sort((a, b) => a.localeCompare(b));

  for (const path of paths) {
    if (matches.length >= MAX_MATCHES) {
      truncated = true;
      break;
    }

    const node = files[path];
    // Directories have no content, and base64 payloads are not text.
    if (node.type !== 'file' || node.encoding !== 'utf8') continue;

    const lines = node.content.split('\n');
    let inFile = 0;

    for (let index = 0; index < lines.length; index += 1) {
      if (inFile >= MAX_PER_FILE || matches.length >= MAX_MATCHES) {
        truncated = true;
        break;
      }

      const raw = lines[index];
      if (raw.length > MAX_LINE_LENGTH * 4) continue;

      // A fresh lastIndex per line; the pattern is global and reused.
      pattern.lastIndex = 0;

      let found = pattern.exec(raw);
      while (found !== null) {
        const leading = raw.length - raw.trimStart().length;
        const display = raw.trim().slice(0, MAX_LINE_LENGTH);

        matches.push({
          path,
          line: index + 1,
          column: found.index + 1,
          text: display,
          start: Math.max(0, found.index - leading),
          length: found[0].length,
        });

        if (withMatches[withMatches.length - 1] !== path) {
          if (!withMatches.includes(path)) withMatches.push(path);
        }

        inFile += 1;
        if (inFile >= MAX_PER_FILE || matches.length >= MAX_MATCHES) {
          truncated = true;
          break;
        }

        // Guard against a pattern that can match empty at a later position.
        if (pattern.lastIndex === found.index) pattern.lastIndex += 1;
        found = pattern.exec(raw);
      }
    }
  }

  return { matches, files: withMatches, truncated, error: null };
}
