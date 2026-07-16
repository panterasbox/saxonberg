/**
 * Phase 4 — the conduction-graph walk. A live source imposes a potential;
 * the walk over the conductive-contact graph (co-immersion in a shared
 * conductive pool, with the room's Floor as ground) computes the current
 * through each bridged body. Grounding, insulation, and bird-on-a-wire are
 * emergent, not scripted. No combat / world clock needed — fixtures only.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ElectricityApi } from '../../../api/electricity';
import { ConditionApi } from '../../../api/condition';
import { EnergizedMixin } from '../../../lib/electricity/Energized';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { NamedMixin } from '../../../lib/description/Named';
import { Idea } from '../../../lib/stuff/Idea';
import Location from '../../../lib/stuff/Location';
import Floor from '../../../obj/Floor';
import Armor from '../../../lib/equipment/Armor';
import { Construction } from '../../../lib/material/Construction';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../lib/species/Species';
import BodyPlan from '../../../lib/species/BodyPlan';
import Material from '../../../lib/material/Material';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../../lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../../lib/vitals/Condition';

class TestWire extends EnergizedMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'TestWire';
}

let seq = 0;

function mkConductor(name: string, conductivity: number): Material {
  const m = makeStuff(() => new Material());
  m.setName(name);
  m.setElectricalConductivity(Quantity.of(conductivity, 'S/m'));
  stampTemplatePathForTest(m, `/lib/material/test/${name}-${seq++}`);
  return m;
}

const saltWater = () => mkConductor('salt-water', 5);
const rubber = () => mkConductor('rubber', 1.0e-13);
const steel = () => mkConductor('steel', 6.0e6);

function makeRoom(): Location {
  return makeStuff(() => new Location());
}

/** Attach a Floor with a conductive (or dry) surface pool to the room. */
function floodFloor(room: Location, pool: Material | null, litres: number): Floor {
  const floor = makeStuff(() => {
    const f = new Floor();
    f.surfaceBulk = true;
    return f;
  });
  (room as unknown as { addFixture(f: unknown): boolean }).addFixture(floor);
  if (pool) {
    floor.setBulkMaterial('surface', pool);
    floor.setBulkAmount('surface', Quantity.of(litres, 'L'));
  }
  return floor;
}

/** A dry room whose Floor's own material conducts (a metal floor) — grounds
 * and bridges without wetting anyone. */
function metalFloor(room: Location, material: Material): Floor {
  const floor = makeStuff(() => {
    const f = new Floor();
    f.surfaceBulk = true;
    return f;
  });
  floor.setMaterial(material);
  (room as unknown as { addFixture(f: unknown): boolean }).addFixture(floor);
  return floor;
}

/** Wear a Constructed armor layer of `material` + `form` on the torso. */
function wearTorso(c: Creature, material: Material, form: string): Armor {
  const plan = makeBodyPlanTorso(c);
  const a = makeStuff(() => new Armor());
  a.setMaterial(material);
  a.setConstruction(Construction.of(form));
  a.setSlotClaim(plan, ['torso']);
  (c as unknown as { occupy(x: unknown, s: string): void }).occupy(a, 'torso');
  return a;
}

function makeBodyPlanTorso(c: Creature): string {
  return c.getSpecies()!.getBodyPlan()!.getTemplatePath()!;
}

function makeWire(room: Location, volts: number): TestWire {
  const w = makeStuff(() => {
    const wire = new TestWire();
    wire.setName('live wire');
    wire.setVoltage(Quantity.of(volts, 'V'));
    return wire;
  });
  ContainmentApi.move(w as never, room as never);
  return w;
}

function makeBody(room: Location | null): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-biped');
  plan.setSlots([
    {
      name: 'feet',
      accepts: 'WearableMixin',
      covers: ['body.leg.left.foot', 'body.leg.right.foot'],
    },
    { name: 'torso', accepts: 'WearableMixin', covers: ['body.torso'] },
  ]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.leg.left', parent: 'body.torso', tissues: [] },
    {
      key: 'body.leg.left.foot',
      parent: 'body.leg.left',
      tissues: [{ tissuePath: '/lib/material/tissue/flesh', mass: 0.5 }],
    },
    { key: 'body.leg.right', parent: 'body.torso', tissues: [] },
    {
      key: 'body.leg.right.foot',
      parent: 'body.leg.right',
      tissues: [{ tissuePath: '/lib/material/tissue/flesh', mass: 0.5 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/lib/body-plans/test-elec-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/lib/species/test/elec-${id}`);

  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  if (room) ContainmentApi.move(c as never, room as never);
  return c;
}

function bootBody(room: Location, material: Material): Creature {
  const c = makeBody(room);
  const boots = makeStuff(() => new Armor());
  boots.setMaterial(material);
  boots.setSlotClaim(c.getSpecies()!.getBodyPlan()!.getTemplatePath()!, [
    'feet',
  ]);
  (c as unknown as { occupy(x: unknown, s: string): void }).occupy(boots, 'feet');
  return c;
}

function traumaOf(c: Creature): Trauma | undefined {
  return c.getConditions().find((x) => x.kind === 'trauma') as
    | Trauma
    | undefined;
}

describe('ElectricityLogic — the conduction walk', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('two bodies co-immersed in a live pool BOTH take current (faction-blind)', () => {
    const room = makeRoom();
    floodFloor(room, saltWater(), 20);
    const wire = makeWire(room, 120);
    const a = makeBody(room);
    const b = makeBody(room);

    expect(ElectricityApi.currentThrough(wire, a).rawValue()).toBeGreaterThan(0);
    expect(ElectricityApi.currentThrough(wire, b).rawValue()).toBeGreaterThan(0);

    const outcomes = ElectricityApi.conduct(wire);
    expect(outcomes.length).toBe(2); // everyone bridged, allies included
    expect(traumaOf(a)).toBeDefined();
    expect(traumaOf(b)).toBeDefined();
  });

  it('rubber boots break the ground path → zero current (insulation counterplay)', () => {
    const room = makeRoom();
    floodFloor(room, saltWater(), 20);
    const wire = makeWire(room, 120);
    const shod = bootBody(room, rubber());

    expect(ElectricityApi.currentThrough(wire, shod).rawValue()).toBe(0);
    expect(ElectricityApi.pathToGround(shod)).toBe(false);
    const outcomes = ElectricityApi.conduct(wire);
    expect(outcomes.length).toBe(0);
    expect(traumaOf(shod)).toBeUndefined();
  });

  it('a barefoot body in the pool IS grounded (the counterplay baseline)', () => {
    const room = makeRoom();
    floodFloor(room, saltWater(), 20);
    makeWire(room, 120);
    const bare = makeBody(room);
    expect(ElectricityApi.pathToGround(bare)).toBe(true);
  });

  it('bird-on-a-wire: touching only the live node with no ground path → zero', () => {
    // A dry room (no pool, non-conductive floor). The body holds the live
    // wire (direct contact) but has no path to ground → no current.
    const room = makeRoom();
    floodFloor(room, null, 0); // dry floor, no conductive pool
    const body = makeBody(room);
    const wire = makeWire(room, 120);
    ContainmentApi.move(wire as never, body as never); // wire in hand

    expect(ElectricityApi.pathToGround(body)).toBe(false);
    expect(ElectricityApi.currentThrough(wire, body).rawValue()).toBe(0);
  });

  it('a dead / zero-volt source conducts nothing', () => {
    const room = makeRoom();
    floodFloor(room, saltWater(), 20);
    const wire = makeWire(room, 0);
    const body = makeBody(room);
    expect(ElectricityApi.currentThrough(wire, body).rawValue()).toBe(0);
    expect(ElectricityApi.conduct(wire).length).toBe(0);
  });

  it('groundNodeFor resolves the room Floor', () => {
    const room = makeRoom();
    const floor = floodFloor(room, saltWater(), 20);
    const wire = makeWire(room, 120);
    expect(ElectricityApi.groundNodeFor(wire)).toBe(floor);
  });
});

describe('ElectricityLogic — the armor inversion + wet-skin', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('plate armor takes MORE current than bare; rubber takes LESS (inversion)', () => {
    const room = makeRoom();
    floodFloor(room, saltWater(), 20);
    const wire = makeWire(room, 120);

    const bare = makeBody(room);
    const plated = makeBody(room);
    wearTorso(plated, steel(), 'plate');
    const rubberClad = makeBody(room);
    wearTorso(rubberClad, rubber(), 'plate');

    const iBare = ElectricityApi.currentThrough(wire, bare).rawValue();
    const iPlate = ElectricityApi.currentThrough(wire, plated).rawValue();
    const iRubber = ElectricityApi.currentThrough(wire, rubberClad).rawValue();

    expect(iPlate).toBeGreaterThan(iBare); // metal conducts → betrays armor
    expect(iRubber).toBeLessThan(iBare); // rubber adds series R → protects
  });

  it('rubber-soled boots still break the ground path even under plate', () => {
    const room = makeRoom();
    floodFloor(room, saltWater(), 20);
    const wire = makeWire(room, 120);
    const shod = bootBody(room, rubber());
    wearTorso(shod, steel(), 'plate');
    // Insulation at the feet dominates the conductive plate — no ground, no
    // current.
    expect(ElectricityApi.currentThrough(wire, shod).rawValue()).toBe(0);
  });

  it('a wet body takes markedly more current than a dry (grounded) one', () => {
    // Wet: co-immersed in a salt pool (skin ~1 kΩ). Dry: standing on a
    // conductive metal floor that grounds + bridges but does not wet.
    const wetRoom = makeRoom();
    floodFloor(wetRoom, saltWater(), 20);
    const wetWire = makeWire(wetRoom, 120);
    const wetBody = makeBody(wetRoom);

    const dryRoom = makeRoom();
    metalFloor(dryRoom, steel());
    const dryWire = makeWire(dryRoom, 120);
    const dryBody = makeBody(dryRoom);

    const iWet = ElectricityApi.currentThrough(wetWire, wetBody).rawValue();
    const iDry = ElectricityApi.currentThrough(dryWire, dryBody).rawValue();
    expect(iWet).toBeGreaterThan(0);
    expect(iDry).toBeGreaterThan(0);
    expect(iWet).toBeGreaterThan(iDry); // wet skin ~100× lower resistance
  });
});
