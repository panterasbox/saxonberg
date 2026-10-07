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

import "../../../../../../test-bootstrap";
import { AdvancementMixin } from '../../../../../lib/advancement/Advancement';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FeedController from '../FeedController';
import Receptacle from '../../../../thing/Receptacle';
import Plant from '../../../../thing/Plant';
import GardenBed from '../../../../thing/GardenBed';
import PlantPot from '../../../../thing/PlantPot';
import Material from '../../../../../lib/material/Material';
import { Reserve } from '../../../../../lib/reserve';
import { type GrowthProfileData } from '../../../../../lib/husbandry/Growing';
import {
  PLANT_SLOT,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
} from '../../../../../lib/husbandry/Cultivable';
import { SOIL_ORGANIC_MATTER_RESERVE_KEY } from '../../../../../lib/husbandry/Soil';
import { execSync } from 'node:child_process';
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
import { ShadowApi } from '../../../../../api/shadow';
import { ContainmentApi } from '../../../../../api/containment';
import { PersistableApi } from '../../../../../api/persistable';
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

class TestGiver extends AdvancementMixin(
  SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
)
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
  }, freshPath('/stuff/idea/material/_test/compost')) as unknown as Material;
}

/**
 * ⭐ Ground bone — a `slow-amendment`, which is the OTHER kind of matter
 * you work into ground. Deliberately **not** tagged `compost`: a sack of
 * bone meal and a sack of muck are poured by the same act and feed
 * different reserves.
 */
function boneMeal(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('bone meal');
    m.setAppearance('fine grey bone meal');
    m.setTags(['granular', 'solid', 'feed', 'bone-meal', 'slow-amendment']);
    m.setSpecificHeat(Quantity.of(1400, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.2, 'W/(m·K)'));
    return m;
  }, freshPath('/stuff/idea/material/_test/bone-meal')) as unknown as Material;
}

function tissue(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('plant-tissue');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, freshPath('/stuff/idea/material/_test/feed-tissue')) as unknown as Material;
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
  }, freshPath('/trade/farming/thing/plant/_feed'));
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
  }, freshPath('/trade/farming/thing/bed/_feed'));
}

/**
 * ⭐ Ground deep enough to be worth IMPROVING — a `Field` seeds all four
 * soil reserves in code, and the garden bed above authors only two. The
 * difference is the content fact the slow-amendment branch turns on, and
 * this fixture is the field end of it.
 */
function makeAmendableBed(nitrogen = 0, organicMatter = 0): GardenBed {
  const bed = makeBed(nitrogen);
  bed.setReserve(
    new Reserve(
      SOIL_ORGANIC_MATTER_RESERVE_KEY,
      Quantity.of(100, '%'),
      Quantity.of(organicMatter, '%'),
      'cultivation',
      null,
    ),
  );
  return bed;
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
  }, freshPath('/trade/farming/thing/pot/_feed'));
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
  }, freshPath('/stuff/thing/vessel/_compost-sack'));
}

/** A sack of ground bone rather than of muck. */
function makeBoneSack(litres: number): Receptacle {
  return makeStuffAtPath(() => {
    const sack = new Receptacle();
    sack.setShortDescription('a sack of bone meal');
    sack.interiorBulk = true;
    sack.setInteriorCapacity(Quantity.of(20, 'L'));
    sack.setBulkMaterial('interior', boneMeal());
    sack.setInteriorAmount(Quantity.of(litres, 'L'));
    return sack;
  }, freshPath('/stuff/thing/vessel/_bone-sack'));
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
  it('no shipped tool row confers it — you feed by hand', () => {
    // `water` rides the watering can's own authored verbs because a can
    // is an instrument. Compost is a material, not a tool, so no row
    // anywhere names `feed` as a conferred verb.
    const hits = execSync(
      "grep -rl 'platform/cmd/bulk/feed.yaml' ../content --include='*.yaml' || true",
      { cwd: process.cwd(), encoding: 'utf8' },
    ).trim();
    expect(hits).toBe('');
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
    // Credits land on the giver's own creditDeed since the OO sweep —
    // the instance is the capture seam.
    vi.spyOn(
      giver as unknown as {
        creditDeed(sub: {
          discipline: string;
          difficulty: string;
          outcome: string;
        }): Promise<void>;
      },
      'creditDeed',
    ).mockImplementation(async (subcheck) => {
      deeds.push(subcheck);
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
    expect(deeds[0]!.discipline).toBe('horticulture');
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

/**
 * ⭐⭐ **`feed` takes a second kind of matter**, and which reserve it
 * credits is a fact about the matter rather than about the verb. This is
 * bone meal's only sink in the game: the carcass chain grinds bone and the
 * field is where it goes.
 *
 * ⚠ The important test here is the last one. Keyed on nitrogen the way the
 * headroom check used to be, a field with rich nitrogen and starved
 * organic matter would have refused a sack of bone meal with *"the soil is
 * already rich"* — a true sentence about the wrong reserve, and the most
 * plausible way for this to ship dead.
 */
describe('feed <ground> with a slow amendment', () => {
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
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function amendScene(nitrogen = 0, organicMatter = 0): {
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
    vi.spyOn(
      giver as unknown as {
        creditDeed(sub: {
          discipline: string;
          difficulty: string;
          outcome: string;
        }): Promise<void>;
      },
      'creditDeed',
    ).mockImplementation(async (subcheck) => {
      deeds.push(subcheck);
    });
    ContainmentApi.move(giver, room);
    const bed = makeAmendableBed(nitrogen, organicMatter);
    ContainmentApi.move(bed, room);
    return { giver, room, bed };
  }

  it('⭐ works ground bone in as ORGANIC MATTER, not as nitrogen', async () => {
    const { giver, room, bed } = amendScene(0, 0);
    const sack = makeBoneSack(20);
    ContainmentApi.move(sack, giver);

    const ctrl = makeStuff(() => new FeedController());
    await ctrl.execute(model(one(bed, 'bed')), makeContext(giver, room));

    expect(bed.organicMatterFraction()).toBeGreaterThan(0);
    expect(sack.getBulkAmount('interior').rawValue()).toBeLessThan(20);
  });

  it('⭐ and a little of it IS available now — the mineralisation line', async () => {
    // `addOrganicMatter` credits a fraction of what went in to nitrogen
    // immediately and leaves the rest to mineralise over years. That one
    // line is why an amendment is a long investment rather than a
    // fertiliser.
    const { giver, room, bed } = amendScene(0, 0);
    ContainmentApi.move(makeBoneSack(20), giver);

    const ctrl = makeStuff(() => new FeedController());
    await ctrl.execute(model(one(bed, 'bed')), makeContext(giver, room));

    const nitrogen = bed.nutrientFraction()!;
    expect(nitrogen).toBeGreaterThan(0);
    expect(nitrogen).toBeLessThan(bed.organicMatterFraction()!);
  });

  it('compost still credits NITROGEN and not organic matter', async () => {
    const { giver, room, bed } = amendScene(0, 0);
    ContainmentApi.move(makeSack(20), giver);

    const ctrl = makeStuff(() => new FeedController());
    await ctrl.execute(model(one(bed, 'bed')), makeContext(giver, room));

    expect(bed.nutrientFraction()).toBe(1);
    expect(bed.organicMatterFraction()).toBe(0);
  });

  it('a carried sack of bone meal is found with no `with` clause', async () => {
    const { giver, room, bed } = amendScene(0, 0);
    ContainmentApi.move(makeBoneSack(20), giver);

    const ctrl = makeStuff(() => new FeedController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(bed, 'bed')), ctx);

    expect(noteReasons(ctx)).not.toContain('no-compost-source');
  });

  it('⚠ rich nitrogen does NOT refuse an amendment the ground wants', async () => {
    const { giver, room, bed } = amendScene(100, 0);
    const sack = makeBoneSack(20);
    ContainmentApi.move(sack, giver);

    const ctrl = makeStuff(() => new FeedController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(bed, 'bed')), ctx);

    expect(noteReasons(ctx)).not.toContain('already-fed');
    expect(bed.organicMatterFraction()).toBeGreaterThan(0);
    expect(sack.getBulkAmount('interior').rawValue()).toBeLessThan(20);
  });

  it('…and starved nitrogen does not let compost into full ground', async () => {
    // The mirror: the headroom that matters is the one the MATTER feeds.
    const { giver, room, bed } = amendScene(100, 0);
    const sack = makeSack(20);
    ContainmentApi.move(sack, giver);

    const ctrl = makeStuff(() => new FeedController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(bed, 'bed')), ctx);

    expect(noteReasons(ctx)).toContain('already-fed');
    expect(sack.getBulkAmount('interior').rawValue()).toBe(20);
  });

  it('ground too shallow to amend says which thing it cannot take', async () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(300);
    const giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    });
    ContainmentApi.move(giver, room);
    // A plain bed: nitrogen, no organic matter.
    const bed = makeBed(0);
    ContainmentApi.move(bed, room);
    ContainmentApi.move(makeBoneSack(20), giver);

    const ctrl = makeStuff(() => new FeedController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(bed, 'bed')), ctx);

    expect(noteReasons(ctx)).toContain('no-amendment-reserve');
  });
});
