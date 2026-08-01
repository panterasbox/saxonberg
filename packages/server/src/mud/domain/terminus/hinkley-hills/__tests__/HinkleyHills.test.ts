/**
 * Hinkley Hills — the suburb (Wave 6).
 *
 * Two things worth testing here and nowhere else:
 *
 *   1. ⭐ **The land-use gate bites.** A garden bed is refused on `civic`
 *      ground and accepted on the suburb's `residential`, and the refusal
 *      names the use. That is Wave 1's whole reason for existing getting
 *      its first consumer — a vocabulary nothing consults is not an
 *      enabler.
 *   2. **A pot is exempt.** Land use governs GROUND, not furniture: a
 *      houseplant on a windowsill in a rented office is not agriculture,
 *      and the gate must not say otherwise.
 *
 * The content itself (rooms, exits, the Locality) is proven by the
 * acceptance walk; this file covers the rule.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PlantController from '../../../../obj/command/inventory/PlantController';
import WaterController from '../../../../obj/command/bulk/WaterController';
import FeedController from '../../../../obj/command/bulk/FeedController';
import HarvestController from '../../../../obj/command/inventory/HarvestController';
import WateringCan from '../../../../obj/WateringCan';
import Receptacle from '../../../../obj/Receptacle';
import Crop from '../../../../obj/Crop';
import Material from '../../../../lib/material/Material';
import { PersistableApi } from '../../../../api/persistable';
import { AdvancementApi } from '../../../../api/advancement';
import { type GrowthProfileData } from '../../../../lib/husbandry/Growing';
import GardenBed from '../../../../obj/GardenBed';
import PlantPot from '../../../../obj/PlantPot';
import Seed from '../../../../obj/Seed';
import Plant from '../../../../obj/Plant';
import TitledRoom from '../../../../obj/TitledRoom';
import ParcelRegistry from '../../../../obj/ParcelRegistry';
import GroupRegistry from '../../../../obj/GroupRegistry';
import { Reserve } from '../../../../lib/reserve';
import {
  PLANT_SLOT,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
} from '../../../../lib/husbandry/Cultivable';
import { LandUses } from '../../../../lib/parcel/LandUse';
import { Quantity } from '../../../../lib/quantity';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../lib/description/Named';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { AmbientLitMixin } from '../../../../lib/perception/AmbientLit';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import { Document } from '../../../../lib/persistence/Document';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ParcelApi } from '../../../../api/parcel';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
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
import '../../../../obj/WorldClockRegistry';

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'TestGiverHinkley';
  protected handleMessage(): void {}
}
class LitRoom extends AmbientLitMixin(Location) {}

const SUBURB = '/domain/terminus/hinkley-hills';
const YARD = '/domain/terminus/hinkley-hills/yard';
const REGISTRY = '/domain/terminus/registry';
const OFFICE = '/domain/terminus/registry/office';

let seq = 0;
let plantSeq = 0;
function fresh(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

interface Doc extends Record<string, unknown> {
  _id?: string;
}
let store: Map<string, Doc[]>;
let idCounter = 0;
function col(c: string): Doc[] {
  let a = store.get(c);
  if (!a) {
    a = [];
    store.set(c, a);
  }
  return a;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const save = vi.fn(async (c: string, d: Doc) => {
    const arr = col(c);
    if (d._id) {
      const i = arr.findIndex((x) => x._id === d._id);
      if (i >= 0) arr[i] = { ...d };
      else arr.push({ ...d });
      return d._id;
    }
    const id = String(++idCounter);
    arr.push({ ...d, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => {
    const arr = col(c);
    const keys = Object.keys(q);
    if (keys.length === 0) return arr.slice();
    return arr.filter((d) => keys.every((k) => d[k] === q[k]));
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById: vi.fn(async () => null),
    delete: vi.fn(async () => {}),
    isConnected: () => true,
  } as unknown as PersistenceManager);
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

function seedParcel(extent: string, landUse: string | null): void {
  col('parcels').push({
    _id: `seed-${++idCounter}`,
    extent,
    zonePath: extent,
    owner: { kind: 'group', name: 'core' },
    parentParcel: null,
    grants: [],
    allowance: null,
    landUse,
    area: null,
  });
}

/**
 * Stand the registries up ONCE and rebuild the coverage index per test.
 *
 * No `StuffApi.clearAll()` between tests: it wipes the WorldClockRegistry
 * from the path index, after which every growth reconcile silently
 * no-ops (the documented husbandry trap). So the singletons persist and
 * the trie is re-warmed from each test's freshly-seeded store instead.
 */
async function bootParcels(): Promise<void> {
  if (!StuffApi.findByTemplatePath('/obj/GroupRegistry')) {
    const groups = makeStuffAtPath(
      () => new GroupRegistry(),
      '/obj/GroupRegistry',
    );
    await groups.postRegister();
  }
  if (!StuffApi.findByTemplatePath('/obj/ParcelRegistry')) {
    const parcels = makeStuffAtPath(
      () => new ParcelRegistry(),
      '/obj/ParcelRegistry',
    );
    await parcels.postRegister();
  }
  await ParcelApi.rebuildCoverageIndex();
}

function makeBed(): GardenBed {
  return makeStuffAtPath(() => {
    const bed = new GardenBed();
    bed.setShortDescription('a raised garden bed');
    bed.setMass(Quantity.of(340, 'kg'));
    bed.setFixedGround(true);
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
        Quantity.of(100, '%'),
        'cultivation',
        'spent',
      ),
    );
    return bed;
  }, fresh('/obj/bed/_hh'));
}

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
    return pot;
  }, fresh('/obj/pot/_hh'));
}

function makeSeed(): Seed {
  return makeStuffAtPath(() => {
    const s = new Seed();
    s.setShortDescription('a packet of carrot seed');
    s.setGrowsIntoPath('/obj/plant/carrot');
    return s;
  }, fresh('/obj/seed/_hh'));
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    'verbs: [plant]\ncontroller: NoopController\ndescription: stub\n',
    '<test>',
  );
}

function ctxFor(giver: TestGiver, loc: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandText: 'plant',
    executionId: 'test',
    commandId: 'test',
    verb: 'plant',
    command: stubCommand(),
  });
}

function one(stuff: Stuff | null, raw: string, prep?: string): MqlOneResult {
  const out: MqlOneResult = { stuff, raw };
  if (prep) out.prep = prep;
  return out;
}
type PlantExec = Parameters<PlantController['execute']>[0];
function model(seed: MqlOneResult, pot: MqlOneResult): PlantExec {
  // The arg is named `pot` in plant.yaml — a phase-1 name that now also
  // takes a bed. Renaming it is a verb-surface change, not this build's.
  return { seed, pot } as ModelData as unknown as PlantExec;
}
function reasons(ctx: CommandContext): string[] {
  return ctx.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
}

// ── the acceptance walk's own fixtures ──

const DAY = 86_400;
const WALK_BASE = 60_000_000;
let walkNow = WALK_BASE;

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

function walkTissue(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('plant-tissue');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, fresh('/lib/material/_test/walk-tissue')) as unknown as Material;
}

function walkWater(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    m.setAppearance('clear water');
    m.setTags(['liquid', 'beverage', 'drinkable']);
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.6, 'W/(m·K)'));
    return m;
  }, fresh('/lib/material/_test/walk-water')) as unknown as Material;
}

function walkCompost(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('compost');
    m.setAppearance('crumbly black compost');
    m.setTags(['granular', 'solid', 'compost']);
    m.setSpecificHeat(Quantity.of(1400, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.2, 'W/(m·K)'));
    return m;
  }, fresh('/lib/material/_test/walk-compost')) as unknown as Material;
}

function makeWalkCan(litres: number): WateringCan {
  return makeStuffAtPath(() => {
    const can = new WateringCan();
    can.setShortDescription('a tin watering can');
    can.interiorBulk = true;
    can.setInteriorCapacity(Quantity.of(litres, 'L'));
    can.setBulkMaterial('interior', walkWater());
    can.setInteriorAmount(Quantity.of(litres, 'L'));
    return can;
  }, fresh('/obj/vessel/_walk-can'));
}

/** Top the can back up — the standpipe in the yard, without the verb. */
function refillCan(can: WateringCan, litres: number): void {
  can.setBulkMaterial('interior', walkWater());
  can.setInteriorAmount(Quantity.of(litres, 'L'));
}

function makeWalkSack(litres: number): Receptacle {
  return makeStuffAtPath(() => {
    const sack = new Receptacle();
    sack.setShortDescription('a sack of compost');
    sack.interiorBulk = true;
    sack.setInteriorCapacity(Quantity.of(litres, 'L'));
    sack.setBulkMaterial('interior', walkCompost());
    sack.setInteriorAmount(Quantity.of(litres, 'L'));
    return sack;
  }, fresh('/obj/vessel/_walk-sack'));
}

type WaterExec = Parameters<WaterController['execute']>[0];
function waterModel(target: MqlOneResult): WaterExec {
  return { target } as ModelData as unknown as WaterExec;
}
type FeedExec = Parameters<FeedController['execute']>[0];
function feedModel(target: MqlOneResult): FeedExec {
  return { target } as ModelData as unknown as FeedExec;
}
type HarvestExec = Parameters<HarvestController['execute']>[0];
function harvestModel(target: MqlOneResult): HarvestExec {
  return { target } as ModelData as unknown as HarvestExec;
}

describe('Hinkley Hills — the land-use gate', () => {
  beforeEach(async () => {
    installStore();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 50_000_000);
    WorldClockApi.setScale(1000);
    // The suburb is residential; the Registry annex is civic. Both are
    // exactly what config/parcels.yaml ships.
    seedParcel(SUBURB, 'residential');
    seedParcel(REGISTRY, 'civic');
    await bootParcels();
    // The planting itself clones a Plant from the template store, which
    // this suite does not stand up — it is about the GATE. Stub the mint
    // so a permitted planting completes rather than dying downstream.
    vi.spyOn(StuffApi, 'clone').mockImplementation((async () => {
      plantSeq += 1;
      return makeStuffAtPath(() => {
        const p = new Plant();
        p.setShortDescription('a row of carrots');
        p.setLifecycleState('alive');
        return p;
      }, `/obj/plant/_hh-minted-${plantSeq}`);
    }) as unknown as typeof StuffApi.clone);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  /** A room at `path`, standing on whatever parcel covers it. */
  function roomAt(path: string): LitRoom {
    const room = makeStuffAtPath(() => new LitRoom(), path);
    room.setAmbientFlux(600);
    return room;
  }

  function giverIn(room: LitRoom): TestGiver {
    const g = makeStuffAtPath(() => {
      const t = new TestGiver();
      t.setName('Alice');
      return t;
    }, fresh('/obj/Avatar/_hh'));
    ContainmentApi.move(g, room);
    return g;
  }

  it('the suburb is residential and the Registry annex is civic', () => {
    expect(ParcelApi.landUseOf(YARD)).toBe('residential');
    expect(ParcelApi.landUseOf(OFFICE)).toBe('civic');
  });

  it('⭐ a bed on RESIDENTIAL ground accepts a planting', async () => {
    const yard = roomAt(YARD);
    const giver = giverIn(yard);
    const bed = makeBed();
    ContainmentApi.move(bed, yard);
    const seed = makeSeed();
    ContainmentApi.move(seed, giver);

    const ctx = ctxFor(giver, yard);
    const ctrl = makeStuff(() => new PlantController());
    await ctrl.execute(model(one(seed, 'seed'), one(bed, 'bed', 'in')), ctx);

    expect(reasons(ctx)).not.toContain('land-use-forbids-cultivation');
  });

  it('⭐ a bed on CIVIC ground is refused, and the reason names the use', async () => {
    const office = roomAt(OFFICE);
    const giver = giverIn(office);
    const bed = makeBed();
    ContainmentApi.move(bed, office);
    const seed = makeSeed();
    ContainmentApi.move(seed, giver);

    const ctx = ctxFor(giver, office);
    const ctrl = makeStuff(() => new PlantController());
    await ctrl.execute(model(one(seed, 'seed'), one(bed, 'bed', 'in')), ctx);

    expect(reasons(ctx)).toContain('land-use-forbids-cultivation');
    const detail = ctx
      .getNotes()
      .map((n) => (n as { detail?: string }).detail ?? '')
      .join(' ');
    expect(detail).toContain('civic');
    // …and nothing was planted.
    expect(bed.occupiedSlotCount()).toBe(0);
  });

  it('⭐ a POT is exempt — furniture is not agriculture', async () => {
    // The same civic floor that refuses a bed must accept a houseplant,
    // or every rented office in the game becomes unfurnishable.
    const office = roomAt(OFFICE);
    const giver = giverIn(office);
    const pot = makePot();
    ContainmentApi.move(pot, office);
    const seed = makeSeed();
    ContainmentApi.move(seed, giver);

    const ctx = ctxFor(giver, office);
    const ctrl = makeStuff(() => new PlantController());
    await ctrl.execute(model(one(seed, 'seed'), one(pot, 'pot', 'in')), ctx);

    expect(reasons(ctx)).not.toContain('land-use-forbids-cultivation');
    expect(pot.isFixedGround()).toBe(false);
  });

  it('unzoned ground refuses too — wild admits nothing', async () => {
    const nowhere = roomAt(fresh('/domain/unclaimed/field'));
    const giver = giverIn(nowhere);
    const bed = makeBed();
    ContainmentApi.move(bed, nowhere);
    const seed = makeSeed();
    ContainmentApi.move(seed, giver);

    const ctx = ctxFor(giver, nowhere);
    const ctrl = makeStuff(() => new PlantController());
    await ctrl.execute(model(one(seed, 'seed'), one(bed, 'bed', 'in')), ctx);

    expect(reasons(ctx)).toContain('land-use-forbids-cultivation');
  });

  it('⭐ a KEYED room resolves to its own lot, not to the district', async () => {
    // Every lot's yard clones from ONE template under the district, so a
    // template-path read answers `residential` for ALL of them — right
    // today only because every Hinkley lot is zoned alike. The room's
    // persistence key IS its lot's parcel extent, so the gate reads that
    // instead.
    //
    // The proof is the refusal: `banned`'s own template path sits under
    // the residential district and would be ALLOWED on a path read. It is
    // refused, so the key is what was consulted.
    seedParcel(`${SUBURB}/lot-9`, 'civic'); // a lot zoned against the grain
    await ParcelApi.rebuildCoverageIndex();

    const shared = fresh('/domain/terminus/hinkley-hills/yard');
    const ok = makeStuffAtPath(() => new TitledRoom(), shared);
    ok.setAmbientFlux(600);
    ok.setPersistenceKey(`${SUBURB}/lot-1`);
    const banned = makeStuffAtPath(() => new TitledRoom(), fresh(shared));
    banned.setAmbientFlux(600);
    banned.setPersistenceKey(`${SUBURB}/lot-9`);

    for (const [room, refused] of [
      [ok, false],
      [banned, true],
    ] as const) {
      const giver = giverIn(room as unknown as LitRoom);
      const bed = makeBed();
      ContainmentApi.move(bed, room);
      const seed = makeSeed();
      ContainmentApi.move(seed, giver);
      const ctx = ctxFor(giver, room as unknown as LitRoom);
      await makeStuff(() => new PlantController()).execute(
        model(one(seed, 'seed'), one(bed, 'bed', 'in')),
        ctx,
      );
      expect(reasons(ctx).includes('land-use-forbids-cultivation')).toBe(
        refused,
      );
    }
  });

  it('the two uses that admit cultivation are the ones stewardship named', () => {
    expect(LandUses.permitsAnyCultivation('residential')).toBe(true);
    expect(LandUses.permitsAnyCultivation('agricultural')).toBe(true);
    expect(LandUses.permitsAnyCultivation('civic')).toBe(false);
    expect(LandUses.permitsAnyCultivation('commercial')).toBe(false);
    expect(LandUses.permitsAnyCultivation('industrial')).toBe(false);
    expect(LandUses.permitsAnyCultivation('wild')).toBe(false);
  });
});

/**
 * ⭐ Wave 8 — the acceptance walk, through real verbs only.
 *
 * The loop the whole build exists to produce, end to end: plant into the
 * bed, tend it, harvest it, watch the soil get poorer, feed it, and get a
 * better crop next time. If this reads awkwardly the verb surface is
 * wrong, which is why it is written as a sequence of verb calls rather
 * than as method calls on the model.
 *
 * The one thing it deliberately does NOT do is buy the lot — that is
 * `TitleVerb.test.ts`, which needs a whole banking harness for one act.
 * Here the ground is already yours.
 */
describe('⭐ the acceptance walk: plant → tend → harvest → feed → again', () => {
  beforeEach(async () => {
    installStore();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    walkNow = WALK_BASE;
    WorldClockApi._setNowProviderForTesting(() => walkNow);
    WorldClockApi.setScale(1000);
    seedParcel(SUBURB, 'residential');
    await bootParcels();
    vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation(
      (async () => {}) as unknown as typeof PersistableApi.captureHostOf,
    );
    vi.spyOn(AdvancementApi, 'recordDeed').mockImplementation(
      (async () => {}) as unknown as typeof AdvancementApi.recordDeed,
    );
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      plantSeq += 1;
      if (path.startsWith('/obj/crop/')) {
        return makeStuffAtPath(() => {
          const c = new Crop();
          c.setShortDescription('a bunch of carrots');
          return c;
        }, `/obj/crop/_walk-${plantSeq}`);
      }
      return makeStuffAtPath(() => {
        const p = new Plant();
        p.setShortDescription('a row of carrots');
        p.setMaterial(walkTissue());
        p.setMass(Quantity.of(0.4, 'kg'));
        p.setLastAmbientK(295);
        p.setLifecycleState('alive');
        p.setProfile(carrotProfile());
        p.setHarvestTemplatePath('/obj/crop/carrot');
        p.setNutrientDraw(15);
        return p;
      }, `/obj/plant/_walk-${plantSeq}`);
    }) as unknown as typeof StuffApi.clone);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('runs the whole loop, and the second crop beats the third', async () => {
    const yard = makeStuffAtPath(() => new LitRoom(), YARD);
    yard.setAmbientFlux(600);
    const me = makeStuffAtPath(() => {
      const t = new TestGiver();
      t.setName('Alice');
      return t;
    }, '/obj/Avatar/_walk-alice');
    ContainmentApi.move(me, yard);

    // The ground is mine, and it is zoned for growing.
    expect(ParcelApi.cultivationScaleAt(YARD)).toBe('bed');

    const bed = makeBed();
    ContainmentApi.move(bed, yard);
    const can = makeWalkCan(4);
    ContainmentApi.move(can, me);
    const sack = makeWalkSack(20);
    ContainmentApi.move(sack, me);

    const bands: string[] = [];
    const nitrogen: number[] = [];

    for (let round = 1; round <= 3; round++) {
      // ── plant ──
      const seed = makeSeed();
      ContainmentApi.move(seed, me);
      const plantCtx = ctxFor(me, yard);
      await makeStuff(() => new PlantController()).execute(
        model(one(seed, 'seed'), one(bed, 'bed', 'in')),
        plantCtx,
      );
      expect(reasons(plantCtx)).not.toContain(
        'land-use-forbids-cultivation',
      );
      const crop = bed.getPlants()[0] as unknown as Plant;
      expect(crop).toBeDefined();

      // ── tend: water on a real cadence until it is grown ──
      for (let d = 4; d <= 96; d += 4) {
        walkNow = WALK_BASE + d * DAY;
        refillCan(can, 4);
        await makeStuff(() => new WaterController()).execute(
          waterModel(one(crop, 'carrots')),
          ctxFor(me, yard),
        );
      }
      expect(crop.getGrowthStage()).toBe('mature');

      // ── harvest ──
      const harvestCtx = ctxFor(me, yard);
      await makeStuff(() => new HarvestController()).execute(
        harvestModel(one(crop, 'carrots')),
        harvestCtx,
      );
      expect(reasons(harvestCtx)).not.toContain('not-mature');

      const held = me
        .getContents()
        .filter((s) => s instanceof Crop) as unknown as Crop[];
      expect(held).toHaveLength(round);
      const latest = held[held.length - 1]!;
      bands.push(
        (latest as unknown as { getGrade(): { getBand(): string } })
          .getGrade()
          .getBand(),
      );
      nitrogen.push(bed.nutrientFraction()!);

      // ── the bed is poorer, and I only feed it after round 2 ──
      if (round === 2) {
        await makeStuff(() => new FeedController()).execute(
          feedModel(one(bed, 'bed')),
          ctxFor(me, yard),
        );
        expect(bed.nutrientFraction()).toBe(1);
      }
      walkNow += 2 * DAY;
    }

    // ⭐ The soil got poorer each unfed round, and feeding put it back.
    expect(nitrogen[0]).toBeGreaterThan(nitrogen[1]!);
    // Round 3 started from a FED bed (fed after round 2), so it ends
    // higher than round 2 did.
    expect(nitrogen[2]).toBeGreaterThan(nitrogen[1]!);

    // Every crop carries a maker and a band — the loop produced goods,
    // not just state changes.
    expect(bands).toHaveLength(3);
    for (const band of bands) expect(band.length).toBeGreaterThan(0);
  });
});
