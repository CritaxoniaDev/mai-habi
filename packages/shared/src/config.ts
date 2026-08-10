/// <reference types="vite/client" />

/**
 * Runtime configuration.
 *
 * Everything here is public by design — only values safe to ship to a browser
 * bundle belong in this file. Service keys must never appear in the app.
 *
 * Each variable is read through a literal `import.meta.env.NAME` expression:
 * Vite substitutes those at build time and refuses dynamic lookups, so an
 * indexed helper would break both the dev server and the bundle.
 */

function clean(raw: string | undefined, fallback: string): string {
  return raw && raw.length > 0 ? raw.replace(/\/$/, '') : fallback;
}

/**
 * Origin the application is served from. Both modules share it.
 *
 * `PUBLIC_EDITOR_ORIGIN` is accepted as well: it is what the two-app layout
 * used before the editor and the viewer became routes of one deployment.
 */
export const EDITOR_ORIGIN = clean(
  import.meta.env.PUBLIC_APP_ORIGIN || import.meta.env.PUBLIC_EDITOR_ORIGIN,
  'http://localhost:4321',
);

export const SUPABASE_URL = clean(import.meta.env.PUBLIC_SUPABASE_URL, '');
export const SUPABASE_ANON_KEY = clean(import.meta.env.PUBLIC_SUPABASE_ANON_KEY, '');

/** Accounts, cross-device sync and durable share links stay off without these. */
export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const LIMITS = {
  /** Rejects oversized single files during import. */
  maxFileSize: 2 * 1024 * 1024,
  /** Rejects oversized projects during import. */
  maxProjectSize: 12 * 1024 * 1024,
  maxFileCount: 500,
  maxFolderDepth: 16,
  /** Above this a share needs a database row instead of a link payload. */
  maxInlineShareBytes: 1_400_000,
} as const;

export const GUEST_SHARE_EXPIRY_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
] as const;

export function editorProjectUrl(projectId: string): string {
  return `${EDITOR_ORIGIN}/editor/${projectId}`;
}

export function viewerProjectUrl(projectId: string): string {
  return `${EDITOR_ORIGIN}/view/${projectId}`;
}

export function viewerSharedUrl(shareId: string): string {
  return `${EDITOR_ORIGIN}/view/${shareId}`;
}
