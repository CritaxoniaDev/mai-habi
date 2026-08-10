import * as fflate from 'fflate';
import { base64ToBytes, bytesToBase64 } from './utils';

/**
 * Guest shares travel inside the link fragment when object storage is not
 * configured, so the payload is gzipped and base64url encoded.
 */

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array, flag: 'g' | 'r'): string {
  return (
    flag +
    bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  );
}

/**
 * Synchronous variant, used where an `await` would break the user gesture that
 * a popup blocker is watching for — opening the viewer, in particular.
 */
export function compressToBase64UrlSync(text: string): string {
  const { gzipSync, strToU8 } = fflate;
  return toBase64Url(gzipSync(strToU8(text), { level: 6 }), 'g');
}

export function supportsCompressionStreams(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

export async function compressToBase64Url(text: string): Promise<string> {
  if (!supportsCompressionStreams()) return compressToBase64UrlSync(text);

  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return toBase64Url(await collect(stream), 'g');
}

export async function decompressFromBase64Url(encoded: string): Promise<string> {
  const flag = encoded.slice(0, 1);
  const body = encoded.slice(1).replace(/-/g, '+').replace(/_/g, '/');
  const bytes = base64ToBytes(body.padEnd(Math.ceil(body.length / 4) * 4, '='));

  if (flag !== 'g') return new TextDecoder().decode(bytes);
  if (!supportsCompressionStreams()) return fflate.strFromU8(fflate.gunzipSync(bytes));

  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new TextDecoder().decode(await collect(stream));
}
