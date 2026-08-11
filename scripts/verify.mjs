/**
 * Checks for the pure logic the application depends on.
 *
 * The interesting parts of this product — import resolution, the compiler's
 * rules about what a project may import, filesystem operations, the preview
 * document and the theme — are plain functions, so they can be verified without
 * a browser. Run with `npm run verify`.
 */

import vm from 'node:vm';
import { existsSync, readFileSync } from 'node:fs';
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

const LIBRARY_PROJECT = {
  'src/main.tsx': `import { createRoot } from 'react-dom/client';
import App from './App';
const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
`,
  'src/App.tsx': `import { motion, AnimatePresence } from 'framer-motion';
import { ReactLenis } from 'lenis/react';
import clsx from 'clsx';
import { create } from 'zustand';

const useStore = create<{ open: boolean; toggle: () => void }>((set) => ({
  open: false,
  toggle: () => set((state) => ({ open: !state.open })),
}));

export default function App() {
  const { open, toggle } = useStore();

  return (
    <ReactLenis root>
      <button className={clsx('btn', open && 'btn-open')} onClick={toggle}>
        Toggle
      </button>
      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />}
      </AnimatePresence>
    </ReactLenis>
  );
}
`,
};

check('compiles a project using the curated libraries', async () => {
  const result = await compileFixture(LIBRARY_PROJECT, 'src/main.tsx');
  if (!result.ok) throw new Error(result.errors.join('; '));
  return result.js.includes('AnimatePresence') && result.js.includes('ReactLenis');
});

check('libraries stay external rather than being bundled in', async () => {
  const result = await compileFixture(LIBRARY_PROJECT, 'src/main.tsx');
  return (
    result.ok &&
    /from\s*"framer-motion"/.test(result.js) &&
    /from\s*"lenis\/react"/.test(result.js) &&
    /from\s*"zustand"/.test(result.js) &&
    // The implementations belong to the platform, not to a user's bundle.
    !result.js.includes('createAnimationsFromSequence') &&
    result.js.length < 8000
  );
});

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const IMAGE_PROJECT = {
  'src/main.tsx': `import { createRoot } from 'react-dom/client';
import logo from './assets/logo.png';
import './styles.css';
const root = document.getElementById('root');
if (root) createRoot(root).render(<img src={logo} alt="" />);
`,
  'src/styles.css': ".hero { background-image: url('./assets/logo.png'); }",
  'src/assets/logo.png': PNG_BASE64,
};

check('an image import becomes a data URI', async () => {
  const result = await compileFixture(IMAGE_PROJECT, 'src/main.tsx');
  if (!result.ok) throw new Error(result.errors.join('; '));
  return result.js.includes('data:image/png;base64,');
});

check('css url() references resolve to the same asset', async () => {
  const result = await compileFixture(IMAGE_PROJECT, 'src/main.tsx');
  return result.ok && result.css.includes('data:image/png;base64,');
});

check('an image is never emitted as raw base64 text', async () => {
  const result = await compileFixture(IMAGE_PROJECT, 'src/main.tsx');
  // The bytes must arrive decoded and re-encoded by the loader, not pasted in.
  return result.ok && !result.js.includes("'" + PNG_BASE64 + "'");
});

check('html img tags are rewritten to embedded assets', async () => {
  const html = {
    'index.html':
      '<!doctype html><html><body><img src="./photo.png" alt="">' +
      '<img src="https://example.com/remote.png" alt=""></body></html>',
    'photo.png': PNG_BASE64,
  };

  const result = await compileFixture(html, 'index.html');
  if (!result.ok) throw new Error(result.errors.join('; '));

  return (
    result.js.includes('data:image/png;base64,') &&
    // A remote image is left exactly as the author wrote it.
    result.js.includes('https://example.com/remote.png')
  );
});

check('a missing html image is left alone rather than failing the build', async () => {
  const result = await compileFixture(
    { 'index.html': '<!doctype html><html><body><img src="./gone.png"></body></html>' },
    'index.html',
  );
  return result.ok && result.js.includes('./gone.png');
});

check('a large asset compiles but warns', async () => {
  const big = 'A'.repeat(900 * 1024);
  const result = await nodeBuild(
    bundler.createBuildOptions({
      files: { 'a.tsx': "import img from './big.png';\nexport default img;", 'big.png': big },
      entry: 'a.tsx',
      minify: false,
    }),
  );
  return (result.warnings ?? []).some((warning) => warning.text.includes('inlined into the build'));
});

check('a project snapshot keeps images binary on the way back', () => {
  const files = shared.filesFromRecord({ 'src/App.tsx': 'export default null;', 'logo.png': PNG_BASE64 });
  return files['logo.png'].encoding === 'base64' && files['src/App.tsx'].encoding === 'utf8';
});

check('images survive the round trip through a source map', () => {
  const files = shared.filesFromRecord({ 'logo.png': PNG_BASE64 });
  return shared.toSourceMap(files)['logo.png'] === PNG_BASE64;
});

check('the import whitelist is exactly the curated shelf', () => {
  const allowed = new Set(Object.keys(runtime.ALLOWED_PACKAGES));

  for (const name of ['react', 'react-dom/client', 'motion/react', 'framer-motion', 'lenis', 'clsx', 'zustand']) {
    if (!allowed.has(name)) throw new Error(`${name} should be importable`);
  }
  for (const name of ['axios', 'lodash', 'three', 'gsap']) {
    if (allowed.has(name)) throw new Error(`${name} should not be importable`);
  }

  return true;
});

check('every allowed package is staged into /runtime', () => {
  for (const [name, url] of Object.entries(runtime.ALLOWED_PACKAGES)) {
    const file = 'apps/web/public' + url;
    if (!existsSync(file)) throw new Error(`${name} points at a missing file: ${url}`);
  }
  return true;
});

check('framer-motion and motion/react are the same module', () =>
  runtime.ALLOWED_PACKAGES['framer-motion'] === runtime.ALLOWED_PACKAGES['motion/react']);

check('the rejection message lists what is available', () => {
  const message = runtime.unsupportedImportMessage('axios');
  return (
    message.includes('"axios"') &&
    message.includes('framer-motion') &&
    message.includes('react') &&
    // Internal plumbing is not something anyone imports on purpose.
    !message.includes('scheduler')
  );
});

check('an unknown subpath of a known package is reported differently', () => {
  const message = runtime.unsupportedImportMessage('motion/nope');
  return message.includes('motion/react') && !message.includes('not available in this playground');
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

check('the motion template demonstrates the provided libraries', async () => {
  const template = shared.getTemplate('react-motion');
  const source = Object.values(template.files).join('\n');

  for (const specifier of ['framer-motion', 'lenis/react', 'clsx']) {
    if (!source.includes(specifier)) throw new Error(`the sample never imports ${specifier}`);
  }

  // And it has to actually build, not merely mention them.
  const result = await compileFixture(template.files, template.settings.entryFile);
  if (!result.ok) throw new Error(result.errors.join('; '));

  return result.js.includes('AnimatePresence') && result.js.includes('ReactLenis');
});

check('starter samples show a local component import', () => {
  for (const id of ['react-ts', 'react-js']) {
    const template = shared.getTemplate(id);
    const app = template.files[id === 'react-ts' ? 'src/App.tsx' : 'src/App.jsx'];
    const component = id === 'react-ts' ? 'src/components/Counter.tsx' : 'src/components/Counter.jsx';

    if (!app.includes('./components/Counter')) throw new Error(`${id} does not import a component`);
    if (!template.files[component]) throw new Error(`${id} is missing ${component}`);
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

/* ------------------------------------------------------------------ import */

const { zipSync, strToU8 } = await import('fflate');

const archive = () =>
  zipSync({
    "widget/index.html": strToU8("<h1>hi</h1>"),
    "widget/assets/logo.svg": strToU8("<svg/>"),
  });

check('a wrapping folder is dropped when an import becomes the project', async () => {
  const result = await fs.importFromZip(archive());
  return Boolean(result.files["index.html"] && result.files["assets/logo.svg"]);
});

check('structure is kept when merging into an existing folder', async () => {
  const result = await fs.importFromZip(archive(), { stripRoot: false });
  return Boolean(result.files["widget/index.html"] && result.files["widget/assets/logo.svg"]);
});

check('imported directories come back as directory nodes', async () => {
  const result = await fs.importFromZip(archive(), { stripRoot: false });
  return result.files["widget/assets"]?.type === "directory";
});

check('an imported binary keeps its base64 encoding', async () => {
  const zip = zipSync({ "pack/logo.png": new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) });
  const result = await fs.importFromZip(zip, { stripRoot: false });
  return result.files["pack/logo.png"].encoding === "base64";
});

/* ----------------------------------------------------------- explorer icons */

/**
 * `file-icons.tsx` imports React components, so the icon library and the UI
 * package are stubbed out. The classification itself is plain data and is what
 * matters here.
 */
const stubIcons = {
  name: 'stub-icons',
  setup(build) {
    build.onResolve({ filter: /^(lucide-react|@mai-habi\/ui)$/ }, (args) => ({
      path: args.path,
      namespace: 'stub',
    }));
    // CommonJS on purpose: esbuild then resolves named imports at runtime, so
    // the stub does not have to enumerate every icon the module happens to use.
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: `module.exports = new Proxy(
         {},
         {
           get: (_, name) =>
             name === 'cn'
               ? (...parts) => parts.filter(Boolean).join(' ')
               : function StubIcon() { return null; },
         },
       );`,
      loader: 'js',
    }));
  },
};

const icons = await (async () => {
  const bundle = await nodeBuild({
    entryPoints: ['apps/web/src/lib/file-icons.tsx'],
    bundle: true,
    format: 'esm',
    write: false,
    platform: 'neutral',
    mainFields: ['module', 'main'],
    jsx: 'transform',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    logLevel: 'silent',
    plugins: [stubIcons],
  });

  return import(
    `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
  );
})();

const toneOf = (path) => icons.fileKind(path).tone;

check('tsx and jsx share the React accent', () =>
  toneOf('src/App.tsx') === 'text-lang-react' && toneOf('src/App.jsx') === 'text-lang-react');

check('plain typescript is distinct from a component', () =>
  toneOf('src/util.ts') === 'text-lang-typescript' &&
  toneOf('src/util.ts') !== toneOf('src/App.tsx'));

check('javascript, css, html and json each get their own accent', () => {
  const tones = ['a.js', 'a.css', 'a.html', 'a.json'].map(toneOf);
  return new Set(tones).size === 4;
});

check('images are recognised, including svg', () =>
  toneOf('logo.png') === 'text-lang-image' && toneOf('logo.svg') === 'text-lang-image');

check('known filenames beat their extension', () =>
  toneOf('package.json') === 'text-lang-config' &&
  toneOf('tsconfig.json') === 'text-lang-config' &&
  toneOf('data.json') === 'text-lang-json');

check('dotfiles and env files read as configuration', () =>
  toneOf('.env') === 'text-lang-config' &&
  toneOf('.env.local') === 'text-lang-config' &&
  toneOf('.gitignore') === 'text-lang-config');

check('an unknown extension falls back to a neutral file', () =>
  toneOf('notes.xyz') === 'text-muted-foreground');

check('languages use a real logo, other categories use a glyph', () => {
  const withLogo = ['a.tsx', 'a.ts', 'a.js', 'a.css', 'a.html', 'a.json', 'a.md'];
  const withGlyph = ['a.png', '.env', 'a.xyz'];

  for (const path of withLogo) {
    if (!icons.fileKind(path).logo) throw new Error(`${path} has no language logo`);
  }
  for (const path of withGlyph) {
    if (icons.fileKind(path).logo) throw new Error(`${path} should not claim a language logo`);
  }

  return true;
});

check('every referenced logo exists in the generated paths', () => {
  const generated = readFileSync('apps/web/src/lib/language-logos.ts', 'utf8');
  const samples = ['a.tsx', 'a.ts', 'a.js', 'a.css', 'a.html', 'a.json', 'a.md'];

  for (const path of samples) {
    const { logo } = icons.fileKind(path);
    // The generator writes `key: 'M…'`, so the key must appear followed by a path.
    if (!new RegExp(`\\n  ${logo}: 'M`).test(generated)) {
      throw new Error(`language-logos.ts has no path for "${logo}"`);
    }
  }

  return true;
});

check('classification ignores the folder path', () =>
  toneOf('deep/nested/path/App.tsx') === toneOf('App.tsx'));

check('every icon tone maps to a token defined in both themes', () => {
  const css = readFileSync('packages/ui/src/theme.css', 'utf8');
  const samples = [
    'a.tsx', 'a.ts', 'a.js', 'a.css', 'a.html', 'a.json', 'a.md', 'a.png', '.env', 'a.xyz',
  ];

  for (const tone of new Set(samples.map(toneOf))) {
    const token = tone.replace(/^text-/, '--');
    if (token === '--muted-foreground') continue;

    const light = new RegExp(`\\n  ${token}:`).test(css);
    const dark = new RegExp(`\\n  ${token}:[^;]+;`, 'g');
    if (!light || (css.match(dark) ?? []).length < 2) {
      throw new Error(`${token} is not defined in both themes`);
    }
  }

  return true;
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
