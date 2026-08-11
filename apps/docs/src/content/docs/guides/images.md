---
title: Images and assets
description: Getting a picture into a project, and referencing it from code, CSS or HTML.
---

## Getting a file in

Images live in your project like any other file. Three ways to add one:

- **Drag it onto the file tree.** Drop it on a folder to put it there, or on
  empty space for the project root.
- **Right-click a folder → Upload files.**
- **Right-click empty space → Import files.**

Selecting an image in the tree opens a preview rather than a wall of characters.

## Using it

Once a file is in the project, reference it the way you normally would. All three
of these work:

### From JavaScript or TypeScript

```tsx
import logo from './assets/logo.png';

export default function App() {
  return <img src={logo} alt="Logo" />;
}
```

The import gives you a string. The editor knows that too, so `logo` types as
`string` rather than as an unresolved module.

### From CSS

```css
.hero {
  background-image: url('./assets/logo.png');
}
```

### From HTML

```html
<img src="./photo.png" alt="A photo" />
```

In an `index.html` project, local `src` and `poster` attributes on `img`,
`source`, `video`, `audio`, `track` and `embed` are resolved against your
project. Anything absolute — `https://…` or a `data:` URI — is left exactly as
you wrote it.

## Paths

Paths work like imports elsewhere: `./logo.png` is relative to the file you are
writing, and `/src/assets/logo.png` is from the project root. **Copy path** in
the file tree's context menu gives you the root path to paste.

Unlike code imports, the extension is required. `./logo` will not find
`logo.png`.

## What actually happens

There is no asset server and no upload. Each referenced file is inlined into the
build as a `data:` URI, which is why a shared link works with nothing behind it —
the image travels inside the project.

Supported: `png`, `jpg`, `jpeg`, `gif`, `webp`, `avif`, `ico`, `bmp`, `svg`,
`woff`, `woff2`, `ttf`, `otf`, `mp4`, `webm`, `mp3`, `wav`, `ogg`.

:::caution
A data URI is about a third larger than the file it encodes, and it is rebuilt
into the preview on every change. Above 512 KB the compiler warns you in the
Problems panel — it still builds, but a few large images will make reloads
sluggish and can push a share link past its size limit.

For anything big, an absolute URL to an image hosted elsewhere costs the project
nothing.
:::

## Fonts

The same mechanism covers web fonts:

```css
@font-face {
  font-family: 'My Font';
  src: url('./fonts/my-font.woff2') format('woff2');
}
```

## Missing files

A missing import is a compile error naming both files. A missing image in an
HTML `src` is left alone instead — you get a broken image in the preview rather
than a failed build, which is the same thing a browser would do.
