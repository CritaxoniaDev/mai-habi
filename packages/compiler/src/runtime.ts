/**
 * The platform's controlled dependency set.
 *
 * Projects get React and a small curated shelf of libraries without installing
 * anything, and nothing else. There is no registry, no node_modules and no
 * install step anywhere in this product.
 *
 * Everything here is staged into `/runtime` by `scripts/sync-runtime.mjs`, built
 * in a single pass with code splitting so a library that needs React shares the
 * very same React chunk a project imports. The preview wires the specifiers up
 * with an import map, so a module is only fetched when something imports it — a
 * project that never touches motion never downloads it.
 */

export const RUNTIME_BASE = '/runtime';

/** Bare specifiers a project is allowed to import. */
export const ALLOWED_PACKAGES: Record<string, string> = {
  react: `${RUNTIME_BASE}/react.production.js`,
  'react/jsx-runtime': `${RUNTIME_BASE}/react-jsx-runtime.production.js`,
  'react/jsx-dev-runtime': `${RUNTIME_BASE}/react-jsx-runtime.production.js`,
  'react-dom': `${RUNTIME_BASE}/react-dom.production.js`,
  'react-dom/client': `${RUNTIME_BASE}/react-dom-client.production.js`,
  scheduler: `${RUNTIME_BASE}/scheduler.production.js`,

  /* Animation. `framer-motion` is the same API under its older name. */
  motion: `${RUNTIME_BASE}/motion.js`,
  'motion/react': `${RUNTIME_BASE}/motion-react.js`,
  'framer-motion': `${RUNTIME_BASE}/motion-react.js`,

  /* Smooth scrolling. */
  lenis: `${RUNTIME_BASE}/lenis.js`,
  'lenis/react': `${RUNTIME_BASE}/lenis-react.js`,

  /* Small utilities that show up in almost every component. */
  clsx: `${RUNTIME_BASE}/clsx.js`,
  zustand: `${RUNTIME_BASE}/zustand.js`,
};

/**
 * What a person is told they can import.
 *
 * `scheduler` and the JSX runtimes are React's own plumbing rather than
 * something anyone imports on purpose, so they are left out of the message.
 */
export const PUBLIC_PACKAGES = [
  'react',
  'react-dom',
  'motion',
  'framer-motion',
  'lenis',
  'clsx',
  'zustand',
] as const;

export const WASM_URL = '/wasm/esbuild.wasm';

export const TAILWIND_URL = `${RUNTIME_BASE}/tailwind-browser.js`;

export function isAllowedPackage(specifier: string): boolean {
  return specifier in ALLOWED_PACKAGES;
}

/** The package a specifier belongs to, so a deep import reports its root. */
export function packageRootOf(specifier: string): string {
  return specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];
}

/**
 * The message shown when a project imports something the playground cannot
 * provide. It names the package and lists what is available, so the error is
 * actionable rather than just a refusal.
 */
export function unsupportedImportMessage(specifier: string): string {
  const root = packageRootOf(specifier);

  // A known package reached by an unknown subpath is a different mistake.
  if (PUBLIC_PACKAGES.includes(root as (typeof PUBLIC_PACKAGES)[number])) {
    return (
      `"${specifier}" is not one of the entry points this playground provides for ` +
      `"${root}". Available: ${Object.keys(ALLOWED_PACKAGES)
        .filter((name) => packageRootOf(name) === root)
        .join(', ')}.`
    );
  }

  return (
    `External package "${root}" is not available in this playground. ` +
    `Available packages: ${PUBLIC_PACKAGES.join(', ')}.`
  );
}
