/**
 * Browser shims for the `next/*` modules a page component commonly imports.
 *
 * A real Next.js application needs a server: routing, React Server Components,
 * data fetching, API routes and `next build` have no place in a browser-only,
 * no-server sandbox. What the playground *can* do is client-render a Next page —
 * a page is a default-exported React component — so these shims stand in for the
 * `next/*` modules such a page reaches for, mapping each to its nearest browser
 * behaviour (a `<Link>` becomes an `<a>`, `next/font` injects a Google Fonts
 * stylesheet, the router hooks read `window.location`). Anything genuinely
 * server-only is rejected with a clear message rather than a cryptic bundle error.
 *
 * The sources are plain JavaScript (no JSX) so the bundler can load them with the
 * `js` loader; they import React, which the platform already provides.
 */

const LINK = `
import { createElement, forwardRef } from 'react';
const Link = forwardRef(function Link(props, ref) {
  const { href, replace, scroll, prefetch, shallow, locale, legacyBehavior, as, ...rest } = props;
  const url = typeof href === 'string' ? href : (href && (href.pathname || href.href)) || '#';
  return createElement('a', { ...rest, href: url, ref: ref });
});
export default Link;
`;

const IMAGE = `
import { createElement, forwardRef } from 'react';
const Image = forwardRef(function Image(props, ref) {
  const { src, alt = '', width, height, fill, loader, quality, priority, placeholder, blurDataURL, unoptimized, sizes, style, ...rest } = props;
  const resolved = src && typeof src === 'object' ? (src.src || src.default) : src;
  const fillStyle = fill ? { position: 'absolute', inset: 0, height: '100%', width: '100%', objectFit: 'cover' } : null;
  return createElement('img', {
    ...rest,
    ref: ref,
    src: resolved,
    alt: alt,
    width: fill ? undefined : width,
    height: fill ? undefined : height,
    style: { ...fillStyle, ...style },
  });
});
export default Image;
`;

// React 19 — the runtime the preview loads — hoists <title>/<meta>/<link> to
// <head> wherever they are rendered, so returning the children is enough.
const HEAD = `
export default function Head(props) {
  return props.children == null ? null : props.children;
}
`;

const SCRIPT = `
import { createElement } from 'react';
export default function Script(props) {
  const { children, dangerouslySetInnerHTML, strategy, onLoad, onReady, onError, ...rest } = props;
  if (dangerouslySetInnerHTML || children != null) {
    return createElement('script', { ...rest, dangerouslySetInnerHTML: dangerouslySetInnerHTML || { __html: String(children) } });
  }
  return createElement('script', rest);
}
`;

// Wraps its own Suspense so a page that never rendered one still works.
const DYNAMIC = `
import { createElement, lazy, Suspense } from 'react';
export default function dynamic(loader, options) {
  const load = () => Promise.resolve(typeof loader === 'function' ? loader() : loader).then((m) => ({ default: (m && m.default) || m }));
  const Lazy = lazy(load);
  const fallback = options && options.loading ? createElement(options.loading) : null;
  return function DynamicShim(props) {
    return createElement(Suspense, { fallback: fallback }, createElement(Lazy, props));
  };
}
`;

const NAVIGATION = `
const loc = () => (typeof window !== 'undefined' ? window.location : { pathname: '/', search: '' });
const noop = () => {};
export function useRouter() {
  return {
    push: (url) => { loc().href = url; },
    replace: (url) => { loc().replace(url); },
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: noop,
    prefetch: noop,
  };
}
export function usePathname() { return loc().pathname; }
export function useSearchParams() { return new URLSearchParams(loc().search); }
export function useParams() { return {}; }
export function useSelectedLayoutSegment() { return null; }
export function useSelectedLayoutSegments() { return []; }
export function redirect(url) { loc().href = url; }
export function permanentRedirect(url) { loc().href = url; }
export function notFound() {}
export const RedirectType = { push: 'push', replace: 'replace' };
`;

const ROUTER = `
const loc = () => (typeof window !== 'undefined' ? window.location : { pathname: '/', search: '' });
const noop = () => {};
export function useRouter() {
  const l = loc();
  return {
    pathname: l.pathname,
    route: l.pathname,
    query: Object.fromEntries(new URLSearchParams(l.search)),
    asPath: l.pathname + l.search,
    isReady: true,
    isFallback: false,
    push: (url) => { l.href = typeof url === 'string' ? url : (url.pathname || '/'); return Promise.resolve(true); },
    replace: (url) => { l.replace(typeof url === 'string' ? url : (url.pathname || '/')); return Promise.resolve(true); },
    back: () => window.history.back(),
    reload: () => window.location.reload(),
    prefetch: () => Promise.resolve(),
    beforePopState: noop,
    events: { on: noop, off: noop, emit: noop },
  };
}
export default { useRouter };
`;

/**
 * `next/font/google`. Each named export loads its Google Fonts stylesheet on
 * first use and returns a class that applies the family — so a preview actually
 * shows the chosen font rather than the fallback. Fonts not listed here fail to
 * import; the popular families cover the common case.
 */
const FONT_GOOGLE = `
function makeFont(name) {
  return function (options) {
    const family = name.replace(/_/g, ' ');
    const cls = 'nf-' + name.toLowerCase();
    if (typeof document !== 'undefined' && !document.getElementById('nf-link-' + name)) {
      const link = document.createElement('link');
      link.id = 'nf-link-' + name;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':wght@100;200;300;400;500;600;700;800;900&display=swap';
      document.head.appendChild(link);
      const style = document.createElement('style');
      if (window.__previewNonce) style.nonce = window.__previewNonce;
      style.textContent = '.' + cls + '{font-family:"' + family + '",system-ui,sans-serif}';
      document.head.appendChild(style);
    }
    return { className: cls, style: { fontFamily: '"' + family + '",system-ui,sans-serif' }, variable: '--font-' + name.toLowerCase() };
  };
}
export const Inter = makeFont('Inter');
export const Roboto = makeFont('Roboto');
export const Roboto_Mono = makeFont('Roboto_Mono');
export const Roboto_Condensed = makeFont('Roboto_Condensed');
export const Open_Sans = makeFont('Open_Sans');
export const Lato = makeFont('Lato');
export const Montserrat = makeFont('Montserrat');
export const Poppins = makeFont('Poppins');
export const Oswald = makeFont('Oswald');
export const Raleway = makeFont('Raleway');
export const Merriweather = makeFont('Merriweather');
export const Nunito = makeFont('Nunito');
export const Nunito_Sans = makeFont('Nunito_Sans');
export const Playfair_Display = makeFont('Playfair_Display');
export const Ubuntu = makeFont('Ubuntu');
export const Rubik = makeFont('Rubik');
export const Work_Sans = makeFont('Work_Sans');
export const Noto_Sans = makeFont('Noto_Sans');
export const Noto_Serif = makeFont('Noto_Serif');
export const PT_Sans = makeFont('PT_Sans');
export const PT_Serif = makeFont('PT_Serif');
export const Source_Sans_3 = makeFont('Source_Sans_3');
export const Source_Code_Pro = makeFont('Source_Code_Pro');
export const Fira_Sans = makeFont('Fira_Sans');
export const Fira_Code = makeFont('Fira_Code');
export const Barlow = makeFont('Barlow');
export const Karla = makeFont('Karla');
export const Manrope = makeFont('Manrope');
export const DM_Sans = makeFont('DM_Sans');
export const DM_Serif_Display = makeFont('DM_Serif_Display');
export const Space_Grotesk = makeFont('Space_Grotesk');
export const Space_Mono = makeFont('Space_Mono');
export const IBM_Plex_Sans = makeFont('IBM_Plex_Sans');
export const IBM_Plex_Mono = makeFont('IBM_Plex_Mono');
export const IBM_Plex_Serif = makeFont('IBM_Plex_Serif');
export const Lora = makeFont('Lora');
export const Bitter = makeFont('Bitter');
export const Cabin = makeFont('Cabin');
export const Quicksand = makeFont('Quicksand');
export const Josefin_Sans = makeFont('Josefin_Sans');
export const Dosis = makeFont('Dosis');
export const Inconsolata = makeFont('Inconsolata');
export const JetBrains_Mono = makeFont('JetBrains_Mono');
export const Figtree = makeFont('Figtree');
export const Outfit = makeFont('Outfit');
export const Sora = makeFont('Sora');
export const Plus_Jakarta_Sans = makeFont('Plus_Jakarta_Sans');
export const Libre_Franklin = makeFont('Libre_Franklin');
export const Archivo = makeFont('Archivo');
export const Geist = makeFont('Geist');
export const Geist_Mono = makeFont('Geist_Mono');
export const Mulish = makeFont('Mulish');
export const Kanit = makeFont('Kanit');
export const Heebo = makeFont('Heebo');
export const Asap = makeFont('Asap');
export const Assistant = makeFont('Assistant');
export const Catamaran = makeFont('Catamaran');
export const Exo_2 = makeFont('Exo_2');
export const Hind = makeFont('Hind');
export const Titillium_Web = makeFont('Titillium_Web');
export const Overpass = makeFont('Overpass');
export const Red_Hat_Display = makeFont('Red_Hat_Display');
export const Red_Hat_Text = makeFont('Red_Hat_Text');
export const Public_Sans = makeFont('Public_Sans');
export const Lexend = makeFont('Lexend');
export const Urbanist = makeFont('Urbanist');
export const Epilogue = makeFont('Epilogue');
export const Syne = makeFont('Syne');
export const Bricolage_Grotesque = makeFont('Bricolage_Grotesque');
export const Onest = makeFont('Onest');
export const Instrument_Sans = makeFont('Instrument_Sans');
export const Schibsted_Grotesk = makeFont('Schibsted_Grotesk');
export const Wix_Madefor_Display = makeFont('Wix_Madefor_Display');
export const Anek_Latin = makeFont('Anek_Latin');
export const Chivo = makeFont('Chivo');
export const Commissioner = makeFont('Commissioner');
export const Readex_Pro = makeFont('Readex_Pro');
export const Sen = makeFont('Sen');
export const Signika = makeFont('Signika');
export const Tajawal = makeFont('Tajawal');
export const Jost = makeFont('Jost');
export const Prompt = makeFont('Prompt');
export const Saira = makeFont('Saira');
export const Rajdhani = makeFont('Rajdhani');
export const Teko = makeFont('Teko');
export const Arimo = makeFont('Arimo');
export const Cabin_Condensed = makeFont('Cabin_Condensed');
export const Encode_Sans = makeFont('Encode_Sans');
export const Maven_Pro = makeFont('Maven_Pro');
export const Varela_Round = makeFont('Varela_Round');
export const Zilla_Slab = makeFont('Zilla_Slab');
export const Source_Serif_4 = makeFont('Source_Serif_4');
export const EB_Garamond = makeFont('EB_Garamond');
export const Cormorant_Garamond = makeFont('Cormorant_Garamond');
export const Libre_Baskerville = makeFont('Libre_Baskerville');
export const Spectral = makeFont('Spectral');
export const Roboto_Slab = makeFont('Roboto_Slab');
export const Crimson_Text = makeFont('Crimson_Text');
export const Crimson_Pro = makeFont('Crimson_Pro');
export const Vollkorn = makeFont('Vollkorn');
export const Cardo = makeFont('Cardo');
export const Neuton = makeFont('Neuton');
export const Domine = makeFont('Domine');
export const Arvo = makeFont('Arvo');
export const Frank_Ruhl_Libre = makeFont('Frank_Ruhl_Libre');
export const Newsreader = makeFont('Newsreader');
export const Literata = makeFont('Literata');
export const Petrona = makeFont('Petrona');
export const Faustina = makeFont('Faustina');
export const Alegreya = makeFont('Alegreya');
export const Instrument_Serif = makeFont('Instrument_Serif');
export const Ubuntu_Mono = makeFont('Ubuntu_Mono');
export const Anonymous_Pro = makeFont('Anonymous_Pro');
export const Cousine = makeFont('Cousine');
export const Overpass_Mono = makeFont('Overpass_Mono');
export const Azeret_Mono = makeFont('Azeret_Mono');
export const Martian_Mono = makeFont('Martian_Mono');
export const DM_Mono = makeFont('DM_Mono');
export const Red_Hat_Mono = makeFont('Red_Hat_Mono');
export const Chivo_Mono = makeFont('Chivo_Mono');
export const Noto_Sans_Mono = makeFont('Noto_Sans_Mono');
export const Fragment_Mono = makeFont('Fragment_Mono');
export const Bebas_Neue = makeFont('Bebas_Neue');
export const Anton = makeFont('Anton');
export const Abril_Fatface = makeFont('Abril_Fatface');
export const Comfortaa = makeFont('Comfortaa');
export const Righteous = makeFont('Righteous');
export const Fredoka = makeFont('Fredoka');
export const Alfa_Slab_One = makeFont('Alfa_Slab_One');
export const Archivo_Black = makeFont('Archivo_Black');
export const Bungee = makeFont('Bungee');
export const Rowdies = makeFont('Rowdies');
export const Staatliches = makeFont('Staatliches');
export const Caveat = makeFont('Caveat');
export const Pacifico = makeFont('Pacifico');
export const Dancing_Script = makeFont('Dancing_Script');
export const Lobster = makeFont('Lobster');
export const Satisfy = makeFont('Satisfy');
export const Sacramento = makeFont('Sacramento');
export const Great_Vibes = makeFont('Great_Vibes');
export const Shadows_Into_Light = makeFont('Shadows_Into_Light');
export const Permanent_Marker = makeFont('Permanent_Marker');
export const Indie_Flower = makeFont('Indie_Flower');
`;

// `next/font/local` points at font files the browser sandbox can't resolve from a
// path, so this is a no-op that keeps the page rendering in the fallback font.
const FONT_LOCAL = `
export default function localFont(options) {
  return { className: '', style: {}, variable: (options && options.variable) || '' };
}
`;

/** Specifier → shim source. */
const NEXT_SHIMS: Record<string, string> = {
  'next/link': LINK,
  'next/image': IMAGE,
  'next/head': HEAD,
  'next/script': SCRIPT,
  'next/dynamic': DYNAMIC,
  'next/navigation': NAVIGATION,
  'next/router': ROUTER,
  'next/font/google': FONT_GOOGLE,
  'next/font/local': FONT_LOCAL,
};

/** The shim source for a specifier, or undefined when none applies. */
export function nextShimSource(specifier: string): string | undefined {
  return NEXT_SHIMS[specifier];
}

/** `next/*` modules that only run on a server and have no browser stand-in. */
const SERVER_ONLY = new Set([
  'next/headers',
  'next/server',
  'next/cache',
  'next/og',
]);

/**
 * A pointed message for a server-only `next/*` import, or undefined when the
 * specifier is not one. Keeps the failure legible instead of "package not found".
 */
export function serverOnlyNextMessage(specifier: string): string | undefined {
  if (SERVER_ONLY.has(specifier) || specifier.startsWith('next/dist/server')) {
    return (
      `"${specifier}" runs only on a Next.js server, which the browser preview ` +
      `does not have. The playground renders a Next page on the client — remove ` +
      `server-only code or guard it so it never runs in the browser.`
    );
  }
  return undefined;
}
