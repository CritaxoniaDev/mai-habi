---
title: Self-hosting
description: Running HABI yourself.
---

HABI is three separate deployments from one repository.

| App | Path | What it is |
| --- | --- | --- |
| Playground | `apps/web` | The editor and the viewer |
| Marketing | `apps/marketing` | The landing page |
| Docs | `apps/docs` | This site |

They are separate so that someone reading the landing page never downloads the
editor, and someone reading the docs never downloads either.

## Requirements

Node 20 or newer, and npm. That is the whole list — there is nothing to run in
production beyond a static host.

```bash
npm install     # also stages the browser runtime
npm run dev     # the playground, on :4321
```

`npm install` runs `scripts/sync-runtime.mjs`, which stages assets out of
`node_modules` and into `apps/web/public`:

- `esbuild.wasm` for the compiler worker
- React, ReactDOM and the JSX runtime, built as ES modules with code splitting
- Tailwind's browser build
- React's `.d.ts` files, for editor IntelliSense

Re-run it with `npm run sync:runtime` after upgrading React, esbuild or
Tailwind.

## Required headers

The preview iframe has an opaque origin, so the React modules it loads are
cross-origin requests. `/runtime` and `/wasm` must be served with:

```
Access-Control-Allow-Origin: *
```

`apps/web/vercel.json` sets this. If you deploy somewhere else, carry it across —
without it the preview cannot load React.

There is no cross-origin isolation requirement. HABI does not use
`SharedArrayBuffer`, so no `COOP`/`COEP` headers are needed.

## Optional backend

Accounts, cross-device sync and short share links need a Postgres database.
Apply `supabase/schema.sql`, then set:

```
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
```

Only the anon key reaches the browser, and row-level security stays enabled.
Skip this entirely and HABI runs in guest-only mode.

## Environment

| Variable | App | Meaning |
| --- | --- | --- |
| `PUBLIC_APP_ORIGIN` | all | Where the playground is deployed |
| `PUBLIC_DOCS_ORIGIN` | marketing | Where these docs are deployed |
| `PUBLIC_SITE_ORIGIN` | docs | Where the marketing site is deployed |

## Checks

```bash
npm run verify     # compiler, filesystem, preview, contrast and design audit
npm run typecheck  # astro check across every app
npm run build      # build all three
```

`npm run verify` runs the real compiler plugin through Node's esbuild — the same
implementation as the WebAssembly build — so import resolution, the package
whitelist, JSX handling and every starter template are genuinely exercised.
