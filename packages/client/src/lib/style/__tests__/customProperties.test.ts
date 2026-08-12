/**
 * ⭐ **The load-bearing guard.**
 *
 * > AC: *a test asserts every `--sx-*` custom property referenced
 * > anywhere is defined by every theme.*
 *
 * This closes the custom-property layer's one silent-failure mode. A
 * missing or misspelled custom property does not throw, does not warn,
 * and does not render wrong in an obvious way: CSS **drops the
 * declaration** and the element inherits whatever its ancestor had. The
 * result is a page that looks nearly right, which is the worst outcome
 * available — the whole point of the layer is that colour resolves from
 * the theme, and a silent inherit is exactly that guarantee failing
 * invisibly.
 *
 * Four assertions, closing all four directions:
 *
 *   1. **Definition** — every theme defines every role (value route).
 *   2. **Reference** — every `--sx-*` named in source is a real role
 *      (source route). The typo guard.
 *   3. **Emission** — the applier actually writes all of them (DOM
 *      route).
 *   4. **Reverse** — every role is consumed, or explicitly listed as
 *      reserved with a reason.
 *
 * ⚠ Note on jsdom, because the next reader will assume a bug: jsdom
 * does **not** substitute `var()`. `getComputedStyle(el).color` on an
 * element whose colour is `var(--sx-fg)` returns the literal string
 * `"var(--sx-fg)"`, not a resolved rgb triple. Custom properties set on
 * `documentElement.style` *are* stored and readable, which is what makes
 * assertion 3 possible at all — and is why the resolved-colour half of
 * the acceptance criterion lives in `e2e/tests/theme.spec.ts`, against a
 * real browser.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { GROUND_ROLES, SX, type GroundRole } from '../../../styles/ground';
import { THEMES } from '../themes';
import { applyGround } from '../useGround';
import { tokens } from '../../../components/ui/tokens';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../..');
const groundModule = resolve(srcDir, 'styles/ground.ts');
const selfPath = fileURLToPath(import.meta.url);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('1 — definition: every theme defines every role', () => {
  it.each(Object.keys(THEMES))('%s covers the whole vocabulary', (name) => {
    const theme = THEMES[name as keyof typeof THEMES]!;
    expect(Object.keys(theme.ground).sort()).toEqual(
      [...GROUND_ROLES].sort(),
    );
  });

  it.each(Object.keys(THEMES))('%s has no empty value', (name) => {
    const theme = THEMES[name as keyof typeof THEMES]!;
    for (const role of GROUND_ROLES) {
      const value = theme.ground[role];
      expect(typeof value, `${name}.${role}`).toBe('string');
      expect(value.trim().length, `${name}.${role}`).toBeGreaterThan(0);
    }
  });

  it('the vocabulary itself has no duplicate name', () => {
    expect(new Set(GROUND_ROLES).size).toBe(GROUND_ROLES.length);
  });
});

describe('2 — reference: every --sx-* in source is a real role', () => {
  // ⭐ This is the assertion that catches a hand-typed
  // `var(--sx-surace)` that bypassed the `SX` table. `SX` makes a typo
  // impossible where it is used; nothing stops someone writing the
  // string by hand in a styled-components template, and CSS will drop
  // it without a word.
  it('no source file names an unknown custom property', () => {
    const offenders: string[] = [];
    const known = new Set<string>(GROUND_ROLES);
    for (const file of walk(srcDir)) {
      // `ground.ts` constructs the names; this file enumerates them.
      if (file === groundModule || file === selfPath) continue;
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/--sx-([a-z0-9-]+)/g)) {
        const role = match[1]!;
        if (!known.has(role)) {
          offenders.push(`${file.slice(srcDir.length + 1)}: --sx-${role}`);
        }
      }
    }
    expect(
      offenders,
      `Unknown --sx-* custom properties (these resolve to nothing and ` +
        `the element silently inherits):\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('SX builds exactly the reference form the CSS expects', () => {
    for (const role of GROUND_ROLES) {
      expect(SX[role]).toBe(`var(--sx-${role})`);
    }
  });
});

describe('3 — emission: the applier writes every role to :root', () => {
  it.each(Object.keys(THEMES))('applyGround(%s) sets all 44', (name) => {
    const theme = THEMES[name as keyof typeof THEMES]!;
    const root = document.documentElement;
    // Clear first, so a value left by a previous theme cannot make a
    // missing write look like a successful one.
    for (const role of GROUND_ROLES) {
      root.style.removeProperty(`--sx-${role}`);
    }
    applyGround(theme.ground);
    for (const role of GROUND_ROLES) {
      const written = getComputedStyle(root).getPropertyValue(
        `--sx-${role}`,
      );
      expect(written.trim(), `${name} → --sx-${role}`).toBe(
        theme.ground[role],
      );
    }
  });

  it('is idempotent — StrictMode double-invokes the effect', () => {
    const theme = THEMES.ink;
    applyGround(theme.ground);
    const once = getComputedStyle(document.documentElement)
      .getPropertyValue('--sx-surface')
      .trim();
    applyGround(theme.ground);
    const twice = getComputedStyle(document.documentElement)
      .getPropertyValue('--sx-surface')
      .trim();
    expect(twice).toBe(once);
  });
});

describe('4 — reverse: every role is consumed, or reserved on purpose', () => {
  /**
   * Roles that nothing reads today. Each carries its reason, because a
   * bare unconsumed list reads as dead code and would eventually be
   * deleted by someone tidying up.
   */
  const RESERVED: Record<string, string> = {
    // ⭐⭐ **This table is now empty, and that is the intended end
    // state.** Both of its entries named a future surface as their
    // consumer, and Build B is that surface:
    //
    //   - `red` — Old Glory Red as the *official colour*, distinct from
    //     the `bad` semantic role. It awaited "a surface that can carry
    //     white separation", which is the top bar's SEAL: white glyph
    //     on red with a red border, read through `tokens.color.seal` /
    //     `sealInk`. It stays a background/border colour and never
    //     text — `tokens.color.danger` still resolves to `ember`, so
    //     "red never touches blue" holds.
    //   - `fg-dim` — the published middle foreground step. The chrome
    //     hierarchy (top bar / status bar / shelf) is the first surface
    //     with three levels of text to separate, and
    //     `tokens.color.fgDim` now references it.
    //
    // ⚠ A reservation whose named consumer ARRIVES is supposed to
    // leave; that is exactly what distinguishes it from dead
    // vocabulary. Adding a new entry here is fine — with its reason,
    // and with the surface that will retire it named.
  };

  it('the consumed set plus the reserved set is the whole vocabulary', () => {
    const consumed = new Set<string>();
    const record = (value: unknown) => {
      if (typeof value !== 'string') return;
      const m = /^var\(--sx-([a-z0-9-]+)\)$/.exec(value);
      if (m) consumed.add(m[1]!);
    };

    for (const value of Object.values(tokens.color)) record(value);
    for (const value of Object.values(tokens.palette)) record(value);
    for (const value of Object.values(tokens.brand)) record(value);
    for (const theme of Object.values(THEMES)) {
      for (const [key, value] of Object.entries(theme.palette)) {
        if (key === 'channelDefaults') {
          for (const v of Object.values(theme.palette.channelDefaults)) {
            record(v);
          }
        } else {
          record(value);
        }
      }
      const treatments = [
        ...Object.values(theme.topic),
        ...Object.values(theme.element),
        ...Object.values(theme.bucket),
        theme.mention.match,
        theme.mention.other,
      ];
      for (const t of treatments) {
        record(t.fg);
        record(t.bg);
      }
    }
    // The two percentages are composed into `hsl()` by GutterStripe,
    // not read as whole values, so they never appear as a bare
    // `var(--sx-…)` string. Count them by their real consumer.
    const stripeSrc = readFileSync(
      resolve(srcDir, 'components/GutterStripe.tsx'),
      'utf8',
    );
    for (const role of ['stripe-s', 'stripe-l'] as const) {
      if (stripeSrc.includes(`--sx-${role}`)) consumed.add(role);
    }

    const unconsumed = GROUND_ROLES.filter(
      (r: GroundRole) => !consumed.has(r),
    );
    expect(
      unconsumed.slice().sort(),
      'A role that is neither consumed nor listed in RESERVED is ' +
        'either dead vocabulary or a token that forgot to reference it.',
    ).toEqual(Object.keys(RESERVED).sort());
  });

  it('every reserved role states why', () => {
    for (const [role, reason] of Object.entries(RESERVED)) {
      expect(GROUND_ROLES).toContain(role);
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});
