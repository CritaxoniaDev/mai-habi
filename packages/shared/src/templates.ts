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
  font-family: var(--font-body, Geist, Inter, system-ui, sans-serif);
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

const MAIN_TSX = `// The entry file. This is where your app attaches to the page.
//
// React comes from the platform, so there is nothing to install — just import
// it. The preview always provides <div id="root">.
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
`;

const MAIN_JSX = MAIN_TSX.replace("from './App'", "from './App.jsx'");

const APP_TSX = `import { useState } from 'react';

// Local imports resolve the way you would expect: the extension is optional,
// and a folder with an index file can be imported by folder name.
import Counter from './components/Counter';

export default function App() {
  const [name, setName] = useState('React');

  return (
    <main className="container">
      <h1>Hello {name}</h1>
      <p>
        Edit <code>src/App.tsx</code> and the preview rebuilds. Everything
        compiles in this browser — nothing is uploaded.
      </p>

      <input
        value={name}
        aria-label="Name"
        onChange={(event) => setName(event.target.value)}
        placeholder="Type a name"
      />

      <Counter label="Clicks" />
    </main>
  );
}
`;

const COUNTER_TSX = `import { useState } from 'react';

// Props are typed, and the editor knows about them. Try hovering "label".
interface CounterProps {
  label: string;
  start?: number;
}

export default function Counter({ label, start = 0 }: CounterProps) {
  const [count, setCount] = useState(start);

  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      {label}: {count}
    </button>
  );
}
`;

const COUNTER_JSX = `import { useState } from 'react';

export default function Counter({ label, start = 0 }) {
  const [count, setCount] = useState(start);

  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      {label}: {count}
    </button>
  );
}
`;

const APP_JSX = APP_TSX.replace('src/App.tsx', 'src/App.jsx')
  .replace("from './components/Counter'", "from './components/Counter.jsx'");

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
  font-family: var(--font-body, Geist, Inter, system-ui, sans-serif);
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
  font-family: var(--font-body, Inter, ui-sans-serif, system-ui, sans-serif);
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

const APP_MOTION_TSX = `import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactLenis } from 'lenis/react';
import clsx from 'clsx';

import Section from './components/Section';

// Motion, Lenis and clsx are provided by the playground — no install step, and
// they are only downloaded because this project imports them.

const SECTIONS = [
  { title: 'Scroll', body: 'Lenis smooths the whole page. Scroll and see.' },
  { title: 'Animate', body: 'Each section fades up the first time it appears.' },
  { title: 'Compose', body: 'Everything here compiled in your browser.' },
];

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <ReactLenis root>
      <main className="page">
        <motion.header
          className="hero"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        >
          <h1>Motion</h1>
          <p>Edit src/App.tsx. The preview rebuilds as you type.</p>

          <button
            type="button"
            className={clsx('toggle', open && 'toggle-open')}
            onClick={() => setOpen(!open)}
          >
            {open ? 'Hide details' : 'Show details'}
          </button>

          {/* AnimatePresence lets an element animate on the way out too. */}
          <AnimatePresence initial={false}>
            {open && (
              <motion.p
                className="details"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                Nothing was installed to make this work.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.header>

        {SECTIONS.map((section) => (
          <Section key={section.title} title={section.title}>
            {section.body}
          </Section>
        ))}
      </main>
    </ReactLenis>
  );
}
`;

const SECTION_TSX = `import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface SectionProps {
  title: string;
  children: ReactNode;
}

export default function Section({ title, children }: SectionProps) {
  return (
    <motion.section
      className="section"
      initial={{ opacity: 0, y: 32 }}
      // whileInView runs when the element scrolls into view; "once" stops it
      // replaying every time you scroll past.
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
    >
      <h2>{title}</h2>
      <p>{children}</p>
    </motion.section>
  );
}
`;

const MOTION_CSS = `html,
body {
  margin: 0;
}

body {
  font-family: var(--font-body, Geist, Inter, system-ui, sans-serif);
  font-weight: 300;
  color: #171717;
  background: #ffffff;
}

.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 96px 24px 160px;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

h1 {
  margin: 0;
  font-size: 48px;
  font-weight: 300;
  letter-spacing: -0.03em;
}

h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 300;
  letter-spacing: -0.02em;
}

p {
  margin: 0;
  color: #525252;
  line-height: 1.6;
}

.toggle {
  font: inherit;
  margin-top: 8px;
  padding: 8px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: background 150ms ease;
}

.toggle:hover {
  background: #f5f5f5;
}

.toggle-open {
  background: #171717;
  color: #ffffff;
  border-color: #171717;
}

.details {
  overflow: hidden;
}

.section {
  margin-top: 160px;
}
`;

const REACT_TS: ProjectTemplate = {
  id: 'react-ts',
  name: 'React + TypeScript',
  description: 'TSX with full type checking in the editor.',
  settings: { entryFile: 'src/main.tsx', tailwind: false },
  files: {
    'src/main.tsx': MAIN_TSX,
    'src/App.tsx': APP_TSX,
    'src/components/Counter.tsx': COUNTER_TSX,
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
    'src/components/Counter.jsx': COUNTER_JSX,
    'src/styles.css': STYLES_CSS,
  },
};

const REACT_MOTION: ProjectTemplate = {
  id: 'react-motion',
  name: 'React + Motion',
  description: 'Animation and smooth scrolling, using the provided libraries.',
  settings: { entryFile: 'src/main.tsx', tailwind: false },
  files: {
    'src/main.tsx': MAIN_TSX,
    'src/App.tsx': APP_MOTION_TSX,
    'src/components/Section.tsx': SECTION_TSX,
    'src/styles.css': MOTION_CSS,
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

const NEXT_PAGE_TSX = `'use client';

import { useState } from 'react';
import Link from 'next/link';

/*
 * A Next.js App Router page. The playground has no server, so it renders this
 * page component on the client — Server Components that fetch data, API routes
 * and \`next build\` do not run here, but most client pages work as-is. \`next/*\`
 * modules like next/link, next/image, next/navigation and next/font are shimmed
 * to their browser equivalents.
 */
export default function Page() {
  const [count, setCount] = useState(0);

  return (
    <main className="page">
      <span className="badge">app/page.tsx</span>
      <h1>Next.js, in the browser</h1>
      <p>
        This page is compiled and rendered entirely on your machine. Edit it and
        the preview updates instantly.
      </p>

      <button className="counter" onClick={() => setCount((value) => value + 1)}>
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </button>

      <Link className="link" href="https://nextjs.org/docs" target="_blank" rel="noreferrer">
        Read the Next.js docs →
      </Link>
    </main>
  );
}
`;

const NEXT_GLOBALS_CSS = `:root {
  color-scheme: light dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: #0a0a0a;
  color: #fafafa;
}

.page {
  max-width: 42rem;
  margin: 0 auto;
  padding: 6rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.25rem;
}

.badge {
  font: 500 0.75rem/1 ui-monospace, monospace;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid #262626;
  color: #a3a3a3;
}

h1 {
  margin: 0;
  font-size: 2.5rem;
  letter-spacing: -0.03em;
}

p {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: #a3a3a3;
}

.counter {
  font: inherit;
  cursor: pointer;
  padding: 0.6rem 1.1rem;
  border-radius: 0.6rem;
  border: 1px solid #262626;
  background: #fafafa;
  color: #0a0a0a;
  transition: transform 0.1s ease;
}

.counter:active {
  transform: scale(0.97);
}

.link {
  color: #fafafa;
  text-decoration: none;
  border-bottom: 1px solid #404040;
}

.link:hover {
  border-color: #fafafa;
}
`;

/*
 * Next.js. There is no server in the playground, so a real Next app cannot run
 * end to end — instead the page component is mounted and rendered on the client.
 * An empty entryFile lets the platform synthesise the mount (see synthesiseEntry).
 */
const NEXT: ProjectTemplate = {
  id: 'next',
  name: 'Next.js',
  description: 'An App Router page, client-rendered in the browser.',
  settings: { entryFile: '', tailwind: false },
  files: {
    'app/page.tsx': NEXT_PAGE_TSX,
    'app/globals.css': NEXT_GLOBALS_CSS,
  },
};

export const TEMPLATES: ProjectTemplate[] = [
  REACT_TS,
  REACT_JS,
  REACT_MOTION,
  REACT_TAILWIND,
  NEXT,
  HTML_CSS_JS,
  BLANK,
];

export function getTemplate(id: string): ProjectTemplate | undefined {
  return TEMPLATES.find((template) => template.id === id);
}
