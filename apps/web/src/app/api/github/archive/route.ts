/**
 * Fetches a repository archive on the browser's behalf.
 *
 * Everything else the repository browser does talks to `api.github.com`
 * directly, which allows cross-origin reads. The archive does not: the zipball
 * endpoint answers with a redirect to `codeload.github.com`, and that host sends
 * `Access-Control-Allow-Origin: https://render.githubusercontent.com` — so the
 * browser refuses to read it. This route makes the request server-side, where
 * CORS does not apply, and streams the bytes back.
 *
 * Unlike `/api/proxy` this is not a general forwarder: the URL is *built* here
 * from a validated owner/repo/ref, so there is no caller-supplied target and no
 * SSRF surface. The only outbound host is GitHub's.
 */

/** Room for a large repository while still bounding memory; the import caps at 12MB expanded. */
const MAX_ARCHIVE_BYTES = 40 * 1024 * 1024;
const TIMEOUT_MS = 60_000;

/** GitHub's own rules: alphanumerics, hyphen, underscore, and dot for repos. */
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;
/** Branch, tag or SHA. Excludes anything that could escape the path segment. */
const REF = /^[A-Za-z0-9._\-\/]{1,255}$/;

interface ArchiveRequest {
  owner?: string;
  repo?: string;
  ref?: string;
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return json({ error: 'Not connected to GitHub.' }, 401);

  let payload: ArchiveRequest;
  try {
    payload = (await request.json()) as ArchiveRequest;
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const owner = String(payload.owner ?? '');
  const repo = String(payload.repo ?? '');
  const ref = String(payload.ref ?? '');

  if (!OWNER.test(owner) || !REPO.test(repo) || !REF.test(ref)) {
    return json({ error: 'That repository reference is not valid.' }, 400);
  }
  /*
   * Dots are legal in repository names (`.github`, `my.repo`) and in refs, so
   * the character classes above admit `.` and `..` as whole segments. Those are
   * not valid names and would reshape the request path, so they go here.
   */
  const traversal = (value: string) =>
    value.split('/').some((segment) => segment === '.' || segment === '..');
  if (traversal(owner) || traversal(repo) || traversal(ref)) {
    return json({ error: 'That repository reference is not valid.' }, 400);
  }

  const target = `https://api.github.com/repos/${owner}/${repo}/zipball/${ref}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // `fetch` follows the redirect to codeload and forwards the Authorization
    // header, which is what private repositories need.
    const upstream = await fetch(target, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': 'mai-habi-playground',
        'x-github-api-version': '2022-11-28',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (upstream.status === 401) return json({ error: 'Your GitHub connection has expired.' }, 401);
    if (upstream.status === 403) {
      return json({ error: 'GitHub refused that download. Check the connection’s access.' }, 403);
    }
    if (upstream.status === 404) return json({ error: 'That repository could not be found.' }, 404);
    if (!upstream.ok) return json({ error: `GitHub returned ${upstream.status}.` }, 502);

    const declared = Number(upstream.headers.get('content-length') ?? '0');
    if (declared > MAX_ARCHIVE_BYTES) {
      return json({ error: 'That repository is too large to open here.' }, 413);
    }

    const bytes = new Uint8Array(await upstream.arrayBuffer());
    // Re-checked: the length header is advisory and often absent on this route.
    if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
      return json({ error: 'That repository is too large to open here.' }, 413);
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': 'application/zip',
        'cache-control': 'no-store',
      },
    });
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    return json(
      { error: aborted ? 'GitHub took too long to respond.' : 'Could not reach GitHub.' },
      aborted ? 504 : 502,
    );
  } finally {
    clearTimeout(timeout);
  }
}
