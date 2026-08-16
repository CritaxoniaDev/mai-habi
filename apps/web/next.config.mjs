/** @type {import('next').NextConfig} */

/*
 * The compiled preview runs in a `sandbox="allow-scripts"` iframe, which gives
 * it an opaque origin. Module scripts it loads from this origin — the platform
 * React runtime under /runtime, the esbuild wasm under /wasm — are therefore
 * cross-origin requests and need CORS. These headers apply in development; they
 * are mirrored in vercel.json for the deployed app.
 */
const runtimeHeaders = [
  {
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  },
  {
    source: '/runtime/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
    ],
  },
  {
    source: '/wasm/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
    ],
  },
  {
    source: '/types/:path*',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
  },
];

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,

  // The workspace packages ship raw TypeScript source (their `main` points at
  // `src/*.ts`), so Next has to compile them alongside the app.
  transpilePackages: [
    '@mai-habi/compiler',
    '@mai-habi/filesystem',
    '@mai-habi/shared',
    '@mai-habi/types',
    '@mai-habi/ui',
  ],

  async headers() {
    return runtimeHeaders;
  },
};

export default nextConfig;
