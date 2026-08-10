import type { FileMap } from '@mai-habi/types';
import { LIMITS, bytesToBase64 } from '@mai-habi/shared';
import { isBinaryPath } from './language';
import { depthOf, isSafePath, normalizePath, shouldIgnoreImportPath, stripCommonRoot } from './path';

export interface ImportResult {
  files: FileMap;
  skipped: string[];
  warnings: string[];
}

interface RawEntry {
  path: string;
  bytes: Uint8Array;
}

/**
 * Imported projects are untrusted input. Every entry is validated for path
 * traversal, size and depth before it reaches the virtual filesystem, and the
 * contents are never evaluated by the editor document.
 */
function assemble(entries: RawEntry[]): ImportResult {
  const skipped: string[] = [];
  const warnings: string[] = [];

  const candidates = entries.filter((entry) => {
    if (!isSafePath(entry.path)) {
      skipped.push(entry.path);
      return false;
    }
    return !shouldIgnoreImportPath(entry.path);
  });

  const prefix = stripCommonRoot(candidates.map((entry) => normalizePath(entry.path)));
  const files: FileMap = {};
  let totalBytes = 0;
  let count = 0;

  for (const entry of candidates) {
    const normalized = normalizePath(entry.path);
    const path = prefix ? normalized.slice(prefix.length + 1) : normalized;
    if (!path) continue;

    if (depthOf(path) > LIMITS.maxFolderDepth) {
      skipped.push(path);
      continue;
    }
    if (entry.bytes.length > LIMITS.maxFileSize) {
      skipped.push(path);
      warnings.push(`${path} is larger than the ${LIMITS.maxFileSize / 1024 / 1024} MB file limit.`);
      continue;
    }

    count += 1;
    totalBytes += entry.bytes.length;

    if (count > LIMITS.maxFileCount) {
      warnings.push(`Stopped after ${LIMITS.maxFileCount} files.`);
      break;
    }
    if (totalBytes > LIMITS.maxProjectSize) {
      warnings.push(`Stopped at the ${LIMITS.maxProjectSize / 1024 / 1024} MB project limit.`);
      break;
    }

    const binary = isBinaryPath(path);
    const content = binary
      ? bytesToBase64(entry.bytes)
      : new TextDecoder('utf-8', { fatal: false }).decode(entry.bytes);

    files[path] = {
      path,
      type: 'file',
      content,
      encoding: binary ? 'base64' : 'utf8',
      size: entry.bytes.length,
    };

    const segments = path.split('/');
    segments.pop();
    let directory = '';
    for (const segment of segments) {
      directory = directory ? `${directory}/${segment}` : segment;
      if (!files[directory]) files[directory] = { path: directory, type: 'directory' };
    }
  }

  if (skipped.length > 0) {
    warnings.push(`${skipped.length} entr${skipped.length === 1 ? 'y was' : 'ies were'} skipped.`);
  }

  return { files, skipped, warnings };
}

/** Handles both a file picker selection and a directory picker (webkitdirectory). */
export async function importFromFiles(list: File[] | FileList): Promise<ImportResult> {
  const files = Array.from(list as ArrayLike<File>);

  const entries = await Promise.all(
    files.map(async (file) => ({
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  );

  return assemble(entries);
}

export async function importFromZip(archive: ArrayBuffer | Uint8Array): Promise<ImportResult> {
  const { unzipSync } = await import('fflate');
  const bytes = archive instanceof Uint8Array ? archive : new Uint8Array(archive);

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(bytes, {
      filter: (file) => !shouldIgnoreImportPath(file.name) && file.originalSize <= LIMITS.maxFileSize,
    });
  } catch {
    throw new Error('That file could not be read as a ZIP archive.');
  }

  const entries: RawEntry[] = Object.entries(unzipped)
    .filter(([path]) => !path.endsWith('/'))
    .map(([path, data]) => ({ path, bytes: data }));

  if (entries.length === 0) throw new Error('The archive did not contain any importable files.');

  return assemble(entries);
}

/** Reads a drag-and-drop payload, walking directory entries recursively. */
export async function importFromDataTransfer(transfer: DataTransfer): Promise<ImportResult> {
  const items = Array.from(transfer.items).filter((item) => item.kind === 'file');
  const roots = items
    .map((item) => (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => Boolean(entry));

  if (roots.length === 0) {
    return importFromFiles(Array.from(transfer.files));
  }

  const collected: RawEntry[] = [];
  await Promise.all(roots.map((entry) => walk(entry, '', collected)));

  const zip = collected.find((entry) => entry.path.toLowerCase().endsWith('.zip'));
  if (collected.length === 1 && zip) return importFromZip(zip.bytes);

  return assemble(collected);
}

async function walk(entry: FileSystemEntry, prefix: string, out: RawEntry[]): Promise<void> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;
  if (shouldIgnoreImportPath(path)) return;

  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    out.push({ path, bytes: new Uint8Array(await file.arrayBuffer()) });
    return;
  }

  if (!entry.isDirectory) return;

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) break;
    for (const child of batch) await walk(child, path, out);
  }
}
