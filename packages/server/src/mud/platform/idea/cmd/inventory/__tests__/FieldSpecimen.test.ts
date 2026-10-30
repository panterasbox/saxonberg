/**
 * ⭐ The specimen and the labeled plant (field population W4, D6/D7).
 *
 * `sample <crop> at <patch>` pulls ONE stem from the stand in that part —
 * a real plant of the crop's kind, its read stamped at the pull, carried
 * off by the sampler; the stand keeps its area. `label <crop> [text] at
 * <patch>` leaves one plant standing with a name and a root zone of its
 * own, so `water <label>` reaches it alone.
 *
 * The fixtures are `WaterVerb.test.ts`'s divided field (a kernel
 * `TestPart` per patch); `StuffApi.clone` is stubbed to mint a fresh
 * plant, as `Growing.test.ts` does for `takeSpecimen`.
 */

import '../../../../../../test-bootstrap';
import { AdvancementMixin } from '../../../../../lib/advancement/Advancement';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SampleController from '../SampleController';
import LabelController from '../LabelController';
import WaterController from '../../bulk/WaterController';
import WateringCan from '../../../../thing/WateringCan';
import FeedController from '../../bulk/FeedController';
import Receptacle from '../../../../thing/Receptacle';
import Plant from '../../../../thing/Plant';
import Material from '../../../../../lib/material/Material';
import { Reserve, ReservedMixin } from '../../../../../lib/reserve';
import {
  SoilMixin,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
} from '../../../../../lib/husbandry/Soil';
import { type GrowthProfileData } from '../../../../../lib/husbandry/Growing';
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
import { MixinApi } from '../../../../../api/mixin';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { PersistableApi } from '../../../../../api/persistable';
import { WorldClockApi } from '../../../../../api/worldclock';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { CommandApi, type CommandContext, type ModelData } from '../../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../../api/mql';
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
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
) {
  static _mixinName = 'TestGiver';
  received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

/** A named part of a divided field — the `Patch` shape, in the kernel. */
class TestPart extends SoilMixin(ReservedMixin(NamedMixin(Idea))) {
  key = '';
  area = 0;
  depth: number | null = null;
  public override soilPartKey(): string {
    return this.key;
  }
  public override soilCatchmentAreaM2(): number {
    return this.area;
  }
  public override soilDepthM(): number | null {
    return this.depth;
  }
}

/** Soil-bearing ground holding no slot: a field of parts. */
class TestField extends SoilMixin(ReservedMixin(AmbientLitMixin(Place))) {
  parts: TestPart[] = [];
  public override soilParts(): readonly TestPart[] {
    return this.parts;
  }
  public override soilCatchmentAreaM2(): number {
    return this.parts.reduce((n, p) => n + p.area, 0);
  }
}

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;
let seq = 0;
function freshPath(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function wheatProfile(): GrowthProfileData {
  return {
    moistureHappyAt: 0.35,
    moistureWiltAt: 0.08,
    litresPerGameDay: 0.16,
    luxHappyAt: 200,
    luxDarkAt: 20,
    rootDemand: { seedling: 0.2, young: 1.0, established: 2.0, mature: 3.0 },
    daysToStage: { young: 18, established: 55, mature: 110 },
    seedRateKgPerM2: 0.015,
    yieldRatio: 6,
  };
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

function water(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    m.setAppearance('clear water');
    m.setTags(['liquid', 'beverage', 'drinkable']);
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.6, 'W/(m·K)'));
    return m;
  }, freshPath('/stuff/idea/material/_test/water')) as unknown as Material;
}

function newPlant(): Plant {
  const p = new Plant();
  p.setShortDescription('stand of wheat');
  p.setKeywords(['wheat', 'stand']);
  p.setSpecimenNoun('stem of wheat');
  p.setMaterial(tissue());
  p.setMass(Quantity.of(0.5, 'kg'));
  p.setLastAmbientK(295);
  p.setLifecycleState('alive');
  p.setProfile(wheatProfile());
  // One crop — a stem and its stand cut to the same grain.
  p.setHarvestTemplatePath('/trade/farming/thing/crop/_specimen-grain');
  return p;
}

function reserve(key: string, capacity: number, current: number, unit: 'L' | '%'): Reserve {
  return new Reserve(key, Quantity.of(capacity, unit), Quantity.of(current, unit), 'cultivation', null);
}

function makePart(key: string, moisture: number, depth: number | null = null): TestPart {
  return makeStuffAtPath(() => {
    const p = new TestPart();
    p.key = key;
    p.area = 1000;
    p.depth = depth;
    p.setName(key.replace('-', ' '));
    p.setReserve(reserve(SOIL_MOISTURE_RESERVE_KEY, 1000, 1000 * moisture, 'L'));
    p.setReserve(reserve(SOIL_NITROGEN_RESERVE_KEY, 100, 60, '%'));
    return p;
  }, freshPath(`/trade/farming/thing/_specimen-part-${key}`));
}

function makeCan(litres: number): WateringCan {
  return makeStuffAtPath(() => {
    const can = new WateringCan();
    can.setShortDescription('a tin watering can');
    can.interiorBulk = true;
    can.setInteriorCapacity(Quantity.of(2, 'L'));
    can.setBulkMaterial('interior', water());
    can.setBulkAmount('interior', Quantity.of(litres, 'L'));
    return can;
  }, freshPath('/stuff/thing/vessel/_specimen-can'));
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

/** The crop augmenter — `look`'s derived lines, read straight. */
function lookLines(host: Stuff, viewer: Stuff): string {
  let c: unknown = (host as object).constructor;
  while (c) {
    const own = Object.getOwnPropertyDescriptor(c, 'markupAugmenters')?.value as
      | Array<(s: string, h: unknown, v: unknown) => string>
      | undefined;
    const aug = own?.find((f) => f.name === 'conditionAugmenter');
    if (aug) return aug('', host, viewer);
    c = Object.getPrototypeOf(c);
  }
  throw new Error('no crop augmenter');
}

let captured: Stuff[];

describe('sample <crop> at <patch> / label <crop> [text] at <patch>', () => {
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
    vi.spyOn(StuffApi, 'clone').mockImplementation(
      async () => makeStuff(() => newPlant()) as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function scene(): {
    giver: TestGiver;
    field: TestField;
    top: TestPart;
    lane: TestPart;
    topStand: Plant;
    laneStand: Plant;
  } {
    // ⚠ The top end is thin and dry; the lane end deep and moist.
    const top = makePart('top-end', 0.1, 0.12);
    const lane = makePart('lane-end', 0.6, 0.4);
    const field = makeStuffAtPath(() => {
      const f = new TestField();
      f.setShortDescription('upper bench');
      f.setAmbientFlux(400);
      f.parts = [top, lane];
      return f;
    }, freshPath('/trade/farming/location/_specimen-field'));
    const stand = (part: TestPart): Plant => {
      const p = makeStuffAtPath(
        () => newPlant(),
        freshPath('/trade/farming/thing/plant/_specimen-wheat'),
      );
      p.growthStage = 'established';
      p.setSownAreaM2(1000);
      p.setGroundPart(part.key);
      ContainmentApi.move(p, field);
      p.getVigor();
      return p;
    };
    const topStand = stand(top);
    const laneStand = stand(lane);
    const giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    });
    vi.spyOn(
      giver as unknown as { creditDeed(): Promise<void> },
      'creditDeed',
    ).mockImplementation(async () => {});
    ContainmentApi.move(giver, field);
    return { giver, field, top, lane, topStand, laneStand };
  }

  type SampleModel = Parameters<SampleController['execute']>[0];
  async function sample(
    giver: TestGiver,
    field: TestField,
    named: Stuff,
    patch?: TestPart,
  ): Promise<CommandContext> {
    const ctx = makeContext(giver, field, 'sample');
    const model = {
      subject: one(named, 'wheat'),
      patch: patch ? one(patch, patch.getName(), 'at') : undefined,
    } as ModelData as unknown as SampleModel;
    await makeStuff(() => new SampleController()).execute(model, ctx);
    return ctx;
  }

  function stems(giver: TestGiver): Plant[] {
    return giver.getContents().filter((c): c is Plant => c instanceof Plant);
  }

  it('⭐ a stem comes off the stand — into your hand, stamped; the stand keeps its area', async () => {
    const { giver, field, top, laneStand, topStand } = scene();
    // Named by the lane end's stand, pulled at the top end's.
    await sample(giver, field, laneStand, top);
    const [stem] = stems(giver);
    expect(stem).toBeDefined();
    expect(stem!.isSpecimen()).toBe(true);
    expect(stem!.getSownAreaM2()).toBe(0);
    expect(stem!.getShortDescription()).toBe('stem of wheat');
    expect(stem!.getSpecimen()!.part).toBe('top-end');
    expect(stem!.getSpecimen()!.roots).toBe('shallow');
    expect(stem!.getSampling()!.at).toBe(field.getIdentityPath());
    expect(topStand.getSownAreaM2()).toBe(1000);
    expect(laneStand.getSownAreaM2()).toBe(1000);
    expect(JSON.stringify(giver.received)).toMatch(/You pull .*stem of wheat.* from .*top end.* and look at the roots/);
    expect(captured).toContain(stem);
  });

  it('⭐ the same spot gives the same stem — equal vigor, the same cause', async () => {
    const { giver, field, top, topStand } = scene();
    await sample(giver, field, topStand, top);
    await sample(giver, field, topStand, top);
    const [a, b] = stems(giver);
    expect(a!.getVigor()).toBe(b!.getVigor());
    expect(a!.getSpecimen()).toEqual(b!.getSpecimen());
    expect(a!.getSpecimen()!.limiting).toBe('water');
  });

  it('⭐ with a stem already in hand, naming the part still pulls from the stand there', async () => {
    const { giver, field, top, lane, topStand } = scene();
    await sample(giver, field, topStand, top);
    const [first] = stems(giver);
    // `wheat` binds the carried stem first; `at the lane end` names the ground.
    await sample(giver, field, first!, lane);
    const pulled = stems(giver);
    expect(pulled).toHaveLength(2);
    expect(pulled[1]!.getSpecimen()!.part).toBe('lane-end');
    // …and the label goes on a plant standing there, not on the stem.
    await label(giver, field, first!, 'trial', top);
    expect(first!.getLabel()).toBe('');
    expect(labeled(field).map((p) => p.getLabel())).toEqual(['trial']);
  });

  it('on a divided field, naming no part is refused by the ground — nothing pulled', async () => {
    const { giver, field, topStand } = scene();
    const ctx = await sample(giver, field, topStand);
    expect(noteReasons(ctx)).toContain('patch-unnamed');
    expect(stems(giver)).toHaveLength(0);
  });

  it('a stem in hand does not grow, and `look` carries its roots and where it came from', async () => {
    const { giver, field, top, topStand } = scene();
    await sample(giver, field, topStand, top);
    const [stem] = stems(giver);
    const stage = stem!.getGrowthStage();
    const vigor = stem!.getVigor();
    now = BASE + 30 * DAY * 1; // a month, by the game clock
    WorldClockApi._setNowProviderForTesting(() => now);
    expect(stem!.getGrowthStage()).toBe(stage);
    expect(stem!.getVigor()).toBe(vigor);
    const lines = lookLines(stem!, giver);
    expect(lines).toContain('Its roots are short and spread flat');
    expect(lines).toMatch(/Taken from (the )?top end of .*upper bench/);
  });

  type LabelModel = Parameters<LabelController['execute']>[0];
  async function label(
    giver: TestGiver,
    field: TestField,
    named: Stuff,
    text: string,
    patch?: TestPart,
  ): Promise<CommandContext> {
    const ctx = makeContext(giver, field, 'label');
    const model = {
      target: one(named, 'wheat'),
      text,
      patch: patch ? one(patch, patch.getName(), 'at') : undefined,
    } as ModelData as unknown as LabelModel;
    await makeStuff(() => new LabelController()).execute(model, ctx);
    return ctx;
  }

  function labeled(field: TestField): Plant[] {
    return field
      .getContents()
      .filter((c): c is Plant => c instanceof Plant && !c.isAreaCrop());
  }

  it('⭐ a labeled individual stands in the field, answers to its label, reads in full', async () => {
    const { giver, field, top, topStand } = scene();
    await label(giver, field, topStand, 'trial', top);
    const [trial] = labeled(field);
    expect(trial).toBeDefined();
    expect(trial!.isSpecimen()).toBe(false);
    expect(trial!.isAreaCrop()).toBe(false);
    expect(trial!.getGroundPart()).toBe('top-end');
    expect(trial!.getBed()).toBe(top);
    expect(trial!.getLabel()).toBe('trial');
    expect(trial!.getShortDescription()).toBe('stem of wheat labeled "trial"');
    expect(trial!.getKeywords()).toEqual(expect.arrayContaining(['trial', 'labeled']));
    // A labeled plant does not answer to its patch's name — the stand does.
    expect(trial!.getKeywords()).not.toContain('top end');
    expect(topStand.getKeywords()).toContain('top end');
    expect(trial!.hasRootZone()).toBe(true);
    expect(topStand.getSownAreaM2()).toBe(1000);
    // Read in full, as a pot plant reads — no banded "short of something".
    expect(lookLines(trial!, giver)).not.toContain('short of something');
    expect(JSON.stringify(giver.received)).toMatch(/You tie your label to .*stem of wheat.* at .*top end.*: trial\./);
    expect(captured).toContain(trial);
  });

  it('with no text, your own name goes on it', async () => {
    const { giver, field, lane, laneStand } = scene();
    await label(giver, field, laneStand, '', lane);
    const [mine] = labeled(field);
    expect(mine!.getLabel()).toBe(giver.getPresentation());
  });

  it('any other target is the shipped label — and `at …` is part of what you wrote', async () => {
    const { giver, field } = scene();
    const jar = makeStuffAtPath(() => newPlant(), freshPath('/trade/farming/thing/plant/_jar'));
    ContainmentApi.move(jar, giver);
    const ctx = makeContext(giver, field, 'label');
    await makeStuff(() => new LabelController()).execute(
      {
        target: one(jar, 'jar'),
        text: 'meet',
        patch: one(null, 'noon', 'at'),
      } as ModelData as unknown as LabelModel,
      ctx,
    );
    expect(jar.getLabel()).toBe('meet at noon');
    expect(labeled(field)).toHaveLength(0);
  });

  type WaterModel = Parameters<WaterController['execute']>[0];
  async function waterIt(giver: TestGiver, field: TestField, target: Stuff): Promise<void> {
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    await makeStuff(() => new WaterController()).execute(
      {
        target: one(target, 'trial'),
        source: { stuff: [can], raw: '' } as unknown as MqlManyResult,
      } as ModelData as unknown as WaterModel,
      makeContext(giver, field, 'water'),
    );
    ContainmentApi.move(can, field);
  }

  it('⭐ `water trial` reaches only it — the patch\'s reserve does not move', async () => {
    const { giver, field, top, topStand } = scene();
    await label(giver, field, topStand, 'trial', top);
    const [trial] = labeled(field);
    const before = top.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue();
    await waterIt(giver, field, trial!);
    expect(top.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue()).toBeCloseTo(before, 6);
    expect(trial!.getSoilMoisture()).toBeCloseTo(1, 6);
    expect(topStand.getSoilMoisture()).toBeCloseTo(0.1, 2);
    const said = JSON.stringify(giver.received);
    expect(said).toMatch(/You tip 0\.\d+ L of clear water into the soil around/);
    expect(said).not.toContain('barely shows');
    expect(captured).toContain(trial);
  });

  it('⭐ watered daily it outreads its patch over a dry stretch; a skipped week lets it fall back', async () => {
    const { giver, field, top, topStand } = scene();
    await label(giver, field, topStand, 'trial', top);
    const [trial] = labeled(field);
    for (let day = 1; day <= 7; day++) {
      await waterIt(giver, field, trial!);
      now = BASE + day * DAY;
      expect(trial!.getSoilMoisture()).toBeGreaterThan(top.soilMoistureFraction()! + 0.2);
    }
    expect(trial!.getConditionBand()).not.toBe('failing');
    now = BASE + 14 * DAY;
    expect(trial!.getSoilMoisture()).toBeLessThan(top.soilMoistureFraction()! + 0.02);
  });

  it('⭐ `feed trial` works the compost into its zone alone', async () => {
    const { giver, field, top, topStand } = scene();
    await label(giver, field, topStand, 'trial', top);
    const [trial] = labeled(field);
    const compost = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('compost');
      m.setAppearance('crumbly black compost');
      m.setTags(['granular', 'solid', 'soil', 'compost']);
      m.setSpecificHeat(Quantity.of(1400, 'J/(kg·K)'));
      m.setThermalConductivity(Quantity.of(0.2, 'W/(m·K)'));
      return m;
    }, freshPath('/stuff/idea/material/_test/compost')) as unknown as Material;
    const sack = makeStuffAtPath(() => {
      const r = new Receptacle();
      r.setShortDescription('a sack of compost');
      r.interiorBulk = true;
      r.setInteriorCapacity(Quantity.of(20, 'L'));
      r.setBulkMaterial('interior', compost);
      r.setInteriorAmount(Quantity.of(10, 'L'));
      return r;
    }, freshPath('/stuff/thing/vessel/_specimen-sack'));
    ContainmentApi.move(sack, giver);
    type FeedModel = Parameters<FeedController['execute']>[0];
    await makeStuff(() => new FeedController()).execute(
      { target: one(trial!, 'trial'), source: one(sack, 'sack') } as ModelData as unknown as FeedModel,
      makeContext(giver, field, 'feed'),
    );
    expect(trial!.getReserve(SOIL_NITROGEN_RESERVE_KEY)!.current.rawValue()).toBeCloseTo(100, 6);
    expect(top.getReserve(SOIL_NITROGEN_RESERVE_KEY)!.current.rawValue()).toBeCloseTo(60, 6);
    // 40 points at 10 a litre — 4 L out of the sack, the rest kept.
    expect(sack.getInteriorAmount().rawValue()).toBeCloseTo(6, 6);
    expect(JSON.stringify(giver.received)).toContain('into the soil around');
    expect(captured).toContain(trial);
  });
});
