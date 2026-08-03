/**
 * `feed` — working compost into a bed's soil (Hinkley Hills Wave 4).
 *
 * `water`'s twin, and the tests mirror WaterVerb's: an explicit measure
 * sized to the soil's headroom, naming either half of the assembly, the
 * ground captured after the act, and the deed credited only when the soil
 * actually took something.
 *
 * The one place it deliberately diverges: `feed` is NOT tool-afforded. You
 * feed by hand out of a sack, as you pour soil by hand, so there is no
 * `TOOL_CAPABILITIES` row and no instrument to carry.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FeedController from '../FeedController';
import Receptacle from '../../../Receptacle';
import Plant from '../../../Plant';
import GardenBed from '../../../GardenBed';
import PlantPot from '../../../PlantPot';
import Material from '../../../../lib/material/Material';
import { Reserve } from '../../../../lib/reserve';
import { type GrowthProfileData } from '../../../../lib/husbandry/Growing';
import {
  PLANT_SLOT,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
} from '../../../../lib/husbandry/Cultivable';
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
  static _mixinName = 'TestGiverFeed';
  received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}
class LitRoom extends AmbientLitMixin(Location) {}

const BASE = 30_000_000;
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

function compost(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('compost');
    m.setAppearance('crumbly black compost');
    m.setTags(['granular', 'solid', 'soil', 'compost']);
    m.setSpecificHeat(Quantity.of(1400, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.2, 'W/(m·K)'));
    return m;
  }, freshPath('/obj/material/_test/compost')) as unknown as Material;
}

function tissue(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('plant-tissue');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, freshPath('/obj/material/_test/feed-tissue')) as unknown as Material;
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
  }, freshPath('/obj/plant/_feed'));
}

/** A bed with `nitrogen` percentage points already in it. */
function makeBed(nitrogen = 100): GardenBed {
  return makeStuffAtPath(() => {
    const bed = new GardenBed();
    bed.setShortDescription('a raised garden bed');
    bed.setMass(Quantity.of(340, 'kg'));
    bed.interiorBulk = true;
    bed.setInteriorCapacity(Quantity.of(12, 'L'));
    bed.setInteriorAmount(Quantity.of(12, 'L'));
    bed.setStaticSlots([
      { name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 4 },
    ]);
    bed.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(6, 'L'),
        Quantity.of(6, 'L'),
        'cultivation',
        'wilting',
      ),
    );
    bed.setReserve(
      new Reserve(
        SOIL_NITROGEN_RESERVE_KEY,
        Quantity.of(100, '%'),
        Quantity.of(nitrogen, '%'),
        'cultivation',
        'spent',
      ),
    );
    return bed;
  }, freshPath('/obj/bed/_feed'));
}

/** A pot — moisture only, NO nitrogen. */
function makePot(): PlantPot {
  return makeStuffAtPath(() => {
    const pot = new PlantPot();
    pot.setShortDescription('a clay pot');
    pot.interiorBulk = true;
    pot.setInteriorCapacity(Quantity.of(3, 'L'));
    pot.setInteriorAmount(Quantity.of(3, 'L'));
    pot.setStaticSlots([
      { name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 1 },
    ]);
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
  }, freshPath('/obj/pot/_feed'));
}

function makeSack(litres: number): Receptacle {
  return makeStuffAtPath(() => {
    const sack = new Receptacle();
    sack.setShortDescription('a sack of compost');
    sack.interiorBulk = true;
    sack.setInteriorCapacity(Quantity.of(20, 'L'));
    sack.setBulkMaterial('interior', compost());
    sack.setInteriorAmount(Quantity.of(litres, 'L'));
    return sack;
  }, freshPath('/obj/vessel/_compost-sack'));
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
    commandText: 'feed',
    executionId: 'test',
    commandId: 'test',
    verb: 'feed',
    command: stubCommand('feed'),
  });
}

function one(stuff: Stuff | null, raw: string, prep?: string): MqlOneResult {
  const out: MqlOneResult = { stuff, raw };
  if (prep) out.prep = prep;
  return out;
}

type FeedExecModel = Parameters<FeedController['execute']>[0];
function model(target: MqlOneResult, source?: MqlOneResult): FeedExecModel {
  return { target, source } as ModelData as unknown as FeedExecModel;
}

function noteReasons(ctx: CommandContext): string[] {
  return ctx.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
}

let captured: Stuff[];
let deeds: Array<{ discipline: string; difficulty: string; outcome: string }>;

describe('feed is NOT tool-afforded', () => {
  it('no capability row confers it — you feed by hand', () => {
    // `water` rides the `watering` row because a can is an instrument.
    // Compost is a material, not a tool, so there is nothing to confer.
    for (const name of ToolCapabilities.ALL) {
      const def = ToolCapabilities.definitionOf(name);
      expect(def?.verbs ?? []).not.toContain('bulk/feed.yaml');
    }
    // …and `water` DOES ride one, which is the contrast.
    expect(ToolCapabilities.definitionOf('watering')?.verbs).toContain(
      'bulk/water.yaml',
    );
  });
});

describe('feed <bed>', () => {
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

  // No StuffApi.clearAll() — it wipes the WorldClockRegistry.
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function scene(nitrogen = 0): {
    giver: TestGiver;
    room: LitRoom;
    bed: GardenBed;
  } {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(300);
    const giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    });
    ContainmentApi.move(giver, room);
    const bed = makeBed(nitrogen);
    ContainmentApi.move(bed, room);
    return { giver, room, bed };
  }

  it('⭐ works compost in, raising the nitrogen and debiting the sack', async () => {
    const { giver, room, bed } = scene(0);
    const sack = makeSack(20);
    ContainmentApi.move(sack, giver);
    expect(bed.nutrientFraction()).toBe(0);

    const ctrl = makeStuff(() => new FeedController());
    await ctrl.execute(model(one(bed, 'bed')), makeContext(giver, room));

    expect(bed.nutrientFraction()).toBe(1);
    // Only the headroom moved: 100 points at 10 points/L = 10 L.
    expect(sack.getBulkAmount('interior').rawValue()).toBeCloseTo(10, 3);
  });

  it('⭐ credits only the headroom — a part-spent bed takes only what fits', async () => {
    const { giver, room, bed } = scene(70);
    const sack = makeSack(20);
    ContainmentApi.move(sack, giver);

    const ctrl = makeStuff(() => new FeedController());
    await ctrl.execute(model(one(bed, 'bed')), makeContext(giver, room));

    expect(bed.nutrientFraction()).toBe(1);
    // 30 points of headroom = 3 L, and the rest stays in the sack.
    expect(sack.getBulkAmount('interior').rawValue()).toBeCloseTo(17, 3);
  });

  it('feeding a FULL bed says so and spends nothing', async () => {
    const { giver, room, bed } = scene(100);
    const sack = makeSack(20);
    ContainmentApi.move(sack, giver);

    const ctrl = makeStuff(() => new FeedController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(bed, 'bed')), ctx);

    expect(noteReasons(ctx)).toContain('already-fed');
    expect(sack.getBulkAmount('interior').rawValue()).toBe(20);
    expect(deeds).toHaveLength(0);
  });

  it('naming a PLANT feeds the ground it stands in', async () => {
    const { giver, room, bed } = scene(0);
    const sack = makeSack(20);
    ContainmentApi.move(sack, giver);
    const plant = makePlant();
    ContainmentApi.move(plant, bed);
    bed.occupy(plant, PLANT_SLOT);

    const ctrl = makeStuff(() => new FeedController());
    await ctrl.execute(model(one(plant, 'lily')), makeContext(giver, room));

    expect(bed.nutrientFraction()).toBe(1);
  });

  it('⭐ a POT is refused with the reason — a houseplant needs no feeding', async () => {
    const { giver, room } = scene();
    const pot = makePot();
    ContainmentApi.move(pot, room);
    const sack = makeSack(20);
    ContainmentApi.move(sack, giver);

    const ctrl = makeStuff(() => new FeedController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(pot, 'pot')), ctx);

    expect(noteReasons(ctx)).toContain('no-nutrient-reserve');
    expect(sack.getBulkAmount('interior').rawValue()).toBe(20);
  });

  it('refuses something that is not ground at all', async () => {
    const { giver, room } = scene();
    const sack = makeSack(20);
    ContainmentApi.move(sack, giver);

    const ctrl = makeStuff(() => new FeedController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(giver, 'alice')), ctx);

    expect(noteReasons(ctx)).toContain('not-cultivable');
  });

  it('refuses when nothing carried holds compost', async () => {
    const { giver, room, bed } = scene(0);

    const ctrl = makeStuff(() => new FeedController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(bed, 'bed')), ctx);

    expect(noteReasons(ctx)).toContain('no-compost-source');
    expect(bed.nutrientFraction()).toBe(0);
  });

  it('captures the GROUND and credits agriculture', async () => {
    const { giver, room, bed } = scene(0);
    const sack = makeSack(20);
    ContainmentApi.move(sack, giver);

    const ctrl = makeStuff(() => new FeedController());
    await ctrl.execute(model(one(bed, 'bed')), makeContext(giver, room));

    expect(captured).toContain(bed);
    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.discipline).toBe('agriculture');
  });

  it('an explicitly named source is used over a carried one', async () => {
    const { giver, room, bed } = scene(0);
    const carried = makeSack(20);
    const named = makeSack(20);
    ContainmentApi.move(carried, giver);
    ContainmentApi.move(named, room);

    const ctrl = makeStuff(() => new FeedController());
    await ctrl.execute(
      model(one(bed, 'bed'), one(named, 'sack', 'with')),
      makeContext(giver, room),
    );

    expect(named.getBulkAmount('interior').rawValue()).toBeCloseTo(10, 3);
    expect(carried.getBulkAmount('interior').rawValue()).toBe(20);
  });
});
