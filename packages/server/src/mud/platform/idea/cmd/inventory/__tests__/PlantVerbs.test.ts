/**
 * `plant` / `repot` — the assembly verbs (husbandry Wave 4).
 *
 * No generic "put a Slottable into a Slotted" verb ships (`wear`, `wield`
 * and `mount` are each bespoke), so both of these are their own
 * controllers. They gate on soil, on slot occupancy, and on the plant's
 * own `fitsSlot`, and each success captures the plant's own persistence
 * record — a plant is its own host.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PlantController from '../PlantController';
import RepotController from '../RepotController';
import Plant from '../../../../thing/Plant';
import PlantPot, { PLANT_SLOT } from '../../../../thing/PlantPot';
import Seed from '../../../../thing/Seed';
import Material from '../../../../../lib/material/Material';
import { Reserve } from '../../../../../lib/reserve';
import { type GrowthProfileData } from '../../../../../lib/husbandry/Growing';
import { SOIL_MOISTURE_RESERVE_KEY } from '../../../../../lib/husbandry/Cultivable';
import { Quantity } from '../../../../../lib/quantity';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../../lib/description/Named';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { AmbientLitMixin } from '../../../../../lib/perception/AmbientLit';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/stuff/Location';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../../api/stuff';
import { ShadowApi } from '../../../../../api/shadow';
import { ContainmentApi } from '../../../../../api/containment';
import { PersistableApi } from '../../../../../api/persistable';
import { AdvancementApi } from '../../../../../api/advancement';
import { WorldClockApi } from '../../../../../api/worldclock';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../../lib/perception/modalities/__tests__/test-helpers';
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

/** The peace lily's shipped profile — `young` needs more than a small pot. */
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

let seq = 0;
function freshPath(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function tissue(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('plant-tissue');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, freshPath('/stuff/idea/material/_test/tissue')) as unknown as Material;
}

/** The template path the seed names; the clone stub mints from it. */
const PLANT_TEMPLATE = '/stuff/thing/plant/_verbtest';

function newPlant(): Plant {
  const p = new Plant();
  p.setShortDescription('a peace lily');
  p.setMaterial(tissue());
  p.setMass(Quantity.of(0.5, 'kg'));
  p.setLastAmbientK(295);
  p.setLifecycleState('alive');
  p.setProfile(lilyProfile());
  return p;
}

function makePlantAt(path = PLANT_TEMPLATE): Plant {
  return makeStuffAtPath(newPlant, path);
}

function makePot(soil: number, capacity = Math.max(soil, 0.5)): PlantPot {
  return makeStuffAtPath(() => {
    const pot = new PlantPot();
    pot.setShortDescription('a clay pot');
    pot.interiorBulk = true;
    pot.setInteriorCapacity(Quantity.of(capacity, 'L'));
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
  }, freshPath('/stuff/thing/pot/_test'));
}

function makeSeed(growsInto: string | null = PLANT_TEMPLATE): Seed {
  return makeStuffAtPath(() => {
    const s = new Seed();
    s.setShortDescription('a peace lily seed');
    s.setGrowsIntoPath(growsInto);
    return s;
  }, freshPath('/stuff/thing/seed/_test'));
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
    commandText: 'plant',
    executionId: 'test',
    commandId: 'test',
    verb: 'plant',
    command: stubCommand('plant'),
  });
}

function one(stuff: Stuff | null, raw: string, prep?: string): MqlOneResult {
  const out: MqlOneResult = { stuff, raw };
  if (prep) out.prep = prep;
  return out;
}

type PlantExecModel = Parameters<PlantController['execute']>[0];
type RepotExecModel = Parameters<RepotController['execute']>[0];

function plantModel(seed: MqlOneResult, pot: MqlOneResult): PlantExecModel {
  return { seed, pot } as ModelData as unknown as PlantExecModel;
}
function repotModel(plant: MqlOneResult, pot: MqlOneResult): RepotExecModel {
  return { plant, pot } as ModelData as unknown as RepotExecModel;
}

/** Notes the context accumulated, by kind. */
function noteKinds(ctx: CommandContext): string[] {
  return ctx.getNotes().map((n) => n.kind);
}

/** Notes' `reason` fields (controller-rejected carries the detail). */
function noteReasons(ctx: CommandContext): string[] {
  return ctx
    .getNotes()
    .map((n) => (n as { reason?: string }).reason ?? '');
}

let captured: Array<Stuff>;
let deeds: Array<{ discipline: string; difficulty: string; outcome: string }>;

describe('plant / repot', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    now = BASE;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);

    // The verbs clone the plant through the gated path and capture the
    // host afterwards; both are stubbed (no Template rows, no Mongo).
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path === PLANT_TEMPLATE) return makeStuffAtPath(newPlant, path);
      throw new Error(`unexpected clone of ${path}`);
    }) as unknown as typeof StuffApi.clone);
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

  // No StuffApi.clearAll() — it would wipe the WorldClockRegistry and
  // silently stop every growth reconcile (the Caster precedent).
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function scene(): { giver: TestGiver; room: LitRoom } {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    });
    ContainmentApi.move(giver, room);
    return { giver, room };
  }

  it('plants into a soil-filled pot: mints the species, consumes the seed, occupies the slot', async () => {
    const { giver, room } = scene();
    const pot = makePot(0.5);
    ContainmentApi.move(pot, room);
    const seed = makeSeed();
    ContainmentApi.move(seed, giver);

    const ctrl = makeStuff(() => new PlantController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(plantModel(one(seed, 'seed'), one(pot, 'pot', 'in')), ctx);

    const grown = pot.getOccupant(PLANT_SLOT);
    expect(grown).toBeInstanceOf(Plant);
    expect(grown!.getTemplatePath()).toBe(PLANT_TEMPLATE);
    // In the CONTENTS as well as the slot — the capture-slice requirement.
    expect(pot.getContents()).toContain(grown);
    expect(seed.isDestroyed()).toBe(true);
    // …and the plant's own record was captured.
    expect(captured).toContain(grown);
  });

  it('rejects an empty (soil-less) pot and consumes nothing', async () => {
    const { giver, room } = scene();
    const pot = makePot(0, 0.5); // capacity but no soil
    ContainmentApi.move(pot, room);
    const seed = makeSeed();
    ContainmentApi.move(seed, giver);

    const ctrl = makeStuff(() => new PlantController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(plantModel(one(seed, 'seed'), one(pot, 'pot', 'in')), ctx);

    expect(pot.getOccupant(PLANT_SLOT)).toBeNull();
    expect(seed.isDestroyed()).toBe(false);
    expect(noteReasons(ctx)).toContain('no-soil');
    expect(captured).toHaveLength(0);
  });

  it('rejects an occupied pot', async () => {
    const { giver, room } = scene();
    const pot = makePot(0.5);
    ContainmentApi.move(pot, room);
    const sitting = makePlantAt(freshPath('/stuff/thing/plant/_sitting'));
    ContainmentApi.move(sitting, pot);
    pot.occupy(sitting, PLANT_SLOT);
    const seed = makeSeed();
    ContainmentApi.move(seed, giver);

    const ctrl = makeStuff(() => new PlantController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(plantModel(one(seed, 'seed'), one(pot, 'pot', 'in')), ctx);

    expect(pot.getOccupant(PLANT_SLOT)).toBe(sitting);
    expect(seed.isDestroyed()).toBe(false);
    expect(noteKinds(ctx)).toContain('slot-occupied');
  });

  it('rejects a target that is not a pot, and a seed that is not a seed', async () => {
    const { giver, room } = scene();
    const notAPot = makeStuff(() => {
      const t = new TestItem();
      t.setName('bucket');
      return t;
    });
    ContainmentApi.move(notAPot, room);
    const seed = makeSeed();
    ContainmentApi.move(seed, giver);

    const ctrl = makeStuff(() => new PlantController());
    const ctx1 = makeContext(giver, room);
    await ctrl.execute(
      plantModel(one(seed, 'seed'), one(notAPot, 'bucket', 'in')),
      ctx1,
    );
    expect(noteReasons(ctx1)).toContain('not-a-pot');
    expect(seed.isDestroyed()).toBe(false);

    const pot = makePot(0.5);
    ContainmentApi.move(pot, room);
    const ctx2 = makeContext(giver, room);
    await ctrl.execute(
      plantModel(one(notAPot, 'bucket'), one(pot, 'pot', 'in')),
      ctx2,
    );
    expect(noteReasons(ctx2)).toContain('not-a-seed');
    expect(pot.getOccupant(PLANT_SLOT)).toBeNull();
  });

  it('repot preserves every scrap of growth state — a transplant is not a reset', async () => {
    const { giver, room } = scene();
    const small = makePot(0.5);
    const large = makePot(3);
    ContainmentApi.move(small, room);
    ContainmentApi.move(large, room);
    const p = makePlantAt(freshPath('/stuff/thing/plant/_move'));
    ContainmentApi.move(p, small);
    small.occupy(p, PLANT_SLOT);

    // Let it live a while so its state is non-default.
    now = BASE + 20 * 86_400;
    p.waterPlant(0.5);
    const before = {
      moisture: p.getSoilMoisture(),
      vigor: p.getVigor(),
      stage: p.getGrowthStage(),
      stamp: p.growthClockStamp,
      key: p.getPersistenceKey(),
    };

    const ctrl = makeStuff(() => new RepotController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(repotModel(one(p, 'lily'), one(large, 'pot', 'into')), ctx);

    expect(large.getOccupant(PLANT_SLOT)).toBe(p);
    expect(small.getOccupant(PLANT_SLOT)).toBeNull();
    expect(large.getContents()).toContain(p);

    // Every scrap of the PLANT's own state survives the move.
    expect(p.getVigor()).toBeCloseTo(before.vigor, 6);
    expect(p.getGrowthStage()).toBe(before.stage);
    expect(p.growthClockStamp).toBe(before.stamp);
    expect(p.getPersistenceKey()).toBe(before.key);
    expect(captured).toContain(p);

    // ⭐ Moisture is NOT in that list any more, and its absence is the
    // phase-2 change stated positively: water belongs to the GROUND, so a
    // plant moved into a different pot drinks from that pot. Here the
    // destination is full while the one it left was drawn down, and the
    // plant reads the new soil rather than carrying the old water with
    // it. That is the physically right answer, and it is only expressible
    // because the reserve moved.
    expect(before.moisture).toBeLessThan(1);
    expect(p.getSoilMoisture()).toBeCloseTo(1, 6);
    expect(p.getBed()).toBe(large);
  });

  it('repot into a too-small pot rejects, and the message names the reason', async () => {
    const { giver, room } = scene();
    const large = makePot(3);
    const thimble = makePot(0.2);
    ContainmentApi.move(large, room);
    ContainmentApi.move(thimble, room);
    const p = makePlantAt(freshPath('/stuff/thing/plant/_grown'));
    ContainmentApi.move(p, large);
    large.occupy(p, PLANT_SLOT);

    // Grow it to `mature` (root demand 3.0) so the thimble cannot take it.
    for (let d = 4; d <= 200; d += 4) {
      now = BASE + d * 86_400;
      p.waterPlant(1);
    }
    expect(p.getGrowthStage()).toBe('mature');

    const ctrl = makeStuff(() => new RepotController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(
      repotModel(one(p, 'lily'), one(thimble, 'pot', 'into')),
      ctx,
    );

    expect(thimble.getOccupant(PLANT_SLOT)).toBeNull();
    expect(large.getOccupant(PLANT_SLOT)).toBe(p); // untouched
    expect(noteReasons(ctx)).toContain('pot-too-small');
    const said = JSON.stringify(giver.received);
    expect(said).toContain('too small');
    expect(captured).toHaveLength(0);
  });

  it('both verbs credit horticulture; repot grades by root disturbance', async () => {
    const { giver, room } = scene();
    const pot = makePot(0.5);
    ContainmentApi.move(pot, room);
    const seed = makeSeed();
    ContainmentApi.move(seed, giver);

    // `plant` — the entry act, trivially graded and so self-limiting.
    await makeStuff(() => new PlantController()).execute(
      plantModel(one(seed, 'seed'), one(pot, 'pot', 'in')),
      makeContext(giver, room),
    );
    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.discipline).toBe('horticulture');
    expect(deeds[0]!.difficulty).toBe('trivial');

    // `repot` a seedling — barely any root to disturb.
    const grown = pot.getOccupant(PLANT_SLOT) as Plant;
    const second = makePot(3);
    ContainmentApi.move(second, room);
    await makeStuff(() => new RepotController()).execute(
      repotModel(one(grown, 'lily'), one(second, 'pot', 'into')),
      makeContext(giver, room),
    );
    expect(deeds).toHaveLength(2);
    expect(deeds[1]!.discipline).toBe('horticulture');
    expect(deeds[1]!.difficulty).toBe('trivial'); // still a seedling

    // …and a grown plant is a real transplant.
    for (let d = 4; d <= 200; d += 4) {
      now = BASE + d * 86_400;
      grown.waterPlant(1);
    }
    expect(grown.getGrowthStage()).toBe('mature');
    const third = makePot(3);
    ContainmentApi.move(third, room);
    await makeStuff(() => new RepotController()).execute(
      repotModel(one(grown, 'lily'), one(third, 'pot', 'into')),
      makeContext(giver, room),
    );
    expect(deeds).toHaveLength(3);
    expect(deeds[2]!.difficulty).toBe('hard');
  });

  it('a refused act earns nothing', async () => {
    // No credit for an attempt the world turned down — the pot has no soil.
    const { giver, room } = scene();
    const dry = makePot(0, 0.5);
    ContainmentApi.move(dry, room);
    const seed = makeSeed();
    ContainmentApi.move(seed, giver);

    await makeStuff(() => new PlantController()).execute(
      plantModel(one(seed, 'seed'), one(dry, 'pot', 'in')),
      makeContext(giver, room),
    );
    expect(deeds).toHaveLength(0);
  });

  it('repot rejects a soil-less destination and a non-plant subject', async () => {
    const { giver, room } = scene();
    const large = makePot(3);
    const dry = makePot(0, 3);
    ContainmentApi.move(large, room);
    ContainmentApi.move(dry, room);
    const p = makePlantAt(freshPath('/stuff/thing/plant/_dry'));
    ContainmentApi.move(p, large);
    large.occupy(p, PLANT_SLOT);

    const ctrl = makeStuff(() => new RepotController());
    const ctx1 = makeContext(giver, room);
    await ctrl.execute(repotModel(one(p, 'lily'), one(dry, 'pot', 'into')), ctx1);
    expect(noteReasons(ctx1)).toContain('no-soil');
    expect(large.getOccupant(PLANT_SLOT)).toBe(p);

    const rock = makeStuff(() => {
      const t = new TestItem();
      t.setName('rock');
      return t;
    });
    ContainmentApi.move(rock, room);
    const ctx2 = makeContext(giver, room);
    await ctrl.execute(
      repotModel(one(rock, 'rock'), one(large, 'pot', 'into')),
      ctx2,
    );
    expect(noteReasons(ctx2)).toContain('not-a-plant');
  });
});
