import { useEffect, useRef } from 'react';

import type { Problem } from '@mai-habi/types';
import {
  isDocxPath,
  isImagePath,
  isPdfPath,
  languageForPath,
  mimeForPath,
} from '@mai-habi/filesystem';
import { MediaViewer, isMediaPath } from './MediaViewer';
import { PdfPreview } from './PdfPreview';
import { DocxPreview } from './DocxPreview';
import { cn, useTheme } from '@mai-habi/ui';
import { useWorkspace } from '../../state/workspace';
/*
 * Worker environment, themes, Emmet and the TypeScript defaults all live in
 * the shared runtime, so the read-only viewers get exactly the same Monaco.
 */
import { configureMonaco, monaco } from '../../lib/monaco-runtime';
import { monacoThemeName } from '../../lib/editor-themes';

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
  const revealTarget = useWorkspace((state) => state.revealTarget);
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

  /*
   * Search results scroll the editor to their line. The model swap above runs
   * on the same activeTab change, so this waits a frame to let it land —
   * revealing a line on the outgoing model would scroll the wrong file.
   */
  useEffect(() => {
    const instance = editor.current;
    if (!instance || !revealTarget) return;
    if (revealTarget.path !== activeTab) return;

    const frame = requestAnimationFrame(() => {
      instance.revealLineInCenter(revealTarget.line);
      instance.setPosition({ lineNumber: revealTarget.line, column: revealTarget.column });
      instance.focus();
      useWorkspace.getState().consumeReveal();
    });

    return () => cancelAnimationFrame(frame);
  }, [revealTarget, activeTab]);

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

  const image =
    activeTab && file?.type === 'file' && isImagePath(activeTab)
      ? file.encoding === 'base64'
        ? `data:${mimeForPath(activeTab)};base64,${file.content}`
        : `data:${mimeForPath(activeTab)};utf8,${encodeURIComponent(file.content)}`
      : null;

  const media =
    activeTab && file?.type === 'file' && isMediaPath(activeTab) ? { path: activeTab, file } : null;

  const pdf =
    activeTab && file?.type === 'file' && isPdfPath(activeTab) ? { path: activeTab, file } : null;

  const docx =
    activeTab && file?.type === 'file' && isDocxPath(activeTab) ? { path: activeTab, file } : null;

  const showEditor = Boolean(activeTab && file && !image && !media && !pdf && !docx);

  /*
   * The host stays mounted in every state.
   *
   * Returning a different <div> when no tab is open used to leave the editor
   * on screen: React reuses a DOM node when the element type and position
   * match, so it appended the placeholder and updated the class but left
   * Monaco's own DOM — which React never created — untouched. Keeping one host
   * and covering it sidesteps that, and it also means the editor instance
   * survives closing every tab rather than being orphaned and never rebuilt.
   *
   * `invisible` rather than `hidden`: the box keeps its size, so Monaco holds
   * its layout instead of measuring zero and having to recover on reopen.
   */
  return (
    <div className="relative h-full w-full bg-surface">
      <div
        ref={host}
        aria-hidden={!showEditor}
        className={cn('h-full w-full', !showEditor && 'invisible')}
      />

      {!showEditor && (
        <div
          className={cn(
            'absolute inset-0',
            media || pdf || docx ? '' : 'flex items-center justify-center',
            image ? 'bg-background p-8' : media || pdf || docx ? '' : 'bg-surface',
          )}
        >
          {media ? (
            <MediaViewer path={media.path} file={media.file} />
          ) : pdf ? (
            <PdfPreview path={pdf.path} file={pdf.file} />
          ) : docx ? (
            <DocxPreview path={docx.path} file={docx.file} />
          ) : image ? (
            <img
              src={image}
              alt={activeTab ?? ''}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <p className="text-secondary font-light text-muted-foreground">
              Select a file to start editing
            </p>
          )}
        </div>
      )}
    </div>
  );
}
