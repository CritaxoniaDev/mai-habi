---
title: Your first React app
description: Components, state and styles in a HABI project.
---

Create a **React + TypeScript** project. You get three files.

## The mount file

`src/main.tsx` is the entry: the module the compiler starts from.

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './styles.css';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
```

The preview document always provides `<div id="root">`, so this works as written.

:::note
If a project has no entry file, HABI generates one for you: it finds your root
component, mounts it, and imports every stylesheet in the project. You can work
entirely inside `App.tsx` and never write a `createRoot` call.
:::

## The component

`src/App.tsx` is where you actually work.

```tsx
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="container">
      <h1>Hello React</h1>
      <button type="button" onClick={() => setCount(count + 1)}>
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
    </main>
  );
}
```

Types work properly. `useState` infers, `ReactNode` resolves, and hovering a
prop shows its type — HABI loads React's declaration files into the editor even
though there is no `node_modules` folder.

## Adding a component

Create `src/components/Button.tsx`:

```tsx
import type { ReactNode } from 'react';

export default function Button({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}
```

Then import it. The extension is optional:

```tsx
import Button from './components/Button';
```

## Styles

`src/styles.css` is imported by the entry, so it applies to the whole preview.
Import CSS from any module and it is gathered into a single stylesheet.

```tsx
import './styles.css';
```

For utility classes instead, turn on Tailwind in project settings — see
[Styling and Tailwind](/guides/styling/).

## When something breaks

- A red marker on a line, and an entry under **Problems**, means it did not
  compile. Nothing new ran.
- A message under **Console** means it compiled and then threw while running.

The two are kept apart on purpose. See
[Preview, console and errors](/guides/preview-and-errors/).
