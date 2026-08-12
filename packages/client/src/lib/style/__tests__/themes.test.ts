/**
 * Theme audits — acceptance criterion #27: every treatment that sets
 * `fg` (color) must also set at least one non-color cue (weight,
 * italic, prefix, chip) so the theme remains legible without color.
 *
 * `ink` and `marble` are exempt from the strict audit — the posture is
 * unchanged from the retired `default` theme (the two civic grounds are
 * the ordinary reading themes and not every distinction needs a
 * non-colour cue), only the subject was renamed. The high-contrast
 * theme MUST pass, because it is the theme that exists to be the test.
 */

import { describe, it, expect } from 'vitest';
import { INK_THEME } from '../themes/ink';
import { MARBLE_THEME } from '../themes/marble';
import { HIGH_CONTRAST_THEME } from '../themes/highContrast';
import { THEMES, pickTheme } from '../themes';
import type { StyleTreatment, Theme } from '../types';

function hasNonColorCue(t: StyleTreatment): boolean {
  return !!(t.weight || t.italic || t.prefix || t.chip);
}

function collectTreatments(theme: Theme): Array<{
  label: string;
  treatment: StyleTreatment;
}> {
  const out: Array<{ label: string; treatment: StyleTreatment }> = [];
  for (const [key, t] of Object.entries(theme.topic)) {
    out.push({ label: `topic.${key}`, treatment: t });
  }
  for (const [key, t] of Object.entries(theme.element)) {
    out.push({ label: `element.${key}`, treatment: t });
  }
  for (const [key, t] of Object.entries(theme.bucket)) {
    out.push({ label: `bucket.${key}`, treatment: t });
  }
  out.push({ label: 'mention.match', treatment: theme.mention.match });
  out.push({ label: 'mention.other', treatment: theme.mention.other });
  return out;
}

describe('High-contrast theme (#27 — no color-alone semantics)', () => {
  it('every colored treatment carries a non-color cue', () => {
    const offenders: string[] = [];
    for (const { label, treatment } of collectTreatments(HIGH_CONTRAST_THEME)) {
      if (treatment.fg && !hasNonColorCue(treatment)) {
        offenders.push(`${label}: ${JSON.stringify(treatment)}`);
      }
    }
    expect(
      offenders,
      `High-contrast treatments with color-only styling:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('palette resolves through the ground, which holds the pure values', () => {
    // The palette now holds `var()` REFERENCES; the assertion that used
    // to live here moved one layer down, onto the ground record that
    // actually carries the value. Both halves are worth keeping: the
    // reference proves the indirection, the value proves it is still
    // maximal contrast.
    expect(HIGH_CONTRAST_THEME.palette.fg).toBe('var(--sx-fg)');
    expect(HIGH_CONTRAST_THEME.palette.bg).toBe('var(--sx-surface)');
    expect(HIGH_CONTRAST_THEME.ground.fg).toBe('#ffffff');
    expect(HIGH_CONTRAST_THEME.ground.surface).toBe('#000000');
  });

  it('friend / foe carry both color AND prefix', () => {
    expect(HIGH_CONTRAST_THEME.bucket.friend.prefix).toBeDefined();
    expect(HIGH_CONTRAST_THEME.bucket.foe.prefix).toBeDefined();
  });
});

describe('The theme registry — three themes, one resolver', () => {
  it('registers exactly ink, marble and high-contrast', () => {
    expect(Object.keys(THEMES).sort()).toEqual([
      'high-contrast',
      'ink',
      'marble',
    ]);
    for (const [name, theme] of Object.entries(THEMES)) {
      expect(theme.name).toBe(name);
    }
  });

  it('pickTheme resolves each known name to its own theme', () => {
    expect(pickTheme('ink')).toBe(INK_THEME);
    expect(pickTheme('marble')).toBe(MARBLE_THEME);
    expect(pickTheme('high-contrast')).toBe(HIGH_CONTRAST_THEME);
  });

  it('⚠ `default` is retired UNALIASED — it resolves like any junk', () => {
    // The word stopped naming anything the moment there were two
    // grounds. It must fall through exactly as an unknown string does,
    // not resolve to Ink by a special case that would keep the dead
    // vocabulary quietly alive. (The server refuses it outright; this
    // is the client half of the same decision.)
    expect(pickTheme('default')).toBe(INK_THEME);
    expect(pickTheme('gibberish')).toBe(INK_THEME);
    expect(pickTheme(undefined)).toBe(INK_THEME);
    expect(pickTheme(null)).toBe(INK_THEME);
    expect(pickTheme(42)).toBe(INK_THEME);
  });
});

describe('Ink and Marble — basic shape', () => {
  for (const theme of [INK_THEME, MARBLE_THEME]) {
    describe(theme.name, () => {
      it('exposes the gossip channel default color', () => {
        expect(theme.palette.channelDefaults.gossip).toBeDefined();
      });

      it('element / topic rules stay empty — renderer carries styling', () => {
        // Per-tag treatment (StrongSpan = bold, EmSpan = italic, etc.) is
        // baked into the renderer. The theme tables are present for
        // future divergence but stay empty so per-word markers don't get
        // erased by frame-level claims. Neither font-by-register nor the
        // colour ground adds topic/element entries — both are SIBLING
        // fields — so this invariant is unaffected by either.
        expect(theme.element).toEqual({});
        expect(theme.topic).toEqual({});
      });
    });
  }
});

describe('All three themes expose font registers + role tokens', () => {
  for (const theme of Object.values(THEMES)) {
    describe(theme.name, () => {
      it('declares all four FontRole face stacks', () => {
        for (const role of [
          'narrative',
          'chrome',
          'command',
          'display',
        ] as const) {
          expect(typeof theme.fontRoles[role]).toBe('string');
          expect(theme.fontRoles[role].length).toBeGreaterThan(0);
        }
      });

      it('narrative and command faces differ (serif vs mono)', () => {
        expect(theme.fontRoles.narrative).not.toBe(theme.fontRoles.command);
      });

      it('the register table maps world prose to narrative, machine to command', () => {
        // Keyed on ROOTS now — the payoff of a tree that carries
        // subject matter, since the voice a frame speaks in follows
        // from what it is about.
        expect(theme.registers['speech']).toBe('narrative');
        expect(theme.registers['act']).toBe('narrative');
        expect(theme.registers['sense']).toBe('narrative');
        expect(theme.registers['shell']).toBe('command');
        expect(theme.registers['session']).toBe('command');
      });
    });
  }

  it('all three themes share the identical register mapping', () => {
    // Typography is orthogonal to BOTH the ground and the contrast
    // axis. One shared table, three consumers — the single-source
    // claim, asserted over every consumer rather than the one pair it
    // used to cover.
    expect(MARBLE_THEME.registers).toEqual(INK_THEME.registers);
    expect(MARBLE_THEME.fontRoles).toEqual(INK_THEME.fontRoles);
    expect(HIGH_CONTRAST_THEME.registers).toEqual(INK_THEME.registers);
    expect(HIGH_CONTRAST_THEME.fontRoles).toEqual(INK_THEME.fontRoles);
  });
});
