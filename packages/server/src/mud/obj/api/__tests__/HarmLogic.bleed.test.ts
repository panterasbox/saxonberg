/**
 * HarmLogic wound-tick driver (Phase 1) — the flagship bleed loop.
 *
 * Covers: a bleeding laceration drains `bloodVolume` on the recurring tick
 * (game-time drain), passes through `unconscious`, and kills with cause
 * `'exsanguination'`; the presence-freeze (linkdead + far-past gaps
 * integrate nothing); re-arm-on-hydrate (a restored bleeding body resumes
 * draining, its handle never persisted); and the dressed laceration
 * stopping the drain and healing to clear.
 *
 * The world clock is driven by a manual `real` ms provider (the metabolism
 * clock-freeze harness); the recurring tick fires under fake timers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HarmApi } from '../../../api/harm';
import { Creature } from '../../../lib/creature/Creature';
import { HasInteractiveMixin } from '../../../lib/connection/HasInteractive';
import type Interactive from '../../../obj/Interactive';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  HARM_DEFAULTS,
  TRAUMA_BEHAVIOR,
} from '../../../lib/vitals/Condition';
import type { Trauma } from '../../../lib/vitals/Condition';

class TestBody extends HasInteractiveMixin(Creature) {
  static _mixinName = 'TestBody';
}

/** Game-time provider: real ms; scale 12 → each ms provider-tick is 12 g-s. */
const SCALE = 12;
let real = 0;
const TICK = HARM_DEFAULTS.TICK_INTERVAL_MS;

/** Fire one wound-tick, advancing game-time by one real interval. */
function tick(times = 1): void {
  for (let i = 0; i < times; i++) {
    real += TICK;
    vi.advanceTimersByTime(TICK);
  }
}

const bv = (b: TestBody): number =>
  b.getVitalSign('bloodVolume').rawValue();
const connect = (b: TestBody): void =>
  b.addInteractive({} as unknown as Interactive);
const bleedingLaceration = (severity: number): Trauma => ({
  kind: 'trauma',
  type: 'laceration',
  site: 'body.leg.left.foot',
  severity,
  bleeding: true,
});

describe('HarmLogic wound-tick — bleed → death', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    vi.useFakeTimers();
    WorldClockApi._resetForTesting();
    real = 100_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.useRealTimers();
  });

  it('drains blood, passes through unconscious, then dies of exsanguination', () => {
    const b = makeStuff(() => new TestBody());
    connect(b); // present, not linkdead
    const start = bv(b);

    HarmApi.inflict(b, {
      mechanism: 'sharp',
      site: 'body.leg.left.foot',
      energy: 2,
    });

    tick(2);
    expect(bv(b)).toBeLessThan(start);
    expect(b.getConsciousness()).toBe('conscious');

    // Advance until unconscious (bvFraction < 0.7 → bv < 3.5).
    let guard = 0;
    while (b.getConsciousness() === 'conscious' && guard++ < 50) tick();
    expect(b.getConsciousness()).toBe('unconscious');
    expect(b.getLifecycleState()).not.toBe('dead');

    // Advance to death.
    guard = 0;
    while (b.getLifecycleState() !== 'dead' && guard++ < 50) tick();
    expect(b.getLifecycleState()).toBe('dead');
    expect(b.getCauseOfDeath()).toBe('exsanguination');
    expect(b.getConditionBand()).toBe('dead');
  });

  it('freezes while linkdead (no drain from absence)', () => {
    const b = makeStuff(() => new TestBody()); // no interactive ⇒ linkdead
    expect(b.isLinkdead()).toBe(true);
    HarmApi.inflict(b, {
      mechanism: 'sharp',
      site: 'body.leg.left.foot',
      energy: 2,
    });
    const start = bv(b);
    tick(10);
    expect(bv(b)).toBeCloseTo(start, 6); // frozen — no drain
  });

  it('a far-past gap integrates no drain', () => {
    const b = makeStuff(() => new TestBody());
    connect(b);
    HarmApi.inflict(b, {
      mechanism: 'sharp',
      site: 'body.leg.left.foot',
      energy: 2,
    });
    const start = bv(b);
    // One huge jump past the 4h guard, then a single tick.
    real += (HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC / SCALE) * 1000 + 10_000;
    vi.advanceTimersByTime(TICK);
    expect(bv(b)).toBeCloseTo(start, 6); // gap dropped
  });

  it('re-arms on hydrate: a restored bleeding body resumes draining', () => {
    const b = makeStuff(() => new TestBody());
    connect(b);
    // Simulate a hydrated body: the bleeding trauma persisted, but the
    // transient tick handle did not (nothing armed it).
    b.afflict(bleedingLaceration(2));
    const restored = b.getConditions()[0] as Trauma;
    // The persisted value carries no runtime handle field.
    expect(Object.keys(restored).sort()).toEqual(
      ['bleeding', 'kind', 'severity', 'site', 'type'].sort()
    );

    const start = bv(b);
    tick(3);
    expect(bv(b)).toBeCloseTo(start, 6); // nothing armed → no drain

    HarmApi.rearmWoundTicks(b);
    tick(3);
    expect(bv(b)).toBeLessThan(start); // resumes draining
  });

  it('a dressed laceration stops draining and heals to clear', () => {
    const b = makeStuff(() => new TestBody());
    connect(b);
    HarmApi.inflict(b, {
      mechanism: 'sharp',
      site: 'body.leg.left.foot',
      energy: 1.5,
    });
    tick(2);
    const afterBleed = bv(b);

    // Dress it directly (the verb path lands in Phase 4).
    const wound = b.getConditions()[0] as Trauma;
    TRAUMA_BEHAVIOR.laceration.resolve(b, wound);

    tick(3);
    expect(bv(b)).toBeCloseTo(afterBleed, 6); // bleed arrested

    // Heal to clear — the wound auto-relieves at ~0 severity and disarms.
    let guard = 0;
    while (b.getConditions().length > 0 && guard++ < 200) tick();
    expect(b.getConditions()).toHaveLength(0);
  });
});
