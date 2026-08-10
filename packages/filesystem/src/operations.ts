import type { FileMap, FsNode, ProjectFile, TreeNode } from '@mai-habi/types';
import { basename, dirname, isDescendant, joinPath, normalizePath } from './path';
import { isBinaryPath } from './language';

function encodedSize(content: string, encoding: 'utf8' | 'base64'): number {
  return encoding === 'utf8' ? new TextEncoder().encode(content).length : Math.floor((content.length * 3) / 4);
}

function ensureParents(files: FileMap, path: string): FileMap {
  const next = { ...files };
  const segments = normalizePath(path).split('/');
  segments.pop();

  let prefix = '';
  for (const segment of segments) {
    prefix = prefix ? `${prefix}/${segment}` : segment;
    if (!next[prefix]) next[prefix] = { path: prefix, type: 'directory' };
  }

  return next;
}

export function exists(files: FileMap, path: string): boolean {
  return Boolean(files[normalizePath(path)]);
}

export function readFile(files: FileMap, path: string): ProjectFile | null {
  const node = files[normalizePath(path)];
  return node && node.type === 'file' ? node : null;
}

export function writeFile(
  files: FileMap,
  path: string,
  content: string,
  encoding: 'utf8' | 'base64' = 'utf8',
): FileMap {
  const key = normalizePath(path);
  const next = ensureParents(files, key);
  next[key] = { path: key, type: 'file', content, encoding, size: encodedSize(content, encoding) };
  return next;
}

export function createFile(files: FileMap, path: string, content = ''): FileMap {
  const key = normalizePath(path);
  if (files[key]) throw new Error(`"${basename(key)}" already exists.`);
  return writeFile(files, key, content, isBinaryPath(key) ? 'base64' : 'utf8');
}

export function createFolder(files: FileMap, path: string): FileMap {
  const key = normalizePath(path);
  if (files[key]) throw new Error(`"${basename(key)}" already exists.`);

  const next = ensureParents(files, key);
  next[key] = { path: key, type: 'directory' };
  return next;
}

export function deleteNode(files: FileMap, path: string): FileMap {
  const key = normalizePath(path);
  const next: FileMap = {};

  for (const [candidate, node] of Object.entries(files)) {
    if (isDescendant(key, candidate)) continue;
    next[candidate] = node;
  }

  return next;
}

/** Rename and move share an implementation — both rewrite a path prefix. */
export function moveNode(files: FileMap, from: string, to: string): FileMap {
  const source = normalizePath(from);
  const target = normalizePath(to);

  if (source === target) return files;
  if (!files[source]) throw new Error(`"${basename(source)}" no longer exists.`);
  if (isDescendant(source, target)) throw new Error('A folder cannot be moved into itself.');
  if (files[target]) throw new Error(`"${basename(target)}" already exists.`);

  let next = ensureParents(files, target);
  const moved: FileMap = {};

  for (const [candidate, node] of Object.entries(next)) {
    if (!isDescendant(source, candidate)) {
      moved[candidate] = node;
      continue;
    }
    const suffix = candidate.slice(source.length);
    const relocated = `${target}${suffix}`;
    moved[relocated] = { ...node, path: relocated };
  }

  next = moved;
  return next;
}

export function renameNode(files: FileMap, path: string, nextName: string): FileMap {
  const key = normalizePath(path);
  const name = nextName.trim();

  if (!name || name.includes('/') || name === '.' || name === '..') {
    throw new Error('Enter a valid name.');
  }

  return moveNode(files, key, joinPath(dirname(key), name));
}

export function duplicateNode(files: FileMap, path: string): FileMap {
  const key = normalizePath(path);
  const node = files[key];
  if (!node) throw new Error('Nothing to duplicate.');

  const target = uniquePath(files, key);
  const next = ensureParents(files, target);

  for (const [candidate, entry] of Object.entries(files)) {
    if (!isDescendant(key, candidate)) continue;
    const relocated = `${target}${candidate.slice(key.length)}`;
    next[relocated] = { ...entry, path: relocated };
  }

  return next;
}

export function uniquePath(files: FileMap, path: string): string {
  const key = normalizePath(path);
  const directory = dirname(key);
  const name = basename(key);
  const dotIndex = name.lastIndexOf('.');
  const stem = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const extension = dotIndex > 0 ? name.slice(dotIndex) : '';

  let attempt = 1;
  let candidate = joinPath(directory, `${stem} copy${extension}`);
  while (files[candidate]) {
    attempt += 1;
    candidate = joinPath(directory, `${stem} copy ${attempt}${extension}`);
  }

  return candidate;
}

/* ------------------------------------------------------------------- listing */

export function buildTree(files: FileMap): TreeNode[] {
  const root: TreeNode = { name: '', path: '', type: 'directory', children: [] };
  const directories = new Map<string, TreeNode>([['', root]]);

  const ensureDirectory = (path: string): TreeNode => {
    const existing = directories.get(path);
    if (existing) return existing;

    const parent = ensureDirectory(dirname(path));
    const node: TreeNode = { name: basename(path), path, type: 'directory', children: [] };
    parent.children!.push(node);
    directories.set(path, node);
    return node;
  };

  for (const node of Object.values(files)) {
    if (node.type === 'directory') {
      ensureDirectory(node.path);
      continue;
    }
    const parent = ensureDirectory(dirname(node.path));
    parent.children!.push({ name: basename(node.path), path: node.path, type: 'file' });
  }

  sortTree(root);
  return root.children ?? [];
}

function sortTree(node: TreeNode): void {
  if (!node.children) return;

  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  for (const child of node.children) sortTree(child);
}

export function listFiles(files: FileMap): ProjectFile[] {
  return Object.values(files).filter((node): node is ProjectFile => node.type === 'file');
}

export function projectSize(files: FileMap): number {
  return listFiles(files).reduce((total, file) => total + file.size, 0);
}

/* --------------------------------------------------------------- serialising */

export interface SerializedProject {
  version: 1;
  files: Array<{ path: string; type: 'file' | 'directory'; content?: string; encoding?: string }>;
}

export function serializeProject(files: FileMap): SerializedProject {
  return {
    version: 1,
    files: Object.values(files).map((node) =>
      node.type === 'file'
        ? { path: node.path, type: 'file', content: node.content, encoding: node.encoding }
        : { path: node.path, type: 'directory' },
    ),
  };
}

export function deserializeProject(input: SerializedProject): FileMap {
  const files: FileMap = {};

  for (const entry of input.files ?? []) {
    const path = normalizePath(entry.path);
    if (!path) continue;

    if (entry.type === 'directory') {
      files[path] = { path, type: 'directory' };
      continue;
    }

    const encoding = entry.encoding === 'base64' ? 'base64' : 'utf8';
    const content = entry.content ?? '';
    files[path] = { path, type: 'file', content, encoding, size: encodedSize(content, encoding) };
  }

  return files;
}

/** Shape the viewer and the publisher consume — content only, no metadata. */
export function toContentMap(files: FileMap): Record<string, { content: string; encoding: 'utf8' | 'base64' }> {
  const out: Record<string, { content: string; encoding: 'utf8' | 'base64' }> = {};
  for (const node of Object.values(files)) {
    if (node.type !== 'file') continue;
    out[node.path] = { content: node.content, encoding: node.encoding };
  }
  return out;
}

export function nodeAt(files: FileMap, path: string): FsNode | undefined {
  return files[normalizePath(path)];
}
