/**
 * A thin GitHub REST client for the repository browser.
 *
 * `api.github.com` answers with `Access-Control-Allow-Origin: *`, so listing and
 * reading happen straight from the browser with no proxy. Downloading a whole
 * repository does not: the zipball endpoint redirects to `codeload.github.com`,
 * which restricts CORS to GitHub's own origins. That one path goes through
 * `/api/github/archive` instead — see the route for why.
 */

import { readGitHubToken } from '@mai-habi/shared';

const API = 'https://api.github.com';

export interface Repo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  language: string | null;
  defaultBranch: string;
  updatedAt: string;
  htmlUrl: string;
  /** Kilobytes, as GitHub reports it. */
  size: number;
  stars: number;
}

export interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  size: number;
}

/** Raised with a message already fit to show a user. */
export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

/** Signals that the stored token is gone or no longer accepted. */
export class GitHubAuthError extends GitHubError {
  constructor(message = 'Your GitHub connection has expired. Sign in again to reconnect.') {
    super(message, 401);
    this.name = 'GitHubAuthError';
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readGitHubToken();
  if (!token) throw new GitHubAuthError('Not connected to GitHub.');

  const response = await fetch(path.startsWith('http') ? path : API + path, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      ...init.headers,
    },
  });

  if (response.status === 401) throw new GitHubAuthError();
  if (response.status === 403) {
    // 403 covers both "rate limited" and "the token lacks this scope", which are
    // very different problems for the person reading the message.
    const remaining = response.headers.get('x-ratelimit-remaining');
    throw new GitHubError(
      remaining === '0'
        ? 'GitHub’s rate limit is exhausted. It resets within the hour.'
        : 'GitHub refused that request. The connection may not cover this repository.',
      403,
    );
  }
  if (response.status === 404) throw new GitHubError('That repository could not be found.', 404);
  if (!response.ok) {
    throw new GitHubError(`GitHub returned ${response.status}.`, response.status);
  }

  return (await response.json()) as T;
}

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  private: boolean;
  fork: boolean;
  language: string | null;
  default_branch: string;
  updated_at: string;
  html_url: string;
  size: number;
  stargazers_count: number;
}

function toRepo(raw: RawRepo): Repo {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    owner: raw.owner?.login ?? raw.full_name.split('/')[0],
    description: raw.description,
    private: raw.private,
    fork: raw.fork,
    language: raw.language,
    defaultBranch: raw.default_branch,
    updatedAt: raw.updated_at,
    htmlUrl: raw.html_url,
    size: raw.size,
    stars: raw.stargazers_count ?? 0,
  };
}

/**
 * Every repository the account can reach, most recently pushed first.
 *
 * Paged to a ceiling rather than exhaustively: an account with thousands of
 * repositories should not spend thirty requests before the list appears, and
 * the browser has a filter for finding the rest.
 */
export async function listRepos(maxPages = 4): Promise<Repo[]> {
  const repos: Repo[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await call<RawRepo[]>(
      `/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`,
    );
    repos.push(...batch.map(toRepo));
    if (batch.length < 100) break;
  }

  return repos;
}

export async function getRepo(owner: string, name: string): Promise<Repo> {
  return toRepo(await call<RawRepo>(`/repos/${owner}/${name}`));
}

/**
 * Every language GitHub detected, as bytes written in each.
 *
 * The repository object carries only a single `language` — the largest one —
 * which says very little about a monorepo. This is the full breakdown, and it
 * is one request, so it is fetched per opened repository rather than for the
 * whole list.
 */
export async function getLanguages(owner: string, name: string): Promise<Record<string, number>> {
  return await call<Record<string, number>>(`/repos/${owner}/${name}/languages`);
}

interface RawTree {
  tree: { path: string; type: string; size?: number }[];
  truncated: boolean;
}

/** The whole file list in one request. */
export async function getTree(
  owner: string,
  name: string,
  ref: string,
): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
  const raw = await call<RawTree>(
    `/repos/${owner}/${name}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
  );

  const entries = raw.tree
    .filter((node) => node.type === 'blob' || node.type === 'tree')
    .map((node) => ({
      path: node.path,
      type: node.type === 'tree' ? ('tree' as const) : ('blob' as const),
      size: node.size ?? 0,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return { entries, truncated: raw.truncated };
}

interface RawContent {
  content?: string;
  encoding?: string;
  size: number;
  type: string;
}

/**
 * One file's text. Binary files are reported rather than returned — the preview
 * pane has nothing useful to do with them.
 */
export async function getFileText(
  owner: string,
  name: string,
  path: string,
  ref: string,
): Promise<{ text: string; truncated: boolean } | { binary: true; size: number }> {
  const raw = await call<RawContent>(
    `/repos/${owner}/${name}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`,
  );

  if (raw.type !== 'file' || raw.encoding !== 'base64' || raw.content === undefined) {
    return { binary: true, size: raw.size };
  }

  const bytes = Uint8Array.from(atob(raw.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));

  // A NUL in the first block is the usual heuristic for "not text".
  if (bytes.subarray(0, 1024).includes(0)) return { binary: true, size: raw.size };

  return { text: new TextDecoder().decode(bytes), truncated: false };
}

/**
 * The repository as a ZIP, fetched through the server route because
 * `codeload.github.com` does not permit cross-origin reads.
 */
export async function downloadArchive(
  owner: string,
  name: string,
  ref: string,
): Promise<ArrayBuffer> {
  const token = readGitHubToken();
  if (!token) throw new GitHubAuthError('Not connected to GitHub.');

  const response = await fetch('/api/github/archive', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // Carried as a header rather than in the body: request bodies are the
      // part frameworks are most willing to log.
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ owner, repo: name, ref }),
  });

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    if (response.status === 401) throw new GitHubAuthError();
    throw new GitHubError(detail?.error ?? `Could not download that repository.`, response.status);
  }

  return await response.arrayBuffer();
}
