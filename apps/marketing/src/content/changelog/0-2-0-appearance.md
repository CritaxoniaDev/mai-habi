---
version: '0.2.0'
date: 2026-07-09
title: Light, dark and system
summary: A theme that follows your operating system, switches without a flash, and never reaches your project.
kinds: ['added', 'improved']
---

Appearance became a real feature rather than a stylesheet swap.

### Added

- **Light, dark and system**, defaulting to system. System follows
  `prefers-color-scheme` and changes the moment your operating system does, with
  no reload.
- **Monaco and the editor chrome switch together**, and your open tabs, undo
  history and cursor position all survive the change.
- Appearance is remembered in this browser, and tabs stay in step with one
  another.

### Improved

- **No flash on load.** The theme is resolved by a small script that runs before
  the first paint, so a dark page never appears white for a frame.
- **Contrast is now computed rather than eyeballed.** Every text colour clears
  WCAG AA against every surface it sits on, in both themes, and a build check
  fails if a palette edit drops below that.
- Focus rings on every control, arrow-key navigation in the file tree, labelled
  form fields, and `prefers-reduced-motion` respected throughout.

### Note

Your project keeps its own appearance. The preview receives no fonts, no design
tokens and no theme class — in dark mode you get dark chrome around a page that
looks exactly as you built it.
