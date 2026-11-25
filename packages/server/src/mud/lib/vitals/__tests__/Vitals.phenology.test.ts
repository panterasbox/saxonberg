/**
 * ⭐⭐ Phenology — a body's seasons are conditions on a schedule
 * (organism-biology D9, W7).
 *
 * The species declares `phenology`: each entry a condition and a trigger,
 * a conjunction of the terms it authors (a daylength band or the species'
 * own `breeding` season, a core temperature, sex, stage, entire). The
 * body carries the condition while the trigger holds and is relieved when
 * it stops — through the shipped `afflict` / `relieve`, from ONE place
 * (the thermal reconcile, or a daylight pin's fan-out), never from a read.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import type { PhenologyEntry } from '../../../platform/idea/species/Species';
import { CelestialApi } from '../../../api/celestial';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { standShippedConditions } from './conditions';
import { Quantity } from '../../quantity';

const IN_SEASON = '/platform/idea/Condition/reproduction/in-season';
const RUT = '/platform/idea/Condition/reproduction/rut';
const DENNING = '/platform/idea/Condition/dormancy/denning';
const LACTATING = '/platform/idea/Condition/reproduction/lactating';

const SCHEDULE: PhenologyEntry[] = [
  { condition: IN_SEASON, trigger: { season: 'breeding', sex: 'female', stage: 'adult' } },
  { condition: RUT, trigger: { season: 'breeding', sex: 'male', stage: 'adult', entire: true } },
  { condition: DENNING, trigger: { daylightFrom: 0, daylightTo: 0.42, coreBelowK: 283 } },
  { condition: LACTATING, trigger: { event: true, sex: 'female' } },
];

let seq = 0;
function species(): Species {
  return makeStuffAtPath(() => {
    const s = new Species();
    s.setSexDeterminationSystem('xy');
    s.setAgeCurve({ weanedAt: 60, matureAt: 400, agedAt: 4000, senescentAt: 6000 });
    s.setBreeding({ daylightFrom: 0, daylightTo: 0.44, gestationDays: 150, litter: 1 });
    s.applyPhenology(SCHEDULE);
    return s;
  }, `/stuff/idea/species/_test/phenology-${seq++}`);
}

function body(sex: 'male' | 'female', ageDays = 900): Creature {
  const c = makeStuff(() => new Creature());
  c.setSpecies(species());
  c.setSex(sex);
  c.setAge(ageDays);
  return c;
}

const carries = (c: Creature, path: string): boolean =>
  c.getConditions().some((x) => x.kind === 'affliction' && x.templatePath === path);

describe('phenology — the seasons on the body', () => {
  beforeEach(async () => {
    await standShippedConditions();
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 10_000_000_000);
  });
  afterEach(() => {
    CelestialApi.pinDaylightFraction(null);
    WorldClockApi._resetForTesting();
  });

  it('⭐⭐ a mature female in her breeding band is in season — and out of it, relieved', () => {
    const ewe = body('female');
    CelestialApi.pinDaylightFraction(0.4); // short days: her season
    ewe.reconcilePhenology();
    expect(carries(ewe, IN_SEASON)).toBe(true);
    CelestialApi.pinDaylightFraction(0.6); // long days
    ewe.reconcilePhenology();
    expect(carries(ewe, IN_SEASON)).toBe(false);
  });

  it('⭐ a mature male ruts in the season; a lamb does not', () => {
    CelestialApi.pinDaylightFraction(0.4);
    const ram = body('male');
    ram.reconcilePhenology();
    expect(carries(ram, RUT)).toBe(true);
    expect(carries(ram, IN_SEASON)).toBe(false);
    const lamb = body('male', 30);
    lamb.reconcilePhenology();
    expect(carries(lamb, RUT)).toBe(false);
  });

  it('⭐ denning is short days AND a cold core — both terms, or none', () => {
    const frog = body('female');
    CelestialApi.pinDaylightFraction(0.3);
    frog.reconcilePhenology();
    expect(carries(frog, DENNING)).toBe(false); // warm core
    frog.setVitalSign('coreTemperature', Quantity.of(280, 'K'));
    frog.reconcilePhenology();
    expect(carries(frog, DENNING)).toBe(true);
    CelestialApi.pinDaylightFraction(0.6); // spring
    frog.reconcilePhenology();
    expect(carries(frog, DENNING)).toBe(false);
  });

  it('an event entry is its act\'s — the schedule never brings it on', () => {
    const cow = body('female');
    cow.reconcilePhenology();
    expect(carries(cow, LACTATING)).toBe(false);
  });

  it('⭐⭐ reading a body changes nothing — only the reconcile carries a season', () => {
    const ewe = body('female');
    CelestialApi.pinDaylightFraction(0.4);
    ewe.getConditions();
    ewe.getVitalSign('coreTemperature');
    ewe.getCommonNames();
    expect(carries(ewe, IN_SEASON)).toBe(false);
  });

  it('⭐ the thermal reconcile is the one caller — a body brought current reads its season', () => {
    let real = 10_000_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    const ewe = body('female');
    CelestialApi.pinDaylightFraction(0.4);
    ewe.reconcileThermalRegulation(); // seed
    real += 600_000; // ten real minutes — two game hours at scale 12
    ewe.reconcileThermalRegulation();
    expect(carries(ewe, IN_SEASON)).toBe(true);
  });

  it('a dead body carries no season', () => {
    const ewe = body('female');
    CelestialApi.pinDaylightFraction(0.4);
    ewe.reconcilePhenology();
    ewe.setLifecycleState('dead');
    ewe.reconcilePhenology();
    expect(carries(ewe, IN_SEASON)).toBe(false);
  });
});
