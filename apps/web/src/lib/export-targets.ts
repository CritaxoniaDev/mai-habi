import LZString from 'lz-string';
import { listFiles } from '@mai-habi/filesystem';
import { toast } from '@mai-habi/ui';
import { useWorkspace } from '../state/workspace';

/**
 * Export the current project to another online IDE.
 *
 * HABI projects have no build config of their own — the platform supplies the
 * runtime — so a runnable scaffold (package.json, Vite, an index.html entry) is
 * generated around the user's files. Plain HTML projects are shipped as-is.
 *
 * Both targets are opened by POSTing a form to a new tab, kept synchronous so
 * the click that triggered it still counts as a user gesture (popup blockers).
 */

type ExportFiles = Record<string, string>;

interface Built {
  files: ExportFiles;
  /** StackBlitz template id. */
  template: 'node' | 'html';
  title: string;
  openPath: string;
}

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()] });
`;

function packageJson(name: string): string {
  return `${JSON.stringify(
    {
      name: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'habi-project',
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      // React plus the platform's provided shelf, so imports resolve on install.
      dependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        clsx: '^2.1.1',
        zustand: '^5.0.3',
        motion: '^11.0.0',
        lenis: '^1.1.0',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.3.0',
        vite: '^6.0.0',
        typescript: '^5.7.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
      },
    },
    null,
    2,
  )}\n`;
}

function indexHtml(entry: string, tailwind: boolean): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HABI export</title>${tailwind ? '\n    <script src="https://cdn.tailwindcss.com"></script>' : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entry}"></script>
  </body>
</html>
`;
}

function build(): Built | null {
  const { project, files } = useWorkspace.getState();
  if (!project) return null;

  const text: ExportFiles = {};
  for (const node of listFiles(files)) {
    // Only text travels: the target IDEs take string file contents, and binary
    // assets (base64) would need a different transport.
    if (node.type === 'file' && node.encoding === 'utf8') text[node.path] = node.content;
  }

  if (Object.keys(text).length === 0) return null;

  const entry = project.settings.entryFile || 'src/main.tsx';
  const isHtml =
    entry.toLowerCase().endsWith('.html') ||
    Object.keys(text).some((path) => path.toLowerCase() === 'index.html');

  if (isHtml) {
    return { files: text, template: 'html', title: project.name, openPath: 'index.html' };
  }

  const out: ExportFiles = { ...text };
  if (!out['package.json']) out['package.json'] = packageJson(project.name);
  if (!out['vite.config.js'] && !out['vite.config.ts']) out['vite.config.js'] = VITE_CONFIG;
  if (!out['index.html']) out['index.html'] = indexHtml(entry, project.settings.tailwind);

  const openPath = text['src/App.tsx'] ? 'src/App.tsx' : entry;
  return { files: out, template: 'node', title: project.name, openPath };
}

function submit(action: string, fields: Record<string, string>): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.target = '_blank';
  form.style.display = 'none';

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('textarea');
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

export function openInStackBlitz(): void {
  const built = build();
  if (!built) {
    toast.error('Nothing to export yet.');
    return;
  }

  const fields: Record<string, string> = {
    'project[title]': built.title,
    'project[description]': 'Exported from HABI',
    'project[template]': built.template,
  };
  for (const [path, content] of Object.entries(built.files)) {
    fields[`project[files][${path}]`] = content;
  }

  submit('https://stackblitz.com/run', fields);
  toast.success('Opening in StackBlitz…');
}

/** CodeSandbox's define API expects LZ-compressed, URL-safe base64 parameters. */
function codesandboxParameters(files: ExportFiles): string {
  const normalized: Record<string, { content: string }> = {};
  for (const [path, content] of Object.entries(files)) normalized[path] = { content };

  return LZString.compressToBase64(JSON.stringify({ files: normalized }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function openInCodeSandbox(): void {
  const built = build();
  if (!built) {
    toast.error('Nothing to export yet.');
    return;
  }

  submit('https://codesandbox.io/api/v1/sandboxes/define', {
    parameters: codesandboxParameters(built.files),
    query: `file=/${built.openPath}`,
  });
  toast.success('Opening in CodeSandbox…');
}
