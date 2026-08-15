import type { FontConfig } from '@mai-habi/types';
import { ALLOWED_PACKAGES, TAILWIND_URL } from './runtime';
import { cssFontFamily, googleFontsHref } from './fonts';

/**
 * Builds the document the preview iframe runs.
 *
 * The iframe is sandboxed with `allow-scripts` and nothing else, so the user's
 * application gets an opaque origin: it cannot reach this application's DOM,
 * storage, cookies or session. Compiled code is never evaluated in the editor
 * context — no `eval`, no `new Function`, no direct script injection.
 */

export interface PreviewOptions {
  /** Compiled ES module produced by the bundler. */
  js: string;
  /** Aggregated project CSS. */
  css: string;
  tailwind: boolean;
  /** Google Fonts loaded into the document; empty when the project uses none. */
  fonts?: FontConfig[];
  /** Absolute origin serving the platform React runtime. */
  origin: string;
  title?: string;
}

/**
 * The `<head>` markup that loads the chosen Google Fonts and, if one is marked
 * as the default, applies it to the document.
 *
 * The default is published as the `--font-body` custom property *and* as a
 * zero-specificity `:where(html)` rule. The variable is what lets the starter
 * templates react to a font change — their stylesheets read
 * `font-family: var(--font-body, <their own stack>)`, so choosing a font swaps
 * it in and choosing none leaves their original stack untouched. The `:where`
 * rule covers projects that set no body font at all, and both lose to any real
 * selector the project writes.
 */
function fontMarkup(fonts: FontConfig[]): string {
  const href = googleFontsHref(fonts);
  if (!href) return '';

  const links =
    '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
    `<link rel="stylesheet" href="${escapeHtml(href)}" />`;

  // The last font marked as default wins, matching how the picker enforces one.
  const preferred = [...fonts].reverse().find((font) => font.defaultBody && font.family.trim());
  const stack = preferred ? `${cssFontFamily(preferred.family)},system-ui,sans-serif` : '';
  const rule = preferred
    ? `<style>:root{--font-body:${stack}}:where(html){font-family:var(--font-body)}</style>`
    : '';

  return `${links}${rule}`;
}

/** Runs inside the preview document. Serialised with `Function.toString()`. */
function previewBridge(): void {
  const post = (message: Record<string, unknown>) => {
    try {
      parent.postMessage({ ...message, at: Date.now() }, '*');
    } catch {
      /* the host may have navigated away */
    }
  };

  const describe = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (typeof value === 'function') return value.toString().slice(0, 120);
    try {
      return JSON.stringify(value, null, 1) ?? String(value);
    } catch {
      return String(value);
    }
  };

  const levels = ['log', 'info', 'warn', 'error', 'debug'] as const;

  for (const level of levels) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      post({ type: 'preview:console', level, text: args.map(describe).join(' ') });
      original(...args);
    };
  }

  window.addEventListener('error', (event) => {
    post({
      type: 'preview:error',
      message: event.message || 'Script error',
      stack: event.error instanceof Error ? event.error.stack : undefined,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    post({
      type: 'preview:error',
      message: reason instanceof Error ? `${reason.name}: ${reason.message}` : describe(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  window.addEventListener('DOMContentLoaded', () => post({ type: 'preview:ready' }));
}

const BRIDGE_SOURCE = `(${previewBridge.toString()})();`;

/** `</script` or `</style` inside embedded content would close the tag early. */
function escapeForTag(value: string, tag: 'script' | 'style'): string {
  return value.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * React is loaded from the platform origin rather than bundled into every
 * compile: the browser caches it once, the compiled output stays small, and
 * the user's bundle keeps a single React instance.
 */
function importMap(origin: string): string {
  const imports: Record<string, string> = {};
  for (const [specifier, path] of Object.entries(ALLOWED_PACKAGES)) {
    imports[specifier] = `${origin}${path}`;
  }
  return JSON.stringify({ imports });
}

export function buildPreviewDocument(options: PreviewOptions): string {
  const tailwind = options.tailwind
    ? `<script src="${options.origin}${TAILWIND_URL}"></script>`
    : '';

  const fonts = fontMarkup(options.fonts ?? []);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title ?? 'Preview')}</title>
    <script>${BRIDGE_SOURCE}</script>
    <script type="importmap">${importMap(options.origin)}</script>
    ${tailwind}
    ${fonts}
    <style>${escapeForTag(options.css, 'style')}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${escapeForTag(options.js, 'script')}</script>
  </body>
</html>`;
}

/** Shown while a project has never compiled, or has no output yet. */
export function buildPlaceholderDocument(message: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        display: grid;
        place-items: center;
        height: 100vh;
        background: #ffffff;
        color: #737373;
        font: 300 14px/1.6 ui-sans-serif, system-ui, sans-serif;
      }
    </style>
  </head>
  <body>
    <p>${escapeHtml(message)}</p>
  </body>
</html>`;
}

/**
 * Only scripts. No same-origin, no forms, no popups, no top navigation — the
 * preview gets the narrowest sandbox that still runs a React application.
 */
export const PREVIEW_SANDBOX = 'allow-scripts';
