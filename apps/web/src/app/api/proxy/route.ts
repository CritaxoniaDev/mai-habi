/**
 * Server-side request proxy for the built-in REST client.
 *
 * The editor runs in the browser, so a fetch to a third-party API is blocked by
 * CORS unless that API opts in. This endpoint forwards the request from the
 * server — where CORS does not apply — and returns the response as JSON.
 *
 * Because it makes outbound requests on the caller's behalf, it is a classic
 * SSRF vector. `isBlockedHost` rejects loopback, private and link-local targets
 * (including cloud metadata at 169.254.169.254). It cannot, on its own, stop a
 * public hostname that *resolves* to an internal address (DNS rebinding) or a
 * redirect into one — harden with DNS pinning before exposing this widely.
 */

interface ProxyRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
  /** `base64` bodies (files, multipart) are decoded to bytes before forwarding. */
  bodyEncoding?: 'text' | 'base64';
}

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 30_000;

/** Managed by fetch/the browser; forwarding them corrupts the request. */
const STRIP_REQUEST_HEADERS = new Set(['host', 'content-length', 'connection', 'accept-encoding']);
const STRIP_RESPONSE_HEADERS = new Set(['content-encoding', 'transfer-encoding', 'connection']);

const TEXTUAL =
  /^(text\/|application\/(json|xml|javascript|x-www-form-urlencoded|graphql)|[^;]*\+(json|xml)|image\/svg)/i;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === '' || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true;
  }
  // IPv6 loopback, link-local (fe80::/10) and unique-local (fc00::/7).
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) {
    return true;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 0 || a === 127 || a === 10) return true; // this-host, loopback, private
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a >= 224) return true; // multicast / reserved
  }
  return false;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function POST(request: Request): Promise<Response> {
  let payload: ProxyRequest;
  try {
    payload = (await request.json()) as ProxyRequest;
  } catch {
    return json({ error: 'The proxy received an invalid request.' }, 400);
  }

  const method = (payload.method ?? 'GET').toUpperCase();
  if (!ALLOWED_METHODS.has(method)) return json({ error: `Unsupported method "${method}".` }, 400);

  let target: URL;
  try {
    target = new URL(String(payload.url ?? ''));
  } catch {
    return json({ error: 'Enter a valid absolute URL, including http:// or https://.' }, 400);
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return json({ error: 'Only http and https URLs are allowed.' }, 400);
  }
  if (isBlockedHost(target.hostname)) {
    return json({ error: `Requests to "${target.hostname}" are blocked for security.` }, 400);
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(payload.headers ?? {})) {
    if (!key.trim() || STRIP_REQUEST_HEADERS.has(key.toLowerCase())) continue;
    try {
      headers.set(key, value);
    } catch {
      // Skip header names the runtime rejects rather than failing the request.
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();

  const requestBody =
    method === 'GET' || method === 'HEAD' || payload.body === undefined
      ? undefined
      : payload.bodyEncoding === 'base64'
        ? decodeBase64(payload.body)
        : payload.body;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: requestBody as BodyInit | undefined,
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `The request timed out after ${TIMEOUT_MS / 1000}s.`
        : error instanceof Error
          ? error.message
          : 'The request could not be completed.';
    return json({ error: message }, 502);
  }
  clearTimeout(timeout);

  const durationMs = Date.now() - started;

  const responseHeaders: Record<string, string> = {};
  upstream.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) responseHeaders[key] = value;
  });

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  const truncated = bytes.length > MAX_BODY_BYTES;
  const slice = truncated ? bytes.subarray(0, MAX_BODY_BYTES) : bytes;

  const contentType = upstream.headers.get('content-type') ?? '';
  const textual = contentType === '' || TEXTUAL.test(contentType);
  const body = textual
    ? new TextDecoder('utf-8', { fatal: false }).decode(slice)
    : encodeBase64(slice);

  return json({
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
    contentType,
    body,
    binary: !textual,
    size: bytes.length,
    truncated,
    durationMs,
  });
}
