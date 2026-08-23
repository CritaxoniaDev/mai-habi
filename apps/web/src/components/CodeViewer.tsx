'use client';

import { useEffect, useRef } from 'react';
import { languageForPath } from '@mai-habi/filesystem';
import { useTheme } from '@mai-habi/ui';
import { configureMonaco, monaco } from '../lib/monaco-runtime';
import { monacoThemeName } from '../lib/editor-themes';

export interface CodeViewerProps {
  /** Drives syntax highlighting; the extension is all that is read. */
  path: string;
  value: string;
  className?: string;
}

/**
 * Read-only Monaco, for surfaces that show code they do not own — a repository
 * preview, a response body.
 *
 * It shares the workspace editor's runtime, so highlighting, themes and the
 * type worker behave identically rather than being a second, lesser rendering
 * of the same code. Models are created detached from any file URI: these
 * documents are not project files, and reusing `file:///` URIs would collide
 * with the editor's own models and pull them into TypeScript's program.
 */
export function CodeViewer({ path, value, className }: CodeViewerProps) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    if (!host.current || editor.current) return;
    configureMonaco();

    editor.current = monaco.editor.create(host.current, {
      value,
      language: languageForPath(path),
      theme: monacoThemeName(resolved),
      readOnly: true,
      domReadOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      renderLineHighlight: 'none',
      // Nothing here is being written, so the writing affordances are noise.
      occurrencesHighlight: 'off',
      selectionHighlight: false,
      matchBrackets: 'never',
      folding: true,
      contextmenu: false,
      scrollbar: { alwaysConsumeMouseWheel: false },
      padding: { top: 12, bottom: 12 },
    });

    return () => {
      editor.current?.getModel()?.dispose();
      editor.current?.dispose();
      editor.current = null;
    };
    // Created once; the effects below carry later changes in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* A new file swaps the model rather than the editor, keeping one instance. */
  useEffect(() => {
    const instance = editor.current;
    if (!instance) return;

    const previous = instance.getModel();
    const next = monaco.editor.createModel(value, languageForPath(path));
    instance.setModel(next);
    previous?.dispose();
  }, [path, value]);

  useEffect(() => {
    monaco.editor.setTheme(monacoThemeName(resolved));
  }, [resolved]);

  return <div ref={host} className={className} />;
}

export default CodeViewer;
