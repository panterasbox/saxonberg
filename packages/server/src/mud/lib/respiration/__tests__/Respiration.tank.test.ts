/**
 * RespirationMixin Wave 2 — the carried-air supply (the scuba loop).
 *
 * A worn air tank covers a hostile medium: while it has air the drain
 * taps it and pins `spo2`; when it runs dry the body falls into the
 * supply-exhausted crisis (`cause: 'supply'`) and `spo2` drops. A refill
 * (`BulkableApi.transfer`) restores the budget and the body taps again.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { Character } from '../../character/Character';
import Location from '../../stuff/Location';
import BodyPlan from '../../species/BodyPlan';
import Species from '../../species/Species';
import Material from '../../material/Material';
import AirTank from '../../../obj/AirTank';
import Receptacle from '../../../obj/Receptacle';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { SchedulerApi } from '../../../api/scheduler';
import { ContainmentApi } from '../../../api/containment';
import { SlotApi } from '../../../api/slot';
import { BulkableApi } from '../../../api/bulk';
import { MixinApi } from '../../../api/mixin';
import { ExecutionContextApi } from '../../../api/execution-context';
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
class TestCharacter extends Character {}

const TICK_MS = RESPIRATION_DEFAULTS.EMISSION_INTERVAL_MS;
const L = (n: number) => Quantity.of(n, 'L');

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

const AIR_MATERIAL_PATH = '/lib/material/bulk/air';
const BODYPLAN_PATH = '/test/respiration/tank-bodyplan';
const SPECIES_PATH = '/test/respiration/tank-species';

function makeTank(amount: number, capacity = 6): AirTank {
  const tank = makeStuff(() => new AirTank());
  tank.interiorBulk = true;
  tank.setInteriorCapacity(L(capacity));
  const air = StuffApi.findByTemplatePath<Material>(AIR_MATERIAL_PATH)!;
  tank.setBulkMaterial('interior', air);
  tank.setBulkAmount('interior', L(amount));
  // Bypass the Organism/body-plan fit check — we test the respiration
  // tap, not slot eligibility (the Wearable suite owns that).
  tank.fitsSlot = () => true;
  return tank;
}

function makeDiver(): Character {
  const sp = StuffApi.findByTemplatePath<Species>(SPECIES_PATH)!;
  const c = makeStuff(() => new TestCharacter());
  c.setSpecies(sp);
  return c;
}

/** Wear `tank` on the diver's torso and place the diver in `where`. */
function wearAndPlace(diver: Character, tank: AirTank, where: TestLocation): void {
  if (!MixinApi.isSlotted(diver) || !MixinApi.isSlottable(tank)) {
    throw new Error('test setup: diver must be Slotted and tank Slottable');
  }
  SlotApi.occupyAll(diver, tank, ['torso']);
  ContainmentApi.move(diver, where);
}

describe('RespirationMixin — carried-air supply (scuba)', () => {
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

    // Shared fixtures (created once — never `clearAll`, to keep the
    // WorldClockRegistry findable for `respirationNowSeconds`).
    const air = makeStuffAtPath(() => new Material(), AIR_MATERIAL_PATH);
    air.setName('air');
    const bp = makeStuffAtPath(() => new BodyPlan(), BODYPLAN_PATH);
    bp.setSlots([{ name: 'torso', accepts: 'WearableMixin' }]);
    const sp = makeStuffAtPath(() => new Species(), SPECIES_PATH);
    sp.setBodyPlan(bp);
  });

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
  });
  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
  });

  it('a worn tank pins spo2 underwater and depletes; emptying triggers the crisis', async () => {
    const diver = makeDiver();
    const tank = makeTank(20, 20);
    wearAndPlace(diver, tank, room('water'));

    // Sanity: the driver sees the worn air supply and runs the tap.
    await diver.reassess();
    expect(diver.getEngagementByType('respiration-drain')).toBeDefined();

    // While the tank has air, spo2 holds steady and the budget drains.
    tick(13);
    expect(spo2(diver)).toBe(98);
    const left = tank.getBulk('interior').getAmount().rawValue();
    expect(left).toBeLessThan(20);
    expect(left).toBeGreaterThan(0);

    // Drain the tank dry → the supply-exhausted crisis: spo2 falls.
    tick(50);
    expect(tank.getBulk('interior').getAmount().rawValue()).toBe(0);
    expect(spo2(diver)).toBeLessThan(70);
  });

  it('refilling a depleted tank (BulkableApi.transfer) restores the supply', async () => {
    const diver = makeDiver();
    const tank = makeTank(0); // bone dry
    wearAndPlace(diver, tank, room('water'));
    await diver.reassess();

    // Dry tank underwater → no air to tap → spo2 falls.
    tick(30);
    expect(spo2(diver)).toBeLessThan(98);

    // Refill from a dive-shop air source.
    const source = makeStuff(() => new Receptacle());
    source.interiorBulk = true;
    source.setInteriorCapacity(L(50));
    const air = StuffApi.findByTemplatePath<Material>(AIR_MATERIAL_PATH)!;
    source.setBulkMaterial('interior', air);
    source.setBulkAmount('interior', L(50));

    ExecutionContextApi.run(null, BulkableApi, 'test-harness', undefined, () =>
      BulkableApi.transfer(
        source.getBulk('interior'),
        tank.getBulk('interior'),
        { kind: 'measure', litres: 6, mode: 'lenient' },
      ),
    );
    expect(tank.getBulk('interior').getAmount().rawValue()).toBeGreaterThan(0);
  });

  it('the air gauge reads the fill fraction and falls as the tank is tapped', async () => {
    const diver = makeDiver();
    const tank = makeTank(20, 20);
    expect(tank.getAirGauge()).toBe(1); // full

    wearAndPlace(diver, tank, room('water'));
    await diver.reassess();
    tick(20);

    const gauge = tank.getAirGauge()!;
    expect(gauge).toBeLessThan(1);
    expect(gauge).toBeGreaterThan(0);
    expect(gauge).toBeCloseTo(
      tank.getBulk('interior').getAmount().rawValue() / 20,
      5,
    );
  });
});
