/**
 * LandingContest (fishing D5) — **pure arithmetic, no randomness**, and
 * the lesson the dials are seeded to teach: give when it runs, gain when
 * it rests.
 */

import { describe, it, expect } from 'vitest';
import { LandingContest, CONTEST_DEFAULTS } from '../lib/LandingContest';

describe('the contest', () => {
  it('⭐ two reels inside one tick at full stamina SNAP a fighter', () => {
    const c = new LandingContest(1);
    expect(c.reel()).toBe('fighting');
    expect(c.reel()).toBe('snapped');
  });

  it('⭐ a patient alternation lands one in four to eight ticks', () => {
    const c = new LandingContest(1);
    let ticks = 0;
    let outcome = c.getOutcome();
    while (outcome === 'fighting' && ticks < 20) {
      // Gain when it rests (low strain), give when it runs (high strain).
      outcome = c.strain > 0.5 ? c.slack() : c.reel();
      if (outcome !== 'fighting') break;
      outcome = c.tick();
      ticks += 1;
    }
    expect(outcome).toBe('landed');
    expect(ticks).toBeGreaterThanOrEqual(4);
    expect(ticks).toBeLessThanOrEqual(8);
    // The policy is the lesson, and a full fighter takes the longest.
    const small = new LandingContest(0.5);
    let n = 0;
    let o = small.getOutcome();
    while (o === 'fighting' && n < 20) {
      o = small.strain > 0.5 ? small.slack() : small.reel();
      if (o !== 'fighting') break;
      o = small.tick();
      n += 1;
    }
    expect(o).toBe('landed');
    expect(n).toBeLessThanOrEqual(ticks);
  });

  it('a line left slack two ticks running is thrown', () => {
    const c = new LandingContest(0.5);
    c.slack();
    expect(c.strain).toBe(0);
    expect(c.tick()).toBe('fighting'); // slack once: counted
    // The fish pulled a little; slack it off again and it is thrown.
    c.slack();
    expect(c.tick()).toBe('thrown');
  });

  it('a reel between resets the slack count', () => {
    const c = new LandingContest(0.5);
    c.slack();
    c.tick();
    c.reel();
    c.slack();
    expect(c.tick()).toBe('fighting');
  });

  it('a small fish tires out under steady reeling and lands', () => {
    const c = new LandingContest(0.5);
    let outcome = c.getOutcome();
    for (let i = 0; i < 12 && outcome === 'fighting'; i++) {
      outcome = c.strain > 0.6 ? c.slack() : c.reel();
      if (outcome === 'fighting') outcome = c.tick();
    }
    expect(outcome).toBe('landed');
  });

  it('is a pure function of its inputs — the same moves, the same outcome', () => {
    const play = () => {
      const c = new LandingContest(0.8, CONTEST_DEFAULTS);
      const trace: string[] = [];
      for (let i = 0; i < 10; i++) {
        trace.push(i % 3 === 0 ? c.slack() : c.reel());
        trace.push(c.tick());
      }
      return trace.join(',');
    };
    expect(play()).toBe(play());
  });

  it('an ended contest stays ended', () => {
    const c = new LandingContest(1);
    c.reel();
    c.reel();
    expect(c.getOutcome()).toBe('snapped');
    expect(c.slack()).toBe('snapped');
    expect(c.tick()).toBe('snapped');
  });
});
