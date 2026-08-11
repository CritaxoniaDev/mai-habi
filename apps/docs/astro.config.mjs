// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const appOrigin = process.env.PUBLIC_APP_ORIGIN ?? 'http://localhost:4321';
const siteOrigin = process.env.PUBLIC_SITE_ORIGIN ?? 'http://localhost:4322';

/**
 * Documentation is its own deployment.
 *
 * Starlight brings the layout, search and navigation. The only things
 * overridden are type and colour, so the docs read as part of the same product
 * as the playground and the marketing site.
 */
export default defineConfig({
  site: process.env.PUBLIC_DOCS_ORIGIN ?? 'http://localhost:4323',
  integrations: [
    starlight({
      title: 'HABI',
      description: 'Documentation for HABI, a code playground that compiles in your browser.',
      customCss: ['./src/styles/habi.css'],
      favicon: '/favicon.svg',
      lastUpdated: true,
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'What HABI is', slug: 'getting-started/introduction' },
            { label: 'Quick start', slug: 'getting-started/quick-start' },
            { label: 'Your first React app', slug: 'getting-started/first-react-app' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Files and imports', slug: 'guides/files-and-imports' },
            { label: 'Styling and Tailwind', slug: 'guides/styling' },
            { label: 'Images and assets', slug: 'guides/images' },
            { label: 'Preview, console and errors', slug: 'guides/preview-and-errors' },
            { label: 'Sharing', slug: 'guides/sharing' },
            { label: 'Import and export', slug: 'guides/import-and-export' },
            { label: 'Keyboard shortcuts', slug: 'guides/keyboard' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'The compiler', slug: 'reference/compiler' },
            { label: 'Provided packages', slug: 'reference/packages' },
            { label: 'Storage and accounts', slug: 'reference/storage' },
            { label: 'Security', slug: 'reference/security' },
            { label: 'Appearance', slug: 'reference/appearance' },
            { label: 'Self-hosting', slug: 'reference/self-hosting' },
          ],
        },
        {
          label: 'Elsewhere',
          items: [
            { label: 'Open the playground', link: appOrigin, attrs: { target: '_blank' } },
            { label: 'habi.app', link: siteOrigin, attrs: { target: '_blank' } },
          ],
        },
      ],
    }),
  ],
});
