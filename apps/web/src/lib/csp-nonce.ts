/**
 * Reads the per-request CSP nonce the server published in `<meta name="csp-nonce">`.
 *
 * The preview iframe is a `srcdoc` document that inherits the page's CSP, so its
 * scripts must carry this nonce to run. Returns undefined when no CSP is set
 * (e.g. a build without the nonce middleware), in which case the preview emits
 * plain, un-nonced scripts.
 */
export function cspNonce(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') ?? undefined;
}
