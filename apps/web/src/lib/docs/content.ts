import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeShiki from '@shikijs/rehype';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { flatDocs } from './nav';

const DOCS_DIR = join(process.cwd(), 'src/content/docs');

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface Doc {
  slug: string;
  title: string;
  description: string;
  html: string;
  toc: TocItem[];
}

const ASIDE_TITLES: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  caution: 'Caution',
  danger: 'Danger',
};

/** Flatten a node's text descendants into a single string. */
function textOf(node: any): string {
  if (node.type === 'text') return node.value ?? '';
  if (!node.children) return '';
  return node.children.map(textOf).join('');
}

/**
 * Turn `:::note` / `:::caution` container directives into styled `<aside>`
 * callouts, matching the ones Starlight rendered. An optional `:::caution[Custom
 * title]` label overrides the default heading.
 */
function remarkAsides() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.type !== 'containerDirective') return;
      if (!(node.name in ASIDE_TITLES)) return;

      let title = ASIDE_TITLES[node.name];
      const first = node.children[0];
      if (first?.type === 'paragraph' && first.data?.directiveLabel) {
        title = textOf(first);
        node.children.shift();
      }

      node.children.unshift({
        type: 'paragraph',
        data: { hName: 'p', hProperties: { className: ['doc-aside__title'] } },
        children: [{ type: 'text', value: title }],
      });

      node.data = {
        ...(node.data ?? {}),
        hName: 'aside',
        hProperties: { className: ['doc-aside', `doc-aside--${node.name}`] },
      };
    });
  };
}

// Docs used to live at the site root (`/guides/…`); they now sit under `/docs`.
const DOC_ROOTS = new Set(['getting-started', 'guides', 'reference']);

/** Rewrite in-content links that pointed at the old doc root to `/docs/…`. */
function rehypeDocLinks() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (typeof href !== 'string' || !href.startsWith('/')) return;
      const first = href.split('/')[1];
      if (DOC_ROOTS.has(first)) {
        node.properties.href = `/docs${href}`.replace(/\/(#|$)/, '$1').replace(/\/$/, '');
      }
    });
  };
}

/** Collect h2/h3 headings (after slugs are assigned) for the on-this-page nav. */
function rehypeCollectToc(opts: { toc: TocItem[] }) {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return;
      const id = node.properties?.id;
      if (typeof id !== 'string') return;
      opts.toc.push({ id, text: textOf(node), depth: node.tagName === 'h2' ? 2 : 3 });
    });
  };
}

/** Render a markdown body to HTML, collecting its table of contents. */
export async function renderMarkdown(markdown: string): Promise<{ html: string; toc: TocItem[] }> {
  const toc: TocItem[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkAsides)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeDocLinks)
    .use(rehypeCollectToc, { toc })
    .use(rehypeShiki, {
      themes: { light: 'github-light', dark: 'github-dark' },
    })
    .use(rehypeStringify)
    .process(markdown);

  return { html: String(file), toc };
}

function readDocFile(slug: string): { data: Record<string, unknown>; content: string } {
  const raw = readFileSync(join(DOCS_DIR, `${slug}.md`), 'utf8');
  return matter(raw);
}

/** A single documentation page, rendered. */
export async function getDoc(slug: string): Promise<Doc> {
  const { data, content } = readDocFile(slug);
  const { html, toc } = await renderMarkdown(content);
  return {
    slug,
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    html,
    toc,
  };
}

export interface DocIndexHero {
  tagline: string;
  actions: { text: string; href: string; variant?: string }[];
}

/** The splash page (`/docs`): its hero frontmatter plus rendered body. */
export async function getDocIndex(): Promise<{
  title: string;
  hero: DocIndexHero | null;
  html: string;
}> {
  const { data, content } = readDocFile('index');
  const { html } = await renderMarkdown(content);
  const rawHero = (data.hero ?? null) as { tagline?: string; actions?: unknown[] } | null;
  const hero: DocIndexHero | null = rawHero
    ? {
        tagline: String(rawHero.tagline ?? ''),
        actions: (rawHero.actions ?? []).map((a) => {
          const action = a as { text?: string; link?: string; variant?: string };
          const link = String(action.link ?? '/');
          const first = link.split('/')[1];
          const href = DOC_ROOTS.has(first) ? `/docs${link}`.replace(/\/$/, '') : link;
          return { text: String(action.text ?? ''), href, variant: action.variant };
        }),
      }
    : null;
  return { title: typeof data.title === 'string' ? data.title : 'HABI', hero, html };
}

export interface SearchDoc {
  slug: string;
  title: string;
  description: string;
  group: string;
  headings: string[];
  text: string;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/^#{1,6}\s+/gm, '') // heading markers
    .replace(/[*_>#-]+/g, ' ') // residual syntax
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → text
    .replace(/:::\w+(\[[^\]]*\])?/g, ' ') // aside fences
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A compact client-search index over every doc page — title, description,
 * headings and a plain-text excerpt. Built once at render time and embedded in
 * the docs shell.
 */
export function getSearchIndex(): SearchDoc[] {
  return flatDocs().map(({ slug, label, group }) => {
    const { data, content } = readDocFile(slug);
    const headings = [...content.matchAll(/^#{2,3}\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
    return {
      slug,
      title: typeof data.title === 'string' ? data.title : label,
      description: typeof data.description === 'string' ? data.description : '',
      group,
      headings,
      text: stripMarkdown(content).slice(0, 1400),
    };
  });
}
