import type { ComponentType } from 'react';
import { basename, extname } from '@mai-habi/filesystem';
import { cn } from '@mai-habi/ui';
import { File as FileIcon, FileCog, FileImage } from 'lucide-react';
import { LANGUAGE_LOGOS, type LanguageLogo } from './language-logos';

/**
 * File-type icons for the explorer.
 *
 * Languages get their real mark — the React atom, the TypeScript and JavaScript
 * squares, the CSS and HTML5 shields, the JSON and Markdown logos — so a file is
 * recognisable at a glance rather than by reading its extension. Categories with
 * no logo of their own (images, configuration, anything unknown) fall back to a
 * plain glyph.
 *
 * Colour comes from `--lang-*` tokens rather than the official brand palette:
 * JavaScript yellow is around 1.2:1 on white and React cyan around 1.4:1, so
 * the brand hues are kept but darkened for light mode. Every value clears 3:1
 * against the surfaces it sits on in both themes, and `npm run verify` proves
 * it.
 */

interface FileKind {
  /** A language mark, drawn from the generated logo paths. */
  logo?: LanguageLogo;
  /** Or a generic glyph, for categories with no logo. */
  Icon?: ComponentType<{ className?: string }>;
  /** Semantic token class. Components never name a colour directly. */
  tone: string;
  /** Read out for assistive technology, since colour is not available to it. */
  label: string;
}

const REACT: FileKind = { logo: 'react', tone: 'text-lang-react', label: 'React component' };
const TYPESCRIPT: FileKind = {
  logo: 'typescript',
  tone: 'text-lang-typescript',
  label: 'TypeScript',
};
const JAVASCRIPT: FileKind = {
  logo: 'javascript',
  tone: 'text-lang-javascript',
  label: 'JavaScript',
};
const CSS: FileKind = { logo: 'css', tone: 'text-lang-css', label: 'Stylesheet' };
const HTML: FileKind = { logo: 'html', tone: 'text-lang-html', label: 'HTML' };
const JSON_FILE: FileKind = { logo: 'json', tone: 'text-lang-json', label: 'JSON' };
const MARKDOWN: FileKind = { logo: 'markdown', tone: 'text-lang-markdown', label: 'Markdown' };

const IMAGE: FileKind = { Icon: FileImage, tone: 'text-lang-image', label: 'Image' };
const CONFIG: FileKind = { Icon: FileCog, tone: 'text-lang-config', label: 'Configuration' };
const PLAIN: FileKind = { Icon: FileIcon, tone: 'text-muted-foreground', label: 'File' };

const BY_EXTENSION: Record<string, FileKind> = {
  '.tsx': REACT,
  '.jsx': REACT,

  '.ts': TYPESCRIPT,
  '.mts': TYPESCRIPT,
  '.cts': TYPESCRIPT,

  '.js': JAVASCRIPT,
  '.mjs': JAVASCRIPT,
  '.cjs': JAVASCRIPT,

  '.css': CSS,
  '.scss': CSS,
  '.sass': CSS,
  '.less': CSS,

  '.html': HTML,
  '.htm': HTML,
  '.xml': HTML,

  '.json': JSON_FILE,
  '.jsonc': JSON_FILE,

  '.md': MARKDOWN,
  '.mdx': MARKDOWN,
  '.txt': MARKDOWN,

  '.svg': IMAGE,
  '.png': IMAGE,
  '.jpg': IMAGE,
  '.jpeg': IMAGE,
  '.gif': IMAGE,
  '.webp': IMAGE,
  '.avif': IMAGE,
  '.ico': IMAGE,
  '.bmp': IMAGE,

  '.woff': CONFIG,
  '.woff2': CONFIG,
  '.ttf': CONFIG,
  '.otf': CONFIG,

  '.yml': CONFIG,
  '.yaml': CONFIG,
  '.toml': CONFIG,
};

/** Names that mean more than their extension does. */
const BY_NAME: Record<string, FileKind> = {
  'tsconfig.json': CONFIG,
  'jsconfig.json': CONFIG,
  'package.json': CONFIG,
  'package-lock.json': CONFIG,
  '.gitignore': CONFIG,
  '.npmrc': CONFIG,
  '.editorconfig': CONFIG,
  'readme.md': MARKDOWN,
  license: MARKDOWN,
};

export function fileKind(path: string): FileKind {
  const name = basename(path).toLowerCase();

  if (BY_NAME[name]) return BY_NAME[name];
  if (name.startsWith('.env')) return CONFIG;

  return BY_EXTENSION[extname(path)] ?? PLAIN;
}

export interface FileTypeIconProps {
  path: string;
  className?: string;
}

export function FileTypeIcon({ path, className }: FileTypeIconProps) {
  const { logo, Icon, tone, label } = fileKind(path);

  return (
    <>
      {logo ? (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className={cn('shrink-0', tone, className)}
        >
          <path d={LANGUAGE_LOGOS[logo]} />
        </svg>
      ) : (
        Icon && <Icon className={cn('shrink-0', tone, className)} />
      )}
      <span className="sr-only">{label}</span>
    </>
  );
}
