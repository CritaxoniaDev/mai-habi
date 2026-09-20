import type { FileMap } from '@mai-habi/types';

export type DesignTokenCategory =
  'colors' | 'spacing' | 'fonts' | 'radii' | 'shadows';

export interface DesignToken {
  value: string;
  properties: string[];
  files: string[];
  uses: number;
}

export type DesignTokenReport = Record<DesignTokenCategory, DesignToken[]>;

const CSS_FILE = /\.(css|scss|sass|less)$/i;
const COLOR =
  /^(#(?:[\da-f]{3,8})|(?:rgb|hsl|hwb|lab|lch|oklab|oklch|color)\(|transparent\b|currentColor\b)/i;
const LENGTH =
  /^-?(?:\d*\.)?\d+(?:px|r?em|%|vh|vw|vmin|vmax|ch|ex|clamp\(|min\(|max\(|calc\()/i;

function categoryOf(
  property: string,
  value: string,
): DesignTokenCategory | null {
  const name = property.toLowerCase();
  const variable = name.startsWith('--') ? name : '';
  if (
    COLOR.test(value) ||
    /(?:color|background|fill|stroke)$/.test(name) ||
    /(?:color|foreground|background|surface|accent|border)/.test(variable)
  )
    return 'colors';
  if (/font-family$/.test(name) || /(?:font|typeface)/.test(variable))
    return 'fonts';
  if (/shadow$/.test(name) || /shadow/.test(variable)) return 'shadows';
  if (/radius$/.test(name) || /radius/.test(variable)) return 'radii';
  if (
    (LENGTH.test(value) &&
      /^(?:margin|padding|gap|inset|top|right|bottom|left|width|height)/.test(
        name,
      )) ||
    /(?:space|spacing|gap)/.test(variable)
  )
    return 'spacing';
  return null;
}

export function extractDesignTokens(files: FileMap): DesignTokenReport {
  const buckets: Record<DesignTokenCategory, Map<string, DesignToken>> = {
    colors: new Map(),
    spacing: new Map(),
    fonts: new Map(),
    radii: new Map(),
    shadows: new Map(),
  };

  for (const node of Object.values(files)) {
    if (
      node.type !== 'file' ||
      node.encoding !== 'utf8' ||
      !CSS_FILE.test(node.path)
    )
      continue;
    const declarations = node.content.matchAll(/([\w-]+)\s*:\s*([^;{}]+);/g);
    for (const match of declarations) {
      const property = match[1].trim();
      const value = match[2].replace(/\s+/g, ' ').trim();
      const category = categoryOf(property, value);
      if (!category || !value || value.length > 180) continue;

      const key = value.toLowerCase();
      const existing = buckets[category].get(key);
      if (existing) {
        existing.uses += 1;
        if (!existing.properties.includes(property))
          existing.properties.push(property);
        if (!existing.files.includes(node.path)) existing.files.push(node.path);
      } else {
        buckets[category].set(key, {
          value,
          properties: [property],
          files: [node.path],
          uses: 1,
        });
      }
    }
  }

  return {
    colors: [...buckets.colors.values()].sort((a, b) => b.uses - a.uses),
    spacing: [...buckets.spacing.values()].sort((a, b) => b.uses - a.uses),
    fonts: [...buckets.fonts.values()].sort((a, b) => b.uses - a.uses),
    radii: [...buckets.radii.values()].sort((a, b) => b.uses - a.uses),
    shadows: [...buckets.shadows.values()].sort((a, b) => b.uses - a.uses),
  };
}
