/**
 * Path helpers for the virtual project filesystem.
 *
 * Paths are always POSIX-style and relative to the project root, with no
 * leading slash: `src/components/Button.tsx`.
 */

export function normalizePath(input: string): string {
  const collapsed = input.replace(/\\/g, '/').replace(/\/+/g, '/');
  const segments: string[] = [];

  for (const segment of collapsed.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.join('/');
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join('/'));
}

/** Resolves `relative` against the directory `base`. */
export function resolvePath(base: string, relative: string): string {
  if (relative.startsWith('/')) return normalizePath(relative);
  return normalizePath(`${base}/${relative}`);
}

export function dirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '' : normalized.slice(0, index);
}

export function basename(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index === -1 ? normalized : normalized.slice(index + 1);
}

export function extname(path: string): string {
  const name = basename(path);
  const index = name.lastIndexOf('.');
  return index <= 0 ? '' : name.slice(index).toLowerCase();
}

export function depthOf(path: string): number {
  const normalized = normalizePath(path);
  return normalized === '' ? 0 : normalized.split('/').length;
}

export function isDescendant(parent: string, candidate: string): boolean {
  if (parent === '') return candidate !== '';
  return candidate === parent || candidate.startsWith(`${parent}/`);
}

/**
 * Imported archives are untrusted. Anything that could escape the project root,
 * or that the virtual filesystem cannot represent, is rejected outright.
 */
export function isSafePath(raw: string): boolean {
  if (!raw || raw.length > 1024) return false;
  if (raw.includes('\0')) return false;
  if (/^[a-zA-Z]:[\\/]/.test(raw)) return false;
  if (raw.startsWith('/') || raw.startsWith('\\')) return false;

  const parts = raw.replace(/\\/g, '/').split('/');
  if (parts.some((part) => part === '..')) return false;

  return normalizePath(raw).length > 0;
}

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.cache',
  '.next',
  '.astro',
  '.turbo',
  '.vercel',
  '.svelte-kit',
  'coverage',
]);

const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', '.env', '.env.local']);

/** Dependencies are restored with `npm install`, never copied out of a folder. */
export function shouldIgnoreImportPath(path: string): boolean {
  const normalized = normalizePath(path);
  if (!normalized) return true;

  const segments = normalized.split('/');
  if (segments.some((segment) => IGNORED_DIRECTORIES.has(segment))) return true;

  return IGNORED_FILES.has(segments[segments.length - 1]);
}

/**
 * Archives and folder pickers usually nest everything under one directory.
 * Dropping it keeps `package.json` at the project root where the runtime
 * expects it.
 */
export function stripCommonRoot(paths: string[]): string {
  if (paths.length === 0) return '';

  const first = paths[0].split('/');
  if (first.length < 2) return '';

  const candidate = first[0];
  return paths.every((path) => path.startsWith(`${candidate}/`)) ? candidate : '';
}
