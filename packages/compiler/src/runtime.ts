/**
 * The platform's controlled dependency set.
 *
 * Projects get React without installing anything, and nothing else. Arbitrary
 * npm packages are rejected by design — there is no registry, no node_modules
 * and no install step anywhere in this product.
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
};

export const WASM_URL = '/wasm/esbuild.wasm';

export const TAILWIND_URL = `${RUNTIME_BASE}/tailwind-browser.js`;

export function isAllowedPackage(specifier: string): boolean {
  return specifier in ALLOWED_PACKAGES;
}

/**
 * The message shown when a project imports something the playground cannot
 * provide. It names the package so the error is actionable.
 */
export function unsupportedImportMessage(specifier: string): string {
  const root = specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];

  return (
    `External package "${root}" is not available in this playground. ` +
    'Only react and react-dom are provided.'
  );
}
