---
title: Files and imports
description: How modules resolve inside a HABI project.
---

A HABI project is a virtual filesystem held in your browser. It supports nested
folders, rename, duplicate, move, drag and drop, upload and delete — but it is
not a real disk, and nothing is written to your machine.

## Supported files

| Extension | Treated as |
| --- | --- |
| `.tsx`, `.ts` | TypeScript, JSX enabled |
| `.jsx`, `.js`, `.mjs` | JavaScript, JSX enabled |
| `.css` | Stylesheet, bundled into the preview |
| `.json` | Parsed and importable |
| `.html` | Document, or the project entry |

## Previewing what you cannot edit

Not every file is text. Selecting one of these opens a viewer instead of the
editor:

| Kind | Shown as |
| --- | --- |
| Images | The picture, fit to the pane |
| Video and audio | A player with the browser's own controls |
| PDF | The browser's PDF viewer — pages, zoom, search, print |
| Word (`.docx`) | The document, following the editor's light or dark setting |

These are previews, not editors: the file is shown, never rewritten.

## Adding a file or folder

The **＋** buttons above the tree, the right-click menu and the command palette
all do the same thing — open a row in the tree where you type the name. There is
no dialog.

Where the row appears follows what is selected: inside a selected folder,
beside a selected file, otherwise at the root.

## Relative imports

Imports resolve against the project the way a bundler resolves against a disk.

```tsx
import Header from './components/Header';
import { format } from '../lib/format';
import './styles.css';
```

Given `./components/Button`, HABI tries in order:

1. the exact path, if it already has an extension
2. `Button.tsx`, `Button.ts`, `Button.jsx`, `Button.js`, `Button.mjs`, `Button.json`, `Button.css`
3. `Button/index.tsx`, and the same list of extensions

So a folder with an `index.tsx` can be imported by folder name.

## Package imports

Only the packages HABI provides can be imported:

```tsx
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
```

Anything else is a compile error naming the package:

```
External package "axios" is not available in this playground.
Only react and react-dom are provided.
```

This is deliberate. See [Provided packages](/reference/packages/).

## The entry file

The entry is the module the compiler starts from. HABI looks for, in order:

`src/main.tsx`, `src/main.jsx`, `src/index.tsx`, `src/index.jsx`, `src/main.ts`,
`src/main.js`, `main.tsx`, `main.jsx`, `index.tsx`, `index.jsx`, `index.html`

You can set it explicitly in project settings if your project is arranged
differently.

## HTML projects

If the entry is an `index.html`, it is treated as a real document rather than a
module. Local `<link rel="stylesheet">` and `<script src>` references resolve
against the virtual filesystem, the CSS is bundled, and the JavaScript runs
after the body exists.

```html
<!doctype html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <button id="counter">Count</button>
    <script src="./script.js"></script>
  </body>
</html>
```

That means an ordinary `index.html` + `styles.css` + `script.js` project works
with no framework and no build configuration.
