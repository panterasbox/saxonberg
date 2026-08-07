/**
 * Theme audits — acceptance criterion #27: every treatment that sets
 * `fg` (color) must also set at least one non-color cue (weight,
 * italic, prefix, chip) so the theme remains legible without color.
 *
 * Default theme is exempt from the strict audit (it leans on the
 * developer dark palette and not all distinctions need non-color
 * cues — fidelity to the existing cockpit). The high-contrast
 * theme MUST pass.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_THEME } from '../themes/default';
import { HIGH_CONTRAST_THEME } from '../themes/highContrast';
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

  it('palette uses pure high-contrast values', () => {
    expect(HIGH_CONTRAST_THEME.palette.fg).toBe('#ffffff');
    expect(HIGH_CONTRAST_THEME.palette.bg).toBe('#000000');
  });

  it('friend / foe carry both color AND prefix', () => {
    expect(HIGH_CONTRAST_THEME.bucket.friend.prefix).toBeDefined();
    expect(HIGH_CONTRAST_THEME.bucket.foe.prefix).toBeDefined();
  });
});

describe('Default theme — basic shape', () => {
  it('name is "default"', () => {
    expect(DEFAULT_THEME.name).toBe('default');
  });

  it('exposes the gossip channel default color', () => {
    expect(DEFAULT_THEME.palette.channelDefaults.gossip).toBeDefined();
  });

  it('element / topic rules stay empty — renderer carries styling', () => {
    // Per-tag treatment (StrongSpan = bold, EmSpan = italic, etc.) is
    // baked into the renderer. The theme tables are present for
    // future divergence but stay empty in v1 so per-word markers
    // don't get erased by frame-level claims. Font-by-register adds
    // SIBLING fields (registers / fontRoles), NOT topic/element
    // entries — so this invariant is unaffected.
    expect(DEFAULT_THEME.element).toEqual({});
    expect(DEFAULT_THEME.topic).toEqual({});
  });
});

describe('Both themes expose font registers + role tokens', () => {
  for (const theme of [DEFAULT_THEME, HIGH_CONTRAST_THEME]) {
    describe(theme.name, () => {
      it('declares all three FontRole face stacks', () => {
        for (const role of ['narrative', 'chrome', 'command'] as const) {
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

  it('both themes share the identical register mapping (orthogonal to contrast)', () => {
    expect(HIGH_CONTRAST_THEME.registers).toEqual(DEFAULT_THEME.registers);
    expect(HIGH_CONTRAST_THEME.fontRoles).toEqual(DEFAULT_THEME.fontRoles);
  });
});
