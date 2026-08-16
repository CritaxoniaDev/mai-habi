import type { Loader, Message, OutputFile, Plugin } from 'esbuild-wasm';
import type { CompileDiagnostic, CompileFailure, CompileSuccess } from './protocol';
import { ALLOWED_PACKAGES, WASM_URL, isAllowedPackage, unsupportedImportMessage } from './runtime';
import { nextShimSource, serverOnlyNextMessage } from './next-shims';

/**
 * The browser-side bundler.
 *
 * Everything runs on the user's own CPU: one worker per tab, no server-side
 * compilation, no container per user. The server only ever ships static assets.
 */

const NAMESPACE = 'project';

/** Virtual modules that stand in for `next/*` imports (see next-shims.ts). */
const NEXT_SHIM_NAMESPACE = 'mai-habi-next-shim';

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.css', '.html', '.htm'];

const LOADERS: Record<string, Loader> = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.js': 'jsx',
  '.mjs': 'jsx',
  '.jsx': 'jsx',
  '.json': 'json',
  '.css': 'css',
  '.html': 'text',
  '.htm': 'text',
  '.txt': 'text',
};

/**
 * Files carried through the project as base64 rather than text.
 *
 * They are inlined as data URIs, which is what lets `import logo from
 * './logo.png'`, `url('./logo.png')` in CSS and `<img src="./logo.png">` all
 * work with no server and no asset pipeline.
 */
const BASE64_ASSETS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.bmp',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.ogg',
]);

/** SVG is stored as text but behaves like an image once it is referenced. */
function isAssetExtension(extension: string): boolean {
  return BASE64_ASSETS.has(extension) || extension === '.svg';
}

/** Above this, inlining starts to hurt: a data URI is a third larger again. */
const LARGE_ASSET_BYTES = 512 * 1024;

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/*
 * React is provided by the platform as real ES modules served from the app
 * origin, so it is never re-bundled into the user's output. The preview
 * document maps these specifiers with an import map.
 */
const EXTERNAL = Object.keys(ALLOWED_PACKAGES);

export interface CompileInput {
  files: Record<string, string>;
  entry: string;
  minify: boolean;
}

export type CompileOutput =
  | Omit<CompileSuccess, 'type' | 'id'>
  | Omit<CompileFailure, 'type' | 'id'>;

type Esbuild = typeof import('esbuild-wasm');

let esbuild: Esbuild | null = null;
let starting: Promise<Esbuild> | null = null;

/**
 * esbuild may only be initialised once per JavaScript context, so this is
 * memoised and every later compile reuses the same WebAssembly instance.
 */
export async function initialiseCompiler(wasmURL = WASM_URL): Promise<Esbuild> {
  if (esbuild) return esbuild;
  if (starting) return starting;

  starting = import('esbuild-wasm').then(async (module) => {
    // Already inside a worker: `worker: false` keeps esbuild on this thread
    // instead of spawning a second one.
    await module.initialize({ wasmURL, worker: false });
    esbuild = module;
    return module;
  });

  return starting;
}

/* -------------------------------------------------------------------- paths */

function normalise(path: string): string {
  const out: string[] = [];
  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') out.pop();
    else out.push(segment);
  }
  return `/${out.join('/')}`;
}

/** Resolves a specifier the way an importer inside the project would. */
function resolveFrom(importer: string, specifier: string): string {
  return specifier.startsWith('/') ? specifier : `${dirnameOf(importer)}/${specifier}`;
}

function dirnameOf(path: string): string {
  const index = path.lastIndexOf('/');
  return index <= 0 ? '/' : path.slice(0, index);
}

function extnameOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const index = name.lastIndexOf('.');
  return index <= 0 ? '' : name.slice(index).toLowerCase();
}

function toKey(path: string): string {
  return path.replace(/^\//, '');
}

/** Mirrors the resolution a bundler would do on disk, against the file map. */
function resolveInProject(files: Record<string, string>, candidate: string): string | null {
  const base = normalise(candidate);

  if (files[toKey(base)] !== undefined && extnameOf(base)) return base;

  for (const extension of EXTENSIONS) {
    const withExtension = `${base}${extension}`;
    if (files[toKey(withExtension)] !== undefined) return withExtension;
  }

  for (const extension of EXTENSIONS) {
    const asIndex = `${base}/index${extension}`;
    if (files[toKey(asIndex)] !== undefined) return asIndex;
  }

  if (files[toKey(base)] !== undefined) return base;

  return null;
}

/* --------------------------------------------------------------- diagnostics */

function toDiagnostic(message: Message): CompileDiagnostic {
  const location = message.location;

  return {
    message: message.text,
    location: location
      ? { file: toKey(location.file), line: location.line, column: location.column }
      : null,
    snippet: location?.lineText?.trim() || undefined,
  };
}

/* -------------------------------------------------------------- HTML entry */

interface HtmlScript {
  source: string | null;
  inline: string;
  module: boolean;
}

function attribute(markup: string, name: string): string | null {
  const match = markup.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, 'i'),
  );
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
}

function localSpecifier(reference: string): string | null {
  const value = reference.trim();
  if (!value || value.startsWith('#') || value.startsWith('//')) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return null;

  const path = value.replace(/[?#].*$/, '');
  if (!path) return null;
  return path.startsWith('.') || path.startsWith('/') ? path : `./${path}`;
}

function isJavaScriptType(type: string | null): boolean {
  if (!type) return true;
  return /^(?:module|text\/javascript|application\/javascript)$/i.test(type.trim());
}

function externalScript(source: string, module: boolean): string {
  return `await new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = ${JSON.stringify(source)};
  ${module ? "script.type = 'module';" : ''}
  script.addEventListener('load', resolve, { once: true });
  script.addEventListener('error', () => reject(new Error('Failed to load ' + script.src)), { once: true });
  document.body.append(script);
});`;
}

function inlineScript(source: string, module: boolean): string {
  if (!module) {
    return `{
  const script = document.createElement('script');
  script.textContent = ${JSON.stringify(source)};
  document.body.append(script);
}`;
  }

  return `await new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = ${JSON.stringify(source)};
  script.addEventListener('load', resolve, { once: true });
  script.addEventListener('error', () => reject(new Error('Inline module failed')), { once: true });
  document.body.append(script);
});`;
}

/**
 * Turns a real HTML document into the JavaScript entry used by esbuild.
 *
 * Local stylesheets become static imports so esbuild can aggregate them. Local
 * scripts become deferred dynamic imports so the document exists before user
 * JavaScript runs. The remaining document is parsed and adopted into the
 * sandboxed preview, retaining body classes, inline styles and ordinary head
 * elements without evaluating user code in the editor itself.
 */
export function htmlEntryModule(
  html: string,
  /** Whether a local reference exists in the project; missing ones are left alone. */
  resolves: (specifier: string) => boolean = () => true,
): string {
  const scripts: HtmlScript[] = [];
  const stylesheets: string[] = [];
  const assets: string[] = [];

  let documentSource = html.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
    (markup, attributes: string, inline: string) => {
      const type = attribute(attributes, 'type');
      if (!isJavaScriptType(type)) return markup;

      scripts.push({
        source: attribute(attributes, 'src'),
        inline,
        module: type?.trim().toLowerCase() === 'module',
      });
      return '';
    },
  );

  documentSource = documentSource.replace(/<link\b[^>]*>/gi, (markup) => {
    const rel = attribute(markup, 'rel')?.toLowerCase().split(/\s+/) ?? [];
    const href = attribute(markup, 'href');
    const specifier = href ? localSpecifier(href) : null;
    if (!rel.includes('stylesheet') || !specifier) return markup;
    stylesheets.push(specifier);
    return '';
  });

  /*
   * `<img src="./logo.png">` cannot resolve inside the preview: the document has
   * an opaque origin and no base URL. Each local reference becomes an import,
   * which the asset loader turns into a data URI, and the attribute is swapped
   * for a token that is substituted once those imports have resolved.
   */
  documentSource = documentSource.replace(
    /(<(?:img|source|video|audio|track|embed)\b[^>]*?\s(?:src|poster)\s*=\s*)(["'])([^"']+)\2/gi,
    (markup, head: string, quote: string, value: string) => {
      const specifier = localSpecifier(value);
      if (!specifier || !resolves(specifier)) return markup;

      let index = assets.indexOf(specifier);
      if (index === -1) index = assets.push(specifier) - 1;

      return `${head}${quote}__mai_habi_asset_${index}__${quote}`;
    },
  );

  const imports = [
    ...[...new Set(stylesheets)].map((specifier) => `import ${JSON.stringify(specifier)};`),
    ...assets.map((specifier, index) => `import __asset${index} from ${JSON.stringify(specifier)};`),
  ].join('\n');

  const substitution = assets.length
    ? `\nconst assets = [${assets.map((_, index) => `__asset${index}`).join(', ')}];` +
      '\nsource = source.replace(/__mai_habi_asset_(\\d+)__/g, (_, index) => assets[Number(index)]);'
    : '';

  const executions = scripts
    .map((script) => {
      if (script.source) {
        const specifier = localSpecifier(script.source);
        return specifier
          ? `await import(${JSON.stringify(specifier)});`
          : externalScript(script.source, script.module);
      }
      return inlineScript(script.inline, script.module);
    })
    .join('\n');

  return `${imports}

let source = ${JSON.stringify(documentSource)};${substitution}
const parsed = new DOMParser().parseFromString(source, 'text/html');

for (const attribute of parsed.documentElement.attributes) {
  document.documentElement.setAttribute(attribute.name, attribute.value);
}
for (const node of Array.from(parsed.head.childNodes)) {
  document.head.append(document.adoptNode(node));
}
document.body.replaceWith(document.adoptNode(parsed.body));

void (async () => {
${executions}
})();
`;
}

/* ------------------------------------------------------------------- plugin */

export function virtualFilesystem(files: Record<string, string>, entry: string): Plugin {
  return {
    name: 'mai-habi-virtual-fs',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        // The entry point itself.
        if (args.kind === 'entry-point') {
          const resolved = resolveInProject(files, `/${toKey(args.path)}`);
          if (!resolved) {
            return { errors: [{ text: `Entry file "${toKey(entry)}" was not found.` }] };
          }
          return { path: resolved, namespace: NAMESPACE };
        }

        // Relative and root-absolute imports stay inside the project.
        if (args.path.startsWith('.') || args.path.startsWith('/')) {
          const from = args.path.startsWith('/')
            ? args.path
            : `${dirnameOf(args.importer)}/${args.path}`;

          const resolved = resolveInProject(files, from);
          if (resolved) return { path: resolved, namespace: NAMESPACE };

          // Unresolved references from a stylesheet are almost always assets;
          // let them through untouched rather than failing the whole build.
          if (extnameOf(args.importer) === '.css') return { path: args.path, external: true };

          return {
            errors: [
              {
                text: `Could not resolve "${args.path}" from "${toKey(args.importer)}".`,
              },
            ],
          };
        }

        // Bare specifiers: platform packages only.
        if (isAllowedPackage(args.path)) return { path: args.path, external: true };

        // Absolute URLs are the project's own business.
        if (/^https?:\/\//.test(args.path) || args.path.startsWith('data:')) {
          return { path: args.path, external: true };
        }

        // Next.js: server-only modules cannot run in the browser preview.
        const serverOnly = serverOnlyNextMessage(args.path);
        if (serverOnly) return { errors: [{ text: serverOnly }] };

        // Next.js: client-renderable `next/*` modules resolve to a browser shim.
        if (nextShimSource(args.path) !== undefined) {
          return { path: args.path, namespace: NEXT_SHIM_NAMESPACE };
        }

        return { errors: [{ text: unsupportedImportMessage(args.path) }] };
      });

      build.onLoad({ filter: /.*/, namespace: NEXT_SHIM_NAMESPACE }, (args) => {
        const contents = nextShimSource(args.path);
        if (contents === undefined) {
          return { errors: [{ text: `No Next.js shim for "${args.path}".` }] };
        }
        return { contents, loader: 'js', resolveDir: '/' };
      });

      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, (args) => {
        const contents = files[toKey(args.path)];
        if (contents === undefined) {
          return { errors: [{ text: `"${toKey(args.path)}" no longer exists.` }] };
        }

        const extension = extnameOf(args.path);

        // Images, fonts and media become data URIs, so they need real bytes.
        if (isAssetExtension(extension)) {
          const bytes = BASE64_ASSETS.has(extension)
            ? decodeBase64(contents)
            : new TextEncoder().encode(contents);

          return {
            contents: bytes,
            loader: 'dataurl',
            resolveDir: dirnameOf(args.path),
            warnings:
              bytes.length > LARGE_ASSET_BYTES
                ? [
                    {
                      text:
                        `"${toKey(args.path)}" is ${Math.round(bytes.length / 1024)} KB and is ` +
                        'inlined into the build. Large assets slow every reload — consider a ' +
                        'smaller file or an absolute URL.',
                    },
                  ]
                : undefined,
          };
        }

        const htmlEntry =
          (extension === '.html' || extension === '.htm') &&
          normalise(args.path) === normalise(entry);

        return {
          contents: htmlEntry
            ? htmlEntryModule(contents, (specifier) =>
                Boolean(resolveInProject(files, resolveFrom(args.path, specifier))),
              )
            : contents,
          loader: htmlEntry ? 'js' : (LOADERS[extension] ?? 'text'),
          resolveDir: dirnameOf(args.path),
        };
      });
    },
  };
}

/* ------------------------------------------------------------------- public */

function pick(outputs: OutputFile[], extension: string): string {
  return outputs.find((file) => file.path.endsWith(extension))?.text ?? '';
}

/**
 * The exact options used for a build.
 *
 * Exported so the same resolution rules, JSX settings and externals can be
 * exercised outside the browser by `npm run verify`.
 */
export function createBuildOptions(input: CompileInput) {
  return {
    entryPoints: [input.entry.startsWith('/') ? input.entry : `/${input.entry}`],
    bundle: true,
    write: false,
    outdir: '/build',
    format: 'esm' as const,
    target: ['es2020'],
    platform: 'browser' as const,
    jsx: 'automatic' as const,
    jsxImportSource: 'react',
    external: EXTERNAL,
    minify: input.minify,
    sourcemap: 'inline' as const,
    sourcesContent: true,
    logLevel: 'silent' as const,
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [virtualFilesystem(input.files, input.entry)],
  };
}

export async function compile(input: CompileInput): Promise<CompileOutput> {
  const started = performance.now();
  const build = await initialiseCompiler();

  try {
    const result = await build.build(createBuildOptions(input));

    return {
      ok: true,
      js: pick(result.outputFiles ?? [], '.js'),
      css: pick(result.outputFiles ?? [], '.css'),
      warnings: (result.warnings ?? []).map(toDiagnostic),
      durationMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    const failure = error as { errors?: Message[]; warnings?: Message[]; message?: string };

    const errors = failure.errors?.length
      ? failure.errors.map(toDiagnostic)
      : [{ message: failure.message ?? 'Compilation failed.', location: null }];

    return {
      ok: false,
      errors,
      warnings: (failure.warnings ?? []).map(toDiagnostic),
      durationMs: Math.round(performance.now() - started),
    };
  }
}
