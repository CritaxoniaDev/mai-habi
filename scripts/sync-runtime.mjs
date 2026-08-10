/**
 * Stages the browser runtime assets into `apps/web/public`.
 *
 * The playground provides React itself, so the app ships:
 *   - esbuild's WebAssembly binary, loaded by the compiler worker
 *   - React, ReactDOM and the JSX runtime as real ES modules
 *   - Tailwind's browser build, loaded only by projects that enable it
 *
 * React is emitted with code splitting so `react-dom/client` and the user's
 * own `import React` share one chunk, and therefore one React instance.
 *
 * Runs from `postinstall` and `prebuild`; safe to re-run.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);

/**
 * Collects the named exports of a CommonJS module by reading its source.
 *
 * `export * from 'react'` compiles to a runtime re-export, which ES modules
 * cannot name statically — the result exports only `default`. Listing the
 * names explicitly is what makes `import { useState } from 'react'` work in a
 * project.
 */
function namedExportsOf(specifier) {
  const seen = new Set();
  const collect = (file, depth = 0) => {
    if (depth > 3 || !fs.existsSync(file)) return;
    const source = fs.readFileSync(file, 'utf8');

    for (const [, name] of source.matchAll(/^exports\.([A-Za-z_$][\w$]*)\s*=/gm)) {
      seen.add(name);
    }

    if (seen.size > 0) return;

    // Entry shims just forward to a build in ./cjs, so follow them.
    for (const [, , relative] of source.matchAll(/require\((['"])(\.\/cjs\/[^'"]+)\1\)/g)) {
      collect(path.resolve(path.dirname(file), relative), depth + 1);
    }
  };

  collect(require.resolve(specifier));

  const reserved = new Set(['default', 'import', 'export', 'class', 'function', 'const', 'var']);
  return [...seen].filter((name) => !reserved.has(name)).sort();
}

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'apps/web/public');
const RUNTIME_DIR = path.join(PUBLIC, 'runtime');
const WASM_DIR = path.join(PUBLIC, 'wasm');
const TYPES_DIR = path.join(PUBLIC, 'types');
const STAGING = path.join(ROOT, 'node_modules/.cache/mai-habi-runtime');

/** Entry name -> module the playground exposes under that specifier. */
const ENTRIES = {
  'react.production': 'react',
  'react-jsx-runtime.production': 'react/jsx-runtime',
  'react-dom.production': 'react-dom',
  'react-dom-client.production': 'react-dom/client',
  'scheduler.production': 'scheduler',
};

function copy(from, to, label) {
  if (!fs.existsSync(from)) throw new Error(`${label} is missing at ${from}`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  const size = fs.statSync(to).size;
  console.log(`  ${path.relative(ROOT, to).replace(/\\/g, '/')}  ${(size / 1024).toFixed(1)} KB`);
}

async function buildReactRuntime() {
  fs.mkdirSync(STAGING, { recursive: true });

  const entryPoints = {};

  for (const [name, specifier] of Object.entries(ENTRIES)) {
    const names = namedExportsOf(specifier);
    if (names.length === 0) throw new Error(`No named exports found for "${specifier}"`);

    const file = path.join(STAGING, `${name}.js`);
    fs.writeFileSync(
      file,
      [
        `import runtime from ${JSON.stringify(specifier)};`,
        'export default runtime;',
        `export const { ${names.join(', ')} } = runtime;`,
        '',
      ].join('\n'),
    );

    entryPoints[name] = file;
    console.log(`  ${specifier}: ${names.length} named exports`);
  }

  fs.mkdirSync(RUNTIME_DIR, { recursive: true });

  await build({
    entryPoints,
    outdir: RUNTIME_DIR,
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    legalComments: 'none',
    entryNames: '[name]',
    chunkNames: 'shared-[hash]',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'warning',
  });

  for (const name of Object.keys(ENTRIES)) {
    const file = path.join(RUNTIME_DIR, `${name}.js`);
    const size = fs.statSync(file).size;
    console.log(`  public/runtime/${name}.js  ${(size / 1024).toFixed(1)} KB`);
  }
}

/**
 * Copies the type declarations Monaco needs.
 *
 * Projects have no node_modules, so the editor feeds React's `.d.ts` files to
 * the TypeScript worker directly — that is what makes `useState` autocomplete
 * and `ReactNode` resolve.
 */
function copyTypes() {
  const targets = [
    ['@types/react', ['index.d.ts', 'jsx-runtime.d.ts', 'canary.d.ts', 'experimental.d.ts', 'global.d.ts']],
    ['@types/react-dom', ['index.d.ts', 'client.d.ts', 'canary.d.ts', 'experimental.d.ts']],
    ['csstype', ['index.d.ts']],
  ];

  let copied = 0;

  for (const [pkg, files] of targets) {
    const base = path.join(ROOT, 'node_modules', pkg);
    if (!fs.existsSync(base)) continue;

    for (const file of files) {
      const from = path.join(base, file);
      if (!fs.existsSync(from)) continue;
      const to = path.join(TYPES_DIR, pkg, file);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      copied += 1;
    }
  }

  console.log(`  public/types: ${copied} declaration files`);
}

console.log('Staging browser runtime assets');

fs.mkdirSync(RUNTIME_DIR, { recursive: true });
fs.mkdirSync(WASM_DIR, { recursive: true });

copy(
  path.join(ROOT, 'node_modules/esbuild-wasm/esbuild.wasm'),
  path.join(WASM_DIR, 'esbuild.wasm'),
  'esbuild.wasm',
);

copy(
  path.join(ROOT, 'node_modules/@tailwindcss/browser/dist/index.global.js'),
  path.join(RUNTIME_DIR, 'tailwind-browser.js'),
  'Tailwind browser build',
);

await buildReactRuntime();
copyTypes();

const versions = {
  react: JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/react/package.json'), 'utf8'))
    .version,
  esbuild: JSON.parse(
    fs.readFileSync(path.join(ROOT, 'node_modules/esbuild-wasm/package.json'), 'utf8'),
  ).version,
  tailwind: JSON.parse(
    fs.readFileSync(path.join(ROOT, 'node_modules/@tailwindcss/browser/package.json'), 'utf8'),
  ).version,
};

fs.writeFileSync(
  path.join(RUNTIME_DIR, 'versions.json'),
  `${JSON.stringify(versions, null, 2)}\n`,
);

console.log(
  `Done — react ${versions.react}, esbuild ${versions.esbuild}, tailwind ${versions.tailwind}`,
);
