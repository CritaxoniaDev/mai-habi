import type { FileMap, Project } from '@mai-habi/types';
import { detectEntryFile, synthesiseEntry } from '@mai-habi/filesystem';
import { filesFromRecord, toSourceMap } from '@mai-habi/shared';
import { CompilerClient, type CompileResult } from '@mai-habi/compiler';

/**
 * Owns the single compiler worker for the page.
 *
 * The worker is created the first time something actually needs compiling, so
 * the dashboard never downloads esbuild.
 */

let client: CompilerClient | null = null;

export function getCompiler(): CompilerClient {
  if (client) return client;

  const worker = new Worker(new URL('../workers/compiler.worker.ts', import.meta.url), {
    type: 'module',
    name: 'mai-habi-compiler',
  });

  client = new CompilerClient(worker);
  return client;
}

export function disposeCompiler(): void {
  client?.dispose();
  client = null;
}

export interface PreparedCompile {
  files: Record<string, string>;
  entry: string;
}

/**
 * Turns the project into compiler input.
 *
 * When a project has no mount file the platform generates one, so a user can
 * work entirely inside `App.tsx` without writing `createRoot` themselves.
 */
export function prepareCompile(project: Project, files: FileMap): PreparedCompile | null {
  const sources = toSourceMap(files);
  const entry = detectEntryFile(files, project.settings.entryFile);

  if (entry) return { files: sources, entry };

  const generated = synthesiseEntry(files);
  if (!generated) return null;

  return {
    files: { ...sources, [generated.path]: generated.contents },
    entry: generated.path,
  };
}

/**
 * The same entry resolution for a snapshot, which the viewer and shared links
 * compile from. A snapshot already carries a flat source map and a configured
 * entry rather than a FileMap; when that entry is missing — as it is for a
 * Next.js project or an import with no explicit mount — a mount is synthesised,
 * exactly as the editor does. Without this the viewer would fail with
 * `Entry file "" was not found.`
 */
export function prepareSnapshotCompile(
  files: Record<string, string>,
  entryFile: string,
): PreparedCompile | null {
  const fileMap = filesFromRecord(files);
  const entry = detectEntryFile(fileMap, entryFile);

  if (entry) return { files, entry };

  const generated = synthesiseEntry(fileMap);
  if (!generated) return null;

  return {
    files: { ...files, [generated.path]: generated.contents },
    entry: generated.path,
  };
}

export async function compileProject(
  project: Project,
  files: FileMap,
  options: { minify?: boolean } = {},
): Promise<CompileResult> {
  const prepared = prepareCompile(project, files);

  if (!prepared) {
    return {
      ok: false,
      durationMs: 0,
      warnings: [],
      errors: [
        {
          message:
            'This project has no entry file. Add index.html, src/main.tsx, or a component the platform can mount.',
          location: null,
        },
      ],
    };
  }

  return getCompiler().compile(prepared.files, prepared.entry, options.minify ?? false);
}
