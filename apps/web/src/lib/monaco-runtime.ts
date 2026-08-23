/**
 * The one Monaco setup in the product.
 *
 * Both the workspace editor and the read-only viewers load Monaco, and both
 * need the same worker environment, themes and language contributions. Doing
 * that twice would assign `window.MonacoEnvironment` twice and register the
 * themes twice, so it lives here and each surface imports it.
 *
 * This module must never be imported by the viewer: `SourceView` and
 * `ViewerShell` are deliberately Monaco-free so a shared link stays small, and
 * `npm run verify` fails the build if they reach for it.
 */

/*
 * Monaco is imported feature by feature rather than through its `editor.main`
 * barrel: the barrel registers every bundled grammar (ABAP, Solidity, …) and
 * roughly triples the editor bundle for languages this product never opens.
 */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import 'monaco-editor/esm/vs/language/css/monaco.contribution';
import 'monaco-editor/esm/vs/language/html/monaco.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';

import { emmetHTML, emmetCSS, emmetJSX } from 'emmet-monaco-es';

import { MONACO_THEMES } from './editor-themes';
import { loadReactTypes } from './monaco-types';

declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment;
  }
}

/*
 * The bundler resolves each worker from a static `new URL(..., import.meta.url)`
 * — the Vite `?worker` import suffix is not available under Next's bundler, but
 * this form is understood by both webpack and Turbopack. Every path must be a
 * literal for that detection to fire, so the labels map to explicit `new Worker`
 * calls rather than a shared factory.
 */
if (typeof window !== 'undefined') {
  window.MonacoEnvironment = {
    getWorker(_id, label) {
      if (label === 'json') {
        return new Worker(
          new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
          { type: 'module' },
        );
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new Worker(
          new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
          { type: 'module' },
        );
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new Worker(
          new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
          { type: 'module' },
        );
      }
      if (label === 'typescript' || label === 'javascript') {
        return new Worker(
          new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
          { type: 'module' },
        );
      }
      return new Worker(
        new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
        { type: 'module' },
      );
    },
  };
}

let configured = false;

/**
 * Idempotent: whichever surface mounts first pays for it, and the second is a
 * no-op. Themes in particular must not be redefined, and the TypeScript
 * defaults are global to Monaco rather than per-editor.
 */
export function configureMonaco(): void {
  if (configured) return;
  configured = true;

  const compilerOptions: monaco.languages.typescript.CompilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    jsxImportSource: 'react',
    allowJs: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    isolatedModules: true,
    strict: true,
    skipLibCheck: true,
  };

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

  for (const [name, data] of Object.values(MONACO_THEMES)) {
    monaco.editor.defineTheme(name, data);
  }

  /*
   * Emmet: `div` + Tab expands to <div></div>, `ul>li*3`, `.card`, and the rest
   * of the Emmet vocabulary. The JSX variant covers .tsx/.jsx and emits
   * `className` instead of `class`.
   */
  emmetHTML(monaco, ['html']);
  emmetCSS(monaco, ['css', 'scss', 'less']);
  emmetJSX(monaco, ['javascript', 'typescript']);

  void loadReactTypes(monaco);
}

export { monaco };
