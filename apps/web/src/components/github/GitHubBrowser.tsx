'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FileMap, TreeNode } from '@mai-habi/types';
import { EDITOR_ORIGIN, hasGitHubToken, signInWithGitHub } from '@mai-habi/shared';
import { buildTree, importFromZip } from '@mai-habi/filesystem';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNotice,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Spinner,
  Toaster,
  cn,
  toast,
} from '@mai-habi/ui';
import {
  ArrowLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  Folder,
  FolderOpen,
  GitFork,
  Lock,
  Play,
  Search,
  Star,
  X,
} from 'lucide-react';
import {
  GitHubAuthError,
  downloadArchive,
  getFileText,
  getLanguages,
  getTree,
  listRepos,
  type Repo,
  type TreeEntry,
} from '../../lib/github';
import { FileTypeIcon } from '../../lib/file-icons';
import { LANGUAGE_LOGOS, type LanguageLogo } from '../../lib/language-logos';
import { importAndOpen } from '../../lib/project-actions';
import { useSession } from '../../state/session';
import { clientOnly } from '../../lib/client-only';

/*
 * Monaco is several megabytes, and most visits to this page never open a
 * file. Loading it only when a preview is actually requested keeps the
 * repository list as light as it was.
 */
const CodeViewer = clientOnly(
  () => import('../CodeViewer'),
  <div className="flex items-center gap-2 p-4 text-label font-light text-muted-foreground">
    <Spinner label="Loading the editor" /> Loading…
  </div>,
);

/* simple-icons artwork is CC0 1.0; the mark remains a GitHub trademark. */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;

  if (diff < 3_600_000) return 'just now';
  if (diff < day) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/**
 * Whether the in-browser compiler stands a chance with this tree.
 *
 * The playground compiles HTML, CSS, JS, React and Next in the browser and
 * never runs `npm install`, so a repository with a lockfile and native deps will
 * open and read fine but not necessarily run. This is a hint, not a gate — the
 * person looking at it knows their own code better than a heuristic does.
 */
function looksRunnable(entries: TreeEntry[]): boolean {
  return entries.some(
    (entry) =>
      entry.type === 'blob' &&
      (entry.path === 'index.html' ||
        entry.path === 'package.json' ||
        /^(src\/)?(main|index|app)\.(tsx|jsx|ts|js)$/.test(entry.path)),
  );
}


/**
 * A repository's primary language, shown the way file types are shown elsewhere:
 * the real mark where one exists, tinted from `--lang-*`. Languages the icon
 * set does not cover keep their name and take a neutral glyph rather than
 * borrowing someone else's logo.
 *
 * Classes are literals so Tailwind's scanner finds them.
 */
interface LanguageStyle {
  logo?: LanguageLogo;
  /** Foreground for the mark. */
  tone: string;
  /** 10% tint behind the mark. */
  wash: string;
  /** Full strength, for the share bar. */
  bar: string;
}

const LANGUAGES: Record<string, LanguageStyle> = {
  /*
   * Keyed by the language name GitHub reports, lowercased. Several names share
   * one mark where the family is the same thing to a reader — PLpgSQL and SQL
   * both read as a database, SCSS as CSS. Anything absent falls through to a
   * tinted dot and keeps its name, which is honest about not knowing it.
   */
  typescript: { logo: 'typescript', tone: 'text-lang-typescript', wash: 'bg-lang-typescript/10', bar: 'bg-lang-typescript' },
  javascript: { logo: 'javascript', tone: 'text-lang-javascript', wash: 'bg-lang-javascript/10', bar: 'bg-lang-javascript' },
  html: { logo: 'html', tone: 'text-lang-html', wash: 'bg-lang-html/10', bar: 'bg-lang-html' },
  css: { logo: 'css', tone: 'text-lang-css', wash: 'bg-lang-css/10', bar: 'bg-lang-css' },
  scss: { logo: 'css', tone: 'text-lang-css', wash: 'bg-lang-css/10', bar: 'bg-lang-css' },
  sass: { logo: 'css', tone: 'text-lang-css', wash: 'bg-lang-css/10', bar: 'bg-lang-css' },
  less: { logo: 'css', tone: 'text-lang-css', wash: 'bg-lang-css/10', bar: 'bg-lang-css' },
  stylus: { logo: 'css', tone: 'text-lang-css', wash: 'bg-lang-css/10', bar: 'bg-lang-css' },
  json: { logo: 'json', tone: 'text-lang-json', wash: 'bg-lang-json/10', bar: 'bg-lang-json' },
  jsonc: { logo: 'json', tone: 'text-lang-json', wash: 'bg-lang-json/10', bar: 'bg-lang-json' },
  markdown: { logo: 'markdown', tone: 'text-lang-markdown', wash: 'bg-lang-markdown/10', bar: 'bg-lang-markdown' },
  mdx: { logo: 'markdown', tone: 'text-lang-markdown', wash: 'bg-lang-markdown/10', bar: 'bg-lang-markdown' },
  astro: { logo: 'astro', tone: 'text-lang-astro', wash: 'bg-lang-astro/10', bar: 'bg-lang-astro' },
  plpgsql: { logo: 'sql', tone: 'text-lang-sql', wash: 'bg-lang-sql/10', bar: 'bg-lang-sql' },
  sql: { logo: 'sql', tone: 'text-lang-sql', wash: 'bg-lang-sql/10', bar: 'bg-lang-sql' },
  plsql: { logo: 'sql', tone: 'text-lang-sql', wash: 'bg-lang-sql/10', bar: 'bg-lang-sql' },
  tsql: { logo: 'sql', tone: 'text-lang-sql', wash: 'bg-lang-sql/10', bar: 'bg-lang-sql' },
  pgsql: { logo: 'sql', tone: 'text-lang-sql', wash: 'bg-lang-sql/10', bar: 'bg-lang-sql' },
  python: { logo: 'python', tone: 'text-lang-python', wash: 'bg-lang-python/10', bar: 'bg-lang-python' },
  'jupyter notebook': { logo: 'python', tone: 'text-lang-python', wash: 'bg-lang-python/10', bar: 'bg-lang-python' },
  go: { logo: 'go', tone: 'text-lang-go', wash: 'bg-lang-go/10', bar: 'bg-lang-go' },
  rust: { logo: 'rust', tone: 'text-lang-rust', wash: 'bg-lang-rust/10', bar: 'bg-lang-rust' },
  java: { logo: 'java', tone: 'text-lang-java', wash: 'bg-lang-java/10', bar: 'bg-lang-java' },
  kotlin: { logo: 'java', tone: 'text-lang-java', wash: 'bg-lang-java/10', bar: 'bg-lang-java' },
  groovy: { logo: 'java', tone: 'text-lang-java', wash: 'bg-lang-java/10', bar: 'bg-lang-java' },
  php: { logo: 'php', tone: 'text-lang-php', wash: 'bg-lang-php/10', bar: 'bg-lang-php' },
  blade: { logo: 'php', tone: 'text-lang-php', wash: 'bg-lang-php/10', bar: 'bg-lang-php' },
  ruby: { logo: 'ruby', tone: 'text-lang-ruby', wash: 'bg-lang-ruby/10', bar: 'bg-lang-ruby' },
  shell: { logo: 'shell', tone: 'text-lang-shell', wash: 'bg-lang-shell/10', bar: 'bg-lang-shell' },
  powershell: { logo: 'shell', tone: 'text-lang-shell', wash: 'bg-lang-shell/10', bar: 'bg-lang-shell' },
  batchfile: { logo: 'shell', tone: 'text-lang-shell', wash: 'bg-lang-shell/10', bar: 'bg-lang-shell' },
  makefile: { logo: 'shell', tone: 'text-lang-shell', wash: 'bg-lang-shell/10', bar: 'bg-lang-shell' },
  vue: { logo: 'vue', tone: 'text-lang-vue', wash: 'bg-lang-vue/10', bar: 'bg-lang-vue' },
  svelte: { logo: 'svelte', tone: 'text-lang-svelte', wash: 'bg-lang-svelte/10', bar: 'bg-lang-svelte' },
  dockerfile: { logo: 'docker', tone: 'text-lang-docker', wash: 'bg-lang-docker/10', bar: 'bg-lang-docker' },
};

const UNKNOWN_LANGUAGE: LanguageStyle = {
  tone: 'text-muted-foreground',
  wash: 'bg-surface-active',
  bar: 'bg-border-strong',
};

function languageStyle(language: string | null): LanguageStyle {
  if (!language) return UNKNOWN_LANGUAGE;
  return LANGUAGES[language.toLowerCase()] ?? UNKNOWN_LANGUAGE;
}

function LanguageMark({ language }: { language: string | null }) {
  const style = languageStyle(language);

  return (
    <span
      className={cn('grid size-9 shrink-0 place-items-center rounded-lg', style.wash)}
      aria-hidden="true"
    >
      {style.logo ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn('size-4', style.tone)}>
          <path d={LANGUAGE_LOGOS[style.logo]} />
        </svg>
      ) : (
        <Code2 className={cn('size-4', style.tone)} />
      )}
    </span>
  );
}

/** GitHub reports repository size in kilobytes. */
function repoSize(kilobytes: number): string {
  if (kilobytes < 1024) return `${kilobytes} KB`;
  return `${(kilobytes / 1024).toFixed(kilobytes < 10240 ? 1 : 0)} MB`;
}

type Scope = 'all' | 'sources' | 'forks' | 'private';
type Order = 'updated' | 'name' | 'stars';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: 'All repositories' },
  { value: 'sources', label: 'Sources only' },
  { value: 'forks', label: 'Forks only' },
  { value: 'private', label: 'Private only' },
];

const ORDERS: { value: Order; label: string }[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'name', label: 'Name' },
  { value: 'stars', label: 'Stars' },
];


/**
 * The language split, the way GitHub reports it: bytes written per language.
 *
 * A monorepo is the case this exists for — one primary language says nothing
 * useful about a repository holding a TypeScript app, a CSS package and a pile
 * of Markdown. Slivers below a percent are folded into "Other" rather than
 * rendered as invisible segments.
 */
interface LanguageShare {
  name: string;
  share: number;
  style: LanguageStyle;
}

function sharesOf(languages: Record<string, number>): LanguageShare[] {
  const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
  if (total === 0) return [];

  const all = Object.entries(languages)
    .map(([name, bytes]) => ({ name, share: (bytes / total) * 100, style: languageStyle(name) }))
    .sort((a, b) => b.share - a.share);

  const shown = all.filter((entry) => entry.share >= 1);
  const rest = all.filter((entry) => entry.share < 1);

  if (rest.length > 0) {
    shown.push({
      name: 'Other',
      share: rest.reduce((sum, entry) => sum + entry.share, 0),
      style: UNKNOWN_LANGUAGE,
    });
  }

  return shown;
}

function LanguageBreakdown({ languages }: { languages: Record<string, number> }) {
  const shares = sharesOf(languages);
  if (shares.length === 0) return null;

  return (
    <div className="mt-4">
      {/* One bar, proportioned by bytes. Decorative: the legend below carries the same facts. */}
      <div
        aria-hidden="true"
        className="flex h-1.5 overflow-hidden rounded-full bg-surface-active"
      >
        {shares.map((entry) => (
          <span
            key={entry.name}
            className={entry.style.bar}
            style={{ width: entry.share + '%' }}
          />
        ))}
      </div>

      <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {shares.map((entry) => (
          <li
            key={entry.name}
            className="flex items-center gap-1.5 text-micro font-light text-muted-foreground"
          >
            {entry.style.logo ? (
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className={cn('size-3 shrink-0', entry.style.tone)}
              >
                <path d={LANGUAGE_LOGOS[entry.style.logo]} />
              </svg>
            ) : (
              <span
                aria-hidden="true"
                className={cn('size-2 shrink-0 rounded-full', entry.style.bar)}
              />
            )}
            <span className="text-foreground">{entry.name}</span>
            <span>{entry.share.toFixed(entry.share < 10 ? 1 : 0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Whether the tree looks like a workspace rather than one application.
 *
 * Worth saying out loud, because the playground compiles a single app from one
 * entry file and never installs anything: a workspace will import (subject to
 * the file and size caps) and read fine, but running it is a different matter.
 */
function looksLikeWorkspace(entries: TreeEntry[]): boolean {
  const manifests = entries.filter(
    (entry) => entry.type === 'blob' && /^(packages|apps)\/[^/]+\/package\.json$/.test(entry.path),
  );

  return manifests.length > 1;
}


/**
 * What a repository is built with, as opposed to what it is written in.
 *
 * GitHub only reports languages, so a Next.js app and a plain TypeScript
 * library both come back as "TypeScript" and read identically. The framework is
 * recoverable from the tree that is already loaded — a root config file is a
 * deliberate, unambiguous marker — so it costs no extra request.
 *
 * Detection is intentionally shallow: a root config, or for Next (whose config
 * is optional) the router directory it cannot work without.
 */
interface Framework {
  label: string;
  logo?: LanguageLogo;
  /** Root-level files that identify it. */
  files: RegExp;
  /** A second chance for frameworks whose config file is optional. */
  paths?: RegExp;
}

const FRAMEWORKS: Framework[] = [
  {
    label: 'Next.js',
    logo: 'next',
    files: /^next\.config\.(js|mjs|cjs|ts|mts)$/,
    // The config is optional; an App Router or Pages Router entry is not.
    paths: /(^|\/)(src\/)?(app\/page\.(tsx|jsx|ts|js)|pages\/(_app|index)\.(tsx|jsx|ts|js))$/,
  },
  { label: 'Astro', logo: 'astro', files: /^astro\.config\.(js|mjs|cjs|ts|mts)$/ },
  { label: 'Nuxt', logo: 'vue', files: /^nuxt\.config\.(js|mjs|ts)$/ },
  { label: 'SvelteKit', logo: 'svelte', files: /^svelte\.config\.(js|mjs|ts)$/ },
  { label: 'Vue', logo: 'vue', files: /^vue\.config\.(js|mjs|ts)$/ },
  { label: 'Tailwind CSS', logo: 'tailwind', files: /^tailwind\.config\.(js|cjs|mjs|ts)$/ },
  { label: 'Remix', logo: 'react', files: /^remix\.config\.(js|mjs|ts)$/ },
  // No mark of their own in the icon set, so they take the neutral glyph.
  { label: 'Vite', files: /^vite\.config\.(js|mjs|cjs|ts|mts)$/ },
  { label: 'Angular', files: /^angular\.json$/ },
];

/**
 * Where a config file counts: the repository root, or one level inside a
 * workspace directory.
 *
 * Root-only would report nothing for a monorepo, whose apps each carry their
 * own config — the common shape for the repositories this browser opens. It
 * stops at `apps/` and `packages/` rather than matching any depth, so a config
 * buried in `examples/` or a test fixture is not mistaken for the project.
 */
function frameworkScopes(paths: string[]): string[] {
  const out: string[] = [];

  for (const path of paths) {
    const segments = path.split('/');
    if (segments.length === 1) out.push(segments[0]);
    else if (segments.length === 3 && (segments[0] === 'apps' || segments[0] === 'packages')) {
      out.push(segments[2]);
    }
  }

  return out;
}

function detectFrameworks(entries: TreeEntry[]): Framework[] {
  const paths = entries.filter((entry) => entry.type === 'blob').map((entry) => entry.path);
  const configs = frameworkScopes(paths);

  return FRAMEWORKS.filter((framework) => {
    if (configs.some((name) => framework.files.test(name))) return true;
    return framework.paths ? paths.some((path) => framework.paths!.test(path)) : false;
  });
}

/**
 * Shown as neutral chips rather than tinted marks: the coloured bar below says
 * what the repository is written in, and these say what it is built with. Using
 * the same colour language for both would blur a real distinction.
 */
function FrameworkChips({ frameworks }: { frameworks: Framework[] }) {
  if (frameworks.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap items-center gap-2">
      {frameworks.map((framework) => (
        <li
          key={framework.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-micro font-light text-foreground"
        >
          {framework.logo ? (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className="size-3 shrink-0"
            >
              <path d={LANGUAGE_LOGOS[framework.logo]} />
            </svg>
          ) : (
            <Code2 className="size-3 shrink-0" aria-hidden="true" />
          )}
          {framework.label}
        </li>
      ))}
    </ul>
  );
}

export default function GitHubBrowser() {
  const { cloudEnabled, user, ready, initialise } = useSession();
  const [selected, setSelected] = useState<Repo | null>(null);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  const connect = () =>
    void signInWithGitHub(`${EDITOR_ORIGIN}/auth/callback`).catch((cause: unknown) =>
      toast.error('Could not start sign-in', {
        description: cause instanceof Error ? cause.message : String(cause),
      }),
    );

  if (!cloudEnabled) {
    return (
      <Shell>
        <EmptyState
          title="GitHub is not configured"
          description="This deployment has no Supabase credentials, so accounts and repositories are unavailable. Projects still work and stay in this browser."
          action={
            <Button variant="outline" asChild>
              <a href="/">Back to projects</a>
            </Button>
          }
        />
      </Shell>
    );
  }

  if (!ready) {
    return (
      <Shell>
        <div className="mt-8 space-y-3" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-16 w-full" />
          ))}
        </div>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <EmptyState
          title="Sign in to see your repositories"
          description="Connecting your GitHub account lets you browse your repositories here and open the ones the playground can compile."
          action={
            <Button variant="default" onClick={connect}>
              <GithubMark className="size-4" /> Continue with GitHub
            </Button>
          }
        />
      </Shell>
    );
  }

  /*
   * Signed in, but the GitHub token is gone. Supabase only ever emits it once,
   * at sign-in, so a session that was restored from storage (or predates this
   * feature) has an account but no way to call GitHub. Re-authorising is the
   * only way back.
   */
  if (!hasGitHubToken()) {
    return (
      <Shell>
        <EmptyState
          title="Reconnect your GitHub account"
          description="Your session is still valid, but the GitHub authorisation it carried is not available in this browser. Signing in again restores it."
          action={
            <Button variant="default" onClick={connect}>
              <GithubMark className="size-4" /> Reconnect GitHub
            </Button>
          }
        />
      </Shell>
    );
  }

  return (
    <>
      <Shell>
        {selected ? (
          <RepoDetail repo={selected} onBack={() => setSelected(null)} />
        ) : (
          <RepoList onOpen={setSelected} />
        )}
      </Shell>
      <Toaster />
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="pt-14">
      <p className="text-micro font-normal uppercase tracking-[0.12em] text-muted-foreground">
        Connected to GitHub
      </p>
      <h1 className="mt-3 text-page font-light">Repositories</h1>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------- listing */

function RepoList({ onOpen }: { onOpen: (repo: Repo) => void }) {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [order, setOrder] = useState<Order>('updated');

  useEffect(() => {
    let cancelled = false;

    listRepos()
      .then((list) => !cancelled && setRepos(list))
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not load your repositories.');
        setRepos([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(() => {
    if (!repos) return [];
    const needle = query.trim().toLowerCase();

    const matched = repos.filter((repo) => {
      if (scope === 'sources' && repo.fork) return false;
      if (scope === 'forks' && !repo.fork) return false;
      if (scope === 'private' && !repo.private) return false;

      if (!needle) return true;
      return (
        repo.fullName.toLowerCase().includes(needle) ||
        (repo.description ?? '').toLowerCase().includes(needle) ||
        (repo.language ?? '').toLowerCase().includes(needle)
      );
    });

    // Sorted on a copy, so the loaded list stays the unfiltered source of truth.
    return [...matched].sort((a, b) => {
      if (order === 'name') return a.fullName.localeCompare(b.fullName);
      if (order === 'stars') return b.stars - a.stars;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [repos, query, scope, order]);

  if (repos === null) {
    return (
      <div className="mt-8" aria-busy="true" aria-label="Loading repositories">
        <Skeleton className="h-9 w-full" />
        <div className="mt-4 space-y-px overflow-hidden rounded-lg border border-border">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center gap-4 bg-surface px-4 py-3.5">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filtering = query.trim().length > 0 || scope !== 'all';

  return (
    <div className="mt-8">
      {error && (
        <ErrorNotice
          className="mb-4"
          title="Could not load your repositories"
          detail={error}
          reassurance="Nothing in your account was changed."
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name, description or language"
            aria-label="Filter repositories"
            className="px-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground outline-none transition-colors duration-[--duration-fast] hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Select value={scope} onValueChange={(value) => setScope(value as Scope)}>
            <SelectTrigger aria-label="Which repositories" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={order} onValueChange={(value) => setOrder(value as Order)}>
            <SelectTrigger aria-label="Sort order" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Live, so filtering announces its result rather than changing silently. */}
      <p className="mt-3 text-micro font-light text-muted-foreground" aria-live="polite">
        {filtering
          ? shown.length + ' of ' + repos.length + ' repositories'
          : repos.length + (repos.length === 1 ? ' repository' : ' repositories')}
      </p>

      {shown.length === 0 ? (
        <div className="mt-2 rounded-lg border border-dashed border-border-strong bg-surface">
          <EmptyState
            title={filtering ? 'Nothing matches those filters' : 'No repositories found'}
            description={
              filtering
                ? 'Try a different term, or widen the filter.'
                : 'This account has no repositories the connection can reach.'
            }
            action={
              filtering ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery('');
                    setScope('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {shown.map((repo) => (
            <li key={repo.id}>
              <button
                type="button"
                onClick={() => onOpen(repo)}
                className="flex w-full items-start gap-4 px-4 py-3.5 text-left outline-none transition-colors duration-[--duration-fast] hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
              >
                <LanguageMark language={repo.language} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-secondary font-normal text-foreground">
                      {repo.fullName}
                    </span>
                    {repo.private && (
                      <Lock
                        className="size-3 shrink-0 text-muted-foreground"
                        aria-label="Private repository"
                      />
                    )}
                    {repo.fork && (
                      <GitFork className="size-3 shrink-0 text-muted-foreground" aria-label="Fork" />
                    )}
                  </div>

                  {repo.description && (
                    <p className="mt-0.5 line-clamp-2 text-label font-light text-muted-foreground">
                      {repo.description}
                    </p>
                  )}

                  {/* The facts you actually scan a repository list for. */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro font-light text-muted-foreground">
                    {repo.language && <span>{repo.language}</span>}
                    {repo.stars > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3" aria-hidden="true" />
                        {repo.stars}
                        <span className="sr-only">stars</span>
                      </span>
                    )}
                    <span>{repoSize(repo.size)}</span>
                    <span>Updated {relative(repo.updatedAt)}</span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- detail */

function RepoDetail({ repo, onBack }: { repo: Repo; onBack: () => void }) {
  const [entries, setEntries] = useState<TreeEntry[] | null>(null);
  const [languages, setLanguages] = useState<Record<string, number> | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [path, setPath] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [contentNote, setContentNote] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getTree(repo.owner, repo.name, repo.defaultBranch)
      .then((tree) => {
        if (cancelled) return;
        setEntries(tree.entries);
        setTruncated(tree.truncated);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not read that repository.');
        setEntries([]);
      });

    /* A separate request, and a non-critical one: a failure just hides the split. */
    getLanguages(repo.owner, repo.name)
      .then((result) => !cancelled && setLanguages(result))
      .catch(() => !cancelled && setLanguages({}));

    return () => {
      cancelled = true;
    };
  }, [repo]);

  const files = useMemo(() => (entries ?? []).filter((entry) => entry.type === 'blob'), [entries]);

  /*
   * GitHub returns a flat list of paths. `buildTree` is the same function the
   * editor's explorer uses, so the nesting and ordering (folders first, then
   * natural-sorted names) match what the project looks like once opened. It
   * reads only `type` and `path`, so the placeholder content costs nothing.
   */
  const tree = useMemo(() => {
    const map: FileMap = {};
    for (const entry of entries ?? []) {
      map[entry.path] =
        entry.type === 'tree'
          ? { path: entry.path, type: 'directory' }
          : { path: entry.path, type: 'file', content: '', encoding: 'utf8', size: entry.size };
    }
    return buildTree(map);
  }, [entries]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (folder: string) =>
    setExpanded((current) => ({ ...current, [folder]: !current[folder] }));

  const openFile = (filePath: string) => {
    setPath(filePath);
    setContent(null);
    setContentNote(null);
    setLoadingFile(true);

    getFileText(repo.owner, repo.name, filePath, repo.defaultBranch)
      .then((result) => {
        if ('binary' in result) setContentNote('This file is binary and cannot be previewed.');
        else setContent(result.text);
      })
      .catch((cause: unknown) =>
        setContentNote(cause instanceof Error ? cause.message : 'Could not read that file.'),
      )
      .finally(() => setLoadingFile(false));
  };

  /** Archive → FileMap → a normal project, which the editor already knows how to run. */
  const openInPlayground = () => {
    setOpening(true);

    downloadArchive(repo.owner, repo.name, repo.defaultBranch)
      .then(async (archive) => {
        const result = await importFromZip(archive);

        if (result.warnings.length > 0) {
          toast.message(`Imported with ${result.warnings.length} note(s)`, {
            description: result.warnings[0],
          });
        }

        // Navigates away on success.
        await importAndOpen(repo.name, result.files);
      })
      .catch((cause: unknown) => {
        setOpening(false);
        const message =
          cause instanceof GitHubAuthError
            ? 'Your GitHub connection expired. Sign in again to reconnect.'
            : cause instanceof Error
              ? cause.message
              : 'Could not open that repository.';
        toast.error('Could not open in the playground', { description: message });
      });
  };

  const runnable = entries !== null && looksRunnable(entries);
  const workspace = entries !== null && looksLikeWorkspace(entries);
  const frameworks = useMemo(() => (entries ? detectFrameworks(entries) : []), [entries]);

  return (
    <div className="mt-8">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft /> All repositories
      </Button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-section font-light text-foreground">{repo.fullName}</h2>
            {repo.private && <Badge tone="neutral">Private</Badge>}
          </div>
          {repo.description && (
            <p className="mt-1 text-secondary font-light text-muted-foreground">
              {repo.description}
            </p>
          )}
          <p className="mt-1.5 text-micro font-light text-muted-foreground">
            {repo.defaultBranch} · updated {relative(repo.updatedAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" asChild>
            <a href={repo.htmlUrl} target="_blank" rel="noreferrer noopener">
              <ExternalLink /> GitHub
            </a>
          </Button>
          <Button variant="default" loading={opening} onClick={openInPlayground}>
            <Play /> Open in playground
          </Button>
        </div>
      </div>

      <FrameworkChips frameworks={frameworks} />

      {languages && <LanguageBreakdown languages={languages} />}

      {workspace && (
        <p className="mt-4 rounded-lg border border-border bg-surface-secondary px-3.5 py-3 text-label font-light text-muted-foreground">
          This looks like a monorepo — several packages with their own{' '}
          <code className="text-code">package.json</code>. The whole tree imports, but the
          playground compiles one app from a single entry file and installs nothing, so pick the
          package you want after opening it.
        </p>
      )}

      {entries !== null && !runnable && (
        <p className="mt-4 rounded-lg border border-border bg-surface-secondary px-3.5 py-3 text-label font-light text-muted-foreground">
          No <code className="text-code">index.html</code> or{' '}
          <code className="text-code">package.json</code> at the root, so this one probably will not
          run in the browser compiler. You can still open it to read and edit the files.
        </p>
      )}

      {truncated && (
        <p className="mt-4 rounded-lg border border-border bg-surface-secondary px-3.5 py-3 text-label font-light text-muted-foreground">
          GitHub truncated this file listing because the repository is very large. Opening it in the
          playground still fetches the whole archive, subject to the import limits.
        </p>
      )}

      {error && (
        <ErrorNotice
          className="mt-4"
          title="Could not read that repository"
          detail={error}
          reassurance="Nothing in your account was changed."
        />
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <p className="border-b border-border px-3 py-2 text-micro font-normal uppercase tracking-[0.08em] text-muted-foreground">
            {entries === null ? 'Files' : `${files.length} files`}
          </p>

          {entries === null ? (
            <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading files">
              {[0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={row} className="h-4 w-full" />
              ))}
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto p-1">
              <FileTree
                nodes={tree}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
                selected={path}
                onSelect={openFile}
              />
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <p className="truncate border-b border-border px-3 py-2 text-micro font-normal text-muted-foreground">
            {path ?? 'Select a file to preview'}
          </p>

          {loadingFile ? (
            <div className="flex items-center gap-2 p-4 text-label font-light text-muted-foreground">
              <Spinner label="Loading file" /> Loading…
            </div>
          ) : contentNote ? (
            <p className="p-4 text-label font-light text-muted-foreground">{contentNote}</p>
          ) : content === null ? (
            <p className="p-4 text-label font-light text-muted-foreground">
              Pick a file on the left to read it here.
            </p>
          ) : (
            <CodeViewer path={path ?? 'file.txt'} value={content} className="h-[28rem]" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- tree */

interface FileTreeProps {
  nodes: TreeNode[];
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
  selected: string | null;
  onSelect: (path: string) => void;
}

/**
 * The repository's real directory structure.
 *
 * Folders collapse, files carry the same language marks the editor's explorer
 * uses, and indentation comes from padding rather than nested margins so a long
 * path still truncates against the panel edge instead of overflowing it.
 */
function FileTree({ nodes, depth, expanded, onToggle, selected, onSelect }: FileTreeProps) {
  return (
    /*
     * Plain nested lists rather than the ARIA tree pattern. `role="tree"`
     * promises roving-focus arrow-key navigation, and claiming it without
     * implementing it is worse than not claiming it — nested lists already
     * announce their structure and every row is reachable by Tab.
     */
    <ul>
      {nodes.map((node) => {
        const open = expanded[node.path] ?? false;
        const isDirectory = node.type === 'directory';

        return (
          <li key={node.path}>
            <button
              type="button"
              aria-expanded={isDirectory ? open : undefined}
              aria-current={!isDirectory && node.path === selected ? true : undefined}
              onClick={() => (isDirectory ? onToggle(node.path) : onSelect(node.path))}
              /* Indentation scales with depth; the base keeps the first level off the edge. */
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className={cn(
                'flex w-full items-center gap-1.5 rounded-sm py-1.5 pr-2 text-left text-label font-light',
                'outline-none transition-colors duration-[--duration-fast]',
                'hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                !isDirectory && node.path === selected
                  ? 'bg-surface-active text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {isDirectory ? (
                <>
                  <ChevronRight
                    aria-hidden="true"
                    className={cn(
                      'size-3 shrink-0 transition-transform duration-[--duration-fast]',
                      open && 'rotate-90',
                    )}
                  />
                  {open ? (
                    <FolderOpen className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Folder className="size-3.5 shrink-0" aria-hidden="true" />
                  )}
                </>
              ) : (
                <>
                  {/* Keeps file names aligned with folder names, which carry a chevron. */}
                  <span aria-hidden="true" className="size-3 shrink-0" />
                  <FileTypeIcon path={node.path} className="size-3.5" />
                </>
              )}
              <span className="truncate" title={node.path}>
                {node.name}
              </span>
            </button>

            {isDirectory && open && node.children && node.children.length > 0 && (
              <FileTree
                nodes={node.children}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                selected={selected}
                onSelect={onSelect}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
