import type { FontConfig } from '@mai-habi/types';

/**
 * Google Fonts wiring for the preview.
 *
 * Fonts are loaded live from `fonts.googleapis.com` rather than bundled: the
 * project stores only the choice, and the preview turns it into a single `css2`
 * request. The same request is used to render the picker, so the two never
 * disagree about what a font looks like.
 */

const ENDPOINT = 'https://fonts.googleapis.com/css2';

/** A weight every family provides, used when none is chosen. */
const FALLBACK_WEIGHT = 400;

function familyParam(font: FontConfig): string | null {
  const family = font.family.trim();
  if (!family) return null;

  const name = family.replace(/\s+/g, '+');
  const weights = (font.weights.length ? font.weights : [FALLBACK_WEIGHT])
    .filter((weight) => Number.isFinite(weight))
    .filter((weight, index, all) => all.indexOf(weight) === index)
    .sort((a, b) => a - b);

  /*
   * `css2` demands the axis tuples in ascending order. With italics the `ital`
   * axis leads, so every upright weight (`0,w`) is listed before every italic
   * one (`1,w`).
   */
  if (font.italic) {
    const tuples = [
      ...weights.map((weight) => `0,${weight}`),
      ...weights.map((weight) => `1,${weight}`),
    ];
    return `family=${name}:ital,wght@${tuples.join(';')}`;
  }

  return `family=${name}:wght@${weights.join(';')}`;
}

/**
 * The Google Fonts stylesheet URL for a set of families, or null when none are
 * configured. `display=swap` keeps text visible while the font downloads.
 */
export function googleFontsHref(fonts: FontConfig[]): string | null {
  const families = fonts.map(familyParam).filter((part): part is string => part !== null);
  if (families.length === 0) return null;

  return `${ENDPOINT}?${families.join('&')}&display=swap`;
}

/** A CSS `font-family` value, quoted so multi-word names stay one token. */
export function cssFontFamily(family: string): string {
  return JSON.stringify(family.trim());
}
