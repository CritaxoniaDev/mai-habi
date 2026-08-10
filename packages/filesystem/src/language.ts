import type { FileLanguage } from '@mai-habi/types';
import { basename, extname } from './path';

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.tsx': 'typescript',
  '.json': 'json',
  '.jsonc': 'json',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.astro': 'html',
  '.svg': 'xml',
  '.xml': 'xml',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.sh': 'shell',
  '.txt': 'plaintext',
};

const MIME_BY_EXTENSION: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/javascript',
  '.tsx': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.wasm': 'application/wasm',
};

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.bmp',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.mp4',
  '.webm',
  '.mov',
  '.mp3',
  '.wav',
  '.ogg',
  '.pdf',
  '.zip',
  '.gz',
  '.wasm',
]);

/** JSX and TSX intentionally map onto the TS worker so React syntax resolves. */
export function languageForPath(path: string): string {
  const name = basename(path).toLowerCase();
  if (name.startsWith('.env')) return 'shell';
  return LANGUAGE_BY_EXTENSION[extname(path)] ?? 'plaintext';
}

const SCHEMA_LANGUAGE: Record<string, FileLanguage> = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'javascriptreact',
  '.ts': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.tsx': 'typescriptreact',
  '.css': 'css',
  '.html': 'html',
  '.htm': 'html',
  '.json': 'json',
  '.md': 'markdown',
};

/** The language name carried in the project schema. */
export function fileLanguage(path: string): FileLanguage {
  return SCHEMA_LANGUAGE[extname(path)] ?? 'plaintext';
}

/** Files the compiler can read as source text. */
export function isCompilablePath(path: string): boolean {
  return ['.js', '.mjs', '.jsx', '.ts', '.tsx', '.css', '.html', '.htm', '.json'].includes(
    extname(path),
  );
}

export function mimeForPath(path: string): string {
  return MIME_BY_EXTENSION[extname(path)] ?? 'application/octet-stream';
}

export function isBinaryPath(path: string): boolean {
  return BINARY_EXTENSIONS.has(extname(path));
}

export function isImagePath(path: string): boolean {
  return mimeForPath(path).startsWith('image/');
}
