import type { FontConfig } from '@mai-habi/types';

/**
 * A browseable slice of the Google Fonts catalogue.
 *
 * The full catalogue needs an API key to enumerate, so the picker ships this
 * curated list of popular families for one-click adding and falls back to a
 * free-text field for anything else — the `css2` endpoint accepts any family,
 * so nothing is truly out of reach.
 */

export type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';

export interface CatalogFont {
  family: string;
  category: FontCategory;
  /** Weights the family provides, offered as toggles in the picker. */
  weights: number[];
}

/** Offered for a typed-in family, whose real weight range we cannot know. */
export const CUSTOM_WEIGHTS = [400, 700];

/** Selected by default when a font is added. Both are near-universal. */
export const DEFAULT_WEIGHTS = [400, 700];

const SANS = [300, 400, 500, 600, 700];
const SANS_WIDE = [300, 400, 500, 600, 700, 800];

export const GOOGLE_FONTS: CatalogFont[] = [
  // Sans-serif
  { family: 'Inter', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Roboto', category: 'sans-serif', weights: [300, 400, 500, 700, 900] },
  { family: 'Open Sans', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Lato', category: 'sans-serif', weights: [300, 400, 700, 900] },
  { family: 'Montserrat', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Poppins', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Raleway', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Nunito', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Nunito Sans', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Work Sans', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Rubik', category: 'sans-serif', weights: SANS },
  { family: 'DM Sans', category: 'sans-serif', weights: [400, 500, 700] },
  { family: 'Manrope', category: 'sans-serif', weights: SANS },
  { family: 'Plus Jakarta Sans', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Space Grotesk', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Sora', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Outfit', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Figtree', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Mulish', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Karla', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800] },
  { family: 'Oswald', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Barlow', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Kanit', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Quicksand', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Josefin Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'IBM Plex Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Fira Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'PT Sans', category: 'sans-serif', weights: [400, 700] },

  // Serif
  { family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900] },
  { family: 'Merriweather', category: 'serif', weights: [300, 400, 700, 900] },
  { family: 'Lora', category: 'serif', weights: [400, 500, 600, 700] },
  { family: 'PT Serif', category: 'serif', weights: [400, 700] },
  { family: 'Roboto Slab', category: 'serif', weights: [300, 400, 500, 700] },
  { family: 'Source Serif 4', category: 'serif', weights: [400, 500, 600, 700] },
  { family: 'Bitter', category: 'serif', weights: [400, 500, 600, 700] },
  { family: 'EB Garamond', category: 'serif', weights: [400, 500, 600, 700] },
  { family: 'Cormorant Garamond', category: 'serif', weights: [400, 500, 600, 700] },
  { family: 'Libre Baskerville', category: 'serif', weights: [400, 700] },
  { family: 'Spectral', category: 'serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Zilla Slab', category: 'serif', weights: [300, 400, 500, 600, 700] },

  // Monospace
  { family: 'JetBrains Mono', category: 'monospace', weights: [400, 500, 600, 700] },
  { family: 'Fira Code', category: 'monospace', weights: [400, 500, 600, 700] },
  { family: 'Source Code Pro', category: 'monospace', weights: [400, 500, 600, 700] },
  { family: 'IBM Plex Mono', category: 'monospace', weights: [400, 500, 600, 700] },
  { family: 'Space Mono', category: 'monospace', weights: [400, 700] },
  { family: 'Roboto Mono', category: 'monospace', weights: [300, 400, 500, 700] },
  { family: 'Inconsolata', category: 'monospace', weights: [400, 500, 600, 700] },

  // Display & handwriting
  { family: 'Bebas Neue', category: 'display', weights: [400] },
  { family: 'Anton', category: 'display', weights: [400] },
  { family: 'Abril Fatface', category: 'display', weights: [400] },
  { family: 'Comfortaa', category: 'display', weights: [300, 400, 500, 600, 700] },
  { family: 'Caveat', category: 'handwriting', weights: [400, 500, 600, 700] },
  { family: 'Pacifico', category: 'handwriting', weights: [400] },
  { family: 'Dancing Script', category: 'handwriting', weights: [400, 500, 600, 700] },
  { family: 'Lobster', category: 'handwriting', weights: [400] },
  { family: 'Lexend', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Urbanist', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Epilogue', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Public Sans', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Jost', category: 'sans-serif', weights: SANS },
  { family: 'Syne', category: 'sans-serif', weights: [400, 500, 600, 700, 800] },
  { family: 'Bricolage Grotesque', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Onest', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Instrument Sans', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Schibsted Grotesk', category: 'sans-serif', weights: [400, 500, 600, 700, 800, 900] },
  { family: 'Red Hat Display', category: 'sans-serif', weights: SANS },
  { family: 'Heebo', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Assistant', category: 'sans-serif', weights: SANS },
  { family: 'Chivo', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Readex Pro', category: 'sans-serif', weights: SANS },
  { family: 'Archivo', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Libre Franklin', category: 'sans-serif', weights: SANS_WIDE },
  { family: 'Titillium Web', category: 'sans-serif', weights: [200, 300, 400, 600, 700, 900] },
  { family: 'Crimson Pro', category: 'serif', weights: SANS_WIDE },
  { family: 'Newsreader', category: 'serif', weights: SANS },
  { family: 'Literata', category: 'serif', weights: SANS_WIDE },
  { family: 'Alegreya', category: 'serif', weights: [400, 500, 600, 700, 800, 900] },
  { family: 'Domine', category: 'serif', weights: [400, 500, 600, 700] },
  { family: 'Vollkorn', category: 'serif', weights: [400, 500, 600, 700, 800, 900] },
  { family: 'Instrument Serif', category: 'serif', weights: [400] },
  { family: 'DM Serif Display', category: 'serif', weights: [400] },
  { family: 'Noto Serif', category: 'serif', weights: SANS_WIDE },
  { family: 'DM Mono', category: 'monospace', weights: [300, 400, 500] },
  { family: 'Red Hat Mono', category: 'monospace', weights: SANS },
  { family: 'Martian Mono', category: 'monospace', weights: SANS_WIDE },
  { family: 'Azeret Mono', category: 'monospace', weights: SANS_WIDE },
  { family: 'Noto Sans Mono', category: 'monospace', weights: SANS_WIDE },
  { family: 'Ubuntu Mono', category: 'monospace', weights: [400, 700] },
  { family: 'Fredoka', category: 'display', weights: SANS },
  { family: 'Righteous', category: 'display', weights: [400] },
  { family: 'Archivo Black', category: 'display', weights: [400] },
  { family: 'Alfa Slab One', category: 'display', weights: [400] },
  { family: 'Bungee', category: 'display', weights: [400] },
  { family: 'Staatliches', category: 'display', weights: [400] },
  { family: 'Satisfy', category: 'handwriting', weights: [400] },
  { family: 'Great Vibes', category: 'handwriting', weights: [400] },
  { family: 'Sacramento', category: 'handwriting', weights: [400] },
  { family: 'Permanent Marker', category: 'handwriting', weights: [400] },
  { family: 'Indie Flower', category: 'handwriting', weights: [400] },
  { family: 'Shadows Into Light', category: 'handwriting', weights: [400] },
];

export const FONT_CATEGORY_LABEL: Record<FontCategory, string> = {
  'sans-serif': 'Sans',
  serif: 'Serif',
  monospace: 'Mono',
  display: 'Display',
  handwriting: 'Script',
};

/** Case-insensitive lookup so a typed family reuses catalogue metadata. */
export function findCatalogFont(family: string): CatalogFont | undefined {
  const needle = family.trim().toLowerCase();
  return GOOGLE_FONTS.find((font) => font.family.toLowerCase() === needle);
}

/** Builds the stored config for a family, keeping only weights it provides. */
export function makeFontConfig(family: string): FontConfig {
  const catalog = findCatalogFont(family);
  const available = catalog?.weights ?? CUSTOM_WEIGHTS;
  const weights = DEFAULT_WEIGHTS.filter((weight) => available.includes(weight));

  return {
    family: family.trim(),
    weights: weights.length ? weights : [available[0] ?? 400],
    italic: false,
    defaultBody: false,
  };
}
