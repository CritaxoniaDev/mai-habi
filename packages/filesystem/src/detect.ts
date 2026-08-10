import type { FileMap } from '@mai-habi/types';
import { readFile } from './operations';

/**
 * There is no package.json in this product, so a project is described by its
 * files alone: an entry module, some components, some CSS.
 */

const ENTRY_CANDIDATES = [
  'index.html',
  'src/index.html',
  'src/main.tsx',
  'src/main.jsx',
  'src/index.tsx',
  'src/index.jsx',
  'src/main.ts',
  'src/main.js',
  'main.tsx',
  'main.jsx',
  'index.tsx',
  'index.jsx',
  'index.js',
  'main.js',
];

const ROOT_COMPONENTS = ['src/App.tsx', 'src/App.jsx', 'App.tsx', 'App.jsx'];

/** The module the compiler starts from. */
export function detectEntryFile(files: FileMap, configured?: string): string | null {
  if (configured && readFile(files, configured)) return configured;

  for (const candidate of ENTRY_CANDIDATES) {
    if (readFile(files, candidate)) return candidate;
  }

  return null;
}

/** The component a synthesised entry should mount. */
export function detectRootComponent(files: FileMap): string | null {
  for (const candidate of ROOT_COMPONENTS) {
    if (readFile(files, candidate)) return candidate;
  }

  const first = Object.values(files).find(
    (node) => node.type === 'file' && /\.[jt]sx$/.test(node.path),
  );
  return first?.path ?? null;
}

/**
 * Generates the mount file when a project has none.
 *
 * Boilerplate is managed for the user where possible — someone who only wants
 * to edit `App.tsx` should not have to write a root render call first.
 */
export function synthesiseEntry(files: FileMap): { path: string; contents: string } | null {
  const component = detectRootComponent(files);
  if (!component) return null;

  const specifier = `/${component.replace(/\.(tsx|jsx|ts|js)$/, '')}`;
  const stylesheets = Object.values(files)
    .filter((node) => node.type === 'file' && node.path.endsWith('.css'))
    .map((node) => `import ${JSON.stringify(`/${node.path}`)};`)
    .join('\n');

  return {
    path: '__mai-habi__/entry.tsx',
    contents: `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from ${JSON.stringify(specifier)};
${stylesheets}

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
`,
  };
}

export function listStylesheets(files: FileMap): string[] {
  return Object.values(files)
    .filter((node) => node.type === 'file' && node.path.endsWith('.css'))
    .map((node) => node.path)
    .sort();
}

export function hasReactCode(files: FileMap): boolean {
  return Object.values(files).some(
    (node) => node.type === 'file' && /\.(tsx|jsx)$/.test(node.path),
  );
}
