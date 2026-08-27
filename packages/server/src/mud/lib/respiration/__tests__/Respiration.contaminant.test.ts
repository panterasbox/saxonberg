/**
 * RespirationMixin — the inhaled-contaminant fold (the fire driver's first
 * consumer of the biome `contaminant` seam). A body breathing a contaminated
 * medium (smoke → carbon monoxide) takes on the toxin as a metabolism burden
 * each reassess — an enclosed fire poisons as well as smothers. Clean air
 * carries none. Harness mirrors Respiration.tank.test.
 */

import "../../../../test-bootstrap";
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
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Species from '../../../platform/idea/species/Species';
import Material from '../../material/Material';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { SchedulerApi } from '../../../api/scheduler';
import { ContainmentApi } from '../../../api/containment';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestLocation extends Location {}
class TestCharacter extends Character {}

const SPECIES_PATH = '/test/respiration/co-species';
const BODYPLAN_PATH = '/test/respiration/co-bodyplan';
const AIR_MATERIAL_PATH = '/stuff/idea/material/bulk/air';

function room(atmosphere: string): TestLocation {
  const r = makeStuff(() => new TestLocation());
  r.setAtmosphere(atmosphere);
  return r;
}

function makeBody(): Character {
  const sp = StuffApi.findByTemplatePath<Species>(SPECIES_PATH)!;
  const c = makeStuff(() => new TestCharacter());
  c.setSpecies(sp);
  return c;
}

function coBurden(c: Character): number {
  return (
    (c as unknown as { toxinBurdens: Record<string, number> }).toxinBurdens[
      'carbonMonoxide'
    ] ?? 0
  );
}

describe('RespirationMixin — the smoke contaminant fold', () => {
  beforeAll(async () => {
    WorldClockApi._resetForTesting();
    EventApi._clearAllForTesting();
    const reg = await StuffApi.create(() => {
      const r = new EventRegistry();
      Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
      return r;
    });
    StuffApi.unregister(reg);
    StuffApi.register(reg);
    EventApi._setRegistryForTesting(reg);

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

  it('a body breathing smoke takes on a carbon-monoxide burden', async () => {
    const body = makeBody();
    ContainmentApi.move(body, room('smoke'));

    expect(coBurden(body)).toBe(0);
    await body.reassess(); // one breath of smoke
    expect(coBurden(body)).toBeGreaterThan(0); // CO absorbed — poisoning begins
    const afterOne = coBurden(body);
    await body.reassess(); // it accumulates
    expect(coBurden(body)).toBeGreaterThan(afterOne);
  });

  it('a body breathing clean air takes on no contaminant', async () => {
    const body = makeBody();
    ContainmentApi.move(body, room('air'));
    await body.reassess();
    expect(coBurden(body)).toBe(0);
  });
});
