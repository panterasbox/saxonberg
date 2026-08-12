/**
 * > AC: *`Theme.palette` and the chrome tokens resolve through the same
 * > source — asserted, not just intended.*
 *
 * Before this build there were two independently-authored colour tables
 * for one product: the switchable `Theme.palette` (transcript only) and
 * the static `components/ui/tokens.ts` (read by 52 files). Nothing
 * connected them, so they could drift — and "a face swap is one edit"
 * was a claim about a system that had two.
 *
 * "One source" is not a feeling about the code. Operationally it is:
 * **every colour-bearing value in the client is a `var(--sx-<role>)`
 * reference with `role ∈ GROUND_ROLES`**, and therefore the only colour
 * *values* anywhere are the three `ground` records. That is exactly what
 * this file asserts, over every table that carries a colour.
 *
 * The complement lives in `noHexLiterals.test.ts` (nothing outside the
 * theme modules holds a value) and `customProperties.test.ts` (every
 * reference resolves). Together the three close the loop: no values
 * outside, every reference valid, every role defined.
 */

import { describe, it, expect } from 'vitest';
import { GROUND_ROLES } from '../../../styles/ground';
import { THEMES } from '../themes';
import { tokens } from '../../../components/ui/tokens';

const REFERENCE = /^var\(--sx-([a-z0-9-]+)\)$/;
const KNOWN = new Set<string>(GROUND_ROLES);

/** Assert one value is a well-formed reference into a real role. */
function expectReference(label: string, value: unknown): void {
  expect(typeof value, `${label} is not a string`).toBe('string');
  const match = REFERENCE.exec(value as string);
  expect(
    match,
    `${label} = ${JSON.stringify(value)} — expected a var(--sx-<role>) ` +
      `reference. A raw value here is a colour that will not repaint.`,
  ).not.toBeNull();
  expect(KNOWN.has(match![1]!), `${label} → unknown role ${match![1]}`).toBe(
    true,
  );
}

describe('the chrome token layer speaks only in ground references', () => {
  it.each(Object.entries(tokens.color))('tokens.color.%s', (key, value) => {
    expectReference(`tokens.color.${key}`, value);
  });

  it.each(Object.entries(tokens.palette))(
    'tokens.palette.%s',
    (key, value) => {
      expectReference(`tokens.palette.${key}`, value);
    },
  );

  it.each(Object.entries(tokens.brand))('tokens.brand.%s', (key, value) => {
    expectReference(`tokens.brand.${key}`, value);
  });

  it('the social palette is 1:1 with the ground tint tier', () => {
    // `tokens.palette` is the client half of the server's
    // `NotifyRule.PaletteToken` vocabulary. If the two tiers drift, a
    // server-emitted token name resolves to `neutral` and the highlight
    // silently loses its meaning rather than failing.
    const tintRoles = GROUND_ROLES.filter((r) => r.startsWith('tint-'));
    const referenced = Object.values(tokens.palette).map(
      (v) => REFERENCE.exec(v)![1]!,
    );
    expect(referenced.slice().sort()).toEqual([...tintRoles].sort());
  });
});

describe.each(Object.keys(THEMES))(
  '%s — the transcript palette speaks the same language',
  (name) => {
    const theme = THEMES[name as keyof typeof THEMES]!;

    it('every palette token is a ground reference', () => {
      for (const [key, value] of Object.entries(theme.palette)) {
        if (key === 'channelDefaults') continue;
        expectReference(`${name}.palette.${key}`, value);
      }
    });

    it('every channel default is a ground reference', () => {
      for (const [channel, value] of Object.entries(
        theme.palette.channelDefaults,
      )) {
        expectReference(`${name}.channelDefaults.${channel}`, value);
      }
    });

    it('every treatment fg/bg is a ground reference', () => {
      const treatments: ReadonlyArray<
        readonly [string, { fg?: string; bg?: string }]
      > = [
        ...Object.entries(theme.topic).map(
          ([k, t]) => [`topic.${k}`, t] as const,
        ),
        ...Object.entries(theme.element).map(
          ([k, t]) => [`element.${k}`, t] as const,
        ),
        ...Object.entries(theme.bucket).map(
          ([k, t]) => [`bucket.${k}`, t] as const,
        ),
        ['mention.match', theme.mention.match] as const,
        ['mention.other', theme.mention.other] as const,
      ];
      for (const [label, t] of treatments) {
        if (t.fg !== undefined) {
          expectReference(`${name}.${label}.fg`, t.fg);
        }
        if (t.bg !== undefined) {
          expectReference(`${name}.${label}.bg`, t.bg);
        }
      }
    });

    it('the ground record holds VALUES, never references', () => {
      // The other direction, and the one that would otherwise let the
      // whole scheme collapse into self-reference: a `ground` entry
      // pointing at another `var(--sx-…)` would resolve to nothing (or
      // to a cycle) and inherit silently.
      for (const role of GROUND_ROLES) {
        expect(theme.ground[role], `${name}.ground.${role}`).not.toMatch(
          /var\(/,
        );
      }
    });
  },
);

describe('the two systems meet at the same roles', () => {
  it('a chrome token and a transcript token can name the same role', () => {
    // The concrete claim behind "one source": these were two separate
    // hex values in two files before this build, and are now the same
    // reference resolved by the same custom property.
    expect(tokens.color.fgEmphasis).toBe(THEMES.ink.palette.mentionSelfFg);
    expect(tokens.palette.amber).toBe(THEMES.ink.palette.chanChip);
    expect(tokens.color.fg).toBe(THEMES.ink.palette.fg);
  });

  it('and they stay equal in every ground, because neither holds a value', () => {
    for (const theme of Object.values(THEMES)) {
      expect(tokens.color.fg).toBe(theme.palette.fg);
      expect(tokens.color.surface).toBe(theme.palette.bg);
    }
  });
});
