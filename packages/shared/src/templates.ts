import type { ProjectTemplate } from '@mai-habi/types';

/**
 * Starter projects.
 *
 * Framework templates include a visible `src/main.tsx` rather than hiding the mount
 * behind magic — the compiler will synthesise one if a project lacks it, but a
 * user who wants to change the root should be able to see it.
 */

const STYLES_CSS = `html,
body {
  margin: 0;
}

body {
  font-family: Geist, Inter, system-ui, sans-serif;
  font-weight: 300;
  color: #171717;
  background: #ffffff;
}

.container {
  min-height: 100vh;
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 300;
  letter-spacing: -0.02em;
}

p {
  margin: 0;
  color: #525252;
}

button {
  font: inherit;
  padding: 8px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
}

button:hover {
  background: #f5f5f5;
}
`;

const MAIN_TSX = `import { StrictMode } from 'react';
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
`;

const MAIN_JSX = MAIN_TSX.replace("from './App'", "from './App.jsx'");

const APP_TSX = `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="container">
      <h1>Hello React</h1>
      <p>Start editing src/App.tsx. Changes compile in your browser.</p>
      <button type="button" onClick={() => setCount(count + 1)}>
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
    </main>
  );
}
`;

const APP_JSX = APP_TSX.replace('src/App.tsx', 'src/App.jsx');

const APP_TAILWIND = `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-screen flex flex-col items-start gap-3 p-12">
      <h1 className="text-3xl font-light tracking-tight">Hello React</h1>
      <p className="text-neutral-600">
        Tailwind is enabled for this project. Edit src/App.tsx to begin.
      </p>
      <button
        type="button"
        onClick={() => setCount(count + 1)}
        className="rounded-lg border border-neutral-200 px-4 py-2 transition-colors hover:bg-neutral-50"
      >
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
    </main>
  );
}
`;

const TAILWIND_CSS = `/*
 * Tailwind is injected by the preview runtime for this project, so utility
 * classes work without an import. Add your own rules here.
 */

html,
body {
  margin: 0;
}

body {
  font-family: Geist, Inter, system-ui, sans-serif;
  font-weight: 300;
}
`;

const HTML_DOCUMENT = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HTML, CSS & JavaScript</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="container">
      <p class="eyebrow">Vanilla web project</p>
      <h1>HTML, CSS & JavaScript</h1>
      <p class="intro">Edit index.html, styles.css, and script.js. No framework required.</p>
      <button id="counter" type="button">
        Clicked <span>0</span> times
      </button>
    </main>
    <script src="./script.js"></script>
  </body>
</html>
`;

const VANILLA_CSS = `* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: #172033;
  background: #f7f8fc;
}

.container {
  width: min(680px, calc(100% - 40px));
  min-height: 100vh;
  margin: 0 auto;
  display: grid;
  place-content: center;
  justify-items: start;
  gap: 16px;
}

.eyebrow {
  margin: 0;
  color: #59657a;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(36px, 8vw, 64px);
  line-height: 1;
  letter-spacing: -0.05em;
}

.intro {
  max-width: 52ch;
  margin: 0 0 8px;
  color: #59657a;
  line-height: 1.6;
}

button {
  padding: 10px 16px;
  border: 1px solid #cbd1dc;
  border-radius: 10px;
  color: #ffffff;
  background: #172033;
  font: inherit;
  cursor: pointer;
}

button:hover {
  background: #2a3549;
}

button:focus-visible {
  outline: 3px solid #8da2c8;
  outline-offset: 3px;
}
`;

const VANILLA_JS = `const button = document.querySelector('#counter');
const output = button?.querySelector('span');
let count = 0;

button?.addEventListener('click', () => {
  count += 1;
  if (output) output.textContent = String(count);
});
`;

const REACT_TS: ProjectTemplate = {
  id: 'react-ts',
  name: 'React + TypeScript',
  description: 'TSX with full type checking in the editor.',
  settings: { entryFile: 'src/main.tsx', tailwind: false },
  files: {
    'src/main.tsx': MAIN_TSX,
    'src/App.tsx': APP_TSX,
    'src/styles.css': STYLES_CSS,
  },
};

const REACT_JS: ProjectTemplate = {
  id: 'react-js',
  name: 'React + JavaScript',
  description: 'Plain JSX, no type annotations.',
  settings: { entryFile: 'src/main.jsx', tailwind: false },
  files: {
    'src/main.jsx': MAIN_JSX,
    'src/App.jsx': APP_JSX,
    'src/styles.css': STYLES_CSS,
  },
};

const REACT_TAILWIND: ProjectTemplate = {
  id: 'react-tailwind',
  name: 'React + Tailwind CSS',
  description: 'TSX with the Tailwind browser runtime enabled.',
  settings: { entryFile: 'src/main.tsx', tailwind: true },
  files: {
    'src/main.tsx': MAIN_TSX,
    'src/App.tsx': APP_TAILWIND,
    'src/styles.css': TAILWIND_CSS,
  },
};

const HTML_CSS_JS: ProjectTemplate = {
  id: 'html-css-js',
  name: 'HTML + CSS + JavaScript',
  description: 'A browser-native project with no framework.',
  settings: { entryFile: 'index.html', tailwind: false },
  files: {
    'index.html': HTML_DOCUMENT,
    'styles.css': VANILLA_CSS,
    'script.js': VANILLA_JS,
  },
};

const BLANK: ProjectTemplate = {
  id: 'blank',
  name: 'Blank',
  description: 'One component and a stylesheet. Nothing else.',
  settings: { entryFile: 'src/main.tsx', tailwind: false },
  files: {
    'src/main.tsx': MAIN_TSX,
    'src/App.tsx': `export default function App() {
  return <main className="container">{/* Your app */}</main>;
}
`,
    'src/styles.css': STYLES_CSS,
  },
};

export const TEMPLATES: ProjectTemplate[] = [
  REACT_TS,
  REACT_JS,
  REACT_TAILWIND,
  HTML_CSS_JS,
  BLANK,
];

export function getTemplate(id: string): ProjectTemplate | undefined {
  return TEMPLATES.find((template) => template.id === id);
}
