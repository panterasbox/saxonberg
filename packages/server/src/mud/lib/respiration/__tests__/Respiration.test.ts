/**
 * RespirationMixin acceptance battery — respiration as the first concrete
 * engagement producer and the `spo2` death driver.
 *
 * The crisis drain rides game-time emission timers, so these tests drive
 * the scheduler the way `SchedulerApi.test.ts` does: `setScale(1)` +
 * `_advanceForTesting`. The world clock jumps `nowMs` straight to the
 * target inside one `_advanceForTesting`, so time is advanced in
 * per-emission chunks (`tick`) to give each emission a correct
 * intermediate Δt and to let the breath-hold grace burn realistically.
 *
 * Covers: drown → unconscious → death; recover-on-escape; idle-cost-zero;
 * the water-breather species inversion; the `respires` opt-out.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Character } from '../../character/Character';
import Location from '../../stuff/Location';
import BodyPlan from '../../species/BodyPlan';
import Species from '../../species/Species';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { SchedulerApi } from '../../../api/scheduler';
import { ContainmentApi } from '../../../api/containment';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { RESPIRATION_DEFAULTS } from '../Respiration';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestLocation extends Location {}
// Character is abstract — a concrete body for the harness.
class TestCharacter extends Character {}

const TICK_MS = RESPIRATION_DEFAULTS.EMISSION_INTERVAL_MS;

/** Advance game-time by `n` emission ticks (one emission fires per tick). */
function tick(n = 1): void {
  for (let i = 0; i < n; i++) WorldClockApi._advanceForTesting(TICK_MS);
}

function spo2(c: Character): number {
  return c.getVitalSign('spo2').rawValue();
}

function room(atmosphere: string): TestLocation {
  const r = makeStuff(() => new TestLocation());
  r.setAtmosphere(atmosphere);
  return r;
}

/** A Character whose species body plan carries the given respiration config. */
let speciesSeq = 0;
function bodyWith(config: {
  breathableMedia?: string[];
  respires?: boolean;
}): Character {
  speciesSeq += 1;
  const bp = makeStuffAtPath(
    () => new BodyPlan(),
    `/test/respiration/bodyplan-${speciesSeq}`,
  );
  if (config.breathableMedia) bp.setBreathableMedia(config.breathableMedia);
  if (config.respires !== undefined) bp.setRespires(config.respires);
  const sp = makeStuffAtPath(
    () => new Species(),
    `/test/respiration/species-${speciesSeq}`,
  );
  sp.setBodyPlan(bp);
  const c = makeStuff(() => new TestCharacter());
  c.setSpecies(sp);
  return c;
}

describe('RespirationMixin — the crisis core', () => {
  // The scheduler's register() subscribes to StuffDestructed (the
  // engagement's getHost host-destruction hook) — bootstrap the
  // EventRegistry ONCE (a per-test registry would accumulate, breaking
  // the singleton index). We deliberately never `StuffApi.clearAll()`:
  // that would unregister the lazily-created WorldClockRegistry, breaking
  // `respirationNowSeconds`'s findByTemplatePath probe.
  beforeAll(async () => {
    WorldClockApi._resetForTesting();
    EventApi._clearAllForTesting();
    const reg = await StuffApi.create(() => {
      const r = new EventRegistry();
      Stuff._stampTemplatePath(r, '/obj/EventRegistry');
      return r;
    });
    StuffApi.unregister(reg);
    StuffApi.register(reg);
    EventApi._setRegistryForTesting(reg);
  });

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
    // `_clearAllForTesting` wipes the activity registry; re-register the
    // respiration lifecycle classes (the module side-effect ran once).
  });
  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
  });

  it('drown → unconscious → death', async () => {
    const c = makeStuff(() => new TestCharacter());
    ContainmentApi.move(c, room('water'));

    await c.reassess();
    expect(c.getEngagementByType('respiration-drain')).toBeDefined();

    // Past the breath-hold grace, well into the drain (but above the
    // lethal floor): consciousness flips for free off the falling spo2.
    tick(25);
    expect(spo2(c)).toBeLessThan(70);
    expect(spo2(c)).toBeGreaterThan(RESPIRATION_DEFAULTS.ANOXIA_FLOOR_PCT);
    expect(c.getConsciousness()).toBe('unconscious');
    expect(c.getLifecycleState()).not.toBe('dead');

    // Sustained anoxia opens the DYING window — the clock kills from
    // here, not the threshold, so a rescuer has this long to reach them.
    tick(80);
    expect(c.isDying()).toBe(true);
    expect(c.getLifecycleState()).not.toBe('dead');

    // Nobody comes. (`tick` counts emission intervals, not seconds, and
    // `getLifecycleState` does not reconcile — the band read is what
    // drives the clock forward and resolves the expiry.)
    tick(120);
    expect(c.getConditionBand()).toBe('dead');
    expect(c.getLifecycleState()).toBe('dead');
    expect(c.getCauseOfDeath()).toBe('asphyxiation');
  });

  it('recover-on-escape: reaching air cancels the drain and restores spo2', async () => {
    const c = makeStuff(() => new TestCharacter());
    const water = room('water');
    const air = room('air');
    ContainmentApi.move(c, water);

    await c.reassess();
    tick(25);
    expect(c.getConsciousness()).toBe('unconscious');

    // Escape to breathable air.
    ContainmentApi.move(c, air);
    await c.reassess();
    expect(c.getEngagementByType('respiration-drain')).toBeUndefined();
    expect(c.getEngagementByType('respiration-recovery')).toBeDefined();

    tick(20);
    expect(spo2(c)).toBeCloseTo(c.getVitalBand('spo2').baseline, 5);
    expect(c.getConsciousness()).toBe('conscious');
    // Recovery self-cancels at baseline — benign steady state runs nothing.
    expect(c.getEngagementByType('respiration-recovery')).toBeUndefined();
  });

  it('idle-cost-zero: a body in breathable air engages nothing', async () => {
    const c = makeStuff(() => new TestCharacter());
    ContainmentApi.move(c, room('air'));

    await c.reassess();
    expect(c.getEngagementByType('respiration-drain')).toBeUndefined();
    expect(c.getEngagementByType('respiration-recovery')).toBeUndefined();

    const before = spo2(c);
    tick(50);
    expect(spo2(c)).toBe(before);
    expect(c.getEngagements()).toHaveLength(0);
  });

  it('water-breather inversion: drowns in air, breathes water', async () => {
    const fish = bodyWith({ breathableMedia: ['water'] });

    // Air is hostile to a water-breather.
    ContainmentApi.move(fish, room('air'));
    await fish.reassess();
    expect(fish.getEngagementByType('respiration-drain')).toBeDefined();
    tick(25);
    expect(spo2(fish)).toBeLessThan(70);

    // Submerged, it is fine — the drain cancels, recovery runs.
    ContainmentApi.move(fish, room('water'));
    await fish.reassess();
    expect(fish.getEngagementByType('respiration-drain')).toBeUndefined();
  });

  it('inhale extends the breath-hold so a prepared dive outlasts an unprepared one', async () => {
    const prepared = makeStuff(() => new TestCharacter());
    const unprepared = makeStuff(() => new TestCharacter());

    // The prepared diver takes a breath on dry land first.
    prepared.inhale();
    expect(prepared.isHoldingBreath()).toBe(true);

    ContainmentApi.move(prepared, room('water'));
    ContainmentApi.move(unprepared, room('water'));
    await prepared.reassess();
    await unprepared.reassess();

    // Advance past the automatic grace but within the voluntary hold.
    tick(13);
    expect(spo2(unprepared)).toBeLessThan(98); // auto-grace expired, dropping
    expect(spo2(prepared)).toBe(98); // still holding the deeper breath
  });

  it('exhale clears the hold so the drain resumes draining', async () => {
    const c = makeStuff(() => new TestCharacter());
    c.inhale();
    ContainmentApi.move(c, room('water'));
    await c.reassess();

    tick(3); // within the hold — no drop yet
    expect(spo2(c)).toBe(98);

    c.exhale();
    expect(c.isHoldingBreath()).toBe(false);

    tick(20); // the drain now bites
    expect(spo2(c)).toBeLessThan(70);
  });

  it('respires opt-out: a non-respiring body never engages a drain', async () => {
    const construct = bodyWith({ respires: false });
    ContainmentApi.move(construct, room('water'));

    await construct.reassess();
    expect(construct.getEngagementByType('respiration-drain')).toBeUndefined();

    const before = spo2(construct);
    tick(40);
    expect(spo2(construct)).toBe(before);
    expect(construct.getLifecycleState()).not.toBe('dead');
  });
});
