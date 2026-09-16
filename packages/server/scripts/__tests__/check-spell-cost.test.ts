/**
 * The spell-cost gate's own test — ⭐ because **gates ship broken and
 * silently pass**, which is a documented failure in this repo (four gates
 * existed in no pipeline at all and every one passed when finally run).
 *
 * What is pinned is the DESIGN, not just the arithmetic: the check is
 * channel-aware, and a flat `η ≤ 1` over every channel would have been
 * worse than no gate at all — it would have made a heat pump illegal.
 */

import { describe, it, expect } from 'vitest';
import { findingsIn } from '../check-spell-cost';

const SPELL = '/platform/idea/magic/Spell';

const row = (data: Record<string, unknown>) => ({ class: SPELL, data });

const inject = (e: Record<string, unknown>) => ({
  kind: 'inject-channel',
  ...e,
});

describe('check-spell-cost — delivery (η ≤ the channel ceiling)', () => {
  it('⭐⭐ catches the shipped violation: 20 τ against 900 kJ of heat', () => {
    // This is exactly what firebolt authored — η ≈ 45, a wand that
    // returns forty-five times what it costs.
    const out = findingsIn(
      'firebolt.yaml',
      row({ cost: 20, effects: [inject({ channel: 'heat', joules: 900000 })] }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/η ≈ 45/);
    // …and it says what would fix it, in τ.
    expect(out[0]).toMatch(/raise 'cost' to at least 900/);
  });

  it('passes an honest one — 30 τ delivering 30 kJ at η 1.0', () => {
    expect(
      findingsIn(
        'ok.yaml',
        row({
          cost: 30,
          effects: [inject({ channel: 'heat', joules: [15000, 25500, 30000] })],
        }),
      ),
    ).toHaveLength(0);
  });

  it('reads the PEAK of a band array — the blessed band is the ceiling test', () => {
    // A row could otherwise hide a violation in its best band.
    const out = findingsIn(
      'sneaky.yaml',
      row({
        cost: 10,
        effects: [inject({ channel: 'heat', joules: [1000, 2000, 900000] })],
      }),
    );
    expect(out).toHaveLength(1);
  });

  it('a cost of ZERO with real joules is caught, and does not divide by zero', () => {
    const out = findingsIn(
      'free.yaml',
      row({ cost: 0, effects: [inject({ channel: 'heat', joules: 5000 })] }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/∞/);
  });
});

describe('check-spell-cost — cooling is a LIFT, not an efficiency', () => {
  it('⭐⭐ a flat-cost COLD spell is refused — cooling has no fixed price', () => {
    // The design claim. A COP above 1 is what a heat pump MEANS, so an
    // η check on a cold spell would be a category error; what is wrong
    // with a flat-cost cold spell is that its price cannot be flat.
    const out = findingsIn(
      'frost-bad.yaml',
      row({ cost: 4, effects: [inject({ channel: 'cold', joules: 240000 })] }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/heat-pump/);
    expect(out[0]).toMatch(/rule 4/);
  });

  it('⭐ …and one that DECLARES the lift passes, however much it moves', () => {
    // 240 kJ moved on a nominal cost of 4 is not a violation: the real
    // price is computed from the temperature difference at cast time.
    expect(
      findingsIn(
        'frost.yaml',
        row({
          cost: 4,
          costModel: { kind: 'heat-pump' },
          effects: [inject({ channel: 'cold', joules: [60000, 120000, 240000] })],
        }),
      ),
    ).toHaveLength(0);
  });
});

describe('check-spell-cost — what is NOT its jurisdiction', () => {
  it('a row with no `joules` is ignored — twelve of thirteen shipped spells', () => {
    // `energy` is an abstract covering-fold token, not a quantity of
    // anything. Checking it against joules would be the dimensional
    // mistake this gate exists to prevent.
    expect(
      findingsIn(
        'shove.yaml',
        row({ cost: 5, effects: [inject({ channel: 'blunt', energy: 3 })] }),
      ),
    ).toHaveLength(0);
  });

  it('a channel with no argued ceiling is not checked', () => {
    // Deliberate: a new depositing channel should have its η argued in
    // arcane-science.md and added to the table, not silently inherit
    // somebody else's number.
    expect(
      findingsIn(
        'odd.yaml',
        row({ cost: 1, effects: [inject({ channel: 'shock', joules: 999999 })] }),
      ),
    ).toHaveLength(0);
  });

  it('ignores a row that is not a Spell', () => {
    expect(
      findingsIn('thing.yaml', {
        class: '/platform/thing/Thing',
        data: { cost: 1, effects: [inject({ channel: 'heat', joules: 9e9 })] },
      }),
    ).toHaveLength(0);
  });

  it('a spell with no effects at all is fine', () => {
    expect(findingsIn('quiet.yaml', row({ cost: 3 }))).toHaveLength(0);
  });
});
