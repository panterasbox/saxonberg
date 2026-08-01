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
import GardenBed from '../../../../obj/GardenBed';
import PlantPot from '../../../../obj/PlantPot';
import Seed from '../../../../obj/Seed';
import Plant from '../../../../obj/Plant';
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

  it('the two uses that admit cultivation are the ones stewardship named', () => {
    expect(LandUses.permitsAnyCultivation('residential')).toBe(true);
    expect(LandUses.permitsAnyCultivation('agricultural')).toBe(true);
    expect(LandUses.permitsAnyCultivation('civic')).toBe(false);
    expect(LandUses.permitsAnyCultivation('commercial')).toBe(false);
    expect(LandUses.permitsAnyCultivation('industrial')).toBe(false);
    expect(LandUses.permitsAnyCultivation('wild')).toBe(false);
  });
});
