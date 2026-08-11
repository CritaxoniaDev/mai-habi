---
version: '0.1.0'
date: 2026-06-24
title: The playground
summary: An editor, a viewer, and a compiler that runs on your own machine.
kinds: ['added']
---

The first thing that works end to end: write React, watch it run, send someone a
link.

### Added

- **Editor and viewer as separate modules.** The editor is for files, code and
  the console. The viewer is only your running application, on its own page.
- **Compilation in the browser.** esbuild runs as WebAssembly inside a Web
  Worker on your device. There is no build server and nothing is uploaded.
- **Monaco**, with a virtual filesystem behind it — nested folders, rename,
  duplicate, move, drag and drop, upload.
- **React provided by the platform.** `react`, `react-dom` and
  `react-dom/client` are served as real ES modules and cached by your browser,
  so your bundle stays small and holds one React instance.
- **A sandboxed preview.** Compiled code runs in an iframe with
  `allow-scripts` and nothing else, so it can never reach the editor.
- **Share links.** With no backend configured, the whole project travels inside
  the link.
- **Projects stored locally** in IndexedDB. No account, ever, unless you want
  one.
