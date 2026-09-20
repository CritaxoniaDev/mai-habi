---
title: GitHub repositories
description: Browse the repositories on your account and open one in the playground.
---

Signing in with GitHub does two things: it gives your projects somewhere to live
beyond this browser, and it lets you open your repositories here without
downloading anything.

## Signing in

Sign-in is with GitHub, and it stays optional — the editor works fully as a
guest. GitHub asks you to grant access to your repositories, **including private
ones**, because that is the only scope GitHub offers that can read a private
repository. It is not read-only; GitHub publishes no read-only equivalent.

You can revoke it at any time from your
[GitHub applications settings](https://github.com/settings/applications). Doing
so leaves your projects untouched — only the repository browser stops working.

:::caution
The authorisation is held in this browser's `localStorage` so it survives
reloads and tabs. Treat a leaked token as an account compromise and revoke it.
:::

## Browsing

**Repositories** in the header lists everything the connection can reach —
yours, ones you collaborate on, and your organisations'. Filter by name,
description or language, narrow to sources, forks or private repositories, and
sort by recently updated, name or stars.

Each row shows the primary language with its own mark, plus size, stars and when
it was last updated.

## Looking inside

Opening a repository shows its real directory tree — folders collapse, files
carry the same icons as the editor's explorer. Selecting a file previews it in a
read-only editor with full syntax highlighting.

Above the tree you get two things GitHub's own language bar does not make
obvious:

- **The full language split**, not just the primary one. A repository that is
  40% TypeScript, 37% Astro and 20% PLpgSQL says so.
- **What it is built with.** A Next.js app reports its language as TypeScript,
  which tells you nothing about the framework. HABI reads the root config files
  — and one level inside `apps/` and `packages/`, so monorepos work — and labels
  Next.js, Astro, Nuxt, SvelteKit, Vue, Remix, Tailwind, Vite and Angular.

## Opening one in the playground

**Open in playground** downloads the repository and imports it as an ordinary
project. From there it behaves like anything else you made here: edit, run,
share, export.

Two things decide whether it will actually *run*:

- **The import limits.** 500 files and 12MB, the same caps as any other import.
  A large repository is rejected with a message rather than silently truncated.
- **What the compiler supports.** HABI compiles HTML, CSS, JavaScript, React and
  Next in the browser and never runs `npm install`. A Python, Go or backend-Node
  repository will open and read perfectly well and will not run.

The repository page tells you before you commit: it flags a tree with no
`index.html` or `package.json` at the root, and says when a repository looks
like a monorepo — the whole tree imports, but the playground compiles one app
from a single entry file, so you pick the package after opening.

## Nothing is written back

The browser only reads. Opening a repository copies it into a HABI project;
editing that project never touches the repository, and there is no push, commit
or pull request. Export the project if you want the changes back on disk.
