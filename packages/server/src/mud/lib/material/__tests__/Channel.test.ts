import { describe, it, expect } from 'vitest';
import {
  CHANNELS,
  MECHANICAL_CHANNELS,
  THERMAL_CHANNELS,
  Channels,
} from '../Channel';
import type { Channel } from '../Channel';

describe('Channel vocabulary', () => {
  it('ships seven — three mechanical, two thermal, one electrical, one chemical', () => {
    expect([...CHANNELS]).toEqual([
      'edge',
      'point',
      'blunt',
      'shock',
      'heat',
      'cold',
      'corrosion',
    ]);
  });

  it('⭐⭐ THERMAL is both directions — one fold, two wounds', () => {
    // An insulator resists a temperature DIFFERENCE, so heat and cold
    // share the insulation arithmetic exactly and differ only in the
    // wound they name (`burn` vs `frostbite`). Two folds would drift.
    expect([...THERMAL_CHANNELS]).toEqual(['heat', 'cold']);
    expect(Channels.isThermalChannel('cold')).toBe(true);
  });

  it('⭐⭐ FOLDED is everything that walks the covering stack — and not shock', () => {
    // The set the legibility surfaces iterate. `shock` is excluded
    // because it resolves by CIRCUIT: the conduction walk divides current
    // toward ground upstream, so it never consults the stack at all —
    // which is the whole reason this set exists rather than CHANNELS.
    expect([...Channels.FOLDED]).toEqual([
      'edge',
      'point',
      'blunt',
      'heat',
      'cold',
      'corrosion',
    ]);
    expect(Channels.FOLDED).not.toContain('shock');
  });

  it('corrosion is its own fold — neither mechanical nor thermal', () => {
    expect(Channels.isChannel('corrosion')).toBe(true);
    expect(Channels.isMechanicalChannel('corrosion')).toBe(false);
    expect(Channels.isThermalChannel('corrosion')).toBe(false);
  });

  it('the mechanical subset is edge / point / blunt (shock excluded)', () => {
    expect([...MECHANICAL_CHANNELS]).toEqual(['edge', 'point', 'blunt']);
    expect(Channels.MECHANICAL).toEqual(MECHANICAL_CHANNELS);
    expect(Channels.isMechanicalChannel('shock')).toBe(false);
    expect(Channels.isChannel('shock')).toBe(true);
  });

  it('Channels.ALL mirrors CHANNELS', () => {
    expect(Channels.ALL).toEqual(CHANNELS);
  });

  it('isChannel narrows a valid string', () => {
    for (const c of CHANNELS) {
      expect(Channels.isChannel(c)).toBe(true);
    }
    // Compile-time narrowing check: inside the guard, `s` is Channel.
    const s: string = 'edge';
    if (Channels.isChannel(s)) {
      const narrowed: Channel = s;
      expect(narrowed).toBe('edge');
    }
  });

  it('isChannel rejects non-members', () => {
    for (const bad of ['thermal', 'crush', '', 'Edge', 'slash']) {
      expect(Channels.isChannel(bad)).toBe(false);
    }
  });
});
