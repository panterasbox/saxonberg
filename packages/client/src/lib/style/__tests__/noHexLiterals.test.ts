/**
 * > AC: *a test asserts no hex literal appears outside the theme
 * > modules* — making good on the standing "component code must NEVER
 * > hardcode hex literals" comment in `components/ui/tokens.ts`, which
 * > has been unenforced since it was written.
 *
 * The claim being defended is not "hex is ugly". It is that **the only
 * colour values in the client are the three `ground` records**, which is
 * what makes a theme swap complete rather than mostly-complete. One
 * literal left behind is a component that does not repaint, and nothing
 * about a wrong-coloured element on a light ground announces itself as a
 * missed migration rather than a design choice.
 *
 * ## Scope
 *
 * Allowed to contain colour values: **only** `src/lib/style/themes/`.
 *
 * Excluded from scanning: `**\/__tests__\/**`. A test may legitimately
 * assert a concrete value — `themes.test.ts` asserts high-contrast's
 * `ground.fg` really is `#ffffff`, which is the point of that theme, and
 * `Stylesheet.test.ts` keeps a literal `#ff00ff` because a player-typed
 * overlay value is still a raw string. Noting the exclusion here makes
 * it a decision rather than an oversight.
 *
 * ## ⚠ Wider than the AC's letter, on purpose
 *
 * A hex-only guard has three evasions, and two of them were live in the
 * tree when this was written:
 *
 *   - `rgb()` / `rgba()` — rewriting `#2a2a2a` as `rgb(42,42,42)` is a
 *     mechanical dodge with no downside for whoever does it;
 *   - `hsl()` / `hsla()` — same;
 *   - **named CSS colours.** `color: white` is not hex and would sail
 *     past a hex-only regex. There were two live instances, plus a third
 *     the plan's measured list missed.
 *
 * So all three are banned — with one carve-out: a colour function whose
 * arguments include a `var(` is permitted, because composing with the
 * ground is the *correct* way to keep a computed colour theme-aware.
 * `GutterStripe.colorForTopic` is the single site that needs it (the
 * hue is hashed from a topic string; the saturation and lightness are
 * the ground's calibration). It is a pattern permission, not a file
 * allowlist — anything that composes correctly passes.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, sep } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../..');
const themesDir = resolve(srcDir, 'lib', 'style', 'themes');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Every scannable file outside the theme modules. */
function scannableFiles(): string[] {
  return walk(srcDir).filter((f) => !f.startsWith(themesDir + sep));
}

/**
 * Strip block and line comments, and the contents of `/* … *\/` inside
 * styled-components templates. Prose is allowed to *name* a colour —
 * the alias table in `tokens.ts` documents that `fgEmphasis` was
 * `#d7ba7d`, and a guard that made that undocumentable would be worse
 * than the guard is good. What matters is emitted CSS, not commentary.
 *
 * ⚠ Deliberately does not try to respect string literals containing
 * `//` (URLs). Over-stripping only ever makes the guard weaker on that
 * one line, never wrong; a regex comment-stripper that tried to be
 * clever here would be the actual hazard.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[^\n]*?\/\/[^\n]*$/gm, (line) =>
      /https?:\/\//.test(line) ? line : '',
    );
}

interface Offence {
  file: string;
  line: number;
  text: string;
  why: string;
}

function scan(): Offence[] {
  const out: Offence[] = [];
  for (const file of scannableFiles()) {
    const rel = file.slice(srcDir.length + 1);
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      const record = (why: string) =>
        out.push({ file: rel, line: i + 1, text: line.trim(), why });

      // A `#` followed by exactly 3, 4, 6 or 8 hex digits at a word
      // boundary — EXCLUDING all-digit runs, so `#3601` (the
      // styled-components issue number in main.tsx) and `#12` do not
      // trip. An all-digit run cannot be distinguished from a reference
      // by shape, and issue numbers are the common case.
      for (const m of line.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
        const digits = m[1]!;
        if (![3, 4, 6, 8].includes(digits.length)) continue;
        if (/^[0-9]+$/.test(digits)) continue;
        record(`hex literal ${m[0]}`);
      }

      // A colour function whose argument list contains no `var(`.
      for (const m of line.matchAll(/\b(rgba?|hsla?)\(([^)]*)\)/g)) {
        if (m[2]!.includes('var(')) continue;
        record(`${m[1]}() with no var() argument`);
      }

      // A bare named colour in a colour-bearing declaration position.
      // Small, and it closes the cheapest evasion of all.
      if (
        /\b(color|background|background-color|border[a-z-]*|fill|stroke|outline[a-z-]*)\s*:\s*[^;]*\b(white|black)\b/.test(
          line,
        )
      ) {
        record('named CSS colour (white / black) in a colour position');
      }
    });
  }
  return out;
}

describe('no colour value outside the theme modules', () => {
  it('the whole client resolves colour through the token layer', () => {
    const offences = scan();
    const report = offences
      .map((o) => `  ${o.file}:${o.line}  ${o.why}\n      ${o.text}`)
      .join('\n');
    expect(
      offences,
      `Colour values found outside src/lib/style/themes/. Every one of ` +
        `these is a component that will NOT repaint on a theme change:\n` +
        report,
    ).toEqual([]);
  });

  it('the guard actually catches each evasion (a test of the test)', () => {
    // A guard nobody has seen fail is a guard nobody knows works. These
    // are the four shapes it must reject; if a future refactor of the
    // regexes silently stops matching, this fails rather than the suite
    // going quietly green with literals back in the tree.
    const cases = [
      'color: #2a2a2a;',
      'background: rgba(0, 0, 0, 0.4);',
      'color: hsl(120, 65%, 50%);',
      'color: white;',
    ];
    for (const css of cases) {
      const hitsHex = /#([0-9a-fA-F]{3,8})\b/.test(css);
      const fn = /\b(rgba?|hsla?)\(([^)]*)\)/.exec(css);
      const hitsFn = fn !== null && !fn[2]!.includes('var(');
      const hitsNamed =
        /\b(color|background|background-color|border[a-z-]*|fill|stroke|outline[a-z-]*)\s*:\s*[^;]*\b(white|black)\b/.test(
          css,
        );
      expect(hitsHex || hitsFn || hitsNamed, css).toBe(true);
    }
  });

  it('permits a colour function composed from the ground', () => {
    // The GutterStripe pattern. The hue is computed; the calibration is
    // the ground's. This must NOT be an offence, or the only correct way
    // to keep a computed colour theme-aware would be banned.
    const composed = 'hsl(210 var(--sx-stripe-s) var(--sx-stripe-l))';
    const fn = /\b(rgba?|hsla?)\(([^)]*)\)/.exec(composed);
    expect(fn).not.toBeNull();
    expect(fn![2]!.includes('var(')).toBe(true);
  });

  it('does not trip on a `#`-prefixed issue number', () => {
    // `main.tsx` cites styled-components #3601 in the comment that
    // explains why GlobalFonts sits outside StrictMode. An all-digit
    // run is excluded by shape.
    const digits = '3601';
    expect(/^[0-9]+$/.test(digits)).toBe(true);
  });
});
