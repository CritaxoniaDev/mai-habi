import { useEffect, useRef } from 'react';

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

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import type { Problem } from '@mai-habi/types';
import { isImagePath, languageForPath, mimeForPath } from '@mai-habi/filesystem';
import { useTheme } from '@mai-habi/ui';
import { useWorkspace } from '../../state/workspace';
import { MONACO_THEMES, monacoThemeName } from '../../lib/editor-themes';
import { loadReactTypes } from '../../lib/monaco-types';

declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment;
  }
}

window.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

let configured = false;

function configureMonaco(): void {
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

function modelFor(path: string, content: string): monaco.editor.ITextModel {
  const uri = monaco.Uri.parse(`file:///${path}`);
  const existing = monaco.editor.getModel(uri);
  if (existing) return existing;

  return monaco.editor.createModel(content, languageForPath(path), uri);
}

function toProblems(): Problem[] {
  return monaco.editor
    .getModelMarkers({})
    .filter(
      (marker) =>
        marker.severity >= monaco.MarkerSeverity.Warning && marker.owner !== 'mai-habi-compiler',
    )
    .slice(0, 200)
    .map((marker) => ({
      path: marker.resource.path.replace(/^\//, ''),
      line: marker.startLineNumber,
      column: marker.startColumn,
      message: marker.message,
      severity: marker.severity === monaco.MarkerSeverity.Error ? 'error' : 'warning',
      source: marker.owner,
    }));
}

/**
 * One editor instance for the whole session; switching tabs swaps the model so
 * undo history, folding and scroll position survive.
 */
export function CodeEditor() {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const activeTab = useWorkspace((state) => state.activeTab);
  const settings = useWorkspace((state) => state.project?.settings);
  const file = useWorkspace((state) => (state.activeTab ? state.files[state.activeTab] : null));
  const compileErrors = useWorkspace((state) => state.compileErrors);
  const { resolved } = useTheme();

  useEffect(() => {
    if (!host.current || editor.current) return;
    configureMonaco();

    editor.current = monaco.editor.create(host.current, {
      theme: monacoThemeName(resolved),
      automaticLayout: true,
      'semanticHighlighting.enabled': true,
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      lineHeight: 21,
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      padding: { top: 14, bottom: 20 },
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: true,
      guides: { indentation: true },
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
      overviewRulerLanes: 0,
      tabSize: 2,
      wordWrap: 'off',
      multiCursorModifier: 'ctrlCmd',
      formatOnPaste: true,
    });

    const changed = editor.current.onDidChangeModelContent(() => {
      const model = editor.current?.getModel();
      const path = model?.uri.path.replace(/^\//, '');
      if (path && model) useWorkspace.getState().setContent(path, model.getValue());
    });

    const markers = monaco.editor.onDidChangeMarkers(() => {
      useWorkspace.getState().setProblems(toProblems());
    });

    return () => {
      changed.dispose();
      markers.dispose();
      editor.current?.dispose();
      editor.current = null;
      for (const model of monaco.editor.getModels()) model.dispose();
    };
  }, []);

  useEffect(() => {
    const instance = editor.current;
    if (!instance || !activeTab || !file || file.type !== 'file') return;
    if (isImagePath(activeTab)) return;

    const model = modelFor(activeTab, file.encoding === 'utf8' ? file.content : '');
    if (instance.getModel() !== model) instance.setModel(model);

    // Content can change underneath us on import or an external write.
    if (file.encoding === 'utf8' && model.getValue() !== file.content) {
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: file.content }],
        () => null,
      );
    }
  }, [activeTab, file]);

  useEffect(() => {
    if (!editor.current || !settings) return;
    editor.current.updateOptions({
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap ? 'on' : 'off',
      minimap: { enabled: settings.minimap },
    });
  }, [settings?.tabSize, settings?.wordWrap, settings?.minimap]);

  /*
   * Theme changes are a global Monaco setting, not an editor option: switching
   * appearance leaves models, undo history, folding and cursor position alone.
   */
  useEffect(() => {
    if (!editor.current) return;
    monaco.editor.setTheme(monacoThemeName(resolved));
  }, [resolved]);

  /** Compiler errors are surfaced on the offending line, not just in a list. */
  useEffect(() => {
    const byFile = new Map<string, monaco.editor.IMarkerData[]>();

    for (const error of compileErrors) {
      if (!error.location) continue;
      const list = byFile.get(error.location.file) ?? [];
      list.push({
        severity: monaco.MarkerSeverity.Error,
        message: error.message,
        startLineNumber: error.location.line,
        startColumn: error.location.column + 1,
        endLineNumber: error.location.line,
        endColumn: error.location.column + 2,
      });
      byFile.set(error.location.file, list);
    }

    for (const model of monaco.editor.getModels()) {
      const path = model.uri.path.replace(/^\//, '');
      monaco.editor.setModelMarkers(model, 'mai-habi-compiler', byFile.get(path) ?? []);
    }
  }, [compileErrors]);

  if (!activeTab || !file) {
    return (
      <div className="flex h-full items-center justify-center bg-surface">
        <p className="text-secondary font-light text-muted-foreground">
          Select a file to start editing
        </p>
      </div>
    );
  }

  if (isImagePath(activeTab) && file.type === 'file') {
    const source =
      file.encoding === 'base64'
        ? `data:${mimeForPath(activeTab)};base64,${file.content}`
        : `data:${mimeForPath(activeTab)};utf8,${encodeURIComponent(file.content)}`;

    return (
      <div className="flex h-full items-center justify-center bg-background p-8">
        <img src={source} alt={activeTab} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  return <div ref={host} className="h-full w-full bg-surface" />;
}
