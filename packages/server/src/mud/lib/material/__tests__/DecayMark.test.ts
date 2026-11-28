/**
 * DecayMark — the closed vocabulary of decay (decomposition W0, D2): five
 * mechanisms, their ordered bands, and what a band does to a part — the
 * ceiling it caps condition at, the metal it has cost, whether it IS
 * failure, what clears it, and `look`'s words.
 */
import { describe, it, expect } from 'vitest';
import { DECAY_MECHANISMS, DecayMark, DecayScale } from '../DecayMark';

describe('DecayScale — a mechanism’s ladder', () => {
  it('the five mechanisms, each an ordered ladder', () => {
    expect([...DECAY_MECHANISMS]).toEqual(['corrosion', 'rot', 'mold', 'frost', 'fade']);
    expect(new DecayScale('corrosion').bands()).toEqual(['bloom', 'flaking', 'pitted', 'eaten through']);
    expect(new DecayScale('rot').bands()).toEqual(['soft', 'punky', 'rotted through']);
    expect(new DecayScale('mold').bands()).toEqual(['spotted', 'furred']);
    expect(new DecayScale('frost').bands()).toEqual(['crazed', 'spalled', 'crumbled']);
    expect(new DecayScale('fade').bands()).toEqual(['faded', 'bleached']);
  });

  it('refuses a word that is not a mechanism, naming the real ones', () => {
    expect(() => new DecayScale('woodworm')).toThrow(/'woodworm' is not a decay mechanism.*corrosion/);
  });

  it('bandAt: the last band whose threshold the progress reaches', () => {
    const c = new DecayScale('corrosion');
    expect(c.bandAt(0)).toBeNull();
    expect(c.bandAt(0.09)).toBeNull();
    expect(c.bandAt(0.1)).toBe('bloom');
    expect(c.bandAt(0.45)).toBe('flaking');
    expect(c.bandAt(0.84)).toBe('pitted');
    expect(c.bandAt(4)).toBe('eaten through');
    expect(c.bandAt(Number.NaN)).toBeNull();
  });

  it('frost is authored only — a history reaches none of its bands', () => {
    const f = new DecayScale('frost');
    expect(f.isDerivable()).toBe(false);
    expect(f.bandAt(100)).toBeNull();
    expect(new DecayScale('rot').isDerivable()).toBe(true);
  });
});

describe('DecayMark — what a band does', () => {
  it('a band of another mechanism is refused', () => {
    expect(() => new DecayMark({ mechanism: 'rot', band: 'pitted' })).toThrow(
      /'pitted' is not a band of rot/,
    );
  });

  it('corrosion caps lower and costs more metal as it goes, and its last band is failure', () => {
    const bands = new DecayScale('corrosion').bands().map((b) => new DecayScale('corrosion').mark(b));
    const ceilings = bands.map((m) => m.ceiling());
    const lost = bands.map((m) => m.lostShare());
    expect(ceilings).toEqual([...ceilings].sort((a, b) => b - a));
    expect(lost).toEqual([...lost].sort((a, b) => a - b));
    expect(bands.map((m) => m.isFailure())).toEqual([false, false, false, true]);
    expect(bands[3]!.ceiling()).toBe(0);
  });

  it('rot and frost end in failure; mold and fade never fail a part', () => {
    expect(new DecayMark({ mechanism: 'rot', band: 'rotted through' }).isFailure()).toBe(true);
    expect(new DecayMark({ mechanism: 'frost', band: 'crumbled' }).isFailure()).toBe(true);
    for (const band of ['spotted', 'furred'] as const) {
      expect(new DecayMark({ mechanism: 'mold', band }).isFailure()).toBe(false);
    }
    for (const band of ['faded', 'bleached'] as const) {
      const m = new DecayMark({ mechanism: 'fade', band });
      expect(m.isFailure()).toBe(false);
      expect(m.ceiling()).toBe(1);
    }
  });

  it('a punky haft sits below the broken line’s next blows', () => {
    // 0.15 ceiling: three 0.02 blows take it past the 0.1 broken line (D14).
    expect(new DecayMark({ mechanism: 'rot', band: 'punky' }).ceiling()).toBeCloseTo(0.15);
  });

  it('only corrosion costs metal', () => {
    expect(new DecayMark({ mechanism: 'corrosion', band: 'pitted' }).lostShare()).toBeGreaterThan(0);
    expect(new DecayMark({ mechanism: 'rot', band: 'punky' }).lostShare()).toBe(0);
    expect(new DecayMark({ mechanism: 'frost', band: 'spalled' }).lostShare()).toBe(0);
  });

  it('what clears it: scouring takes scale, any brush takes mold, dye takes fade, nothing takes pits', () => {
    expect(new DecayMark({ mechanism: 'corrosion', band: 'bloom' }).clearedBy()).toBe('scouring');
    expect(new DecayMark({ mechanism: 'corrosion', band: 'flaking' }).clearedBy()).toBe('scouring');
    const pitted = new DecayMark({ mechanism: 'corrosion', band: 'pitted' });
    expect(pitted.clearedBy()).toBeNull();
    expect(pitted.isScourable()).toBe(true);
    expect(new DecayMark({ mechanism: 'mold', band: 'furred' }).clearedBy()).toBe('brushing');
    expect(new DecayMark({ mechanism: 'fade', band: 'faded' }).clearedBy()).toBe('dye');
    expect(new DecayMark({ mechanism: 'rot', band: 'soft' }).clearedBy()).toBeNull();
  });

  it('a scoured pitting keeps its pits and reads brushed; scoured means nothing on another band', () => {
    const scoured = new DecayMark({ mechanism: 'corrosion', band: 'pitted', scoured: true });
    expect(scoured.isScoured()).toBe(true);
    expect(scoured.isScourable()).toBe(false);
    expect(scoured.ceiling()).toBe(new DecayMark({ mechanism: 'corrosion', band: 'pitted' }).ceiling());
    expect(scoured.phrase('rust')).toBe('is pitted, the rust brushed out of it');
    const bloom = new DecayMark({ mechanism: 'corrosion', band: 'bloom', scoured: true });
    expect(bloom.isScoured()).toBe(false);
    expect(bloom.record()).toEqual({ mechanism: 'corrosion', band: 'bloom' });
  });

  it('phrases are worded by the material’s own product', () => {
    expect(new DecayMark({ mechanism: 'corrosion', band: 'pitted' }).phrase('rust')).toBe('is pitted with rust');
    expect(new DecayMark({ mechanism: 'corrosion', band: 'bloom' }).phrase('verdigris')).toBe('has a bloom of verdigris');
    expect(new DecayMark({ mechanism: 'corrosion', band: 'eaten through' }).phrase('tarnish')).toBe('eaten through with tarnish');
    // The eye cannot tell punky from soft.
    expect(new DecayMark({ mechanism: 'rot', band: 'punky' }).phrase('')).toBe('has gone soft');
    expect(new DecayMark({ mechanism: 'rot', band: 'soft' }).phrase('')).toBe('has gone soft');
    expect(new DecayMark({ mechanism: 'mold', band: 'furred' }).phrase('')).toBe('is furred with mold');
  });
});
