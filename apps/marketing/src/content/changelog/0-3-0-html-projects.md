---
version: '0.3.0'
date: 2026-07-28
title: Plain HTML, CSS and JavaScript
summary: Projects without a framework, starting from an ordinary index.html.
kinds: ['added']
---

Not everything needs React. A project can now start from a document.

### Added

- **`index.html` as an entry point.** It is treated as a real document rather
  than a module: local stylesheet links and script sources resolve against your
  project, CSS is bundled, and your JavaScript runs once the body exists.
- **An HTML, CSS & JavaScript template**, so `index.html` + `styles.css` +
  `script.js` works with no build configuration and no framework.
- Extension-less and directory imports resolve the way a bundler resolves them
  on disk, so `./components` finds `components/index.tsx`.
