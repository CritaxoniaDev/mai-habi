/**
 * Runtime configuration.
 *
 * Everything here is public by design — only values safe to ship to a browser
 * bundle belong in this file. Service keys must never appear in the app.
 *
 * The web app is built by Next.js, which inlines `process.env.NEXT_PUBLIC_*` at
 * build time. Each variable is therefore read through a literal
 * `process.env.NEXT_PUBLIC_NAME` expression — a bundler only substitutes literal
 * member access, so an indexed helper would break the inlining. The legacy Astro
 * `import.meta.env.PUBLIC_*` names are still accepted as a fallback, guarded so
 * they resolve to `undefined` (rather than throwing) under bundlers that do not
 * define `import.meta.env`.
 */

/**
 * Narrow, module-local declaration of `process` so this file type-checks in the
 * shared package (whose tsconfig pulls in no ambient Node types) without a full
 * `@types/node` dependency. Next.js inlines the literal member accesses below at
 * build time, so no real `process` object is read in the browser bundle.
 */
declare const process: { env: Record<string, string | undefined> };

/** Astro/Vite populate `import.meta.env`; Next.js leaves it undefined. */
const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

function clean(raw: string | undefined, fallback: string): string {
  return raw && raw.length > 0 ? raw.replace(/\/$/, '') : fallback;
}

/**
 * Origin the application is served from. Both modules share it.
 *
 * `*_EDITOR_ORIGIN` is accepted as well: it is what the two-app layout used
 * before the editor and the viewer became routes of one deployment.
 */
export const EDITOR_ORIGIN = clean(
  process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.NEXT_PUBLIC_EDITOR_ORIGIN ||
    viteEnv?.PUBLIC_APP_ORIGIN ||
    viteEnv?.PUBLIC_EDITOR_ORIGIN,
  'http://localhost:4321',
);

export const SUPABASE_URL = clean(
  process.env.NEXT_PUBLIC_SUPABASE_URL || viteEnv?.PUBLIC_SUPABASE_URL,
  '',
);
export const SUPABASE_ANON_KEY = clean(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || viteEnv?.PUBLIC_SUPABASE_ANON_KEY,
  '',
);

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
