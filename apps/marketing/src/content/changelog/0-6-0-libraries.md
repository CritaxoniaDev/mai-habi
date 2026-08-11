---
version: '0.6.0'
date: 2026-08-12
title: Libraries, without installing them
summary: Motion, Lenis, clsx and Zustand join React on the shelf — import one and it works.
kinds: ['added', 'improved']
---

The playground still has no npm registry. It now has a shelf.

### Added

- **Motion** (`motion`, `motion/react`, and `framer-motion` under its older
  name), for animation.
- **Lenis** (`lenis`, `lenis/react`), for smooth scrolling.
- **clsx** and **Zustand**, because almost every component wants one of them.

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { ReactLenis } from 'lenis/react';
```

Each is built ahead of time into a real ES module and wired up with an import
map, which means three things worth knowing:

- Nothing is bundled into your output — your compiled file stays a few kilobytes
  and simply imports by name.
- Nothing is downloaded until it is used. A project that never touches Motion
  never fetches it.
- There is exactly one React. The whole shelf is built in a single pass with code
  splitting, so `motion/react`, `lenis/react` and your own `import React` all
  resolve to the same chunk — the usual cause of "invalid hook call" cannot
  happen here.

### Improved

- **The rejection message now helps.** Importing something unavailable lists what
  *is* available, and reaching for an entry point that does not exist on a
  package that does is reported as its own kind of mistake.
- Project settings shows the shelf, so you do not have to guess.

### Known limitation

Only React ships type declarations to the editor so far. The new packages
compile and run, but the editor treats them as untyped rather than offering
completions.
