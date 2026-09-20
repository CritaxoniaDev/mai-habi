import { toast } from '@mai-habi/ui';
import { useWorkspace } from '../state/workspace';

/**
 * Code formatting with Prettier, running entirely in the browser.
 *
 * Prettier and its language plugins are dynamically imported so none of it is
 * downloaded until the first format — the editor stays light for people who
 * never use it.
 */

type Parser = 'typescript' | 'babel' | 'json' | 'css' | 'scss' | 'less' | 'html' | 'markdown';

function parserForPath(path: string): Parser | null {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.ts':
    case '.tsx':
    case '.mts':
    case '.cts':
      return 'typescript';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'babel';
    case '.json':
      return 'json';
    case '.css':
      return 'css';
    case '.scss':
      return 'scss';
    case '.less':
      return 'less';
    case '.html':
    case '.htm':
      return 'html';
    case '.md':
    case '.markdown':
      return 'markdown';
    default:
      return null;
  }
}

/** Whether Prettier can format the file at this path. */
export function isFormattable(path: string): boolean {
  return parserForPath(path) !== null;
}

/** Load only the plugins a given parser needs. */
async function pluginsFor(parser: Parser): Promise<unknown[]> {
  const pick = (mod: unknown) => (mod as { default?: unknown }).default ?? mod;

  switch (parser) {
    case 'typescript': {
      const [estree, ts] = await Promise.all([
        import('prettier/plugins/estree'),
        import('prettier/plugins/typescript'),
      ]);
      return [pick(estree), pick(ts)];
    }
    case 'babel':
    case 'json': {
      const [estree, babel] = await Promise.all([
        import('prettier/plugins/estree'),
        import('prettier/plugins/babel'),
      ]);
      return [pick(estree), pick(babel)];
    }
    case 'css':
    case 'scss':
    case 'less':
      return [pick(await import('prettier/plugins/postcss'))];
    case 'html':
      return [pick(await import('prettier/plugins/html'))];
    case 'markdown':
      return [pick(await import('prettier/plugins/markdown'))];
  }
}

/** Format a string, or return null if the file type is unsupported. */
export async function formatCode(
  source: string,
  path: string,
  options: { tabWidth?: number } = {},
): Promise<string | null> {
  const parser = parserForPath(path);
  if (!parser) return null;

  const { format } = await import('prettier/standalone');
  const plugins = await pluginsFor(parser);

  return format(source, {
    parser,
    plugins: plugins as never,
    tabWidth: options.tabWidth ?? 2,
    semi: true,
    singleQuote: true,
    printWidth: 100,
  });
}

/**
 * Format the file in the active tab in place. Shared by the editor action, the
 * command palette and format-on-save. Reports failures unless `silent`.
 */
export async function formatActive(options: { silent?: boolean } = {}): Promise<void> {
  const store = useWorkspace.getState();
  const { activeTab, files, project } = store;
  if (!activeTab) return;

  const file = files[activeTab];
  if (!file || file.type !== 'file' || file.encoding !== 'utf8') {
    if (!options.silent) toast.error('Only text files can be formatted.');
    return;
  }

  if (!isFormattable(activeTab)) {
    if (!options.silent) toast.error('No formatter for this file type.');
    return;
  }

  try {
    const formatted = await formatCode(file.content, activeTab, {
      tabWidth: project?.settings.tabSize ?? 2,
    });

    if (formatted == null || formatted === file.content) {
      if (!options.silent) toast.success('Already formatted.');
      return;
    }

    store.setContent(activeTab, formatted);
    if (!options.silent) toast.success('Formatted.');
  } catch (cause) {
    // A syntax error means Prettier cannot parse it yet — say so rather than
    // silently leaving the file untouched.
    if (!options.silent) {
      toast.error('Could not format', {
        description: cause instanceof Error ? cause.message.split('\n')[0] : undefined,
      });
    }
  }
}
