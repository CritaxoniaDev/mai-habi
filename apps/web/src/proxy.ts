import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Per-request CSP nonce.
 *
 * The nonce is generated here, published on the request headers (so the server
 * render can read it and stamp it onto every script) and on the response's
 * `Content-Security-Policy` (so the browser enforces it). Next.js reads the
 * nonce from the request's CSP header and adds it to the framework's own script
 * tags automatically; our inline theme script and the preview iframe read it too.
 *
 * The policy intentionally constrains scripts only. Styles, fonts, images and
 * network access stay unrestricted so the app's assets — and, crucially, the
 * arbitrary user projects that run in the preview iframe — keep working. The
 * preview is a `srcdoc` document that inherits this policy, so its scripts carry
 * the same nonce (see buildPreviewDocument).
 *
 * Why no `strict-dynamic`: it makes the browser ignore `'self'`, but two things
 * here need `'self'`/host allowance rather than nonce propagation — the compiler
 * worker's runtime `import('esbuild-wasm')`, and the preview's `/runtime/*`
 * imports. The preview runs at an opaque origin where `'self'` never matches, so
 * the app's own origin is listed explicitly for it to load the shared runtime.
 * Inline scripts are still gated by the nonce (a nonce disables `'unsafe-inline'`),
 * which blocks the primary XSS vector: injected inline scripts.
 *
 * `unsafe-eval` / `wasm-unsafe-eval` are required by the in-browser toolchain:
 * esbuild-wasm instantiates WebAssembly in the compiler worker, and Monaco and
 * the Tailwind browser build may evaluate at runtime.
 */
export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const origin = request.nextUrl.origin;

  const csp = [
    `script-src 'self' ${origin} 'nonce-${nonce}' 'unsafe-eval' 'wasm-unsafe-eval'`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // HTML documents only — skip static assets, the API proxy, and the public
      // runtime/wasm/types dirs the preview fetches.
      source: '/((?!api|_next/static|_next/image|favicon.svg|runtime|wasm|types).*)',
      // Prefetches would otherwise cache a page under a nonce that no longer
      // matches the CSP served on the real navigation.
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
