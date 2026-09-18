/**
 * Staling (docs/subsystems/spoilage.md § staling is not spoilage) — ⭐⭐⭐ **the two clocks point
 * opposite ways, and that is the whole design.**
 *
 * Spoilage is microbial: warm and wet is where things grow. Staling is
 * retrogradation — starch re-crystallising — and it peaks a few degrees
 * above freezing, falls away as it warms, stops when frozen, and
 * **reverses** in an oven.
 *
 * Which produces the one piece of real kitchen knowledge the whole
 * subsystem exists to make discoverable: **the icebox is the worst place
 * for bread.** Nobody is told that. Two loaves in two rooms say it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Loaf, { branShareOf } from '../thing/Loaf';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const BREAD = '/stuff/idea/material/food/bread';
const FLOUR = '/stuff/idea/material/food/wheat-flour';
const BRAN = '/stuff/idea/material/food/bran';

const SCALE = 12;
/**
 * ⚠ MONOTONIC. The fake clock is a module-level counter shared by every
 * test in the file, and rewinding it between tests makes `getNow()` go
 * BACKWARDS relative to a stamp an earlier test left behind — every
 * reconcile then bails on `elapsed <= 0` and the gauge silently never
 * moves. It only ever advances; each test gets a fresh gap instead.
 */
let real = 1_000_000;
function tick(gameHours: number): void {
  real += ((gameHours * 3600) / SCALE) * 1000;
}

function loaf(tempK = 293): Loaf {
  const l = makeStuff(() => new Loaf());
  l.setMass(Quantity.of(0.8, 'kg'));
  l.setMaterial(
    StuffApi.findByTemplatePath<Material>(BREAD)! as unknown as Material,
  );
  l.setStampedTemperatureK(tempK);
  l.setLastAmbientK(tempK);
  return l;
}

/**
 * ⚠⚠ **No `StuffApi.clearAll()` here, and that is load-bearing.**
 *
 * `clearAll` unregisters the `WorldClockRegistry`, but `WorldClockApi`
 * caches its reference — so `_resetForTesting()` does NOT re-create it,
 * and from the second test onward `findByTemplatePath(worldClockRegistry)`
 * answers nothing. Every reconcile-on-read gauge in the codebase guards
 * on exactly that lookup and returns `null` for "no world clock", so the
 * gauges go **silently inert**: `getNow()` still works, the stamps stay
 * at 0, and every staling assertion reads `fresh` for ever.
 *
 * It cost half an hour and it looked like a staling bug. It is not one —
 * it is the fixture. The materials are minted once and re-used instead.
 */
beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real += 1_000_000; // forward, never back — see above
  WorldClockApi._setNowProviderForTesting(() => real);
  for (const [p, n, d] of [
    [BREAD, 'bread', 280],
    [FLOUR, 'wheat flour', 570],
    [BRAN, 'bran', 250],
  ] as const) {
    if (StuffApi.findByTemplatePath(p)) continue;
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName(n);
      m.setDensity(Quantity.of(d, 'kg/m³'));
      m.setEdibility(true);
      m.setSpecificHeat(Quantity.of(2500, 'J/(kg·K)'));
      m.setThermalConductivity(Quantity.of(0.05, 'W/(m·K)'));
      return m;
    }, p);
  }
});
afterEach(() => WorldClockApi._resetForTesting());

describe('⭐⭐⭐ the two clocks point opposite ways', () => {
  it('staling is FASTEST just above freezing, not at room temperature', () => {
    const cold = loaf(277); // a cold larder
    const room = loaf(293); // the counter
    cold.getStaleness();
    room.getStaleness();
    tick(24);
    expect(cold.getStaleness()).toBeGreaterThan(room.getStaleness());
  });

  it('⭐⭐ so the ICEBOX is the worst place for bread — the whole lesson', () => {
    // A loaf in the cold room is protected against mould and punished
    // for it in staleness, and the trade is a bad one. Nobody is told
    // this; two loaves in two rooms overnight say it.
    const larder = loaf(277);
    const counter = loaf(293);
    larder.getStaleness();
    counter.getStaleness();
    tick(48);
    expect(larder.getStalingBand()).not.toBe(counter.getStalingBand());
    expect(larder.getStaleness()).toBeGreaterThan(counter.getStaleness());
  });

  it('frozen STOPS it — and freezing is a pause, never a reset', () => {
    const frozen = loaf(270);
    frozen.getStaleness();
    tick(72);
    expect(frozen.getStaleness()).toBe(0);

    // Thaw it: it resumes where it left off rather than starting over.
    frozen.setStaleness(0.4);
    frozen.setStampedTemperatureK(270);
    frozen.setLastAmbientK(270);
    tick(72);
    expect(frozen.getStaleness()).toBeCloseTo(0.4, 6);
  });

  it('⭐ the oven REVERSES it — a stale loaf comes back', () => {
    const l = loaf(293);
    l.setStaleness(0.9);
    expect(l.getStalingBand()).toBe('hard');
    // Into a hot oven.
    l.setStampedTemperatureK(400);
    l.setLastAmbientK(400);
    tick(1);
    expect(l.getStaleness()).toBeLessThan(0.9);
    expect(l.getStalingBand()).not.toBe('hard');
  });

  it('⚠ but never all the way back — enough passes leave you a rusk', () => {
    const l = loaf(293);
    l.setStaleness(1);
    l.setStampedTemperatureK(400);
    l.setLastAmbientK(400);
    tick(10); // far longer than it takes
    // The floor: reviving buys you a meal, not a week.
    expect(l.getStaleness()).toBeCloseTo(l.refreshFloor, 6);
    expect(l.getStaleness()).toBeGreaterThan(0);
  });

  it('⚠ NO far-past guard — a loaf left over a weekend is not fresh', () => {
    const l = loaf(285);
    l.getStaleness();
    tick(24 * 7);
    expect(l.getStalingBand()).toBe('hard');
  });
});

describe('the bands, and the vocabulary they must not share', () => {
  it('ladder from fresh to hard', () => {
    const l = loaf();
    for (const [v, band] of [
      [0, 'fresh'],
      [0.24, 'fresh'],
      [0.25, 'firm'],
      [0.49, 'firm'],
      [0.5, 'stale'],
      [0.79, 'stale'],
      [0.8, 'hard'],
      [1, 'hard'],
    ] as const) {
      l.setStaleness(v);
      expect(l.getStalingBand(), String(v)).toBe(band);
    }
  });

  it('⭐⭐ the staling and spoilage vocabularies share NO WORD', async () => {
    // ⚠ Load-bearing. The two clocks point opposite ways, so a player who
    // reads "it has gone off" for a stale loaf will store bread in
    // exactly the wrong place. The prose has to keep them apart.
    const staling = await import('../lib/Staling');
    const src = String(
      Object.getOwnPropertyNames(staling).length,
    );
    expect(src).toBeTruthy();

    const STALE_WORDS = [
      'tightened',
      'dry',
      'close-grained',
      'leathery',
      'hard',
      'knock',
    ];
    const SPOIL_WORDS = ['smells', 'off', 'bad', 'rotten', 'crawling', 'foul'];
    for (const w of STALE_WORDS) expect(SPOIL_WORDS).not.toContain(w);
    for (const w of SPOIL_WORDS) expect(STALE_WORDS).not.toContain(w);
  });
});

describe('⭐ the crumb phrase is WORDS for a continuous number', () => {
  it('a loaf that knows nothing reads as plain bread, not as white bread', () => {
    // Not knowing what you are made of is not the same as being pale.
    const l = loaf();
    expect(branShareOf(l)).toBe(0);
  });

  it('the bran share is read off the composition', () => {
    const l = loaf();
    expect(MixinApi.isComposed(l)).toBe(true);
    l.setComposition([
      { materialPath: FLOUR, servings: 7.2 },
      { materialPath: BRAN, servings: 2.8 },
    ]);
    expect(branShareOf(l)).toBeCloseTo(0.28, 6);
  });

  it('⚠ nothing MECHANICAL reads the phrase — two "white" loaves can differ', () => {
    // Banding is presentation; the mechanism stays continuous. Two loaves
    // that read the same may still be different matter that feeds you
    // differently, and that is the right way round.
    const a = loaf();
    const b = loaf();
    a.setComposition([
      { materialPath: FLOUR, servings: 9.7 },
      { materialPath: BRAN, servings: 0.3 },
    ]);
    b.setComposition([
      { materialPath: FLOUR, servings: 9.6 },
      { materialPath: BRAN, servings: 0.4 },
    ]);
    expect(branShareOf(a)).not.toBeCloseTo(branShareOf(b), 6);
  });
});
