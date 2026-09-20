import type { FontConfig, MockApiRoute } from '@mai-habi/types';
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
  /** Browser-local API fixtures installed before the project module runs. */
  mockApiRoutes?: MockApiRoute[];
  /** Absolute origin serving the platform React runtime. */
  origin: string;
  title?: string;
  /**
   * CSP nonce for the scripts this document emits. A `srcdoc` iframe inherits
   * the embedding page's Content-Security-Policy, so when that policy is
   * nonce-based the preview's own scripts must carry the same nonce or the
   * browser blocks them. Omitted when the host page sets no CSP.
   */
  nonce?: string;
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
  const preferred = [...fonts]
    .reverse()
    .find((font) => font.defaultBody && font.family.trim());
  const stack = preferred
    ? `${cssFontFamily(preferred.family)},system-ui,sans-serif`
    : '';
  const rule = preferred
    ? `<style>:root{--font-body:${stack}}:where(html){font-family:var(--font-body)}</style>`
    : '';

  return `${links}${rule}`;
}

/** Runs inside the preview document. Serialised with `Function.toString()`. */
function previewBridge(mockRoutes: MockApiRoute[]): void {
  /*
   * Publish this document's CSP nonce.
   *
   * The host policy is nonce-based and a srcdoc document inherits it, so a
   * script is only allowed to run if it carries the nonce. The markup emitted
   * by `buildPreviewDocument` is stamped at build time, but anything the
   * project itself loads — a CDN <script src>, an inline <script> — is created
   * by script at runtime and would carry none, so the browser refuses it.
   * Stashing the nonce here lets the loader stamp those too; see
   * `externalScript` in bundler.ts.
   *
   * This grants nothing beyond the preview: the frame is sandboxed without
   * `allow-same-origin`, so it runs at an opaque origin and the nonce only
   * authorises execution inside this throwaway document.
   */
  const current = document.currentScript as HTMLScriptElement | null;
  (window as unknown as { __previewNonce?: string }).__previewNonce =
    current?.nonce ?? '';

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
      post({
        type: 'preview:console',
        level,
        text: args.map(describe).join(' '),
      });
      original(...args);
    };
  }

  /*
   * Request fixtures live inside the opaque-origin frame. A service worker
   * cannot control a sandboxed srcdoc document; intercepting fetch/XHR here
   * preserves that isolation while giving projects the same offline mock API.
   */
  const routeFor = (method: string, input: string) => {
    let path = input;
    try {
      path = new URL(input, document.baseURI).pathname;
    } catch {
      path = input.split('?')[0];
    }

    return mockRoutes.find(
      (route) =>
        route.enabled &&
        route.method === method.toUpperCase() &&
        route.path.split('?')[0] === path,
    );
  };

  const mockedResponse = async (route: MockApiRoute): Promise<Response> => {
    const delay = Math.max(0, Math.min(30_000, Number(route.delayMs) || 0));
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

    const failed =
      Math.random() * 100 < Math.max(0, Math.min(100, route.failureRate));
    const status = failed
      ? 500
      : Math.max(100, Math.min(599, Number(route.status) || 200));
    const body = failed
      ? JSON.stringify({ error: 'Simulated failure' })
      : route.response;
    console.info(
      `[mock] ${route.method} ${route.path} → ${status}${delay ? ` (${delay} ms)` : ''}`,
    );

    return new Response(body, {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Habi-Mock': 'true',
      },
    });
  };

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const method = String(
      init?.method ?? request?.method ?? 'GET',
    ).toUpperCase();
    const url = request?.url ?? String(input);
    const route = routeFor(method, url);
    return route ? mockedResponse(route) : nativeFetch(input, init);
  };

  const NativeXHR = window.XMLHttpRequest;
  class MockXMLHttpRequest extends EventTarget {
    static readonly UNSENT = 0;
    static readonly OPENED = 1;
    static readonly HEADERS_RECEIVED = 2;
    static readonly LOADING = 3;
    static readonly DONE = 4;
    readonly UNSENT = 0;
    readonly OPENED = 1;
    readonly HEADERS_RECEIVED = 2;
    readonly LOADING = 3;
    readonly DONE = 4;

    readyState = 0;
    response: unknown = null;
    responseText = '';
    responseURL = '';
    responseXML: Document | null = null;
    status = 0;
    statusText = '';

    onabort: ((this: XMLHttpRequest, ev: ProgressEvent) => unknown) | null =
      null;
    onerror: ((this: XMLHttpRequest, ev: ProgressEvent) => unknown) | null =
      null;
    onload: ((this: XMLHttpRequest, ev: ProgressEvent) => unknown) | null =
      null;
    onloadend: ((this: XMLHttpRequest, ev: ProgressEvent) => unknown) | null =
      null;
    onloadstart: ((this: XMLHttpRequest, ev: ProgressEvent) => unknown) | null =
      null;
    onprogress: ((this: XMLHttpRequest, ev: ProgressEvent) => unknown) | null =
      null;
    onreadystatechange: ((this: XMLHttpRequest, ev: Event) => unknown) | null =
      null;
    ontimeout: ((this: XMLHttpRequest, ev: ProgressEvent) => unknown) | null =
      null;

    private method = 'GET';
    private url = '';
    private native: XMLHttpRequest | null = null;
    private route: MockApiRoute | null = null;
    private mockedHeaders = '';
    private responseTypeValue: XMLHttpRequestResponseType = '';
    private timeoutValue = 0;
    private withCredentialsValue = false;
    private mockUpload = new EventTarget() as XMLHttpRequestUpload;

    get responseType(): XMLHttpRequestResponseType {
      return this.responseTypeValue;
    }
    set responseType(value: XMLHttpRequestResponseType) {
      this.responseTypeValue = value;
      if (this.native) this.native.responseType = value;
    }
    get timeout(): number {
      return this.timeoutValue;
    }
    set timeout(value: number) {
      this.timeoutValue = value;
      if (this.native) this.native.timeout = value;
    }
    get withCredentials(): boolean {
      return this.withCredentialsValue;
    }
    set withCredentials(value: boolean) {
      this.withCredentialsValue = value;
      if (this.native) this.native.withCredentials = value;
    }
    get upload(): XMLHttpRequestUpload {
      return this.native?.upload ?? this.mockUpload;
    }

    private emit(type: string): void {
      const event =
        type === 'readystatechange' ? new Event(type) : new ProgressEvent(type);
      this.dispatchEvent(event);
      const handler = this[`on${type}` as keyof this];
      if (typeof handler === 'function') {
        (handler as (event: Event) => unknown).call(this, event);
      }
    }

    open(
      method: string,
      url: string | URL,
      async = true,
      username?: string | null,
      password?: string | null,
    ): void {
      this.method = method.toUpperCase();
      this.url = String(url);
      this.readyState = 1;
      this.route = routeFor(this.method, this.url) ?? null;
      if (this.route) {
        this.emit('readystatechange');
        return;
      }
      this.native = new NativeXHR();
      this.native.responseType = this.responseType;
      this.native.timeout = this.timeout;
      this.native.withCredentials = this.withCredentials;
      this.native.open(
        method,
        String(url),
        async,
        username ?? null,
        password ?? null,
      );
      this.native.addEventListener('readystatechange', () => {
        if (!this.native) return;
        this.readyState = this.native.readyState;
        this.status = this.native.status;
        this.statusText = this.native.statusText;
        this.responseURL = this.native.responseURL;
        this.response = this.native.response;
        try {
          this.responseText = this.native.responseText;
        } catch {
          this.responseText = '';
        }
        this.emit('readystatechange');
      });
      for (const type of [
        'loadstart',
        'progress',
        'load',
        'error',
        'abort',
        'timeout',
        'loadend',
      ]) {
        this.native.addEventListener(type, () => this.emit(type));
      }
      this.emit('readystatechange');
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      const route = this.route;
      if (!route) {
        this.native?.send(body ?? null);
        return;
      }

      this.emit('loadstart');
      void mockedResponse(route).then(async (response) => {
        this.readyState = 2;
        this.status = response.status;
        this.statusText = response.statusText;
        this.responseURL = this.url;
        this.mockedHeaders = [...response.headers]
          .map(([key, value]) => `${key}: ${value}`)
          .join('\r\n');
        this.emit('readystatechange');
        this.responseText = await response.text();
        if (this.responseType === 'json') {
          try {
            this.response = JSON.parse(this.responseText);
          } catch {
            this.response = null;
          }
        } else {
          this.response = this.responseText;
        }
        this.readyState = 4;
        this.emit('readystatechange');
        this.emit('load');
        this.emit('loadend');
      });
    }

    abort(): void {
      this.native?.abort();
      this.emit('abort');
    }
    setRequestHeader(name: string, value: string): void {
      this.native?.setRequestHeader(name, value);
    }
    getAllResponseHeaders(): string {
      return this.mockedHeaders || this.native?.getAllResponseHeaders() || '';
    }
    getResponseHeader(name: string): string | null {
      if (this.mockedHeaders) {
        return name.toLowerCase() === 'content-type'
          ? 'application/json; charset=utf-8'
          : null;
      }
      return this.native?.getResponseHeader(name) ?? null;
    }
    overrideMimeType(mime: string): void {
      this.native?.overrideMimeType(mime);
    }
  }

  window.XMLHttpRequest =
    MockXMLHttpRequest as unknown as typeof XMLHttpRequest;

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
      message:
        reason instanceof Error
          ? `${reason.name}: ${reason.message}`
          : describe(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  window.addEventListener('DOMContentLoaded', () =>
    post({ type: 'preview:ready' }),
  );
}

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
  // A nonce-based host CSP is inherited by this srcdoc document, so every script
  // it emits has to carry the nonce to run.
  const nonce = options.nonce ? ` nonce="${options.nonce}"` : '';

  const tailwind = options.tailwind
    ? `<script${nonce} src="${options.origin}${TAILWIND_URL}"></script>`
    : '';

  const fonts = fontMarkup(options.fonts ?? []);
  const bridge = `(${previewBridge.toString()})(${JSON.stringify(options.mockApiRoutes ?? [])});`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title ?? 'Preview')}</title>
    <script${nonce}>${escapeForTag(bridge, 'script')}</script>
    <script type="importmap"${nonce}>${importMap(options.origin)}</script>
    ${tailwind}
    ${fonts}
    <style>${escapeForTag(options.css, 'style')}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module"${nonce}>${escapeForTag(options.js, 'script')}</script>
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
