/**
 * The documentation sidebar.
 *
 * Ported from the former Starlight config. Internal pages carry a `slug`
 * (rendered under /docs/<slug>); the "Elsewhere" links point back into the rest
 * of the app.
 */

export type SidebarItem =
  | { label: string; slug: string }
  | { label: string; href: string; external?: boolean };

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

export const SIDEBAR: SidebarGroup[] = [
  {
    label: "Getting started",
    items: [
      { label: "What HABI is", slug: "getting-started/introduction" },
      { label: "Quick start", slug: "getting-started/quick-start" },
      {
        label: "Your first React app",
        slug: "getting-started/first-react-app",
      },
    ],
  },
  {
    label: "Guides",
    items: [
      { label: "Files and imports", slug: "guides/files-and-imports" },
      { label: "Styling and Tailwind", slug: "guides/styling" },
      { label: "Fonts", slug: "guides/fonts" },
      { label: "Images and assets", slug: "guides/images" },
      {
        label: "Preview, console and errors",
        slug: "guides/preview-and-errors",
      },
      { label: "Searching a project", slug: "guides/search" },
      { label: "GitHub repositories", slug: "guides/github" },
      { label: "REST client", slug: "guides/rest-client" },
      { label: "Backend services", slug: "guides/backend-services" },
      { label: "Sharing", slug: "guides/sharing" },
      { label: "Import and export", slug: "guides/import-and-export" },
      { label: "Keyboard shortcuts", slug: "guides/keyboard" },
    ],
  },
  {
    label: "Reference",
    items: [
      { label: "The compiler", slug: "reference/compiler" },
      { label: "Provided packages", slug: "reference/packages" },
      { label: "Storage and accounts", slug: "reference/storage" },
      { label: "Security", slug: "reference/security" },
      { label: "Appearance", slug: "reference/appearance" },
    ],
  },
  {
    label: "Elsewhere",
    items: [
      { label: "Open the playground", href: "/projects" },
      { label: "habi.app", href: "/" },
    ],
  },
];

export function isDocItem(
  item: SidebarItem,
): item is { label: string; slug: string } {
  return "slug" in item;
}

/** `/docs/<slug>` for an internal page. */
export function docHref(slug: string): string {
  return `/docs/${slug}`;
}

export interface FlatDoc {
  slug: string;
  label: string;
  group: string;
}

/** Every internal doc page, in sidebar order — for prev/next and static params. */
export function flatDocs(): FlatDoc[] {
  const out: FlatDoc[] = [];
  for (const group of SIDEBAR) {
    for (const item of group.items) {
      if (isDocItem(item))
        out.push({ slug: item.slug, label: item.label, group: group.label });
    }
  }
  return out;
}

/** The previous and next pages around a slug, following sidebar order. */
export function getAdjacent(slug: string): { prev?: FlatDoc; next?: FlatDoc } {
  const docs = flatDocs();
  const i = docs.findIndex((d) => d.slug === slug);
  if (i === -1) return {};
  return { prev: docs[i - 1], next: docs[i + 1] };
}
