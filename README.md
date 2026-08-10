# mai-habi

A browser code playground. Write HTML, CSS and JavaScript or build with React
and TypeScript, compile it **in your own browser**, and share the result with a
link.

```
       Editor  ────  Open viewer  ────►  Viewer
          │                                 │
   esbuild-wasm in a worker          compiles again, locally
          │                                 │
          ▼                                 ▼
   sandboxed iframe                  sandboxed iframe
```

No WebContainers, no Docker, no npm install, no server-side compilation. A
hundred users are a hundred local compiler workers — the server only ships
static files.

## Layout

```
mai-habi/
├── apps/web/                  One Astro app, two modules
│   ├── src/pages/             /  ·  /editor/[id]  ·  /view/[id]
│   ├── src/islands/           Hydration roots
│   ├── src/components/        Their internals
│   ├── src/workers/           compiler.worker.ts
│   ├── src/lib/               compile, share, monaco types, shortcuts
│   └── public/                Generated: wasm/, runtime/, types/
├── packages/
│   ├── types/                 Project schema
│   ├── compiler/              esbuild-wasm bundler, preview document, protocol
│   ├── filesystem/            Virtual filesystem, import/export, detection
│   ├── shared/                IndexedDB, guest identity, templates, Supabase
│   └── ui/                    Design system and theme controller
├── scripts/                   sync-runtime.mjs, verify.mjs, design-checks.mjs
└── supabase/schema.sql
```

Packages are consumed as TypeScript source through npm workspaces, so there is
no build step between them and the app.

## Getting started

```bash
npm install          # also stages the browser runtime into public/
npm run dev          # http://localhost:4321
```

```bash
npm run build        # builds the app
npm run typecheck    # astro check
npm run verify       # compiler, filesystem, preview, contrast and design audit
npm run sync:runtime # re-stage React / esbuild.wasm / Tailwind after upgrades
```

> `astro preview` is not supported with the Vercel adapter. Use `npm run dev`.

## How compilation works

1. You type. The virtual filesystem updates and, after a 300 ms pause, a
   snapshot is posted to the compiler worker.
2. The worker runs `esbuild-wasm` with a plugin that resolves imports against
   the project rather than a disk.
3. Output goes into a sandboxed iframe as one ES module and one stylesheet.

Resolution mirrors what a bundler would do on disk: `./Header` finds
`Header.tsx`, `./components` finds `components/index.tsx`, and supported source
extensions are tried in order. CSS imports are aggregated into one stylesheet.

An `index.html` entry is treated as a real document. Local stylesheet links and
script sources are resolved against the virtual filesystem, CSS is bundled, and
JavaScript runs after the document body has been created. This supports ordinary
`index.html` + `styles.css` + `script.js` projects without a framework.

**React is provided by the platform.** `react`, `react-dom`, `react-dom/client`
and `react/jsx-runtime` are marked external and served as real ES modules from
`/runtime`, wired up with an import map in the preview. The browser caches them
once; a user's bundle stays a few kilobytes and holds a single React instance.

Anything else is refused, deliberately:

```
External package "axios" is not available in this playground.
Only react and react-dom are provided.
```

There is no registry, no `node_modules` and no install step, and the console
panel never pretends otherwise — it is the application's browser console, not a
shell.

[`scripts/sync-runtime.mjs`](scripts/sync-runtime.mjs) stages those assets out
of `node_modules` at install time: `esbuild.wasm`, the React ES modules (built
with code splitting so `react-dom/client` and your `import React` share one
chunk), Tailwind's browser build, and React's `.d.ts` files for Monaco.

## Isolation

Compiled code is **never** evaluated in the application context — no `eval`, no
`new Function`, no injected `<script>`. It runs in an iframe with
`sandbox="allow-scripts"` and nothing else, which gives it an opaque origin: it
cannot reach the app's DOM, storage, cookies or session. `allow-same-origin`,
`allow-forms`, `allow-popups` and `allow-top-navigation` are all withheld.

The frame talks back over `postMessage` for console output, runtime errors and
readiness. Because the sandbox's origin is opaque, messages are identified by
matching the source window rather than an origin string, and every payload is
shape-checked before it is used.

Imported projects are untrusted too: paths are validated against traversal,
`node_modules`/`.git`/build folders are skipped, and file count, size and depth
are capped.

## Errors

Compilation and runtime errors are kept apart, because they mean different
things:

| | Where it shows |
| --- | --- |
| Compilation | Problems panel, plus a marker on the offending line in Monaco |
| Runtime | Console panel, tagged and timestamped, with the stack |

A compile error means no bundle was produced. A runtime error means the app ran
and threw — the editor keeps working either way.

## Storage

| | Guest | Signed in |
| --- | --- | --- |
| Projects | IndexedDB | IndexedDB, then a debounced push to Supabase |
| Share links | Snapshot carried inside the link | Short `/view/<id>` link |
| Expiry | 7 or 30 days | Optional, defaults to never |

Guests get a local identifier and an ownership secret that never leaves the
browser; no fake user records are created. Signing in offers to copy local
projects to the account — nothing is uploaded without a choice, and the local
copies are never deleted.

Nothing is sent per keystroke: edits go to local state, then to IndexedDB on a
debounce, then to the network on a longer one.

## Optional cloud setup

Everything works without this. To enable accounts, sync and short share links:

1. Create a Supabase project.
2. Apply [`supabase/schema.sql`](supabase/schema.sql) — tables plus row-level
   security.
3. Copy `apps/web/.env.example` to `.env` and fill in the URL and anon key.

Only the anon key ever reaches the browser. RLS stays enabled.

## Deployment

One Vercel project, root directory `apps/web`, framework Astro. Enable **Include
source files outside of the Root Directory** so the workspace root is available
during install, and set `PUBLIC_APP_ORIGIN` to the real domain.

[`apps/web/vercel.json`](apps/web/vercel.json) sets `Access-Control-Allow-Origin`
on `/runtime` and `/wasm`: the preview's opaque origin makes those module-script
requests cross-origin, so they need CORS.

Vercel serves the app, the static runtime and (optionally) authentication. It
never compiles React, runs npm, or starts a process per user.

## Appearance

Light, Dark and System, defaulting to System, from one implementation in
[`packages/ui/src/theme`](packages/ui/src/theme).

- **No flash.** [`THEME_INIT_SCRIPT`](packages/ui/src/theme/init.ts) runs inline
  in the head, ahead of any bundle. `npm run verify` executes that exact script
  against a stub document for every mode and system combination.
- **System follows the OS live**, with no reload, and tabs stay in step.
- **Nothing resets.** Switching calls `monaco.editor.setTheme`, so models, undo
  history and cursor position survive.

**Your project never inherits the product theme.** The preview gets no Tailwind
variables, no Geist, no `dark` class — only what the project defines. Tailwind
is loaded there only when the project setting is on.

## Design rules

Components never name a colour. [`theme.css`](packages/ui/src/theme.css) defines
semantic tokens for both themes, plus one type scale, the radius set, spacing,
motion and a fixed z-index ladder.

Typography is Geist, and hierarchy comes from size, spacing, colour and position
rather than weight. **No application-controlled text exceeds `font-weight: 400`,
and 300 is the default.**

Accessibility is treated as correctness: visible focus rings everywhere, dialogs
that trap and restore focus, a real `tree` for the file explorer with arrow-key
navigation and F2/Delete, labelled fields with `aria-describedby` error wiring,
and `prefers-reduced-motion` respected.

## What `npm run verify` covers

It runs the **real** compiler plugin and options through Node's esbuild — the
same implementation as the WebAssembly build — so these are end-to-end:

- a TSX project with nested imports compiles; JSX goes through the automatic
  runtime; types are stripped; CSS lands in its own output
- HTML/CSS/JavaScript projects preserve their document and run local scripts
  after the DOM exists; missing linked files produce compiler diagnostics
- React stays external and is never bundled into a user's output
- extensionless and directory imports resolve
- `axios` is rejected by name, deep scoped imports report the package root,
  unresolved relative imports name both files, syntax errors carry a location
- every starter template compiles

plus the preview document (sandbox flags, `</script>` breakout, import map,
Tailwind only when enabled), path-traversal defences, filesystem operations,
share-link round-trips, and the design audit: WCAG AA contrast computed from the
tokens in both themes, light/dark token parity, no weight above 400, no raw
palette classes, no arbitrary z-index.

## Keyboard

| | |
| --- | --- |
| `Ctrl/Cmd + S` | Save and rebuild |
| `Ctrl/Cmd + R` | Rebuild |
| `Ctrl/Cmd + Enter` | Open viewer |
| `Ctrl/Cmd + P` | Quick open |
| `Ctrl/Cmd + Shift + P` | Command palette |
| `Ctrl/Cmd + B` | Toggle files |
| `` Ctrl/Cmd + ` `` | Toggle console |
| `Ctrl/Cmd + F` / `H` | Find / replace (handled by the editor) |
