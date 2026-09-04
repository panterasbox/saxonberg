/**
 * The plot lifecycle (W4 / D54–D61) — **land is a maintained state, not
 * a permanent one.**
 *
 * The three claims, and the third is the one nothing else in the build
 * would catch:
 *
 *  1. ⭐ **Newly plotted ground is NOT plantable** (D54). `plot` is step
 *     two of *ground → claim → clear → treat → establish → maintain →
 *     revert*, not the whole ladder.
 *  2. ⭐ **Two plots of different character demand measurably different
 *     work** (D55) — the requirement is the GROUND's, so the player pays
 *     the difference in labour rather than reading it off a modifier.
 *  3. ⭐⭐ **It goes back** (D58). Stop, and the scrub returns first, the
 *     drains silt up later and the lime leaches last — which is what
 *     walking onto an abandoned farm actually looks like, and what puts
 *     derelict holdings in the world as buyable places.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImprovableMixin, IMPROVEMENT_JOBS } from '../Improvable';
import GroundCharacter, { type GroundSample } from '../../idea/GroundCharacter';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

class TestGround extends ImprovableMixin(Idea) {}

const DAY = 86_400;

/** A synthetic sample, so the ground under test is stated not sampled. */
function ground(over: Partial<GroundSample> = {}): GroundSample {
  return {
    texture: 'loam',
    stoniness: 0.1,
    drainage: 0.7,
    slopeDeg: 2,
    aspectDeg: 180,
    topsoilM: 0.3,
    nativePh: 6.5,
    ...over,
  };
}

const bill = (over: Partial<GroundSample> = {}) =>
  GroundCharacter.improvementCost(ground(over));

function make(): TestGround {
  return makeStuff(() => new TestGround());
}

/** Bank enough acts to finish a job, one unit at a time. */
function work(g: TestGround, job: 'clearing' | 'draining' | 'liming', b: ReturnType<typeof bill>): number {
  let acts = 0;
  while (g.progressOn(job, b) < 1 && acts < 200) {
    g.bankWork(job, 1, b);
    acts += 1;
  }
  return acts;
}

describe('the improvement axis', () => {
  it('⭐ newly plotted ground is NOT plantable (D54)', () => {
    const g = make();
    const b = bill();
    expect(g.isPlantable(b)).toBe(false);
    expect(g.improvementBand(b)).toBe('rough');
    work(g, 'clearing', b);
    expect(g.isPlantable(b)).toBe(true);
  });

  it('⭐ the ONLY gate on planting is clearing — sour wet ground is a lesson, not a wall', () => {
    const b = bill({ nativePh: 4.8, drainage: 0.05 });
    const g = make();
    work(g, 'clearing', b);
    // Owes lime and drains, and will still take a crop. A bad one.
    expect(g.owing(b)).toContain('liming');
    expect(g.owing(b)).toContain('draining');
    expect(g.isPlantable(b)).toBe(true);
  });

  it('⭐⭐ two plots of different character demand different work (D55)', () => {
    const kind = bill({ stoniness: 0.02, drainage: 0.75, nativePh: 6.8, slopeDeg: 1 });
    const cruel = bill({ stoniness: 0.85, drainage: 0.1, nativePh: 4.7, slopeDeg: 16 });
    const a = make();
    const b2 = make();
    expect(work(b2, 'clearing', cruel)).toBeGreaterThan(work(a, 'clearing', kind));
    expect(cruel.total).toBeGreaterThan(kind.total * 3);
  });

  it('ground that owes nothing on a job reads FINISHED, not zero', () => {
    // Sweet ground needs no lime. Reporting 0% limed would be a gauge
    // telling the truth about a number and lying about the world.
    const b = bill({ nativePh: 7.0 });
    const g = make();
    expect(b.liming).toBe(0);
    expect(g.progressOn('liming', b)).toBe(1);
    expect(g.owing(b)).not.toContain('liming');
  });

  it('⚠ the weakest link decides the band, never the mean', () => {
    const b = bill({ nativePh: 4.5, drainage: 0.1, stoniness: 0.5 });
    const g = make();
    work(g, 'draining', b);
    work(g, 'liming', b);
    // Beautiful drains, sweet soil, and a thicket on it. Rough.
    expect(g.improvementBand(b)).toBe('rough');
    expect(g.improvementCause(b)).toBe('there is scrub on it yet');
  });

  it('⭐⭐ the band phrases are percepts and every one is distinct (D86)', () => {
    const b = bill();
    const g = make();
    // ⭐ Reached through the real transitions rather than read off a
    // table, so the vocabulary and the machine are asserted to agree.
    const seen = new Set<string>();
    seen.add(g.improvementPhrase(b));
    work(g, 'draining', b);
    work(g, 'liming', b);
    g.bankWork('clearing', (b.clearing + b.stonePicking) * 0.5, b);
    seen.add(g.improvementPhrase(b));
    work(g, 'clearing', b);
    seen.add(g.improvementPhrase(b));
    expect(seen.size).toBe(3);
    for (const p of seen) expect(p).not.toMatch(/\d/);
  });

  it('⭐ wildness is the complement of clearing — D61 falls out for free', () => {
    const b = bill();
    const g = make();
    expect(g.wildness(b)).toBe(1);
    g.bankWork('clearing', (b.clearing + b.stonePicking) / 2, b);
    expect(g.wildness(b)).toBeCloseTo(0.5, 2);
    work(g, 'clearing', b);
    expect(g.wildness(b)).toBe(0);
  });

  it('the ground affords its own acts — a static on the class, not a row', () => {
    // ⚠ A row's `commandContributions:` is dead silently.
    const verbs = CommandApi.collectContributions(TestGround, 'self')
      .map((d) => d.verbs)
      .flat();
    for (const v of ['grub', 'ditch', 'lime', 'forage']) expect(verbs).toContain(v);
  });
});

describe('⭐⭐ it goes back (D58)', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  beforeEach(() => {
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const advance = (gameDays: number): void => {
    clock.mockReturnValue(Quantity.of(base + gameDays * DAY, 's'));
  };

  it('a field left alone reverts — a SLOPE, never a cliff (D45)', () => {
    const b = bill();
    const g = make();
    for (const job of IMPROVEMENT_JOBS) work(g, job, b);
    expect(g.improvementBand(b)).toBe('in-heart');

    advance(30);
    const after30 = g.progressOn('clearing', b);
    expect(after30).toBeLessThan(1);
    // ⚠ A month of neglect must not erase a season's work.
    expect(after30).toBeGreaterThan(0.8);
  });

  it('⭐ the SCRUB comes back first, and the lime leaches last', () => {
    const b = bill({ nativePh: 5.0, drainage: 0.2 });
    const g = make();
    for (const job of IMPROVEMENT_JOBS) work(g, job, b);
    advance(120);
    // The ordering IS the lesson, and it is the real one: a derelict farm
    // reads as *wild again* long before it reads as *sour again*.
    expect(g.progressOn('clearing', b)).toBeLessThan(g.progressOn('draining', b));
    expect(g.progressOn('draining', b)).toBeLessThan(g.progressOn('liming', b));
  });

  it('⭐ reverted ground is FORAGEABLE again — the derelict farm’s second life', () => {
    const b = bill();
    const g = make();
    work(g, 'clearing', b);
    expect(g.wildness(b)).toBe(0);
    advance(400);
    expect(g.wildness(b)).toBeGreaterThan(0.5);
  });

  it('⚠ reversion has NO far-past guard — land reverts over the whole absence', () => {
    // The family clock's guard is for the INHABITED BODY alone. A herd or
    // a field inheriting it would gain nothing across any absence longer
    // than lunch, and a derelict holding could never come to exist.
    const b = bill();
    const g = make();
    work(g, 'clearing', b);
    advance(2_000);
    expect(g.progressOn('clearing', b)).toBe(0);
  });
});
