'use client';

import { useEffect, useRef } from 'react';
import { languageForPath } from '@mai-habi/filesystem';
import { cn, useTheme } from '@mai-habi/ui';
import { monacoThemeName } from '../lib/editor-themes';
import { configureMonaco, monaco } from '../lib/monaco-runtime';

export interface BackendCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** A controlled Monaco surface for the single-file backend service module. */
export default function BackendCodeEditor({
  value,
  onChange,
  className,
}: BackendCodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const { resolved } = useTheme();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!host.current || editor.current) return;
    configureMonaco();

    const model = monaco.editor.createModel(
      value,
      languageForPath('service.mjs'),
    );
    const instance = monaco.editor.create(host.current, {
      model,
      theme: monacoThemeName(resolved),
      automaticLayout: true,
      ariaLabel: 'Backend service source',
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
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false,
      },
      overviewRulerLanes: 0,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'off',
      multiCursorModifier: 'ctrlCmd',
      formatOnPaste: true,
    });
    editor.current = instance;

    const changed = instance.onDidChangeModelContent(() => {
      onChangeRef.current(model.getValue());
    });

    return () => {
      changed.dispose();
      instance.dispose();
      model.dispose();
      editor.current = null;
    };
    // Monaco is created once. Later values and themes are synchronized below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const model = editor.current?.getModel();
    if (!model || model.getValue() === value) return;
    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: value }],
      () => null,
    );
  }, [value]);

  useEffect(() => {
    if (!editor.current) return;
    monaco.editor.setTheme(monacoThemeName(resolved));
  }, [resolved]);

  return <div ref={host} className={cn('min-h-0 bg-background', className)} />;
}
