import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Release notes for the playground.
 *
 * Entries are plain markdown so a release can be written without touching the
 * page that renders them. The filename orders nothing — `date` does.
 */
const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/changelog' }),
  schema: z.object({
    version: z.string(),
    date: z.coerce.date(),
    title: z.string(),
    summary: z.string(),
    /** Keep a Changelog categories, used for the badges on each entry. */
    kinds: z.array(z.enum(['added', 'improved', 'fixed'])).default([]),
  }),
});

export const collections = { changelog };
