import type { FileMap } from '@mai-habi/types';
import { base64ToBytes, slugify } from '@mai-habi/shared';
import { listFiles } from './operations';

/**
 * Exports the authored project only.
 *
 * There are no installed dependencies to leave out: React comes from the
 * platform, so the archive is exactly what the user wrote.
 */
export async function exportToZip(files: FileMap, projectName: string): Promise<Blob> {
  const { zipSync } = await import('fflate');
  const encoder = new TextEncoder();
  const payload: Record<string, Uint8Array> = {};

  for (const file of listFiles(files)) {
    payload[file.path] =
      file.encoding === 'base64' ? base64ToBytes(file.content) : encoder.encode(file.content);
  }

  // Keep empty folders the user deliberately created.
  for (const node of Object.values(files)) {
    if (node.type === 'directory' && !Object.keys(payload).some((p) => p.startsWith(`${node.path}/`))) {
      payload[`${node.path}/.gitkeep`] = new Uint8Array();
    }
  }

  const zipped = zipSync(payload, { level: 6 });
  return new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadProject(files: FileMap, projectName: string): Promise<void> {
  const blob = await exportToZip(files, projectName);
  downloadBlob(blob, `${slugify(projectName)}.zip`);
}

export function downloadFile(path: string, content: string, encoding: 'utf8' | 'base64'): void {
  const bytes = encoding === 'base64' ? base64ToBytes(content) : new TextEncoder().encode(content);
  downloadBlob(new Blob([bytes as unknown as BlobPart]), path.split('/').pop() ?? 'file');
}
