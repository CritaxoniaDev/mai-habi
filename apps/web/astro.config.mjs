// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

/**
 * The compiled preview runs in a `sandbox="allow-scripts"` iframe, which gives
 * it an opaque origin. Module scripts it loads from this origin — the platform
 * React runtime — are therefore cross-origin requests and need CORS.
 *
 * Mirrored in vercel.json for the deployed app.
 */
function runtimeCors() {
  /**
 * @param {import('vite').ViteDevServer | import('vite').PreviewServer} server
 */
  const apply = (server) => {
    server.middlewares.use((request, response, next) => {
      if (request.url?.startsWith('/runtime/') || request.url?.startsWith('/wasm/')) {
        response.setHeader('Access-Control-Allow-Origin', '*');
      }
      next();
    });
  };

  return {
    name: 'mai-habi:runtime-cors',
    configureServer: apply,
    configurePreviewServer: apply,
  };
}

export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [react()],
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss(), runtimeCors()],
    worker: { format: 'es' },
  },
});
