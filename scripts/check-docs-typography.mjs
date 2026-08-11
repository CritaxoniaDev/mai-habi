/**
 * Fails the docs build if bold type appears in a place the theme does not cap.
 *
 * Starlight ships `font-weight: 600` and `700` in around twenty selectors. The
 * HABI theme overrides those to 400, but the override is a list — and a
 * Starlight upgrade can introduce a selector the list has never seen.
 *
 * So rather than trusting the list, this reads the built stylesheet, finds every
 * bold rule, and checks each one against the selectors the cap actually
 * targets. Anything unrecognised is reported instead of silently shipping.
 *
 * Code keeps its own weights: syntax highlighting is not product chrome.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cssDir = path.join(here, '..', 'apps', 'docs', 'dist', '_astro');

if (!fs.existsSync(cssDir)) {
  console.error('No built CSS found. Run the docs build first.');
  process.exit(1);
}

let css = '';
for (const file of fs.readdirSync(cssDir).filter((name) => name.endsWith('.css'))) {
  css += fs.readFileSync(path.join(cssDir, file), 'utf8');
}

/**
 * Selectors the cap in `apps/docs/src/styles/habi.css` neutralises.
 *
 * Keep this in step with that file: an entry here is a promise that the cap
 * wins against the rule, which it does because the cap uses `!important` and
 * nothing in Starlight does.
 */
const CAPPED = [
  /(^|[\s,>+~(])h[1-6]\b/,
  /(^|[\s,>+~(])(strong|b|th|dt|summary|legend|mark)\b/,
  /\.site-title\b/,
  /\.starlight-aside__title\b/,
  /\.pagefind-ui__(result-title|result-link|filter-name|search-input|message|button)\b/,
  /\[aria-current=['"]?page['"]?\]/,
  /\.large\b/,
  /\.action\b/,
  /\.sl-steps\s*>\s*li:{1,2}before/,
];

/** Weights we deliberately leave alone. */
const EXEMPT = [/(^|[\s,>+~(])(pre|code)\b/, /expressive-code/, /\bshiki\b/];

const offenders = [];

for (const [, selectorList, weight] of css.matchAll(
  /([^{}]*)\{[^{}]*font-weight:\s*(600|700|800|900|bold)[^{}]*\}/g,
)) {
  for (const selector of selectorList.split(',')) {
    const clean = selector.trim();
    if (!clean) continue;
    if (EXEMPT.some((pattern) => pattern.test(clean))) continue;
    if (CAPPED.some((pattern) => pattern.test(clean))) continue;

    offenders.push({ selector: clean, weight });
  }
}

if (offenders.length > 0) {
  console.error('Bold typography is not capped for these selectors:\n');
  for (const offender of offenders) {
    console.error(`  font-weight: ${offender.weight}  ${offender.selector.slice(0, 110)}`);
  }
  console.error('\nAdd them to the cap in apps/docs/src/styles/habi.css, then to CAPPED here.');
  process.exit(1);
}

console.log('Docs typography: every bold rule is capped at 400 outside code blocks.');
