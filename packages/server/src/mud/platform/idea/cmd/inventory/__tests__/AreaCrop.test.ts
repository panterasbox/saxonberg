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

/** A named part of a divided ground — the `Patch` shape, in the kernel. */
class TestPart extends SoilMixin(ReservedMixin(NamedMixin(Idea))) {
  key = '';
  area = 0;
  public override soilPartKey(): string {
    return this.key;
  }
  public override soilCatchmentAreaM2(): number {
    return this.area;
  }
}

/** A field divided into parts; it keeps no soil of its own. */
class DividedGround extends SoilMixin(ReservedMixin(AmbientLitMixin(Place))) {
  parts: TestPart[] = [];
  titled = 0;
  public override soilParts(): readonly TestPart[] {
    return this.parts;
  }
  public override soilCatchmentAreaM2(): number {
    return this.parts.reduce((n, p) => n + p.area, 0);
  }
  public override sowingRefusal(): string | null {
    return null;
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

function one(stuff: Stuff | null, raw: string, prep?: string): MqlOneResult {
  const out: MqlOneResult = { stuff, raw };
  if (prep) out.prep = prep;
  return out;
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

    it('⭐ the light is the field’s, not the dark warren the field sits in', () => {
      // A field that is itself held by something — its warren — the way a
      // real `Field` is (a `Location` is containable).
      class HeldGround extends SoilMixin(ReservedMixin(AmbientLitMixin(ContainableMixin(Place)))) {}
      const ground = makeStuff(() => {
        const g = new HeldGround();
        g.setAmbientFlux(400);
        g.setReserve(new Reserve(SOIL_MOISTURE_RESERVE_KEY, Quantity.of(10, 'L'), Quantity.of(10, 'L'), 'cultivation', 'wilting'));
        return g;
      });
      const warren = makeStuff(() => new (ContainerMixin(ContainableMixin(Idea)))());
      ContainmentApi.move(ground as never, warren as never);
      const p = makeStuffAtPath(() => newPlant(), PLANT_PATH);
      p.setSownAreaM2(100);
      ContainmentApi.move(p, ground as never);
      // `getLimitingFactor` samples light live: a lit field is not dark.
      expect(p.getLimitingFactor()).not.toBe('light');
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

    it('⭐ a field crop on thin ground ripens late, where a pot plant would stall', () => {
      const { ground } = scene();
      // Thin ground: nitrogen at 20% — nutrient satisfaction under "good".
      ground.setReserve(new Reserve(SOIL_NITROGEN_RESERVE_KEY, Quantity.of(100, '%'), Quantity.of(20, '%'), 'cultivation', 'spent'));
      const field = makeStuffAtPath(() => newPlant(), PLANT_PATH);
      field.setSownAreaM2(100);
      ContainmentApi.move(field, ground);
      const single = makeStuffAtPath(() => newPlant(), freshPath(PLANT_PATH));
      ContainmentApi.move(single, ground);
      field.getGrowthStage();
      single.getGrowthStage();
      now = BASE + 200 * 86_400;
      ground.waterSoil(10);
      expect(field.getGrowthStage()).not.toBe('seedling');
      expect(single.getGrowthStage()).toBe('seedling');
    });

    it('⭐ a ripe field crop holds until it is cut — drought does not kill it standing', () => {
      const { ground } = scene();
      const field = makeStuffAtPath(() => newPlant(), PLANT_PATH);
      field.setSownAreaM2(100);
      ContainmentApi.move(field, ground);
      field.getGrowthStage();
      (field as unknown as { growthStage: string }).growthStage = 'mature';
      // A long dry spell with nothing in the ground: a growing crop dies
      // of this; a ripe one is finished and stands ready to cut.
      ground.setReserve(new Reserve(SOIL_MOISTURE_RESERVE_KEY, Quantity.of(200, 'L'), Quantity.of(0, 'L'), 'cultivation', 'wilting'));
      now = BASE + 120 * 86_400;
      expect(field.getGrowthStage()).toBe('mature');
      expect(field.takeSwath(10).kg).toBeGreaterThan(0);
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
      const seed = makeSeed(100); // enough for 1,000 m²
      ContainmentApi.move(seed, giver);
      const ctrl = () => makeStuff(() => new PlantController());
      await ctrl().execute({ seed: one(seed, 'seed') } as ModelData as never, makeContext(giver, ground, 'sow'));
      await settle();
      await ctrl().execute({ seed: one(seed, 'seed') } as ModelData as never, makeContext(giver, ground, 'sow'));
      await settle();
      const sown = ground.getContents().filter((s): s is Plant => s instanceof Plant);
      expect(sown).toHaveLength(1);
      expect(sown[0]!.getSownAreaM2()).toBeCloseTo(800);
      expect(
        (seed as unknown as { getMass(): Quantity<'kg'> }).getMass().rawValue(),
      ).toBeCloseTo(20);
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
      // A different crop: another row AND another harvest (a row that
      // cuts to the same crop is the same crop — the bench's stands).
      standingCrop(ground, 100, OTHER_PATH).setHarvestTemplatePath(
        '/trade/farming/thing/crop/_test-other',
      );
      const seed = makeSeed(3);
      ContainmentApi.move(seed, giver);
      const ctx = makeContext(giver, ground, 'sow');
      await makeStuff(() => new PlantController()).execute(
        { seed: one(seed, 'seed') } as ModelData as never,
        ctx,
      );
      expect(noteReasons(ctx)).toContain('other-crop-stands');
    });

    it('⭐ another ROW of the same crop standing is widened, not refused', async () => {
      const { giver, ground } = scene();
      // The bench's shape: an `extends:` row over the seed's plant, same
      // harvest — it is the same wheat.
      const stand = standingCrop(ground, 100, OTHER_PATH);
      const seed = makeSeed(3);
      ContainmentApi.move(seed, giver);
      const ctx = makeContext(giver, ground, 'sow');
      await makeStuff(() => new PlantController()).execute(
        { seed: one(seed, 'seed') } as ModelData as never,
        ctx,
      );
      await settle();
      expect(noteReasons(ctx)).not.toContain('other-crop-stands');
      expect(stand.getSownAreaM2()).toBeCloseTo(130);
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
  describe('⭐ by the patch (field population W3)', () => {
    function makePart(key: string, area: number, nitrogen = 100): TestPart {
      return makeStuffAtPath(() => {
        const p = new TestPart();
        p.key = key;
        p.area = area;
        p.setName(key.replace('-', ' '));
        p.setReserve(new Reserve(SOIL_MOISTURE_RESERVE_KEY, Quantity.of(10, 'L'), Quantity.of(10, 'L'), 'cultivation', 'wilting'));
        p.setReserve(new Reserve(SOIL_NITROGEN_RESERVE_KEY, Quantity.of(100, '%'), Quantity.of(nitrogen, '%'), 'cultivation', 'spent'));
        return p;
      }, freshPath(`/trade/farming/thing/_test-part-${key}`));
    }

    function dividedScene(keys: Array<[string, number]>): {
      giver: TestGiver;
      field: DividedGround;
      parts: TestPart[];
    } {
      const field = makeStuffAtPath(() => {
        const g = new DividedGround();
        g.setAmbientFlux(400);
        return g;
      }, freshPath('/trade/farming/location/_test-divided'));
      field.parts = keys.map(([k, a]) => makePart(k, a));
      const giver = makeStuffAtPath(() => {
        const g = new TestGiver();
        g.setName('Alice');
        return g;
      }, freshPath('/platform/agent/Avatar/_patch-alice'));
      vi.spyOn(
        giver as unknown as { creditDeed(): Promise<void> },
        'creditDeed',
      ).mockImplementation(async () => {});
      ContainmentApi.move(giver, field);
      return { giver, field, parts: field.parts };
    }

    function standAt(field: DividedGround, part: TestPart, worst: number, areaM2 = 100): Plant {
      const p = makeStuffAtPath(() => newPlant(), PLANT_PATH);
      p.setSownAreaM2(areaM2);
      p.setGroundPart(part.key);
      ContainmentApi.move(p, field);
      (p as unknown as { growthStage: string }).growthStage = 'mature';
      (p as unknown as { _worstLimiting: number })._worstLimiting = worst;
      return p;
    }

    function gradeOf(s: Stuff): string {
      return (s as unknown as { getGrade(): { getBand(): string } }).getGrade().getBand();
    }

    it('⭐ harvest at a part cuts THAT part’s stand and grades it by its own worst stretch', async () => {
      const { giver, field, parts } = dividedScene([['top-end', 100], ['lane-end', 100]]);
      const [top, lane] = parts as [TestPart, TestPart];
      const starved = standAt(field, top, 0.2);
      const thriving = standAt(field, lane, 0.9);
      expect(starved.getBed()).toBe(top);
      const laneN = lane.nutrientFraction();

      // Named by the lane end's stand, cut at the top end.
      await makeStuff(() => new HarvestController()).execute(
        {
          target: one(thriving, 'grain'),
          patch: one(top, 'the top end', 'at'),
          tool: one(makeSickle(10), 'sickle'),
        } as ModelData as never,
        makeContext(giver, field, 'harvest'),
      );
      await settle();
      expect(starved.standingAreaM2()).toBe(90);
      expect(thriving.standingAreaM2()).toBe(100);
      const first = crops(giver);
      expect(first.length).toBeGreaterThan(0);
      expect(first.every((c) => gradeOf(c) === 'poor')).toBe(true);
      // The nitrogen goes out of the part cut, and only that part.
      expect(top.nutrientFraction()!).toBeLessThan(1);
      expect(lane.nutrientFraction()).toBe(laneN);

      await makeStuff(() => new HarvestController()).execute(
        {
          target: one(starved, 'grain'),
          patch: one(lane, 'the lane end', 'at'),
          tool: one(makeSickle(10), 'sickle'),
        } as ModelData as never,
        makeContext(giver, field, 'harvest'),
      );
      await settle();
      expect(thriving.standingAreaM2()).toBe(90);
      const second = crops(giver).filter((c) => !first.includes(c));
      expect(second.length).toBeGreaterThan(0);
      expect(second.every((c) => gradeOf(c) === 'exceptional')).toBe(true);
    });

    it('⭐ naming no part on a divided field is refused by the GROUND, listing them', async () => {
      const { giver, field, parts } = dividedScene([['top-end', 100], ['lane-end', 100]]);
      const stand = standAt(field, parts[0]!, 0.9);
      const ctx = makeContext(giver, field, 'harvest');
      await makeStuff(() => new HarvestController()).execute(
        { target: one(stand, 'grain') } as ModelData as never,
        ctx,
      );
      await settle();
      expect(noteReasons(ctx)).toContain('patch-unnamed');
      expect(JSON.stringify(giver.received)).toContain('Which part?');
      expect(stand.standingAreaM2()).toBe(100);
    });

    it('a part with nothing of that sown is refused, naming the part', async () => {
      const { giver, field, parts } = dividedScene([['top-end', 100], ['lane-end', 100]]);
      const stand = standAt(field, parts[0]!, 0.9);
      const ctx = makeContext(giver, field, 'harvest');
      await makeStuff(() => new HarvestController()).execute(
        { target: one(stand, 'grain'), patch: one(parts[1]!, 'the lane end', 'at') } as ModelData as never,
        ctx,
      );
      expect(noteReasons(ctx)).toContain('nothing-sown-there');
    });

    it('⭐ sow at a part fills it, rooted there, then refuses `patch-sown`', async () => {
      const { giver, field, parts } = dividedScene([['gate-end', 100], ['middle', 300]]);
      const [gate, middle] = parts as [TestPart, TestPart];
      const seed = makeSeed(100); // enough for 1,000 m²
      ContainmentApi.move(seed, giver);
      const ctrl = () => makeStuff(() => new PlantController());

      const unnamed = makeContext(giver, field, 'sow');
      await ctrl().execute({ seed: one(seed, 'seed') } as ModelData as never, unnamed);
      expect(noteReasons(unnamed)).toContain('patch-unnamed');

      await ctrl().execute(
        { seed: one(seed, 'seed'), patch: one(gate, 'the gate end', 'at') } as ModelData as never,
        makeContext(giver, field, 'sow'),
      );
      await settle();
      const sown = field.getContents().filter((s): s is Plant => s instanceof Plant);
      expect(sown).toHaveLength(1);
      expect(sown[0]!.getGroundPart()).toBe('gate-end');
      expect(sown[0]!.getBed()).toBe(gate);
      // Filled to the PART's area, not the field's.
      expect(sown[0]!.getSownAreaM2()).toBeCloseTo(100);

      const full = makeContext(giver, field, 'sow');
      await ctrl().execute(
        { seed: one(seed, 'seed'), patch: one(gate, 'the gate end', 'at') } as ModelData as never,
        full,
      );
      expect(noteReasons(full)).toContain('patch-sown');

      // The middle is its own ground: a second stand, rooted there.
      await ctrl().execute(
        { seed: one(seed, 'seed'), patch: one(middle, 'the middle', 'at') } as ModelData as never,
        makeContext(giver, field, 'sow'),
      );
      await settle();
      const both = field.getContents().filter((s): s is Plant => s instanceof Plant);
      expect(both).toHaveLength(2);
      expect(both.find((p) => p.getBed() === middle)!.getSownAreaM2()).toBeCloseTo(300);
    });

    it('a ground of ONE part needs no part named', async () => {
      const { giver, field, parts } = dividedScene([['whole', 100]]);
      const seed = makeSeed(100);
      ContainmentApi.move(seed, giver);
      const ctx = makeContext(giver, field, 'sow');
      await makeStuff(() => new PlantController()).execute(
        { seed: one(seed, 'seed') } as ModelData as never,
        ctx,
      );
      await settle();
      expect(noteReasons(ctx)).not.toContain('patch-unnamed');
      const sown = field.getContents().find((s): s is Plant => s instanceof Plant);
      expect(sown!.getBed()).toBe(parts[0]);
    });
  });
});
