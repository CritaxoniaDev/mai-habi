/**
 * Static checks for the design rules that are otherwise only enforced by
 * eyeballing screenshots.
 *
 * Contrast is computed from the token definitions themselves, so a palette edit
 * that drops below WCAG AA fails the build rather than shipping.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const THEME_CSS = path.join(ROOT, 'packages/ui/src/theme.css');

/* ------------------------------------------------------------------ parsing */

function readBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`Missing ${selector} in theme.css`);

  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;

  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const body = css.slice(open + 1, end);
  const tokens = {};

  for (const [, name, value] of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    tokens[name] = value.trim();
  }

  return tokens;
}

/* ----------------------------------------------------------------- contrast */

function toRgb(hex) {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex) {
  const channels = toRgb(hex).map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/* Text that must clear AA (4.5:1) in both themes. */
const TEXT_PAIRS = [
  ['--foreground', '--background'],
  ['--foreground', '--surface'],
  ['--foreground', '--surface-secondary'],
  ['--foreground', '--surface-raised'],
  ['--foreground', '--surface-hover'],
  ['--foreground', '--surface-active'],
  ['--foreground-secondary', '--background'],
  ['--foreground-secondary', '--surface'],
  ['--muted-foreground', '--background'],
  ['--muted-foreground', '--surface'],
  ['--muted-foreground', '--surface-secondary'],
  ['--muted-foreground', '--surface-hover'],
  ['--muted-foreground', '--surface-active'],
  ['--accent-foreground', '--accent'],
  ['--danger', '--danger-surface'],
  ['--danger', '--surface'],
  ['--success', '--success-surface'],
  ['--warning', '--warning-surface'],

  // These also carry plain text — the changelog badges — not just icons.
  ['--success', '--surface'],
  ['--success', '--background'],
  ['--warning', '--surface'],
  ['--warning', '--background'],
];

/* Non-text marks: focus rings, decorative glyphs, state boundaries (3:1). */
const GRAPHIC_PAIRS = [
  ['--focus-ring', '--surface'],
  ['--focus-ring', '--background'],
  ['--subtle-foreground', '--surface'],
  ['--subtle-foreground', '--background'],

  // File-type accents in the explorer, on both surfaces they can sit on.
  ...[
    '--lang-react',
    '--lang-typescript',
    '--lang-javascript',
    '--lang-css',
    '--lang-html',
    '--lang-json',
    '--lang-markdown',
    '--lang-image',
    '--lang-config',
  ].flatMap((token) => [
    [token, '--surface'],
    [token, '--surface-active'],
  ]),
];

/* ------------------------------------------------------------------- source */

function sourceFiles() {
  const roots = [
    'packages/ui/src',
    'packages/compiler/src',
    'apps/web/src',
    'apps/marketing/src',
  ];
  const out = [];

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx?|astro|css)$/.test(entry.name)) out.push(full);
    }
  };

  for (const root of roots) walk(path.join(ROOT, root));
  return out;
}

const FORBIDDEN_WEIGHT =
  /\bfont-(medium|semibold|bold|extrabold|black)\b|font-weight:\s*(?:500|600|700|800|900|bold)/;

/* Palette classes that bypass the semantic tokens. */
const RAW_COLOR =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline)-(?:neutral|zinc|slate|gray|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

const ARBITRARY_Z = /\bz-\[/;

export function registerDesignChecks(check) {
  const css = fs.readFileSync(THEME_CSS, 'utf8');
  const light = readBlock(css, ':root {');
  const dark = readBlock(css, '.dark {');

  const resolve = (tokens, name) => {
    const value = tokens[name];
    if (!value) throw new Error(`Token ${name} is not defined`);
    if (!value.startsWith('#')) throw new Error(`Token ${name} is not a hex colour: ${value}`);
    return value;
  };

  /* ----------------------------------------------------------- token parity */

  check('every light token also exists in dark', () => {
    const missing = Object.keys(light).filter((token) => !(token in dark));
    if (missing.length > 0) throw new Error(`missing in .dark: ${missing.join(', ')}`);
    return true;
  });

  check('dark defines no token light is missing', () => {
    const extra = Object.keys(dark).filter((token) => !(token in light));
    if (extra.length > 0) throw new Error(`missing in :root: ${extra.join(', ')}`);
    return true;
  });

  /* --------------------------------------------------------------- contrast */

  for (const [themeName, tokens] of [
    ['light', light],
    ['dark', dark],
  ]) {
    for (const [fg, bg] of TEXT_PAIRS) {
      check(`${themeName}: ${fg} on ${bg} meets AA text contrast`, () => {
        const ratio = contrastRatio(resolve(tokens, fg), resolve(tokens, bg));
        if (ratio < 4.5) throw new Error(`${ratio.toFixed(2)}:1, needs 4.5:1`);
        return true;
      });
    }

    for (const [fg, bg] of GRAPHIC_PAIRS) {
      check(`${themeName}: ${fg} on ${bg} meets non-text contrast`, () => {
        const ratio = contrastRatio(resolve(tokens, fg), resolve(tokens, bg));
        if (ratio < 3) throw new Error(`${ratio.toFixed(2)}:1, needs 3:1`);
        return true;
      });
    }
  }

  /* ------------------------------------------------------------- typography */

  const files = sourceFiles();

  check('no product text exceeds font-weight 400', () => {
    const offenders = files
      .filter((file) => !file.endsWith(path.join('scripts', 'verify.mjs')))
      .map((file) => [file, fs.readFileSync(file, 'utf8')])
      .filter(([file, contents]) => {
        // theme.css names the forbidden weights only inside a comment.
        if (file === THEME_CSS) {
          return contents
            .split('\n')
            .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
            .some((line) => FORBIDDEN_WEIGHT.test(line));
        }
        return FORBIDDEN_WEIGHT.test(contents);
      })
      .map(([file]) => path.relative(ROOT, file));

    if (offenders.length > 0) throw new Error(offenders.join(', '));
    return true;
  });

  /* ------------------------------------------------------------ token usage */

  check('components use semantic tokens, not raw palette classes', () => {
    const offenders = [];

    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      for (const [index, line] of contents.split('\n').entries()) {
        if (RAW_COLOR.test(line)) {
          offenders.push(`${path.relative(ROOT, file)}:${index + 1}`);
        }
      }
    }

    if (offenders.length > 0) throw new Error(offenders.slice(0, 8).join(', '));
    return true;
  });

  check('no arbitrary z-index values', () => {
    const offenders = files
      .filter((file) => ARBITRARY_Z.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file));

    if (offenders.length > 0) throw new Error(offenders.join(', '));
    return true;
  });

  /* ------------------------------------------------------------ theme setup */

  check('the pre-paint script and the controller share one storage key', () => {
    const init = fs.readFileSync(path.join(ROOT, 'packages/ui/src/theme/init.ts'), 'utf8');
    const controller = fs.readFileSync(
      path.join(ROOT, 'packages/ui/src/theme/controller.ts'),
      'utf8',
    );

    const key = controller.match(/THEME_STORAGE_KEY = '([^']+)'/)?.[1];
    return Boolean(key) && init.includes('THEME_STORAGE_KEY');
  });

  check('the pre-paint script resolves system appearance itself', () => {
    const init = fs.readFileSync(path.join(ROOT, 'packages/ui/src/theme/init.ts'), 'utf8');
    return (
      init.includes('prefers-color-scheme: dark') &&
      init.includes('classList.toggle') &&
      init.includes('colorScheme')
    );
  });

  /*
   * Executes the real pre-paint script against a stub document, which is the
   * only way to prove the no-flash path resolves correctly without a browser.
   */
  check('the pre-paint script resolves every mode and system combination', () => {
    const module = fs.readFileSync(path.join(ROOT, 'packages/ui/src/theme/init.ts'), 'utf8');
    const key = fs
      .readFileSync(path.join(ROOT, 'packages/ui/src/theme/controller.ts'), 'utf8')
      .match(/THEME_STORAGE_KEY = '([^']+)'/)?.[1];

    const source = module
      .match(/THEME_INIT_SCRIPT = `([\s\S]*?)`;/)?.[1]
      ?.replace('${JSON.stringify(THEME_STORAGE_KEY)}', JSON.stringify(key));

    if (!source) throw new Error('could not extract the init script');

    for (const stored of ['light', 'dark', 'system', null, 'nonsense']) {
      for (const systemDark of [true, false]) {
        const classes = new Set();
        const root = {
          classList: {
            add: (name) => classes.add(name),
            toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
          },
          style: {},
          dataset: {},
        };

        const context = {
          localStorage: { getItem: () => stored },
          document: { documentElement: root },
          window: { matchMedia: () => ({ matches: systemDark }) },
        };
        context.globalThis = context;

        vm.createContext(context);
        vm.runInContext(source, context);

        const expected =
          stored === 'dark' || ((stored !== 'light') && systemDark) ? 'dark' : 'light';

        if (!classes.has(expected)) {
          throw new Error(`stored=${stored} systemDark=${systemDark} produced ${[...classes]}`);
        }
        if (root.style.colorScheme !== expected) {
          throw new Error(`colorScheme was ${root.style.colorScheme}, expected ${expected}`);
        }
      }
    }

    return true;
  });

  check('the pre-paint script still resolves system when storage is blocked', () => {
    const module = fs.readFileSync(path.join(ROOT, 'packages/ui/src/theme/init.ts'), 'utf8');
    const key = fs
      .readFileSync(path.join(ROOT, 'packages/ui/src/theme/controller.ts'), 'utf8')
      .match(/THEME_STORAGE_KEY = '([^']+)'/)?.[1];
    const source = module
      .match(/THEME_INIT_SCRIPT = `([\s\S]*?)`;/)?.[1]
      ?.replace('${JSON.stringify(THEME_STORAGE_KEY)}', JSON.stringify(key));

    if (!source) throw new Error('could not extract the init script');

    const classes = new Set();
    const root = {
      classList: {
        add: (name) => classes.add(name),
        toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
      },
      style: {},
      dataset: {},
    };
    const context = {
      localStorage: { getItem: () => { throw new Error('blocked'); } },
      document: { documentElement: root },
      window: { matchMedia: () => ({ matches: true }) },
    };
    context.globalThis = context;

    vm.createContext(context);
    vm.runInContext(source, context);

    return (
      classes.has('dark') &&
      root.style.colorScheme === 'dark' &&
      root.dataset.themeMode === 'system' &&
      root.dataset.theme === 'dark'
    );
  });

  check('every layout runs the pre-paint script inline', () => {
    // The web app is Next.js: its root layout injects the script through
    // dangerouslySetInnerHTML. The marketing site is still Astro (is:inline).
    const nextLayout = fs.readFileSync(
      path.join(ROOT, 'apps/web/src/app/layout.tsx'),
      'utf8',
    );
    if (
      !nextLayout.includes('THEME_INIT_SCRIPT') ||
      !nextLayout.includes('dangerouslySetInnerHTML')
    ) {
      throw new Error('apps/web/src/app/layout.tsx does not inline the theme script');
    }

    for (const layout of ['apps/marketing/src/layouts/Base.astro']) {
      const contents = fs.readFileSync(path.join(ROOT, layout), 'utf8');
      if (!contents.includes('is:inline') || !contents.includes('THEME_INIT_SCRIPT')) {
        throw new Error(`${layout} does not inline the theme script`);
      }
    }
    return true;
  });

  check('the sandboxed project inherits no product styling', () => {
    const source = fs.readFileSync(path.join(ROOT, 'packages/compiler/src/preview.ts'), 'utf8');
    const injections = ['tailwindcss/vite', '--background', 'class="dark"', 'theme.css'];
    const found = injections.filter((needle) => source.includes(needle));
    if (found.length > 0) throw new Error(`preview injects ${found.join(', ')}`);
    return true;
  });

  check('Monaco registers tokenizers for every themed source language', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'apps/web/src/components/workspace/CodeEditor.tsx'),
      'utf8',
    );

    const contributions = {
      javascript: 'basic-languages/javascript/javascript.contribution',
      typescript: 'basic-languages/typescript/typescript.contribution',
      css: 'basic-languages/css/css.contribution',
      html: 'basic-languages/html/html.contribution',
      markdown: 'basic-languages/markdown/markdown.contribution',
      json: 'language/json/monaco.contribution',
    };

    for (const [language, contribution] of Object.entries(contributions)) {
      if (!source.includes(contribution)) throw new Error(`missing ${language} tokenizer`);
    }

    return true;
  });

  check('the viewer module loads no editor-only code', () => {
    const viewer = [
      'apps/web/src/islands/ViewerShell.tsx',
      'apps/web/src/components/viewer/SourceView.tsx',
    ];

    for (const file of viewer) {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      for (const banned of ['monaco-editor', 'editor-themes', 'state/workspace']) {
        if (source.includes(banned)) throw new Error(`${file} imports ${banned}`);
      }
    }
    return true;
  });

  check('workspace packages declare themselves side-effect free', () => {
    const missing = [];

    for (const name of ['types', 'shared', 'filesystem', 'compiler', 'ui']) {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(ROOT, `packages/${name}/package.json`), 'utf8'),
      );
      if (!('sideEffects' in manifest)) missing.push(name);
    }

    // Without this the shared UI barrel cannot be tree-shaken and the viewer
    // ends up carrying the command palette it never renders.
    if (missing.length > 0) throw new Error(`packages/${missing.join(', packages/')}`);
    return true;
  });
}
