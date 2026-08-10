import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { ResolvedTheme } from '@mai-habi/ui';

/**
 * Monaco themes, designed per mode rather than inverted.
 *
 * Syntax hues are chosen for each background separately: the light set is
 * saturated and dark enough to read on white, the dark set is desaturated and
 * bright enough to read on near-black without glaring during long sessions.
 *
 * Rules target Monaco's Monarch token names. The matching tokenizer
 * contributions are registered by `CodeEditor` before these themes are used.
 */

export const MONACO_LIGHT = 'mai-habi-light';
export const MONACO_DARK = 'mai-habi-dark';

const lightTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '171717' },
    { token: 'identifier', foreground: '171717' },
    { token: 'comment', foreground: '787878', fontStyle: 'italic' },
    { token: 'keyword', foreground: '7c3aed' },
    { token: 'string', foreground: '047857' },
    { token: 'string.escape', foreground: '047857', fontStyle: 'bold' },
    { token: 'string.invalid', foreground: 'b42318' },
    { token: 'number', foreground: 'b45309' },
    { token: 'regexp', foreground: 'b45309' },
    { token: 'type', foreground: '1d4ed8' },
    { token: 'type.identifier', foreground: '1d4ed8' },
    { token: 'tag', foreground: 'be123c' },
    { token: 'attribute.name', foreground: '7c3aed' },
    { token: 'attribute.value', foreground: '047857' },
    { token: 'delimiter', foreground: '737373' },
    { token: 'delimiter.bracket', foreground: '525252' },
    { token: 'invalid', foreground: 'b42318' },

  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#171717',
    'editor.lineHighlightBackground': '#fafafa',
    'editor.selectionBackground': '#dedede',
    'editor.inactiveSelectionBackground': '#eeeeee',
    'editor.findMatchBackground': '#ffe08a',
    'editor.findMatchHighlightBackground': '#fff3c4',
    'editorLineNumber.foreground': '#c4c4c4',
    'editorLineNumber.activeForeground': '#525252',
    'editorIndentGuide.background1': '#f0f0f0',
    'editorIndentGuide.activeBackground1': '#d4d4d4',
    'editorGutter.background': '#ffffff',
    'editorCursor.foreground': '#171717',
    'editorWhitespace.foreground': '#e5e5e5',
    'editorWidget.background': '#ffffff',
    'editorWidget.border': '#e5e5e5',
    'editorSuggestWidget.background': '#ffffff',
    'editorSuggestWidget.border': '#e5e5e5',
    'editorSuggestWidget.selectedBackground': '#f5f5f5',
    'editorHoverWidget.background': '#ffffff',
    'editorHoverWidget.border': '#e5e5e5',
    'editorError.foreground': '#b42318',
    'editorWarning.foreground': '#b54708',
    'scrollbarSlider.background': '#d4d4d480',
    'scrollbarSlider.hoverBackground': '#b8b8b8b0',
    'scrollbarSlider.activeBackground': '#a3a3a3',
    'input.background': '#ffffff',
    'input.border': '#e5e5e5',
    'focusBorder': '#171717',
  },
};

const darkTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'f5f5f5' },
    { token: 'identifier', foreground: 'f5f5f5' },
    { token: 'comment', foreground: '8a8a8a', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c4b5fd' },
    { token: 'string', foreground: '86efac' },
    { token: 'string.escape', foreground: '86efac', fontStyle: 'bold' },
    { token: 'string.invalid', foreground: 'fda29b' },
    { token: 'number', foreground: 'fcd34d' },
    { token: 'regexp', foreground: 'fcd34d' },
    { token: 'type', foreground: '93c5fd' },
    { token: 'type.identifier', foreground: '93c5fd' },
    { token: 'tag', foreground: 'fda4af' },
    { token: 'attribute.name', foreground: 'c4b5fd' },
    { token: 'attribute.value', foreground: '86efac' },
    { token: 'delimiter', foreground: 'a3a3a3' },
    { token: 'delimiter.bracket', foreground: 'd4d4d4' },
    { token: 'invalid', foreground: 'fda29b' },

  ],
  colors: {
    'editor.background': '#111111',
    'editor.foreground': '#f5f5f5',
    'editor.lineHighlightBackground': '#181818',
    'editor.selectionBackground': '#333333',
    'editor.inactiveSelectionBackground': '#262626',
    'editor.findMatchBackground': '#5c4813',
    'editor.findMatchHighlightBackground': '#3d310e',
    'editorLineNumber.foreground': '#4d4d4d',
    'editorLineNumber.activeForeground': '#a3a3a3',
    'editorIndentGuide.background1': '#1f1f1f',
    'editorIndentGuide.activeBackground1': '#343434',
    'editorGutter.background': '#111111',
    'editorCursor.foreground': '#f5f5f5',
    'editorWhitespace.foreground': '#262626',
    'editorWidget.background': '#181818',
    'editorWidget.border': '#262626',
    'editorSuggestWidget.background': '#181818',
    'editorSuggestWidget.border': '#262626',
    'editorSuggestWidget.selectedBackground': '#262626',
    'editorHoverWidget.background': '#181818',
    'editorHoverWidget.border': '#262626',
    'editorError.foreground': '#fda29b',
    'editorWarning.foreground': '#fdb022',
    'scrollbarSlider.background': '#34343480',
    'scrollbarSlider.hoverBackground': '#454545b0',
    'scrollbarSlider.activeBackground': '#555555',
    'input.background': '#111111',
    'input.border': '#262626',
    'focusBorder': '#f5f5f5',
  },
};

export const MONACO_THEMES: Record<ResolvedTheme, [string, monaco.editor.IStandaloneThemeData]> = {
  light: [MONACO_LIGHT, lightTheme],
  dark: [MONACO_DARK, darkTheme],
};

export function monacoThemeName(theme: ResolvedTheme): string {
  return theme === 'dark' ? MONACO_DARK : MONACO_LIGHT;
}
