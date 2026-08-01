/**
 * `harvest` — taking the crop off a mature plant (Hinkley Hills Wave 5).
 *
 * Three claims worth testing, and one of them is the reason the whole
 * `_worstLimiting` field exists:
 *
 *   1. The crop is minted, stamped and handed over; the plant ends.
 *   2. ⭐ The GRADE is weakest-link. Two plants finishing in identical
 *      condition grade differently when one had a bad stretch — which
 *      cannot be recovered from the smoothed vigor after the fact.
 *   3. Nitrogen is exported, so an unfed bed yields worse each round.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HarvestController from '../HarvestController';
import Plant from '../../../Plant';
import Crop from '../../../Crop';
import type { Crafted } from '../../../../lib/craft/Crafted';
import GardenBed from '../../../GardenBed';
import Material from '../../../../lib/material/Material';
import { Reserve } from '../../../../lib/reserve';
import { type GrowthProfileData } from '../../../../lib/husbandry/Growing';
import {
  PLANT_SLOT,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
} from '../../../../lib/husbandry/Cultivable';
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
import { StuffApi } from '../../../../api/stuff';
import { MixinApi } from '../../../../api/mixin';
import { ContainmentApi } from '../../../../api/containment';
import { PersistableApi } from '../../../../api/persistable';
import { AdvancementApi } from '../../../../api/advancement';
import { WorldClockApi } from '../../../../api/worldclock';
import { Document } from '../../../../lib/persistence/Document';
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
  static _mixinName = 'TestGiverHarvest';
  received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}
class LitRoom extends AmbientLitMixin(Location) {}

const DAY = 86_400;
const BASE = 40_000_000;
let now = BASE;
function setNow(s: number): void {
  now = BASE + s;
}
let seq = 0;
function freshPath(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

const CROP_PATH = '/obj/crop/_test-carrot';

function carrotProfile(): GrowthProfileData {
  return {
    moistureHappyAt: 0.3,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0.12,
    luxHappyAt: 120,
    luxDarkAt: 15,
    rootDemand: { seedling: 0.2, young: 1.0, established: 2.0, mature: 3.0 },
    daysToStage: { young: 14, established: 42, mature: 84 },
  };
}

function tissue(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('plant-tissue');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, freshPath('/lib/material/_test/harv-tissue')) as unknown as Material;
}

function makePlant(opts: { harvestable?: boolean } = {}): Plant {
  return makeStuffAtPath(() => {
    const p = new Plant();
    p.setShortDescription('a row of carrots');
    p.setMaterial(tissue());
    p.setMass(Quantity.of(0.5, 'kg'));
    p.setLastAmbientK(295);
    p.setLifecycleState('alive');
    p.setProfile(carrotProfile());
    if (opts.harvestable !== false) p.setHarvestTemplatePath(CROP_PATH);
    p.setNutrientDraw(15);
    return p;
  }, freshPath('/obj/plant/_harv'));
}

function makeBed(nitrogen = 100, water = 6): GardenBed {
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
        Quantity.of(water, 'L'),
        Quantity.of(water, 'L'),
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
  }, freshPath('/obj/bed/_harv'));
}

function forceStage(plant: Plant, stage: string): void {
  (plant as unknown as { growthStage: string }).growthStage = stage;
}
function forceWorst(plant: Plant, worst: number): void {
  (plant as unknown as { _worstLimiting: number })._worstLimiting = worst;
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
    commandText: 'harvest',
    executionId: 'test',
    commandId: 'test',
    verb: 'harvest',
    command: stubCommand('harvest'),
  });
}

function one(stuff: Stuff | null, raw: string): MqlOneResult {
  return { stuff, raw };
}
type HarvestExecModel = Parameters<HarvestController['execute']>[0];
function model(target: MqlOneResult): HarvestExecModel {
  return { target } as ModelData as unknown as HarvestExecModel;
}
function noteReasons(ctx: CommandContext): string[] {
  return ctx.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
}

/**
 * Narrow a minted crop to the `Crafted` interface. `getGrade` comes from
 * the inner `GradedMixin`, which TypeScript does not surface on an
 * anonymous mixin base — `MixinApi.isCrafted` is the shipped way through
 * (`Crafted extends Graded`).
 */
function crafted(s: Stuff | undefined): Crafted {
  expect(s).toBeDefined();
  expect(MixinApi.isCrafted(s!)).toBe(true);
  return s as unknown as Crafted;
}

let deeds: Array<{ discipline: string; difficulty: string; outcome: string }>;
let cropSeq = 0;

describe('harvest <plant>', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    // Destructing the plant runs its cleanup capture, which preloads
    // marshallers. Nothing here asserts on the record store, so a no-op
    // resolver keeps the teardown quiet (the OfficeController precedent).
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    deeds = [];
    vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation(
      (async () => {}) as unknown as typeof PersistableApi.captureHostOf,
    );
    vi.spyOn(AdvancementApi, 'recordDeed').mockImplementation((async (
      _o: Stuff,
      s: { discipline: string; difficulty: string; outcome: string },
    ) => {
      deeds.push(s);
    }) as unknown as typeof AdvancementApi.recordDeed);
    // The crop mint goes through the gated clone path; stand in a fresh
    // Crop so the test exercises the stamp rather than the template store.
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path !== CROP_PATH) throw new Error(`no template ${path}`);
      cropSeq += 1;
      return makeStuffAtPath(() => {
        const c = new Crop();
        c.setShortDescription('a bunch of carrots');
        return c;
      }, `/obj/crop/_minted-${cropSeq}`);
    }) as unknown as typeof StuffApi.clone);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function scene(): { giver: TestGiver; room: LitRoom; bed: GardenBed } {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(400);
    // At a PATH: the maker's mark is a durable templatePath, so a
    // pathless giver would stamp an empty maker — which is the shape a
    // real Avatar never has.
    const giver = makeStuffAtPath(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    }, freshPath('/obj/Avatar/_harv-alice'));
    ContainmentApi.move(giver, room);
    const bed = makeBed();
    ContainmentApi.move(bed, room);
    return { giver, room, bed };
  }

  /** Seat a mature plant with a chosen worst-limiting history. */
  function ripe(bed: GardenBed, worst = 1): Plant {
    const p = makePlant();
    ContainmentApi.move(p, bed);
    bed.occupy(p, PLANT_SLOT);
    forceStage(p, 'mature');
    forceWorst(p, worst);
    return p;
  }

  it('⭐ mints the crop, hands it over, and ENDS the plant', async () => {
    const { giver, room, bed } = scene();
    const plant = ripe(bed);

    const ctrl = makeStuff(() => new HarvestController());
    await ctrl.execute(model(one(plant, 'carrots')), makeContext(giver, room));

    const crop = giver.getContents().find((s) => s instanceof Crop);
    expect(crop).toBeDefined();
    expect(plant.isDestroyed()).toBe(true);
    // …and the bed has its place back.
    expect(bed.occupiedSlotCount()).toBe(0);
    expect(bed.hasFreePlantSlot()).toBe(true);
  });

  it('the crop carries a MAKER and a band', async () => {
    const { giver, room, bed } = scene();
    const plant = ripe(bed);

    const ctrl = makeStuff(() => new HarvestController());
    await ctrl.execute(model(one(plant, 'carrots')), makeContext(giver, room));

    const crop = crafted(giver.getContents().find((s) => s instanceof Crop));
    expect(crop.getMaker()).toBeTruthy();
    expect(crop.getGrade().getBand()).toBeTruthy();
    // The prose surface crafting already ships works unchanged.
    expect(crop.renderVerdict()).toMatch(/It looks /);
  });

  it('⭐ the grade is WEAKEST-LINK, not final condition', async () => {
    // Two plants in identical shape at harvest — same stage, same bed,
    // same everything — differing only in whether they had a bad
    // stretch. The nursed-back one must grade worse, and no read of its
    // present condition could tell you that.
    const { giver, room, bed } = scene();
    const kept = ripe(bed, 1.0);
    const neglected = ripe(bed, 0.4);
    expect(kept.getGrowthStage()).toBe(neglected.getGrowthStage());

    const ctrl = makeStuff(() => new HarvestController());
    await ctrl.execute(model(one(kept, 'carrots')), makeContext(giver, room));
    await ctrl.execute(
      model(one(neglected, 'carrots')),
      makeContext(giver, room),
    );

    const raw = giver.getContents().filter((s) => s instanceof Crop);
    expect(raw).toHaveLength(2);
    const first = crafted(raw[0]);
    const second = crafted(raw[1]);
    expect(first.getGrade().getOrdinal()).toBeGreaterThan(
      second.getGrade().getOrdinal(),
    );
    expect(first.getGrade().getBand()).toBe('masterful');
    expect(second.getGrade().getBand()).toBe('fair');
  });

  it('walks the whole ladder as the worst reading falls', async () => {
    const { giver, room, bed } = scene();
    const ctrl = makeStuff(() => new HarvestController());
    const bands: string[] = [];
    for (const worst of [1.0, 0.85, 0.7, 0.4, 0.1]) {
      const p = ripe(bed, worst);
      await ctrl.execute(model(one(p, 'carrots')), makeContext(giver, room));
      const crops = giver.getContents().filter((s) => s instanceof Crop);
      bands.push(crafted(crops[crops.length - 1]).getGrade().getBand());
    }
    expect(bands).toEqual([
      'masterful',
      'exceptional',
      'fine',
      'fair',
      'poor',
    ]);
  });

  it('⭐ exports nitrogen — an unfed bed yields worse across rounds', async () => {
    const { giver, room, bed } = scene();
    const ctrl = makeStuff(() => new HarvestController());
    expect(bed.nutrientFraction()).toBe(1);

    const levels: number[] = [];
    for (let round = 0; round < 3; round++) {
      const p = ripe(bed);
      await ctrl.execute(model(one(p, 'carrots')), makeContext(giver, room));
      levels.push(bed.nutrientFraction()!);
    }
    // 15 points a crop: 100 → 85 → 70 → 55, monotonically down.
    expect(levels).toEqual([0.85, 0.7, 0.55]);
    expect(levels[2]!).toBeLessThan(levels[0]!);
  });

  it('feeding puts it back, so the loop closes', async () => {
    const { giver, room, bed } = scene();
    const ctrl = makeStuff(() => new HarvestController());
    const p = ripe(bed);
    await ctrl.execute(model(one(p, 'carrots')), makeContext(giver, room));
    expect(bed.nutrientFraction()).toBe(0.85);

    bed.feedSoil(15);
    expect(bed.nutrientFraction()).toBe(1);
  });

  it('refuses an IMMATURE plant, naming the stage', async () => {
    const { giver, room, bed } = scene();
    const p = makePlant();
    ContainmentApi.move(p, bed);
    bed.occupy(p, PLANT_SLOT);
    forceStage(p, 'young');

    const ctrl = makeStuff(() => new HarvestController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(p, 'carrots')), ctx);

    expect(noteReasons(ctx)).toContain('not-mature');
    const detail = ctx
      .getNotes()
      .map((n) => (n as { detail?: string }).detail ?? '')
      .join(' ');
    expect(detail).toContain('young');
    expect(p.isDestroyed()).toBe(false);
    expect(bed.nutrientFraction()).toBe(1); // nothing was exported
  });

  it('refuses an ORNAMENTAL that yields nothing', async () => {
    const { giver, room, bed } = scene();
    const p = makePlant({ harvestable: false });
    ContainmentApi.move(p, bed);
    bed.occupy(p, PLANT_SLOT);
    forceStage(p, 'mature');

    const ctrl = makeStuff(() => new HarvestController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(p, 'carrots')), ctx);

    expect(noteReasons(ctx)).toContain('not-harvestable');
    expect(p.isDestroyed()).toBe(false);
  });

  it('refuses something that is not a plant', async () => {
    const { giver, room, bed } = scene();
    const ctrl = makeStuff(() => new HarvestController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(bed, 'bed')), ctx);
    expect(noteReasons(ctx)).toContain('not-a-plant');
  });

  it('credits agriculture', async () => {
    const { giver, room, bed } = scene();
    const plant = ripe(bed);
    const ctrl = makeStuff(() => new HarvestController());
    await ctrl.execute(model(one(plant, 'carrots')), makeContext(giver, room));

    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.discipline).toBe('agriculture');
  });
});
