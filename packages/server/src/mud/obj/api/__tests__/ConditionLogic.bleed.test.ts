/**
 * VitalsMixin wound reconcile-on-read (the harm driver) — the flagship
 * bleed loop.
 *
 * Covers: a bleeding laceration drains `bloodVolume` as game-time is read
 * forward (reconcile-on-read, not a push tick), passes through
 * `unconscious`, and kills with cause `'exsanguination'`; the
 * presence-freeze (linkdead + far-past gaps integrate nothing);
 * progression resuming across a simulated reload from the persisted
 * `tickedAt` stamp (no re-arm seam); the dressed laceration stopping the
 * drain and healing to clear; and undress re-opening a bleed.
 *
 * The world clock is driven by a manual `real` ms provider (the metabolism
 * clock-freeze harness). Progression is driven by READING the body
 * (`getConditionBand` / `getVitalSign` / `getConsciousness`) after
 * advancing the clock — there is no recurring tick.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConditionApi } from '../../../api/condition';
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

/** Game-time provider: real ms; DEFAULT_SCALE 12 → 12 game-s per real-s. */
const SCALE = 12;
let real = 0;
const TICK = HARM_DEFAULTS.TICK_INTERVAL_MS;

const bv = (b: TestBody): number =>
  b.getVitalSign('bloodVolume').rawValue();
const connect = (b: TestBody): void =>
  b.addInteractive({} as unknown as Interactive);
const gameNow = (): number => WorldClockApi.getNow().rawValue();
const bleedingLaceration = (severity: number, tickedAt?: number): Trauma => ({
  kind: 'trauma',
  type: 'laceration',
  site: 'body.leg.left.foot',
  severity,
  bleeding: true,
  ...(tickedAt !== undefined ? { tickedAt } : {}),
});

/** Advance game-time one interval and READ the body to drive reconcile. */
function tick(b: TestBody, times = 1): void {
  for (let i = 0; i < times; i++) {
    real += TICK;
    b.getConditionBand(); // a read drives reconcile-on-read
  }
}

describe('VitalsMixin wound reconcile — bleed → death', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('drains blood, passes through unconscious, then dies of exsanguination', () => {
    const b = makeStuff(() => new TestBody());
    connect(b); // present, not linkdead
    const start = bv(b);

    ConditionApi.inflict(b, {
      mechanism: 'edge',
      site: 'body.leg.left.foot',
      energy: 2,
    });

    tick(b, 2);
    expect(bv(b)).toBeLessThan(start);
    expect(b.getConsciousness()).toBe('conscious');

    // Advance until unconscious (bvFraction < 0.7 → bv < 3.5).
    let guard = 0;
    while (b.getConsciousness() === 'conscious' && guard++ < 50) tick(b);
    expect(b.getConsciousness()).toBe('unconscious');
    expect(b.getLifecycleState()).not.toBe('dead');

    // Advance to death.
    guard = 0;
    while (b.getLifecycleState() !== 'dead' && guard++ < 50) tick(b);
    expect(b.getLifecycleState()).toBe('dead');
    expect(b.getCauseOfDeath()).toBe('exsanguination');
    expect(b.getConditionBand()).toBe('dead');
  });

  it('freezes while linkdead (no drain from absence)', () => {
    const b = makeStuff(() => new TestBody()); // no interactive ⇒ linkdead
    expect(b.isLinkdead()).toBe(true);
    ConditionApi.inflict(b, {
      mechanism: 'edge',
      site: 'body.leg.left.foot',
      energy: 2,
    });
    const start = bv(b);
    tick(b, 10);
    expect(bv(b)).toBeCloseTo(start, 6); // frozen — no drain
  });

  it('a far-past gap integrates no drain', () => {
    const b = makeStuff(() => new TestBody());
    connect(b);
    ConditionApi.inflict(b, {
      mechanism: 'edge',
      site: 'body.leg.left.foot',
      energy: 2,
    });
    const start = bv(b);
    // One huge jump past the 4h guard, then a single read.
    real += (HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC / SCALE) * 1000 + 10_000;
    expect(bv(b)).toBeCloseTo(start, 6); // gap dropped
  });

  it('resumes across a simulated reload from the persisted tickedAt stamp', () => {
    const b = makeStuff(() => new TestBody());
    connect(b);
    // Simulate a hydrated body: the bleeding trauma persisted (carrying its
    // game-time `tickedAt` stamp), with no in-memory tick state armed —
    // nothing re-arms it. The next read reconciles from the stamp.
    b.afflict(bleedingLaceration(2, gameNow()));
    const start = bv(b);
    tick(b, 3);
    expect(bv(b)).toBeLessThan(start); // resumed from the stamp, no re-arm
  });

  it('a dressed laceration stops draining and heals to clear', () => {
    const b = makeStuff(() => new TestBody());
    connect(b);
    ConditionApi.inflict(b, {
      mechanism: 'edge',
      site: 'body.leg.left.foot',
      energy: 1.5,
    });
    tick(b, 2);
    const afterBleed = bv(b);

    // Dress it directly (the verb path is exercised in the integration test).
    const wound = b.getConditions()[0] as Trauma;
    TRAUMA_BEHAVIOR.laceration.resolve(b, wound);

    tick(b, 3);
    expect(bv(b)).toBeCloseTo(afterBleed, 6); // bleed arrested

    // Heal to clear — the wound auto-relieves at ~0 severity.
    let guard = 0;
    while (b.getConditions().length > 0 && guard++ < 200) tick(b);
    expect(b.getConditions()).toHaveLength(0);
  });

  it('undress re-opens a clot-eligible bleed, which drains again on read', () => {
    const b = makeStuff(() => new TestBody());
    connect(b);
    ConditionApi.inflict(b, {
      mechanism: 'edge',
      site: 'body.leg.left.foot',
      energy: 2,
    });
    tick(b, 1);

    // Dress → arrest the bleed.
    const wound = b.getConditions()[0] as Trauma;
    TRAUMA_BEHAVIOR.laceration.resolve(b, wound);
    const dressed = bv(b);
    tick(b, 1); // one dressed step — clot begins but severity stays > clot
    expect(bv(b)).toBeCloseTo(dressed, 6); // arrested — no drain while dressed
    expect(wound.severity).toBeGreaterThan(HARM_DEFAULTS.CLOT_SEVERITY);

    // Premature undress (severity still > clot) re-opens the bleed.
    TRAUMA_BEHAVIOR.laceration.reopen(b, wound);
    expect(wound.bleeding).toBe(true);
    const reopened = bv(b);
    tick(b, 2);
    expect(bv(b)).toBeLessThan(reopened); // draining again on read
  });
});
