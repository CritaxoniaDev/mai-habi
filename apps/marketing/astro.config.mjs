// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

/**
 * The marketing site is deliberately its own deployment.
 *
 * It carries no editor, no compiler and no WebAssembly — a visitor who never
 * opens the playground should not download any of it.
 */
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
