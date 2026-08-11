# HABI

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

Three deployments, one repository. They are separate so a visitor reading the
landing page never downloads the editor, and a reader of the docs downloads
neither.

```
mai-habi/
├── apps/
│   ├── web/                   The playground: /editor/[id] and /view/[id]
│   │   ├── src/islands/       Hydration roots
│   │   ├── src/workers/       compiler.worker.ts
│   │   └── public/            Generated: wasm/, runtime/, types/
│   ├── marketing/             habi.app — the landing page, no React at all
│   └── docs/                  Starlight documentation
├── packages/
│   ├── types/                 Project schema
│   ├── compiler/              esbuild-wasm bundler, preview document, protocol
│   ├── filesystem/            Virtual filesystem, import/export, detection
│   ├── shared/                IndexedDB, guest identity, templates, Supabase
│   └── ui/                    Design system and theme controller
├── scripts/                   sync-runtime, verify, design-checks, docs typography
└── supabase/schema.sql
```

| App | Port | What it is |
| --- | --- | --- |
| `apps/web` | 4321 | Editor and viewer |
| `apps/marketing` | 4322 | Landing page |
| `apps/docs` | 4323 | Documentation |

Packages are consumed as TypeScript source through npm workspaces, so there is
no build step between them and the apps.

## Getting started

```bash
npm install          # also stages the browser runtime into public/
npm run dev          # the playground,     http://localhost:4321
npm run dev:marketing #                    http://localhost:4322
npm run dev:docs     #                     http://localhost:4323
```

```bash
npm run build        # builds all three apps
npm run typecheck    # astro check
npm run verify       # compiler, filesystem, preview, contrast and design audit
npm run sync:runtime # re-stage React / esbuild.wasm / Tailwind after upgrades
npm run sync:icons   # regenerate the language logos from simple-icons
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

**Packages are provided by the platform.** React, `motion`/`framer-motion`,
`lenis`, `clsx` and `zustand` are marked external and served as real ES modules
from `/runtime`, wired up with an import map in the preview. They are built in a
single pass with code splitting, so every library that needs React shares the
same React chunk — two copies is how hooks start throwing. Each module is fetched
only when a project imports it, and cached by the browser after that.

Anything else is refused, deliberately:

```
External package "axios" is not available in this playground.
Available packages: react, react-dom, motion, framer-motion, lenis, clsx, zustand.
```

There is no registry, no `node_modules` and no install step, and the console
panel never pretends otherwise — it is the application's browser console, not a
shell.

[`scripts/sync-runtime.mjs`](scripts/sync-runtime.mjs) stages those assets out
of `node_modules` at install time: `esbuild.wasm`, the React ES modules (built
with code splitting so `react-dom/client` and your `import React` share one
chunk), Tailwind's browser build, and React's `.d.ts` files for Monaco.

## File-type icons

The explorer shows each language's real mark — the React atom, the TypeScript
and JavaScript squares, the CSS and HTML5 shields, the JSON and Markdown logos.

simple-icons ships those as raw SVGs alongside a five-megabyte JavaScript index,
so [`scripts/sync-icons.mjs`](scripts/sync-icons.mjs) extracts only the seven
paths in use into a generated module. That file is committed, so the app builds
without simple-icons installed; the package is a devDependency used purely to
regenerate it.

Colour comes from `--lang-*` tokens rather than the official brand palette.
JavaScript yellow reads at about 1.2:1 on white and React cyan at 1.4:1 — both
invisible — so light mode keeps the brand hue and darkens it, while dark mode
uses the real values where they work. Every one clears 3:1 against the surfaces
it sits on, in both themes, and `npm run verify` computes that.

## Images and assets

Drop an image into the file tree and reference it — from an import, from CSS
`url()`, or from `<img src>` in an `index.html` project. Each referenced file
is inlined into the build as a `data:` URI, so a share link carries its own
images and needs no asset host.

Binary files travel through the project as base64 under their own path; both the
store and the compiler decide what is binary from the extension. Above 512 KB the
compiler warns, because a data URI is a third larger again and is rebuilt into
the preview on every change.

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

Three Vercel projects from this one repository, each with its own root
directory. Enable **Include source files outside of the Root Directory** on all
of them so the workspace root is available during install.

| Vercel project | Root directory | Suggested domain |
| --- | --- | --- |
| Playground | `apps/web` | `app.habi.app` |
| Marketing | `apps/marketing` | `habi.app` |
| Docs | `apps/docs` | `docs.habi.app` |

Each app carries its own `vercel.json` with the build command and headers.

Set the origins so the three sites can link to each other:

| Variable | Needed by |
| --- | --- |
| `PUBLIC_APP_ORIGIN` | all three |
| `PUBLIC_DOCS_ORIGIN` | marketing, docs |
| `PUBLIC_SITE_ORIGIN` | docs |

[`apps/web/vercel.json`](apps/web/vercel.json) sets `Access-Control-Allow-Origin`
on `/runtime` and `/wasm`: the preview's opaque origin makes those module-script
requests cross-origin, so they need CORS. Carry that across if you deploy
somewhere other than Vercel — without it the preview cannot load React.

Vercel serves static files and, optionally, authentication. It never compiles
React, runs npm, or starts a process per user.

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
- a project using framer-motion, lenis, clsx and zustand compiles, and those
  libraries stay external rather than being inlined
- `axios` is rejected by name, deep scoped imports report the package root,
  unresolved relative imports name both files, syntax errors carry a location
- every starter template compiles

The docs build additionally fails if any bold type survives into the Starlight
stylesheet — see [`scripts/check-docs-typography.mjs`](scripts/check-docs-typography.mjs),
which reads the built CSS rather than trusting the override list.

The rest covers the preview document (sandbox flags, `</script>` breakout, import map,
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
