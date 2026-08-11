---
version: '0.5.0'
date: 2026-08-11
title: A file tree worth reading
summary: Tree guides, real language icons, and a new file you can always back out of.
kinds: ['added', 'improved', 'fixed']
---

Small things, in the panel you look at most.

### Added

- **Language icons.** Files show their real mark — the React atom, the
  TypeScript and JavaScript squares, the CSS and HTML5 shields, the JSON and
  Markdown logos. Colours keep each brand's hue but are tuned for readability,
  since JavaScript yellow is close to invisible on a light background.
- **Tree guides.** Connector lines run down the explorer, so nesting is
  readable at a glance instead of inferred from indentation.

### Improved

- Naming a new file now shows a placeholder, a cancel button and a hint that
  Escape works.
- Tighter indentation in the explorer, leaving more room for long filenames.

### Fixed

- **A new file you could not cancel.** Clicking away from an empty name row left
  it stranded and unfocused, with no way out except clicking back into it.
  Leaving an untouched row now discards it, and Escape or the cancel button work
  from anywhere.
