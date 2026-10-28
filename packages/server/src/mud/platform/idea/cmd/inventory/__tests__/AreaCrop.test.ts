/**
 * The area crop (cover build W0): ground is a bed by CONTAINMENT, and
 * `harvest` and `sow` work by area on ground that holds no plant slot.
 *
 *   1. A plant standing loose in soil-bearing ground is rooted in it —
 *      it reads the ground's moisture, and a pot plant is unchanged.
 *   2. The yield is the sown area × seed rate × yield ratio, less the
 *      ratoon decline; a swath takes a share of it.
 *   3. `harvest` cuts one swath per act: the tool's `swathM2` or the
 *      hand's; goods by the crop row's mass; the remainder carried;
 *      nitrogen in proportion; a monocarp ends at its last swath and a
 *      ratoon settles and counts the cycle.
 *   4. `sow` broadcasts: the ground may refuse, the seed is spent at the
 *      rate, the first act makes the crop and a later act widens it, a
 *      different crop is refused.
 */

import "../../../../../../test-bootstrap";
import { AdvancementMixin } from '../../../../../lib/advancement/Advancement';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HarvestController from '../HarvestController';
import PlantController from '../PlantController';
import Plant from '../../../../thing/Plant';
import Crop from '../../../../thing/Crop';
import Seed from '../../../../thing/Seed';
import Tool from '../../../../thing/Tool';
import Material from '../../../../../lib/material/Material';
import { Reserve, ReservedMixin } from '../../../../../lib/reserve';
import { SoilMixin } from '../../../../../lib/husbandry/Soil';
import { type GrowthProfileData } from '../../../../../lib/husbandry/Growing';
import {
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
} from '../../../../../lib/husbandry/Cultivable';
import { Quantity } from '../../../../../lib/quantity';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../../lib/description/Named';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { AmbientLitMixin } from '../../../../../lib/perception/AmbientLit';
import { Idea } from '../../../../../lib/stuff/Idea';
import Place from '../../../../../lib/stuff/Place';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { ShadowApi } from '../../../../../api/shadow';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { PersistableApi } from '../../../../../api/persistable';
import { ParcelApi } from '../../../../../api/parcel';
import { WorldClockApi } from '../../../../../api/worldclock';
import { Document } from '../../../../../lib/persistence/Document';
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

class TestGiver extends AdvancementMixin(
  SensorMixin(
    CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
  ),
) {
  static _mixinName = 'TestGiverAreaCrop';
  received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

/** Ground: soil-bearing, lit, holding no plant slot — a field's shape. */
class TestGround extends SoilMixin(ReservedMixin(AmbientLitMixin(Place))) {
  refusal: string | null = null;
  titled = 0;
  public override soilCatchmentAreaM2(): number {
    return 1000;
  }
  public override sowingRefusal(): string | null {
    return this.refusal;
  }
  public override async ensureCropTitle(): Promise<void> {
    this.titled += 1;
  }
}

const BASE = 40_000_000;
let now = BASE;
let seq = 0;
function freshPath(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

const CROP_PATH = '/trade/farming/thing/crop/_test-grain';
const PLANT_PATH = '/trade/farming/thing/plant/_test-grain';
const OTHER_PATH = '/trade/farming/thing/plant/_test-other';
const CROP_KG = 2;

function grainProfile(extra: Partial<GrowthProfileData> = {}): GrowthProfileData {
  return {
    moistureHappyAt: 0.3,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0.12,
    luxHappyAt: 120,
    luxDarkAt: 15,
    rootDemand: { seedling: 0.2, young: 1.0, established: 2.0, mature: 3.0 },
    daysToStage: { young: 14, established: 42, mature: 84 },
    seedRateKgPerM2: 0.1,
    yieldRatio: 5,
    ...extra,
  };
}

function tissue(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('plant-tissue');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, freshPath('/stuff/idea/material/_test/area-tissue')) as unknown as Material;
}

function newPlant(profile = grainProfile()): Plant {
  const p = new Plant();
  p.setShortDescription('a stand of grain');
  p.setMaterial(tissue());
  p.setMass(Quantity.of(0.5, 'kg'));
  p.setLastAmbientK(295);
  p.setLifecycleState('alive');
  p.setProfile(profile);
  p.setHarvestTemplatePath(CROP_PATH);
  p.setNutrientDraw(20);
  return p;
}

function makeGround(): TestGround {
  return makeStuffAtPath(() => {
    const g = new TestGround();
    g.setAmbientFlux(400);
    g.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(10, 'L'),
        Quantity.of(10, 'L'),
        'cultivation',
        'wilting',
      ),
    );
    g.setReserve(
      new Reserve(
        SOIL_NITROGEN_RESERVE_KEY,
        Quantity.of(100, '%'),
        Quantity.of(100, '%'),
        'cultivation',
        'spent',
      ),
    );
    return g;
  }, freshPath('/trade/farming/location/_test-field'));
}

function makeSickle(swathM2: number): Tool {
  return makeStuffAtPath(() => {
    const t = new Tool();
    t.setShortDescription('a sickle');
    t.setCapabilities(['reaping']);
    t.setSwathM2(swathM2);
    return t;
  }, freshPath('/trade/farming/thing/_test-sickle'));
}

function makeSeed(kg: number, growsInto = PLANT_PATH): Seed {
  return makeStuffAtPath(() => {
    const s = new Seed();
    s.setShortDescription('a sack of seed');
    s.setGrowsIntoPath(growsInto);
    s.setMass(Quantity.of(kg, 'kg'));
    return s;
  }, freshPath('/trade/farming/thing/seed/_test'));
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(giver: TestGiver, location: Place, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: stubCommand(verb),
  });
}

function one(stuff: Stuff | null, raw: string): MqlOneResult {
  return { stuff, raw };
}
function noteReasons(ctx: CommandContext): string[] {
  return ctx.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
}

/** The landing is fire-and-forget off the engagement; let it settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
}

function crops(giver: TestGiver): Stuff[] {
  return giver.getContents().filter((s) => s instanceof Crop);
}

describe('the area crop', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    WorldClockApi._resetForTesting();
    now = BASE;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation(
      (async () => {}) as unknown as typeof PersistableApi.captureHostOf,
    );
    vi.spyOn(ParcelApi, 'coveringParcelOf').mockResolvedValue(null);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path === CROP_PATH) {
        return makeStuffAtPath(() => {
          const c = new Crop();
          c.setShortDescription('a sack of grain');
          c.setMass(Quantity.of(CROP_KG, 'kg'));
          return c;
        }, freshPath('/trade/farming/thing/crop/_minted'));
      }
      if (path === PLANT_PATH) return makeStuffAtPath(() => newPlant(), path);
      if (path === OTHER_PATH) return makeStuffAtPath(() => newPlant(), path);
      throw new Error(`no template ${path}`);
    }) as unknown as typeof StuffApi.clone);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function scene(): { giver: TestGiver; ground: TestGround } {
    const ground = makeGround();
    const giver = makeStuffAtPath(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    }, freshPath('/platform/agent/Avatar/_area-alice'));
    vi.spyOn(
      giver as unknown as { creditDeed(): Promise<void> },
      'creditDeed',
    ).mockImplementation(async () => {});
    ContainmentApi.move(giver, ground);
    return { giver, ground };
  }

  function standingCrop(ground: TestGround, areaM2 = 100, path = PLANT_PATH): Plant {
    const p = makeStuffAtPath(() => newPlant(), path);
    p.setSownAreaM2(areaM2);
    ContainmentApi.move(p, ground);
    (p as unknown as { growthStage: string }).growthStage = 'mature';
    return p;
  }

  describe('ground is a bed by containment', () => {
    it('⭐ a plant loose in soil-bearing ground is rooted in it', () => {
      const { ground } = scene();
      const p = standingCrop(ground);
      expect(p.getBed()).toBe(ground);
      expect(p.getSoilMoisture()).toBeGreaterThan(0);
    });

    it('a plant loose in ground with no soil is unrooted', () => {
      const room = makeStuff(() => new (AmbientLitMixin(Place))());
      const p = makeStuffAtPath(() => newPlant(), freshPath(PLANT_PATH));
      ContainmentApi.move(p, room);
      expect(p.getBed()).toBeNull();
    });
  });

  describe('the yield', () => {
    it('is area × seed rate × yield ratio, and a swath takes its share', () => {
      const { ground } = scene();
      const p = standingCrop(ground, 100);
      expect(p.isAreaCrop()).toBe(true);
      expect(p.standingYieldKg()).toBeCloseTo(100 * 0.1 * 5);
      const cut = p.takeSwath(30);
      expect(cut.areaCut).toBe(30);
      expect(cut.kg).toBeCloseTo(15);
      expect(cut.last).toBe(false);
      expect(p.standingAreaM2()).toBe(70);
      const rest = p.takeSwath(1000);
      expect(rest.areaCut).toBe(70);
      expect(rest.last).toBe(true);
    });

    it('a third of the area is a third of the yield', () => {
      const { ground } = scene();
      const full = standingCrop(ground, 900).standingYieldKg();
      const ground2 = makeGround();
      const third = standingCrop(ground2, 300).standingYieldKg();
      expect(third / full).toBeCloseTo(1 / 3);
    });

    it('⭐ a ratoon declines each cycle, and tires', () => {
      const { ground } = scene();
      const p = makeStuffAtPath(
        () => newPlant(grainProfile({ yieldDeclinePerCycle: 0.12 })),
        PLANT_PATH,
      );
      p.setSownAreaM2(100);
      ContainmentApi.move(p, ground);
      (p as unknown as { growthStage: string }).growthStage = 'mature';
      const first = p.standingYieldKg();
      p.takeSwath(100);
      p.settleRatoon();
      expect(p.getCycleCount()).toBe(1);
      expect(p.standingAreaM2()).toBe(100);
      // Mature monocarp-shaped profile: harvestable again at once.
      expect(p.standingYieldKg() / first).toBeCloseTo(0.88);
      expect(p.isTiredRatoon()).toBe(false);
      (p as unknown as { _cycleCount: number })._cycleCount = 5;
      expect(p.isTiredRatoon()).toBe(true);
    });

    it('an individual plant is not an area crop', () => {
      const p = makeStuffAtPath(() => newPlant(), freshPath(PLANT_PATH));
      expect(p.isAreaCrop()).toBe(false);
      expect(p.takeSwath(10)).toEqual({ kg: 0, areaCut: 0, last: false });
    });
  });

  describe('harvest by the swath', () => {
    it('⭐ the tool sets the swath; goods mint by the row mass', async () => {
      const { giver, ground } = scene();
      const p = standingCrop(ground, 100);
      const sickle = makeSickle(10); // 10 m² × 0.5 kg = 5 kg → 2 × 2 kg + 1 carried
      const ctx = makeContext(giver, ground, 'harvest');
      await makeStuff(() => new HarvestController()).execute(
        { target: one(p, 'grain'), tool: one(sickle, 'sickle') } as ModelData as never,
        ctx,
      );
      await settle();
      expect(crops(giver)).toHaveLength(2);
      expect(p.getHarvestCarryKg()).toBeCloseTo(1);
      expect(p.standingAreaM2()).toBe(90);
      expect(ground.titled).toBe(1);
    });

    it('bare hands cut the small hand swath', async () => {
      const { giver, ground } = scene();
      const p = standingCrop(ground, 100);
      await makeStuff(() => new HarvestController()).execute(
        { target: one(p, 'grain') } as ModelData as never,
        makeContext(giver, ground, 'harvest'),
      );
      await settle();
      // 2 m² × 0.5 kg = 1 kg: not yet a 2 kg good — carried.
      expect(crops(giver)).toHaveLength(0);
      expect(p.getHarvestCarryKg()).toBeCloseTo(1);
      expect(p.standingAreaM2()).toBe(98);
    });

    it('takes nitrogen in proportion to the area cut', async () => {
      const { giver, ground } = scene();
      const p = standingCrop(ground, 100);
      const before = ground.nutrientFraction()!;
      await makeStuff(() => new HarvestController()).execute(
        { target: one(p, 'grain'), tool: one(makeSickle(50), 'sickle') } as ModelData as never,
        makeContext(giver, ground, 'harvest'),
      );
      await settle();
      const after = ground.nutrientFraction()!;
      // Half the area: half of the 20-point draw.
      expect((before - after) * 100).toBeCloseTo(10, 0);
    });

    it('⭐ a monocarp ends at its last swath, the remainder made up', async () => {
      const { giver, ground } = scene();
      const p = standingCrop(ground, 3); // 1.5 kg — under one good
      await makeStuff(() => new HarvestController()).execute(
        { target: one(p, 'grain'), tool: one(makeSickle(10), 'sickle') } as ModelData as never,
        makeContext(giver, ground, 'harvest'),
      );
      await settle();
      expect(p.isDestroyed()).toBe(true);
      const got = crops(giver);
      expect(got).toHaveLength(1);
      expect(
        (got[0] as unknown as { getMass(): Quantity<'kg'> }).getMass().rawValue(),
      ).toBeCloseTo(1.5);
    });

    it('an unripe crop is refused by name', async () => {
      const { giver, ground } = scene();
      const p = standingCrop(ground, 100);
      (p as unknown as { growthStage: string }).growthStage = 'young';
      const ctx = makeContext(giver, ground, 'harvest');
      await makeStuff(() => new HarvestController()).execute(
        { target: one(p, 'grain') } as ModelData as never,
        ctx,
      );
      expect(noteReasons(ctx)).toContain('not-mature');
    });
  });

  describe('sow by broadcast', () => {
    it('⭐ the first cast makes the crop; the seed is spent at the rate', async () => {
      const { giver, ground } = scene();
      const seed = makeSeed(3); // 3 kg at 0.1 kg/m² = 30 m²
      ContainmentApi.move(seed, giver);
      await makeStuff(() => new PlantController()).execute(
        { seed: one(seed, 'seed') } as ModelData as never,
        makeContext(giver, ground, 'sow'),
      );
      await settle();
      const crop = ground
        .getContents()
        .find((s): s is Plant => s instanceof Plant);
      expect(crop).toBeDefined();
      expect(crop!.getSownAreaM2()).toBeCloseTo(30);
      expect(seed.isDestroyed()).toBe(true);
      expect(ground.titled).toBe(1);
    });

    it('one cast covers the hand area; a later cast widens the crop', async () => {
      const { giver, ground } = scene();
      const seed = makeSeed(25); // enough for 250 m²
      ContainmentApi.move(seed, giver);
      const ctrl = () => makeStuff(() => new PlantController());
      await ctrl().execute({ seed: one(seed, 'seed') } as ModelData as never, makeContext(giver, ground, 'sow'));
      await settle();
      await ctrl().execute({ seed: one(seed, 'seed') } as ModelData as never, makeContext(giver, ground, 'sow'));
      await settle();
      const sown = ground.getContents().filter((s): s is Plant => s instanceof Plant);
      expect(sown).toHaveLength(1);
      expect(sown[0]!.getSownAreaM2()).toBeCloseTo(200);
      expect(
        (seed as unknown as { getMass(): Quantity<'kg'> }).getMass().rawValue(),
      ).toBeCloseTo(5);
    });

    it('⭐ the ground may refuse, in its own words', async () => {
      const { giver, ground } = scene();
      ground.refusal = 'The ground has not been ploughed for the season.';
      const seed = makeSeed(3);
      ContainmentApi.move(seed, giver);
      const ctx = makeContext(giver, ground, 'sow');
      await makeStuff(() => new PlantController()).execute(
        { seed: one(seed, 'seed') } as ModelData as never,
        ctx,
      );
      expect(noteReasons(ctx)).toContain('ground-refuses-sowing');
      expect(seed.isDestroyed()).toBe(false);
    });

    it('a different crop standing is refused', async () => {
      const { giver, ground } = scene();
      standingCrop(ground, 100, OTHER_PATH);
      const seed = makeSeed(3);
      ContainmentApi.move(seed, giver);
      const ctx = makeContext(giver, ground, 'sow');
      await makeStuff(() => new PlantController()).execute(
        { seed: one(seed, 'seed') } as ModelData as never,
        ctx,
      );
      expect(noteReasons(ctx)).toContain('other-crop-stands');
    });

    it('a seed planted one at a time is not broadcast', async () => {
      const { giver, ground } = scene();
      vi.mocked(StuffApi.clone).mockImplementation((async () =>
        makeStuffAtPath(
          () => newPlant(grainProfile({ seedRateKgPerM2: undefined })),
          freshPath(PLANT_PATH),
        )) as unknown as typeof StuffApi.clone);
      const seed = makeSeed(3);
      ContainmentApi.move(seed, giver);
      const ctx = makeContext(giver, ground, 'sow');
      await makeStuff(() => new PlantController()).execute(
        { seed: one(seed, 'seed') } as ModelData as never,
        ctx,
      );
      expect(noteReasons(ctx)).toContain('not-broadcast');
    });
  });
});
