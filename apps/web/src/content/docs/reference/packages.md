---
title: Provided packages
description: React and a small curated shelf of libraries, with no install step.
---

## What you can import

The playground provides these. Import them and they work — there is nothing to
install and no `package.json` to edit.

| Specifier | What it is |
| --- | --- |
| `react` | Hooks, `memo`, `Fragment`, the full public API |
| `react-dom` | `flushSync`, `createPortal` and friends |
| `react-dom/client` | `createRoot`, `hydrateRoot` |
| `motion` | The vanilla animation API — `animate`, `scroll`, `inView` |
| `motion/react` | The React API — `motion.div`, `AnimatePresence`, `useScroll` |
| `framer-motion` | The same module as `motion/react`, under its older name |
| `lenis` | Smooth scrolling, framework-free |
| `lenis/react` | `ReactLenis`, `useLenis` |
| `clsx` | Conditional class names |
| `zustand` | Small state store |

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { ReactLenis } from 'lenis/react';
import clsx from 'clsx';
import { create } from 'zustand';
```

`react/jsx-runtime` and `scheduler` are also resolvable, but they are React's own
plumbing — the JSX transform reaches for them, you should not have to.

## How it works

Each package is built ahead of time into a real ES module and served from
`/runtime`. The preview document maps the specifiers with an import map, so:

- **Nothing is bundled into your output.** Your compiled file stays a few
  kilobytes and simply imports `react` or `framer-motion` by name.
- **Nothing is downloaded until it is used.** A project that never imports
  motion never fetches it.
- **There is exactly one React.** The whole shelf is built in a single pass with
  code splitting, so `motion/react`, `lenis/react` and your own `import React`
  all resolve to the same chunk. Two copies of React is the classic way for
  hooks to start throwing, and it cannot happen here.
- **The browser caches them once**, across builds and across sessions.

## What you cannot import

Everything else.

```tsx
import axios from 'axios';
```

```
External package "axios" is not available in this playground.
Available packages: react, react-dom, motion, framer-motion, lenis, clsx, zustand.
```

The error names the package and lists the alternatives. A deep import reports its
root, so `@scope/pkg/deep/path` is reported as `@scope/pkg`. An unknown subpath
of a package that *is* available is reported differently, with the entry points
that exist.

## Why the list is short

An npm registry means resolving a dependency tree, downloading tarballs and
running install scripts. That needs either a server per user or a Node runtime in
the browser — the two things that make playgrounds slow to start and expensive to
host.

Keeping a curated shelf is what buys the rest: an instant first render, no
per-user compute, and a share link a stranger can open without waiting for an
install.

## If you need something else

**Import it from a CDN.** Absolute URLs are passed through untouched:

```tsx
import confetti from 'https://esm.sh/canvas-confetti';
```

This is not resolved or verified by the playground. The request happens in the
sandbox at runtime, and it needs the CDN to serve a real ES module with CORS.

:::caution
If a CDN package depends on React, it will usually bring its own copy — and two
Reacts in one page means "invalid hook call". Most CDNs let you avoid that;
`esm.sh` accepts `?external=react,react-dom`.
:::

**Or paste it in.** Many small utilities are a few dozen lines. A file in your
project has no such problems.

## Editor types

React ships full type declarations to the editor, so `useState` autocompletes and
`ReactNode` resolves.

The other packages do not yet — their imports compile and run, but the editor
treats them as untyped rather than offering completions. Adding declarations for
them is planned; nothing about your code needs to change when it lands.

## Self-hosting

The shelf lives in one place. `ALLOWED_PACKAGES` in
`packages/compiler/src/runtime.ts` maps a specifier to a file, and `ENTRIES` in
`scripts/sync-runtime.mjs` builds that file. Adding a library means adding an
entry to each and re-running `npm run sync:runtime`.
