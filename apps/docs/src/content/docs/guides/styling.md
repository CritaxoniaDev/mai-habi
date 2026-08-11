---
title: Styling and Tailwind
description: Plain CSS always works; Tailwind is one setting away.
---

## Plain CSS

Write CSS in any `.css` file and import it from a module:

```tsx
import './styles.css';
```

Every imported stylesheet is gathered into one sheet and injected into the
preview document. Ordinary selectors, custom properties, media queries, nesting
and `@font-face` all behave normally.

Relative `url()` references to project assets are not resolved — use a `data:`
URI or an absolute URL for images and fonts.

## Tailwind CSS

Tailwind is **off by default** and nothing is downloaded while it is off.

Turn it on in **Project settings → Styling**, or from the command palette with
*Enable Tailwind CSS*. Two things happen:

1. The preview loads Tailwind's browser build.
2. Utility classes in your markup start working immediately.

```tsx
export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-light">Hello World</h1>
    </main>
  );
}
```

There is no config file. Tailwind scans the rendered document and generates what
it finds, so classes work as soon as they appear.

You can still use your own CSS at the same time — the two are additive. The
**React + Tailwind CSS** template starts with it already enabled.

:::caution
Tailwind's browser build does its work at runtime, in the preview. It is
excellent for sketching, and heavier than a compiled Tailwind setup would be in
a production application.
:::

## Your project keeps its own appearance

HABI's own light and dark themes apply to the editor and the viewer chrome —
never to your project. The preview receives no design tokens, no fonts and no
theme class from the product. If you want your page to react to dark mode, use
`prefers-color-scheme` in your own CSS.
