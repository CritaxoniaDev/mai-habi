---
title: The compiler
description: esbuild as WebAssembly, in a Web Worker, on your machine.
---

## The pipeline

```
your keystrokes
      │  debounced ~300 ms
      ▼
 compiler worker
      │  esbuild-wasm + a virtual filesystem plugin
      ▼
 one ES module + one stylesheet
      │
      ▼
 sandboxed iframe
```

Everything above happens in your browser. The server's only job is to send the
application and some static assets; it never compiles anything, never runs npm,
and never starts a process for you.

## Why a worker

Compilation runs off the main thread, so typing stays responsive while a build
is in flight. Superseded builds are dropped rather than queued — only the newest
state of your files matters.

esbuild is initialised once per tab and reused, so the WebAssembly binary is
downloaded and instantiated a single time.

## What the build does

| Setting | Value |
| --- | --- |
| Format | ES module |
| Target | ES2020 |
| JSX | Automatic runtime, `react` as the import source |
| Minify | Off in the editor, on in the viewer |
| Source maps | Inline |
| Externals | `react`, `react-dom`, `react-dom/client`, `react/jsx-runtime`, `scheduler` |

TypeScript annotations are **stripped, not checked**. Type errors come from the
editor's own TypeScript service and appear under Problems; they never stop your
project from running. That is the same split Vite and esbuild use.

## Resolution

A plugin resolves every import against the project's virtual filesystem instead
of a disk. See [Files and imports](/guides/files-and-imports/) for the order it
tries.

Anything that is neither relative nor a provided package is an error. Absolute
`http(s)` and `data:` URLs are passed through untouched, so a project can point
at something on the open web if it wants to.

## CSS

CSS imported from a module is collected by esbuild into a single stylesheet,
which is inlined into the preview document. Unresolved `url()` references inside
a stylesheet are left alone rather than failing the build.

## Caching

The WebAssembly binary, the React modules and Tailwind's browser build are
ordinary static files with cache headers. They are fetched once and then served
from the browser cache across builds and sessions.
