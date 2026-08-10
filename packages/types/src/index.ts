/**
 * Shared domain types for the editor and the viewer.
 *
 * Both modules and every package depend on this file, so it stays free of
 * runtime code — types and small constant tables only.
 */

/* ---------------------------------------------------------------- filesystem */

export type NodeType = 'file' | 'directory';

export type FileEncoding = 'utf8' | 'base64';

/** The languages Monaco and the compiler both understand. */
export type FileLanguage =
  | 'javascript'
  | 'typescript'
  | 'javascriptreact'
  | 'typescriptreact'
  | 'css'
  | 'html'
  | 'json'
  | 'markdown'
  | 'plaintext';

export interface ProjectFile {
  path: string;
  type: 'file';
  /** utf8 text, or a base64 payload when `encoding` is `base64`. */
  content: string;
  encoding: FileEncoding;
  size: number;
}

export interface ProjectFolder {
  path: string;
  type: 'directory';
}

export type FsNode = ProjectFile | ProjectFolder;

/** Flat map keyed by absolute-from-root path, e.g. `src/App.tsx`. */
export type FileMap = Record<string, FsNode>;

export interface TreeNode {
  name: string;
  path: string;
  type: NodeType;
  children?: TreeNode[];
}

/* ------------------------------------------------------------------ projects */

export type TemplateId =
  | 'react-ts'
  | 'react-js'
  | 'react-tailwind'
  | 'html-css-js'
  | 'blank'
  | 'import';

export type Visibility = 'private' | 'unlisted' | 'unlisted-source';

export type ProjectOrigin = 'local' | 'cloud';

export interface ProjectSettings {
  /** File the compiler starts from, e.g. `src/main.tsx` or `index.html`. */
  entryFile: string;
  /** Tailwind is opt-in per project and never loaded when disabled. */
  tailwind: boolean;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  autosave: boolean;
  /** Recompile automatically as the project changes. */
  autoCompile: boolean;
}

export interface Project {
  id: string;
  name: string;
  templateId: TemplateId;
  settings: ProjectSettings;
  visibility: Visibility;
  origin: ProjectOrigin;
  ownerId: string | null;
  guestId: string | null;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  openTabs: string[];
  activeTab: string | null;
}

export interface ProjectTemplate {
  id: TemplateId;
  name: string;
  description: string;
  files: Record<string, string>;
  settings: Partial<ProjectSettings>;
}

/** Wire shape used for sharing, publishing and the viewer. */
export interface PlaygroundSnapshot {
  id: string;
  name: string;
  entryFile: string;
  tailwind: boolean;
  files: Record<string, string>;
  updatedAt: number;
}

/* -------------------------------------------------------------------- status */

export type CompileState = 'idle' | 'loading-compiler' | 'compiling' | 'ready' | 'error';

export type SaveStatus =
  | 'saved-locally'
  | 'saving'
  | 'saved'
  | 'offline'
  | 'syncing'
  | 'save-failed';

export interface Problem {
  path: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source?: string;
}

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  text: string;
  at: number;
  /** Set for uncaught exceptions rather than console calls. */
  runtime?: boolean;
  stack?: string;
}

/* -------------------------------------------------------------- publications */

export interface Share {
  shareId: string;
  url: string;
  visibility: Exclude<Visibility, 'private'>;
  expiresAt: number | null;
  /** Set when the payload travels inside the link instead of object storage. */
  inline: boolean;
}

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

/* ------------------------------------------------------------------- devices */

export type DeviceId = 'full' | 'desktop' | 'tablet' | 'mobile';

export interface DevicePreset {
  id: DeviceId;
  label: string;
  width: number | null;
  height: number | null;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'full', label: 'Full', width: null, height: null },
  { id: 'desktop', label: 'Desktop', width: 1440, height: 900 },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024 },
  { id: 'mobile', label: 'Mobile', width: 390, height: 844 },
];
