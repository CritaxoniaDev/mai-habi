/**
 * Messages exchanged with the compiler worker, and between the preview iframe
 * and its host.
 *
 * Both directions are validated by shape before anything is trusted.
 */

export interface CompileRequest {
  type: 'compile';
  id: number;
  /** Path -> source text. Only text files reach the compiler. */
  files: Record<string, string>;
  entry: string;
  minify: boolean;
}

export interface DisposeRequest {
  type: 'dispose';
}

export type WorkerRequest = CompileRequest | DisposeRequest;

export interface CompileLocation {
  file: string;
  line: number;
  column: number;
}

export interface CompileDiagnostic {
  message: string;
  location: CompileLocation | null;
  /** esbuild's own excerpt of the offending line, when it provides one. */
  snippet?: string;
}

export interface CompileSuccess {
  type: 'result';
  id: number;
  ok: true;
  js: string;
  css: string;
  /** Milliseconds spent inside esbuild, for the status line. */
  durationMs: number;
  warnings: CompileDiagnostic[];
}

export interface CompileFailure {
  type: 'result';
  id: number;
  ok: false;
  errors: CompileDiagnostic[];
  warnings: CompileDiagnostic[];
  durationMs: number;
}

export interface WorkerStatus {
  type: 'status';
  stage: 'loading-compiler' | 'ready' | 'compiling';
}

export type WorkerResponse = CompileSuccess | CompileFailure | WorkerStatus;

/* --------------------------------------------------------- preview messages */

export type PreviewMessage =
  | { type: 'preview:ready' }
  | { type: 'preview:console'; level: ConsoleLevel; text: string; at: number }
  | { type: 'preview:error'; message: string; stack?: string; at: number };

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export function isPreviewMessage(value: unknown): value is PreviewMessage {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === 'preview:ready' || type === 'preview:console' || type === 'preview:error'
  );
}
