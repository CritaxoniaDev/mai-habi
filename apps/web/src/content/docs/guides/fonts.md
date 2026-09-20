---
title: Fonts
description: Add Google Fonts to a project without leaving the editor.
---

You don't need to paste a `<link>` from Google Fonts. HABI has a picker.

Open it from the **command palette** (search "Fonts") or from **Project
settings → Fonts → Choose fonts**.

## Adding a font

- Search the shelf of popular families and click one to add it, or type **any**
  Google Fonts family by name in the field at the bottom — the whole catalogue
  is reachable.
- For each font, pick the **weights** you want and toggle **italic**.
- The picker previews each family in its own typeface.

Fonts load **live from Google Fonts** into the preview, so nothing is bundled
into your output, and a shared link renders with the same fonts.

## Using a font

You have two ways to apply one:

- **Reference it by name** in your CSS, as you would any font:

  ```css
  h1 {
    font-family: 'Inter', system-ui, sans-serif;
  }
  ```

- **Set it as the default.** Toggle *Default font* on one of your fonts and it
  becomes the document default. The starter templates read
  `font-family: var(--font-body, …)`, so they adopt your choice automatically;
  your own CSS always wins over it.

## Notes

- Because fonts are fetched from Google at runtime, the preview needs a network
  connection to render them, and a self-contained (offline) export will not
  carry the font files.
- Your selection is part of the project, and travels in a shared link.
