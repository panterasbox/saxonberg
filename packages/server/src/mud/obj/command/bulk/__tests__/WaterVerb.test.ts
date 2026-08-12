/**
 * `water` — the tool-afforded watering verb (husbandry Wave 5).
 *
 * The verb is conferred by a watering can **in inventory**, through the
 * closed `TOOL_CAPABILITIES` vocabulary's `watering` row at
 * `placement: 'carried'` — the standing "instruments confer working verbs"
 * rule getting its first non-crafting consumer. A can on the floor confers
 * nothing.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WaterController from '../WaterController';
import WateringCan from '../../../WateringCan';
import Plant from '../../../Plant';
import PlantPot, { PLANT_SLOT } from '../../../PlantPot';
import Material from '../../../../lib/material/Material';
import { Reserve } from '../../../../lib/reserve';
import { type GrowthProfileData } from '../../../../lib/husbandry/Growing';
import { SOIL_MOISTURE_RESERVE_KEY } from '../../../../lib/husbandry/Cultivable';
import { ToolCapabilities } from '../../../../lib/craft/ToolCapability';
import { Quantity } from '../../../../lib/quantity';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../lib/description/Named';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { AmbientLitMixin } from '../../../../lib/perception/AmbientLit';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ShadowApi } from '../../../../api/shadow';
import { ContainmentApi } from '../../../../api/containment';
import { PersistableApi } from '../../../../api/persistable';
import { AdvancementApi } from '../../../../api/advancement';
import { WorldClockApi } from '../../../../api/worldclock';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';
import '../../../WorldClockRegistry';

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'TestGiver';
  received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}
class TestItem extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'TestItem';
}
class LitRoom extends AmbientLitMixin(Location) {}

const BASE = 10_000_000;
let now = BASE;
let seq = 0;
function freshPath(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function lilyProfile(): GrowthProfileData {
  return {
    moistureHappyAt: 0.35,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0.08,
    luxHappyAt: 25,
    luxDarkAt: 3,
    rootDemand: { seedling: 0.15, young: 1.2, established: 2.0, mature: 3.0 },
    daysToStage: { young: 30, established: 90, mature: 168 },
  };
}

function water(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    m.setAppearance('clear water');
    m.setTags(['liquid', 'beverage', 'drinkable']);
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.6, 'W/(m·K)'));
    return m;
  }, freshPath('/obj/material/_test/water')) as unknown as Material;
}

function tissue(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('plant-tissue');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, freshPath('/obj/material/_test/tissue')) as unknown as Material;
}

function makePlant(): Plant {
  return makeStuffAtPath(() => {
    const p = new Plant();
    p.setShortDescription('a peace lily');
    p.setMaterial(tissue());
    p.setMass(Quantity.of(0.5, 'kg'));
    p.setLastAmbientK(295);
    p.setLifecycleState('alive');
    p.setProfile(lilyProfile());
    return p;
  }, freshPath('/obj/plant/_water'));
}

function makePot(soil = 3): PlantPot {
  return makeStuffAtPath(() => {
    const pot = new PlantPot();
    pot.setShortDescription('a clay pot');
    pot.interiorBulk = true;
    pot.setInteriorCapacity(Quantity.of(soil, 'L'));
    pot.setInteriorAmount(Quantity.of(soil, 'L'));
    pot.setStaticSlots([
      { name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 1 },
    ]);
    // Phase 2: the WATER lives in the ground, not the plant.
    pot.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(1, 'L'),
        Quantity.of(1, 'L'),
        'cultivation',
        'wilting',
      ),
    );
    return pot;
  }, freshPath('/obj/pot/_water'));
}

function makeCan(litres: number): WateringCan {
  return makeStuffAtPath(() => {
    const can = new WateringCan();
    can.setShortDescription('a tin watering can');
    can.interiorBulk = true;
    can.setInteriorCapacity(Quantity.of(2, 'L'));
    can.setCapabilities(['watering']);
    if (litres > 0) {
      can.setBulkMaterial('interior', water());
      can.setBulkAmount('interior', Quantity.of(litres, 'L'));
    }
    return can;
  }, freshPath('/obj/vessel/_can'));
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(giver: TestGiver, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: 'water',
    executionId: 'test',
    commandId: 'test',
    verb: 'water',
    command: stubCommand('water'),
  });
}

function one(stuff: Stuff | null, raw: string, prep?: string): MqlOneResult {
  const out: MqlOneResult = { stuff, raw };
  if (prep) out.prep = prep;
  return out;
}

type WaterExecModel = Parameters<WaterController['execute']>[0];
function model(target: MqlOneResult, source?: MqlOneResult): WaterExecModel {
  return { target, source } as ModelData as unknown as WaterExecModel;
}

function noteReasons(ctx: CommandContext): string[] {
  return ctx.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
}

let captured: Stuff[];
let deeds: Array<{ discipline: string; difficulty: string; outcome: string }>;

describe('the watering capability', () => {
  it('the watering row confers water, carried-only', () => {
    const def = ToolCapabilities.definitionOf('watering');
    expect(def).not.toBeNull();
    expect(def!.verbs).toEqual(['bulk/water.yaml']);
    expect(def!.placement).toBe('carried');
    expect(ToolCapabilities.isCapability('watering')).toBe(true);
  });

  it('a carried can affords water; the same can on the floor does not', () => {
    const can = makeCan(1);
    const contributions = can.getInstanceContributions();
    // The `carried` placement puts it in the ENVIRONMENT bucket only —
    // the can grants outward to whoever holds it — so a can lying in the
    // room confers nothing on the occupants (which would be `peers`).
    // The whetstone rule, as data.
    expect(contributions.environment ?? []).toContain('bulk/water.yaml');
    expect(contributions.peers ?? []).not.toContain('bulk/water.yaml');
  });
});

describe('water <plant>', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    now = BASE;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    captured = [];
    vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation(
      (async (s: Stuff) => {
        captured.push(s);
      }) as unknown as typeof PersistableApi.captureHostOf,
    );
    deeds = [];
    vi.spyOn(AdvancementApi, 'recordDeed').mockImplementation((async (
      _owner: Stuff,
      subcheck: { discipline: string; difficulty: string; outcome: string },
    ) => {
      deeds.push(subcheck);
    }) as unknown as typeof AdvancementApi.recordDeed);
  });

  // No StuffApi.clearAll() — it wipes the WorldClockRegistry (the Caster
  // precedent) and every growth reconcile would silently no-op.
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function scene(): {
    giver: TestGiver;
    room: LitRoom;
    plant: Plant;
    pot: PlantPot;
  } {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    });
    ContainmentApi.move(giver, room);
    const pot = makePot();
    ContainmentApi.move(pot, room);
    const plant = makePlant();
    ContainmentApi.move(plant, pot);
    pot.occupy(plant, PLANT_SLOT);
    return { giver, room, plant, pot };
  }

  /** Let game-time run so the soil is dry enough to take water. */
  function dryOut(plant: Plant, gameDays: number): void {
    plant.getVigor(); // seed the stamp
    now = BASE + gameDays * 86_400;
    plant.getSoilMoisture();
  }

  it('raises soil moisture and debits the can', async () => {
    const { giver, room, plant, pot } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    dryOut(plant, 6); // ~0.48 L transpired

    const before = plant.getSoilMoisture();
    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(plant, 'lily')), makeContext(giver, room));

    expect(plant.getSoilMoisture()).toBeGreaterThan(before);
    expect(plant.getSoilMoisture()).toBeCloseTo(1, 3);
    // The can kept the rest: only the headroom moved.
    expect(can.getBulkAmount('interior').rawValue()).toBeGreaterThan(1.4);
    expect(can.getBulkAmount('interior').rawValue()).toBeLessThan(1.6);
    // ⭐ The act captures the GROUND, not the plant. Since phase 2 the
    // litres land in the pot's moisture reserve, so capturing only the
    // plant would durably record everything about this act except the
    // water — the watering would not survive a restart.
    expect(captured).toContain(pot);
  });

  it('naming the POT waters its occupant — a player types both', async () => {
    const { giver, room, plant, pot } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    dryOut(plant, 6);
    const before = plant.getSoilMoisture();

    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(pot, 'pot')), makeContext(giver, room));

    expect(plant.getSoilMoisture()).toBeGreaterThan(before);
    expect(captured).toContain(pot);
  });

  it('watering an EMPTY pot says there is nothing planted in it', async () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    });
    ContainmentApi.move(giver, room);
    const pot = makePot();
    ContainmentApi.move(pot, room);
    const can = makeCan(2);
    ContainmentApi.move(can, giver);

    const ctrl = makeStuff(() => new WaterController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(pot, 'pot')), ctx);

    expect(noteReasons(ctx)).toContain('nothing-planted');
    expect(can.getBulkAmount('interior').rawValue()).toBeCloseTo(2, 6);
    expect(JSON.stringify(giver.received)).toContain('nothing planted');
    expect(captured).toHaveLength(0);
  });

  it('watering an already-wet plant changes nothing and keeps the water', async () => {
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    plant.getVigor(); // full root zone, no elapsed time

    const ctrl = makeStuff(() => new WaterController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(plant, 'lily')), ctx);

    expect(noteReasons(ctx)).toContain('already-wet');
    expect(can.getBulkAmount('interior').rawValue()).toBeCloseTo(2, 6);
    expect(captured).toHaveLength(0);
  });

  it('rejects a non-plant target and a missing source, changing no state', async () => {
    const { giver, room, plant } = scene();
    const rock = makeStuff(() => {
      const t = new TestItem();
      t.setName('rock');
      return t;
    });
    ContainmentApi.move(rock, room);

    // Not a plant.
    const ctrl = makeStuff(() => new WaterController());
    const ctx1 = makeContext(giver, room);
    await ctrl.execute(model(one(rock, 'rock')), ctx1);
    expect(noteReasons(ctx1)).toContain('not-a-plant');

    // No source at all (nothing carried).
    dryOut(plant, 6);
    const before = plant.getSoilMoisture();
    const ctx2 = makeContext(giver, room);
    await ctrl.execute(model(one(plant, 'lily')), ctx2);
    expect(noteReasons(ctx2)).toContain('no-water-source');
    expect(plant.getSoilMoisture()).toBeCloseTo(before, 6);
    expect(captured).toHaveLength(0);
  });

  it('rejects an empty named source', async () => {
    const { giver, room, plant } = scene();
    const empty = makeCan(0);
    ContainmentApi.move(empty, giver);
    dryOut(plant, 6);

    const ctrl = makeStuff(() => new WaterController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(
      model(one(plant, 'lily'), one(empty, 'can', 'with')),
      ctx,
    );
    expect(noteReasons(ctx)).toContain('source-empty');
    expect(captured).toHaveLength(0);
  });

  it('a can on the FLOOR is not picked up as a carried source', async () => {
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, room); // in the room, not the pack
    dryOut(plant, 6);

    const ctrl = makeStuff(() => new WaterController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(plant, 'lily')), ctx);

    expect(noteReasons(ctx)).toContain('no-water-source');
    // …but naming it explicitly still works (it is reachable).
    const ctx2 = makeContext(giver, room);
    await ctrl.execute(
      model(one(plant, 'lily'), one(can, 'can', 'with')),
      ctx2,
    );
    expect(plant.getSoilMoisture()).toBeCloseTo(1, 3);
  });

  it('credits horticulture, and the difficulty tracks the plant\'s state', async () => {
    // The anti-grind property, at the verb: difficulty is a measurement of
    // the world (how far gone the plant was), not a tag on the act. A routine
    // top-up grades trivially — and the estimator makes a trivial success
    // barely move the estimate, so watering cannot be farmed.
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    dryOut(plant, 6); // still healthy — a routine top-up
    expect(plant.getConditionBand()).toBe('healthy');

    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(plant, 'lily')), makeContext(giver, room));
    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.discipline).toBe('horticulture');
    expect(deeds[0]!.difficulty).toBe('easy');
    expect(deeds[0]!.outcome).toBe('success');
  });

  it('a rescue grades harder than a top-up', async () => {
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    // Let it fall to `failing` — pulling it back is a rescue, not a top-up.
    plant.getVigor();
    now = BASE + 90 * 86_400;
    expect(plant.getConditionBand()).toBe('failing');

    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(plant, 'lily')), makeContext(giver, room));
    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.difficulty).toBe('hard');
  });

  it('going through the motions earns nothing — no headroom, no deed', async () => {
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    plant.getVigor(); // full root zone, no elapsed time

    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(plant, 'lily')), makeContext(giver, room));
    expect(deeds).toHaveLength(0);
  });

  it('a dead plant cannot be revived by watering', async () => {
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    plant.getVigor();
    now = BASE + 12 * 360 * 86_400; // a simulated real year of neglect
    expect(plant.getConditionBand()).toBe('dead');

    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(plant, 'lily')), makeContext(giver, room));

    expect(plant.getConditionBand()).toBe('dead');
    expect(plant.getVigor()).toBe(0);
  });
});
