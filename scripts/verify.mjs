/**
 * Checks for the pure logic the application depends on.
 *
 * The interesting parts of this product — import resolution, the compiler's
 * rules about what a project may import, filesystem operations, the preview
 * document and the theme — are plain functions, so they can be verified without
 * a browser. Run with `npm run verify`.
 */

import vm from 'node:vm';
import { build as nodeBuild } from 'esbuild';
import { registerDesignChecks } from './design-checks.mjs';

const checks = [];
const check = (name, fn) => checks.push([name, fn]);

async function load(entry) {
  const bundle = await nodeBuild({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    write: false,
    platform: 'neutral',
    mainFields: ['module', 'main'],
    external: ['esbuild-wasm'],
    logLevel: 'silent',
    define: {
      'import.meta.env.PUBLIC_APP_ORIGIN': '"https://play.example.com"',
      'import.meta.env.PUBLIC_SUPABASE_URL': '""',
      'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': '""',
    },
  });

  const code = bundle.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

const fs = await load('packages/filesystem/src/index.ts');
const shared = await load('packages/shared/src/index.ts');
const preview = await load('packages/compiler/src/preview.ts');
const bundler = await load('packages/compiler/src/bundler.ts');
const runtime = await load('packages/compiler/src/runtime.ts');

/* ------------------------------------------------------ untrusted import paths */

check('rejects parent traversal', () => !fs.isSafePath('../../etc/passwd'));
check('rejects nested traversal', () => !fs.isSafePath('src/../../secret'));
check('rejects absolute paths', () => !fs.isSafePath('/etc/passwd'));
check('rejects windows drive paths', () => !fs.isSafePath('C:\\Windows\\system32'));
check('accepts ordinary paths', () => fs.isSafePath('src/components/Button.tsx'));
check('ignores node_modules on import', () =>
  fs.shouldIgnoreImportPath('app/node_modules/react/index.js'));
check('ignores .git on import', () => fs.shouldIgnoreImportPath('.git/config'));
check('keeps source files on import', () => !fs.shouldIgnoreImportPath('src/App.tsx'));
check('strips a single common root', () =>
  fs.stripCommonRoot(['app/src/App.tsx', 'app/src/main.tsx']) === 'app');

/* -------------------------------------------------------- filesystem operations */

const seed = fs.deserializeProject({
  version: 1,
  files: [
    { path: 'src', type: 'directory' },
    { path: 'src/main.tsx', type: 'file', content: 'import "./App";', encoding: 'utf8' },
    { path: 'src/App.tsx', type: 'file', content: 'export default null;', encoding: 'utf8' },
    { path: 'src/lib/util.ts', type: 'file', content: 'export const a = 1;', encoding: 'utf8' },
  ],
});

check('builds a sorted tree with folders first', () => {
  const tree = fs.buildTree(seed);
  return tree[0].name === 'src' && tree[0].type === 'directory';
});

check('renames a folder and its descendants', () => {
  const next = fs.renameNode(seed, 'src', 'source');
  return Boolean(next['source/App.tsx'] && next['source/lib/util.ts']) && !next['src/App.tsx'];
});

check('deletes recursively', () => {
  const next = fs.deleteNode(seed, 'src');
  return Object.keys(next).length === 0;
});

check('refuses to move a folder into itself', () => {
  try {
    fs.moveNode(seed, 'src', 'src/lib/src');
    return false;
  } catch {
    return true;
  }
});

check('refuses to overwrite on rename', () => {
  try {
    fs.renameNode(seed, 'src/App.tsx', 'main.tsx');
    return false;
  } catch {
    return true;
  }
});

check('duplicate creates a sibling copy', () =>
  Boolean(fs.duplicateNode(seed, 'src/App.tsx')['src/App copy.tsx']));

check('moves a file between folders', () => {
  const next = fs.moveNode(seed, 'src/App.tsx', 'src/lib/App.tsx');
  return Boolean(next['src/lib/App.tsx']) && !next['src/App.tsx'];
});

/* ----------------------------------------------------------- project detection */

check('detects the entry file', () => fs.detectEntryFile(seed) === 'src/main.tsx');
check('detects a root HTML entry', () =>
  fs.detectEntryFile(shared.filesFromRecord({ 'index.html': '<h1>Hello</h1>' })) === 'index.html');
check('honours a configured entry', () => fs.detectEntryFile(seed, 'src/App.tsx') === 'src/App.tsx');
check('reports no entry when there is none', () => {
  const without = fs.deleteNode(seed, 'src/main.tsx');
  return fs.detectEntryFile(without) === null;
});

check('synthesises an entry that mounts the root component', () => {
  const without = fs.deleteNode(seed, 'src/main.tsx');
  const generated = fs.synthesiseEntry(without);
  return (
    generated !== null &&
    generated.contents.includes('createRoot') &&
    generated.contents.includes('/src/App')
  );
});

check('knows tsx is typescript for monaco', () => fs.languageForPath('src/App.tsx') === 'typescript');
check('knows jsx is javascript for monaco', () => fs.languageForPath('src/App.jsx') === 'javascript');
check('maps schema languages', () => fs.fileLanguage('a.tsx') === 'typescriptreact');

/* --------------------------------------------------------------- the compiler */

/**
 * Runs the real plugin and options through the Node build of esbuild, which
 * shares its implementation with the WebAssembly build used in the browser.
 */
async function compileFixture(files, entry, options = {}) {
  try {
    const result = await nodeBuild(bundler.createBuildOptions({ files, entry, minify: false, ...options }));
    const outputs = result.outputFiles ?? [];
    return {
      ok: true,
      js: outputs.find((file) => file.path.endsWith('.js'))?.text ?? '',
      css: outputs.find((file) => file.path.endsWith('.css'))?.text ?? '',
    };
  } catch (error) {
    return { ok: false, errors: (error.errors ?? []).map((entry) => entry.text) };
  }
}

const REACT_PROJECT = {
  'src/main.tsx': `import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
`,
  'src/App.tsx': `import { useState } from 'react';
import Button from './components/Button';

export default function App() {
  const [count, setCount] = useState<number>(0);
  return <main><Button onClick={() => setCount(count + 1)}>{count}</Button></main>;
}
`,
  'src/components/Button.tsx': `import type { ReactNode } from 'react';

export default function Button({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick}>{children}</button>;
}
`,
  'src/styles.css': 'body { margin: 0; }\n',
};

const HTML_PROJECT = {
  'index.html': `<!doctype html>
<html lang="en">
  <head><link rel="stylesheet" href="./styles.css"></head>
  <body><button id="counter">Count</button><script src="./script.js"></script></body>
</html>`,
  'styles.css': 'button { color: rebeccapurple; }',
  'script.js': `document.querySelector('#counter')?.addEventListener('click', () => console.log('clicked'));`,
};

check('compiles a TSX project with nested imports', async () => {
  const result = await compileFixture(REACT_PROJECT, 'src/main.tsx');
  if (!result.ok) throw new Error(result.errors.join('; '));
  return result.js.includes('createRoot') && result.js.includes('useState');
});

check('transforms JSX through the automatic runtime', async () => {
  const result = await compileFixture(REACT_PROJECT, 'src/main.tsx');
  return result.ok && result.js.includes('react/jsx-runtime');
});

check('strips TypeScript annotations', async () => {
  const result = await compileFixture(REACT_PROJECT, 'src/main.tsx');
  return result.ok && !result.js.includes(': ReactNode');
});

check('aggregates imported CSS into its own output', async () => {
  const result = await compileFixture(REACT_PROJECT, 'src/main.tsx');
  return result.ok && result.css.includes('margin: 0') && !result.js.includes('margin: 0');
});

check('compiles an HTML, CSS and JavaScript project', async () => {
  const result = await compileFixture(HTML_PROJECT, 'index.html');
  return (
    result.ok &&
    result.js.includes('DOMParser') &&
    result.js.includes('querySelector') &&
    result.js.includes('counter') &&
    result.css.includes('rebeccapurple')
  );
});

check('runs inline HTML scripts after adopting the document', async () => {
  const result = await compileFixture(
    { 'index.html': `<main>Ready</main><script>document.body.dataset.ready = 'yes';</script>` },
    'index.html',
  );
  return result.ok && result.js.includes("dataset.ready") && result.js.includes('append');
});

check('reports a missing script referenced by HTML', async () => {
  const result = await compileFixture(
    { 'index.html': `<main>Broken</main><script src="./missing.js"></script>` },
    'index.html',
  );
  return !result.ok && result.errors.some((message) => message.includes('./missing.js'));
});

check('leaves react external rather than bundling it', async () => {
  const result = await compileFixture(REACT_PROJECT, 'src/main.tsx');
  return (
    result.ok &&
    /from\s*"react"/.test(result.js) &&
    /from\s*"react-dom\/client"/.test(result.js) &&
    // The real React implementation must not appear in a user's bundle.
    !result.js.includes('ReactSharedInternals')
  );
});

check('resolves extensionless relative imports', async () => {
  const result = await compileFixture(
    { 'a.tsx': `import B from './b';\nexport default B;`, 'b.tsx': 'export default 1;' },
    'a.tsx',
  );
  return result.ok;
});

check('resolves directory imports through index files', async () => {
  const result = await compileFixture(
    {
      'a.tsx': `import B from './parts';\nexport default B;`,
      'parts/index.tsx': 'export default 1;',
    },
    'a.tsx',
  );
  return result.ok;
});

check('rejects an unknown npm package by name', async () => {
  const result = await compileFixture({ 'a.tsx': `import axios from 'axios';\nexport default axios;` }, 'a.tsx');
  return (
    !result.ok &&
    result.errors.some(
      (message) =>
        message.includes('"axios"') && message.includes('not available in this playground'),
    )
  );
});

check('names the package root for a deep unknown import', async () => {
  const result = await compileFixture(
    { 'a.tsx': `import x from '@scope/pkg/deep/path';\nexport default x;` },
    'a.tsx',
  );
  return !result.ok && result.errors.some((message) => message.includes('"@scope/pkg"'));
});

check('reports an unresolved relative import with both files named', async () => {
  const result = await compileFixture({ 'a.tsx': `import './missing';` }, 'a.tsx');
  return (
    !result.ok &&
    result.errors.some((message) => message.includes('./missing') && message.includes('a.tsx'))
  );
});

check('reports a missing entry file', async () => {
  const result = await compileFixture({ 'a.tsx': 'export default 1;' }, 'src/nope.tsx');
  return !result.ok && result.errors.some((message) => message.includes('was not found'));
});

check('surfaces syntax errors with a location', async () => {
  try {
    await nodeBuild(
      bundler.createBuildOptions({
        files: { 'a.tsx': 'export default function App() { return (<div>; }' },
        entry: 'a.tsx',
        minify: false,
      }),
    );
    return false;
  } catch (error) {
    const first = error.errors?.[0];
    return Boolean(first?.location?.line) && Boolean(first?.text);
  }
});

check('only react and react-dom are importable', () => {
  const allowed = Object.keys(runtime.ALLOWED_PACKAGES).sort();
  return (
    allowed.every((name) => name.startsWith('react') || name === 'scheduler') &&
    runtime.isAllowedPackage('react') &&
    runtime.isAllowedPackage('react-dom/client') &&
    !runtime.isAllowedPackage('axios') &&
    !runtime.isAllowedPackage('lodash')
  );
});

/* ---------------------------------------------------------- the preview runtime */

const previewDocument = preview.buildPreviewDocument({
  js: 'console.log("</script> hi");',
  css: 'body{color:red}',
  tailwind: false,
  origin: 'https://play.example.com',
  title: 'Test <x>',
});

check('the preview sandbox withholds every permission but scripts', () =>
  preview.PREVIEW_SANDBOX === 'allow-scripts');

check('closing tags inside compiled output cannot break out', () => {
  const body = previewDocument.slice(previewDocument.indexOf('<body>'));
  // The only </script> left must be the real closing tags.
  return body.includes('<\\/script>') && !body.includes('console.log("</script>');
});

check('the project name is escaped in the preview title', () =>
  previewDocument.includes('<title>Test &lt;x&gt;</title>'));

check('the import map points react at the platform runtime', () => {
  const map = JSON.parse(
    previewDocument.slice(
      previewDocument.indexOf('<script type="importmap">') + '<script type="importmap">'.length,
      previewDocument.indexOf('</script>', previewDocument.indexOf('<script type="importmap">')),
    ),
  );
  return (
    map.imports.react === 'https://play.example.com/runtime/react.production.js' &&
    map.imports['react-dom/client'].endsWith('/runtime/react-dom-client.production.js')
  );
});

check('tailwind is absent unless the project enables it', () => {
  const withTailwind = preview.buildPreviewDocument({
    js: '',
    css: '',
    tailwind: true,
    origin: 'https://play.example.com',
  });
  return !previewDocument.includes('tailwind') && withTailwind.includes('tailwind-browser.js');
});

check('the preview bridge is valid javascript and forwards console output', () => {
  const start = previewDocument.indexOf('<script>') + '<script>'.length;
  const body = previewDocument.slice(start, previewDocument.indexOf('</script>', start));
  new vm.Script(body);
  return body.includes('preview:console') && body.includes('preview:error');
});

check('preview messages are shape-checked before use', () => {
  return (
    preview.isPreviewMessage?.({ type: 'preview:ready' }) !== false &&
    !preview.isPreviewMessage?.({ type: 'evil' }) &&
    !preview.isPreviewMessage?.(null)
  );
});

/* ------------------------------------------------------------- share and links */

check('round-trips a compressed snapshot', async () => {
  const payload = JSON.stringify({ files: { 'src/App.tsx': 'x'.repeat(500) } });
  const encoded = shared.compressToBase64UrlSync(payload);
  const decoded = await shared.decompressFromBase64Url(encoded);
  return decoded === payload && encoded.length < payload.length && !/[+/=]/.test(encoded);
});

check('share ids are unique and url safe', () => {
  const ids = new Set(Array.from({ length: 500 }, () => shared.shareId()));
  return ids.size === 500 && [...ids].every((id) => /^[0-9a-zA-Z]{12}$/.test(id));
});

check('editor and viewer routes share one origin', () =>
  shared.editorProjectUrl('abc') === 'https://play.example.com/editor/abc' &&
  shared.viewerProjectUrl('abc') === 'https://play.example.com/view/abc');

check('cloud stays disabled without configuration', () => shared.isCloudEnabled() === false);

/* ------------------------------------------------------------------- templates */

check('every template compiles', async () => {
  for (const template of shared.TEMPLATES) {
    const entry = template.settings.entryFile;
    const result = await compileFixture(template.files, entry);
    if (!result.ok) throw new Error(`${template.id}: ${result.errors.join('; ')}`);
  }
  return true;
});

check('templates declare an entry file that exists', () =>
  shared.TEMPLATES.every((template) => template.files[template.settings.entryFile] !== undefined));

check('only the tailwind template enables tailwind', () => {
  const enabled = shared.TEMPLATES.filter((template) => template.settings.tailwind);
  return enabled.length === 1 && enabled[0].id === 'react-tailwind';
});

check('created projects materialise directories', () => {
  const { project, files } = shared.createProject({
    name: 'Demo',
    templateId: 'react-ts',
    guestId: 'guest_x',
  });
  return files.src.type === 'directory' && project.settings.entryFile === 'src/main.tsx';
});

/* ------------------------------------------- theme, contrast and typography */

registerDesignChecks(check);

/* ---------------------------------------------------------------------- run */

let failed = 0;

for (const [name, fn] of checks) {
  let ok = false;
  let detail = '';

  try {
    ok = await fn();
  } catch (error) {
    detail = ` (${error.message})`;
  }

  if (!ok) failed += 1;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail}`);
}

console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed === 0 ? 0 : 1);
