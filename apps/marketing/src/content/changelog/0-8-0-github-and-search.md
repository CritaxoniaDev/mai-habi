---
version: '0.8.0'
date: 2026-08-23
title: Your GitHub repositories, project-wide search, and more kinds of file
summary: Sign in with GitHub and open any repository here, search every file at once, preview video, PDFs and Word documents, and name new files without a dialog.
kinds: ['added', 'improved', 'fixed']
---

The editor learned where your code already lives, and got better at finding
things inside it.

### Added

- **Your GitHub repositories, in the app.** Sign in with GitHub and browse
  everything your account can reach — yours, shared, and your organisations',
  private ones included. Filter by name, description or language, narrow to
  sources, forks or private, and sort by recent, name or stars.

  - **The real directory tree**, with the same file icons as the editor, and any
    file previewed in a read-only editor with full highlighting.
  - **The whole language split**, not just the primary one — a repository that
    is 40% TypeScript, 37% Astro and 20% PLpgSQL says so.
  - **What it is built with.** A Next.js app reports its language as
    TypeScript, which says nothing about the framework, so the config files are
    read instead: Next.js, Astro, Nuxt, SvelteKit, Vue, Remix, Tailwind, Vite
    and Angular, including inside a monorepo's `apps/` and `packages/`.
  - **Open in playground** imports the repository as an ordinary project. It
    tells you first when a tree has no obvious entry point, or looks like a
    workspace the browser compiler will not run whole.

- **Search across every file.** `Ctrl/Cmd + Shift + F` opens a search beside the
  file tree — Monaco keeps `Ctrl/Cmd + F` for the file you are editing. Results
  group by the file they came from, each group folds, and collapsing them all
  leaves exactly the list of files that matched. Match case and regular
  expressions are both there; selecting a result jumps to the line.

- **More kinds of file preview.** Video and audio play with the browser's own
  controls, PDFs open in the browser's viewer, and Word documents render inline
  and follow your light or dark setting.

### Improved

- **New files are named in the tree.** The ＋ buttons, the right-click menu and
  the command palette all open a row where you type the name, instead of a
  dialog. It appears inside a selected folder, beside a selected file, or at the
  root.

- **Sign-in is GitHub.** One provider, and the same authorisation that opens
  your repositories. It is still entirely optional — the editor works as a guest
  and always will.

- **A new look for the projects list and the file tree.** Projects are cards
  carrying their stack's mark and entry file, the most recent one wider than the
  rest. The tree's connector lines are drawn rather than typed, so they line up
  at any zoom.

### Fixed

- **Plain scripts in an HTML project share a scope again.** A `<script src>`
  without `type="module"` was being loaded as a module, so a `const` declared in
  one file was invisible to the next and the page died on a `ReferenceError`.

- **Projects a page loads from a CDN now load.** Tailwind's CDN build, Supabase
  and anything else a project pulls in were refused by the preview's content
  policy. Inline `<script>` blocks were failing the same way.

- **Deleting a synced project deletes it.** It was removed from the browser but
  left in the account, so it reappeared on the next refresh.

- **Signing in finishes.** The callback could navigate away while the token was
  still being exchanged, leaving you back on the dashboard as a guest. An
  expired link now says so instead of silently returning you.

- **Closing every tab shows the empty editor**, rather than leaving the last
  file on screen.
