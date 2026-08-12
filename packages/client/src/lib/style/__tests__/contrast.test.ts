/**
 * > AC: *a test asserts each ground's foreground/background pairs meet
 * > their contrast floor **computed against `--surface`***.
 *
 * `--surface` and not `--ground`: it is the tighter of each theme's two
 * grounds, so it is the harder test, and `DESIGN-SYSTEM.md` says
 * explicitly to check new values there.
 *
 * Two things make this more than a formality:
 *
 * ⭐ **The totality gate.** Every role must be classified — as a text
 * role with a floor, an on-ground pair, an exempt value, or a structural
 * one. A new role cannot be added to the vocabulary without someone
 * deciding which it is. This is the `lint:topics` pattern: the failure
 * mode being defended against is a role quietly acquiring no coverage,
 * which looks exactly like coverage.
 *
 * ⭐ **The red rule as an assertion.** "Red never touches blue" is a
 * design rule until something checks it. `bad` is Old Glory Red at
 * 2.66:1 against Ink's navy surface — unreadable as text. Rather than
 * lighten the red (which would break the official colour) or drop the
 * rule, `bad` is exempt from the floor **and** asserted to be reachable
 * from no `tokens.color` alias. The alert-on-field colour is `ember`.
 *
 * The WCAG relative-luminance / ratio pair below is test-local on
 * purpose: it is not an author-facing capability, so it is not an Api,
 * and a production export would invite call sites that resolve tokens.
 */

import { describe, it, expect } from 'vitest';
import { GROUND_ROLES, SX, type GroundRole } from '../../../styles/ground';
import { THEMES } from '../themes';
import { tokens } from '../../../components/ui/tokens';
import type { Ground } from '../../../styles/ground';

const FLOOR = 4.5;

/** `#rgb` / `#rrggbb` / `#rrggbbaa` → [r, g, b] in 0–255. Alpha dropped. */
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const expand = (s: string) => parseInt(s.length === 1 ? s + s : s, 16);
  if (h.length === 3 || h.length === 4) {
    return [expand(h[0]!), expand(h[1]!), expand(h[2]!)];
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio, 1–21. */
function ratio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Text roles: must clear the floor against **that ground's `surface`**.
 */
const TEXT_ROLES: GroundRole[] = [
  'fg',
  'fg-dim',
  'fg-mute',
  'accent',
  'good',
  'good-lift',
  'warn',
  'info',
  'ember',
  'tint-amber',
  'tint-teal',
  'tint-rose',
  'tint-slate',
  'tint-violet',
  'tint-emerald',
  'tint-sky',
  'tint-neutral',
];

/**
 * Pairs where the "background" is itself a ground role rather than the
 * surface — a button's field, the brass accent's own ink, paper.
 */
const ON_GROUND_PAIRS: Array<[GroundRole, GroundRole]> = [
  ['white', 'field'],
  ['white', 'field-lift'],
  ['white', 'field-press'],
  ['accent-ink', 'accent'],
  ['paper-ink', 'paper'],
];

/**
 * Exempt from any floor, each with its reason. An exemption is a
 * decision and must read as one.
 */
const EXEMPT: Record<string, string> = {
  bad: '⭐ 2.66:1 in Ink BY DESIGN — Old Glory Red on the navy field is the "red never touches blue" measurement, not a defect. Asserted unconsumed by tokens below.',
  red: 'the official colour; exact in every ground, never text on a field',
  'stripe-s': 'a percentage, not a colour',
  'stripe-l': 'a percentage, not a colour',
};

/**
 * Structural roles: grounds, rules, films and third-party marks. **No
 * floor is invented for them.** The AC is about foreground pairs, and
 * high-contrast deliberately sets `ground === surface === sunken ===
 * #000000` — any separation floor between structural greys would fail
 * exactly the theme that needs the most contrast.
 */
const STRUCTURAL: GroundRole[] = [
  'ground',
  'surface',
  'raised',
  'sunken',
  'line',
  'line-soft',
  'line-strong',
  'accent-wash',
  'hatch',
  'hatch-strong',
  'shadow',
  'scrim',
  'paper',
  'paper-line',
  'field',
  'field-lift',
  'field-press',
  'white',
  'accent-ink',
  'paper-ink',
  'brand-twitch',
  'brand-youtube',
  'brand-kick',
];

describe.each(Object.keys(THEMES))('%s — contrast against --surface', (name) => {
  const ground: Ground = THEMES[name as keyof typeof THEMES]!.ground;

  it.each(TEXT_ROLES)(`%s clears ${FLOOR}:1`, (role) => {
    const measured = ratio(ground[role], ground.surface);
    expect(
      Number(measured.toFixed(2)),
      `${name}: --sx-${role} (${ground[role]}) on --sx-surface ` +
        `(${ground.surface}) measures ${measured.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(FLOOR);
  });

  it.each(ON_GROUND_PAIRS)(`%s on %s clears ${FLOOR}:1`, (fg, bg) => {
    const measured = ratio(ground[fg], ground[bg]);
    expect(
      Number(measured.toFixed(2)),
      `${name}: --sx-${fg} (${ground[fg]}) on --sx-${bg} ` +
        `(${ground[bg]}) measures ${measured.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(FLOOR);
  });
});

describe('⭐ the totality gate — every role is classified', () => {
  it('TEXT ∪ ON_GROUND ∪ EXEMPT ∪ STRUCTURAL === GROUND_ROLES', () => {
    const classified = new Set<string>([
      ...TEXT_ROLES,
      ...ON_GROUND_PAIRS.flat(),
      ...Object.keys(EXEMPT),
      ...STRUCTURAL,
    ]);
    const unclassified = GROUND_ROLES.filter((r) => !classified.has(r));
    const phantom = [...classified].filter(
      (r) => !(GROUND_ROLES as readonly string[]).includes(r),
    );
    expect(
      unclassified,
      'A new ground role must be categorised — floor-bearing text, an ' +
        'on-ground pair, exempt (with a reason), or structural. Silence ' +
        'is not a category.',
    ).toEqual([]);
    expect(phantom, 'classified a role that does not exist').toEqual([]);
  });

  it('every exemption states its reason', () => {
    for (const [role, reason] of Object.entries(EXEMPT)) {
      expect(GROUND_ROLES).toContain(role);
      expect(reason.length, role).toBeGreaterThan(20);
    }
  });
});

describe('⭐ red never touches blue, as an assertion', () => {
  it('no tokens.color alias resolves to --sx-bad', () => {
    // The chrome token layer is where a component would reach for "the
    // red one". If `danger` pointed at `bad`, every alert in Ink would
    // be 2.66:1 on the navy field — legible in a design mock and not on
    // the screen. It points at `ember`, and this is what keeps it there.
    expect(Object.values(tokens.color)).not.toContain(SX.bad);
    expect(Object.values(tokens.palette)).not.toContain(SX.bad);
    expect(tokens.color.danger).toBe(SX.ember);
  });

  it('Ink really does measure below the floor — the reason is real', () => {
    // If a future edit lightened Ink's `bad` until it cleared 4.5:1, the
    // exemption above would become a lie that nothing detected. Assert
    // the measurement the exemption rests on.
    const ink = THEMES.ink.ground;
    expect(ratio(ink.bad, ink.surface)).toBeLessThan(FLOOR);
    expect(ink.bad).toBe('#BF0A30');
    // ...and that `ember`, the colour that replaces it on a field, does
    // clear.
    expect(ratio(ink.ember, ink.surface)).toBeGreaterThanOrEqual(FLOOR);
  });

  it('the three official colours are identical in every ground', () => {
    for (const role of ['field', 'red', 'white'] as const) {
      const values = Object.values(THEMES).map((t) => t.ground[role]);
      expect(new Set(values).size, `${role} diverges across themes`).toBe(1);
    }
  });

  it('the platform marks are identical in every ground', () => {
    for (const role of [
      'brand-twitch',
      'brand-youtube',
      'brand-kick',
    ] as const) {
      const values = Object.values(THEMES).map((t) => t.ground[role]);
      expect(new Set(values).size, `${role} diverges across themes`).toBe(1);
    }
  });
});
