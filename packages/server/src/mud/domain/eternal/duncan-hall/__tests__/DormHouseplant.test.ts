/**
 * The dorm houseplant, end to end (husbandry Waves 6 + 7).
 *
 * Runs the REAL DormWarren + the real seed content (loaded from disk through
 * the actual clone pipeline) against the multi-collection in-memory store,
 * and drives the real verb controllers. Two halves:
 *
 *   - **Wave 6 — content and placement.** A fresh dorm room comes with a
 *     soil-filled pot holding a peace lily on the desk, a watering can and a
 *     working tap; the full care loop runs through real verbs; the
 *     footlocker is a genuinely darker place.
 *   - **Wave 7 — durability, proven where it matters.** The properties that
 *     motivated the whole design: a plant survives a reap/restore, it stays
 *     yours when you carry it out of the dorm (its OWN record, reached by
 *     `{ref, key}`, with no dorm code in the path), two rooms' plants never
 *     bleed, a dead plant stays dead, an abandoned one really is abandoned,
 *     and the restart-rollback property holds in both directions.
 *
 * Harness mirrors DormResidence.test.ts.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import DormWarren from '../DormWarren';
import DormRoom from '../DormRoom';
import Desk from '../Desk';
import Footlocker from '../Footlocker';
import Plant from '../../../../obj/Plant';
import PlantPot, { PLANT_SLOT } from '../../../../obj/PlantPot';
import { SOIL_MOISTURE_RESERVE_KEY } from '../../../../lib/husbandry/Cultivable';
import { Reserve } from '../../../../lib/reserve';
import { Quantity } from '../../../../lib/quantity';
import Seed from '../../../../obj/Seed';
import WateringCan from '../../../../obj/WateringCan';
import WaterController from '../../../../obj/command/bulk/WaterController';
import PlantController from '../../../../obj/command/inventory/PlantController';
import RepotController from '../../../../obj/command/inventory/RepotController';
import PourController from '../../../../obj/command/bulk/PourController';
import FillController from '../../../../obj/command/bulk/FillController';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';
import { StuffApi } from '../../../../api/stuff';
import { MixinApi } from '../../../../api/mixin';
import { ContainmentApi } from '../../../../api/containment';
import { ParcelApi } from '../../../../api/parcel';
import { PersistableApi } from '../../../../api/persistable';
import { WorldClockApi } from '../../../../api/worldclock';
import { PerceptionApi } from '../../../../api/perception';
import { AppSettings } from '../../../../lib/config/AppSettings';
import { Light } from '../../../../lib/perception/Light';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import Location from '../../../../lib/stuff/Location';
import PersistentHydrator from '../../../../obj/persistence/PersistentHydrator';
import { Document } from '../../../../lib/persistence/Document';
import ParcelRegistry from '../../../../obj/ParcelRegistry';
import GroupRegistry from '../../../../obj/GroupRegistry';
import Avatar from '../../../../obj/Avatar';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { ExecutionContextApi } from '../../../../api/execution-context';
import {
  makeStuff,
  makeStuffAtPath,
  registerMarshallerForTest,
  withRootContext,
} from '../../../../lib/security/__tests__/test-setup';
import { QuantityMarshaller } from '../../../../obj/persistence/QuantityMarshaller';
import type { Unit } from '../../../../lib/quantity';
import { installV1QuantityTagTables } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';
import { TemplatePaths } from '../../../../lib/paths';
import '../../../../obj/WorldClockRegistry';

// Every test here simulates hundreds of game-days of growth through the real
// verb path, and the acceptance walk runs two full stage ladders. The default
// 5s per-test budget is tight for that, and tighter under parallel load.
vi.setConfig({ testTimeout: 120_000 });

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const PH = PersistentHydrator.templatePath;
const DORMS = DormWarren.DORMS_EXTENT;

const SEEDS = fileURLToPath(new URL('../../../../seeds/', import.meta.url));
const CONTENT = fileURLToPath(
  new URL('../../../../../../../content/', import.meta.url),
);

const DAY = 86_400; // game-seconds per game-day
const BASE = 20_000_000;
let now = BASE;
function setNow(gameSeconds: number): void {
  now = BASE + gameSeconds;
}

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(collection: string): Doc[] {
  let arr = store.get(collection);
  if (!arr) {
    arr = [];
    store.set(collection, arr);
  }
  return arr;
}

/** Load a real seed YAML from disk and register it at `path`. */
function addSeed(path: string, file: string): void {
  const parsed = YAML.parse(readFileSync(file, 'utf-8')) as Record<
    string,
    unknown
  >;
  col('content').push({
    _id: `d-${++idCounter}`,
    path,
    class: parsed.class as string,
    hydratorClass: (parsed.hydratorClass as string) ?? PH,
    data: (parsed.data as Record<string, unknown>) ?? {},
  });
}

const LILY_SPECIES =
  '/obj/species/plantae/tracheophyta/liliopsida/alismatales/araceae/' +
  'spathiphyllum/wallisii';
const SNAKE_SPECIES =
  '/obj/species/plantae/tracheophyta/liliopsida/asparagales/asparagaceae/' +
  'dracaena/trifasciata';

/**
 * Every template this scenario touches, from the REAL seed files — the
 * dorm shell, the gardening objects, and the material / species / body-plan
 * rows they reference.
 */
function seedDomain(): void {
  col('content').push({ _id: `d-${++idCounter}`, path: PH, class: PH, data: {} });

  addSeed(DormWarren.WARREN_PATH, `${SEEDS}domain/eternal/duncan-hall/dorm-warren.yaml`);
  addSeed(DormRoom.SCOPE, `${SEEDS}domain/eternal/duncan-hall/dormroom.yaml`);
  addSeed(
    DormWarren.CORRIDOR_TEMPLATE,
    `${SEEDS}domain/eternal/duncan-hall/corridor.yaml`,
  );
  addSeed(
    DormWarren.LOBBY_PATH,
    `${SEEDS}domain/eternal/duncan-hall/corridor.yaml`,
  );
  for (const f of ['bed', 'desk', 'footlocker', 'tap']) {
    addSeed(
      `/domain/eternal/duncan-hall/dorm-fixtures/${f}`,
      `${SEEDS}domain/eternal/duncan-hall/dorm-fixtures/${f}.yaml`,
    );
  }
  // The gardening objects.
  addSeed('/obj/pot/starter', `${SEEDS}obj/pot/starter.yaml`);
  addSeed('/obj/pot/small', `${SEEDS}obj/pot/small.yaml`);
  addSeed('/obj/pot/large', `${SEEDS}obj/pot/large.yaml`);
  addSeed('/obj/plant/peace-lily', `${SEEDS}obj/plant/peace-lily.yaml`);
  addSeed('/obj/plant/snake-plant', `${SEEDS}obj/plant/snake-plant.yaml`);
  addSeed('/obj/seed/peace-lily', `${SEEDS}obj/seed/peace-lily.yaml`);
  addSeed('/obj/seed/snake-plant', `${SEEDS}obj/seed/snake-plant.yaml`);
  addSeed('/obj/vessel/watering-can', `${SEEDS}obj/vessel/watering-can.yaml`);
  addSeed('/obj/vessel/soil-sack', `${SEEDS}obj/vessel/soil-sack.yaml`);
  // Materials + taxonomy the above reference.
  addSeed(
    '/obj/material/bulk/water',
    `${CONTENT}base-library/content/obj/material/bulk/water.yaml`,
  );
  addSeed(
    '/obj/material/bulk/potting-soil',
    `${CONTENT}base-library/content/obj/material/bulk/potting-soil.yaml`,
  );
  addSeed(
    '/obj/material/ceramic/ceramic',
    `${CONTENT}base-library/content/obj/material/ceramic/ceramic.yaml`,
  );
  addSeed(
    '/obj/material/alloy/steel',
    `${CONTENT}base-library/content/obj/material/alloy/steel.yaml`,
  );
  addSeed(
    '/obj/material/tissue/plant-tissue',
    `${CONTENT}base-library/content/obj/material/tissue/plant-tissue.yaml`,
  );
  addSeed('/obj/species/BodyPlan/sessile', `${SEEDS}obj/species/BodyPlan/sessile.yaml`);
  addSeed(
    '/obj/species/plantae',
    `${CONTENT}species-and-names/content/obj/species/plantae.yaml`,
  );
  addSeed(
    LILY_SPECIES,
    `${CONTENT}species-and-names/content/obj/species/plantae/tracheophyta/` +
      `liliopsida/alismatales/araceae/spathiphyllum/wallisii.yaml`,
  );
  addSeed(
    SNAKE_SPECIES,
    `${CONTENT}species-and-names/content/obj/species/plantae/tracheophyta/` +
      `liliopsida/asparagales/asparagaceae/dracaena/trifasciata.yaml`,
  );
}

function seedUnit(floor: number, pos: number): string {
  const extent = `${DORMS}/f${floor}-r${pos}`;
  col('parcels').push({
    _id: `p-${++idCounter}`,
    extent,
    zonePath: extent,
    owner: { kind: 'group', name: 'duncan-hall' },
    parentParcel: DORMS,
    grants: [],
    allowance: null,
  });
  return extent;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  seedDomain();
  col('parcels').push({
    _id: `p-${++idCounter}`,
    extent: DORMS,
    zonePath: DORMS,
    owner: { kind: 'group', name: 'duncan-hall' },
    parentParcel: null,
    grants: [],
    allowance: null,
  });

  const save = vi.fn(async (collection: string, doc: Doc) => {
    const arr = col(collection);
    if (doc._id) {
      const idx = arr.findIndex((d) => d._id === doc._id);
      if (idx >= 0) arr[idx] = { ...doc };
      else arr.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      const arr = col(collection);
      const keys = Object.keys(query);
      if (keys.length === 0) return arr.slice();
      return arr.filter((d) =>
        keys.every((k) => {
          const stored = d[k];
          const wanted = query[k];
          if (Array.isArray(stored)) return stored.includes(wanted);
          return stored === wanted;
        }),
      );
    },
  );
  const findById = vi.fn(
    async (collection: string, id: string) =>
      col(collection).find((d) => d._id === id) ?? null,
  );
  const del = vi.fn(async (collection: string, id: string) => {
    const arr = col(collection);
    const idx = arr.findIndex((d) => d._id === id);
    if (idx >= 0) arr.splice(idx, 1);
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  // Every marshaller PRODUCTION seeds, read off disk — this scenario walks
  // real content (materials with conductivity, an Avatar's body state), and
  // a unit whose marshaller is missing falls through to a clone of a
  // template the test store doesn't hold. The shared
  // `installV1QuantityMarshallers` helper's hand-kept unit list has fallen
  // behind the `Unit` union, so the seed directory is the honest source.
  for (const file of readdirSync(`${SEEDS}obj/persistence/QuantityMarshaller/`)) {
    if (!file.endsWith('.yaml')) continue;
    const unit = (
      YAML.parse(
        readFileSync(`${SEEDS}obj/persistence/QuantityMarshaller/${file}`, 'utf-8'),
      ) as { data?: { unit?: string } }
    ).data?.unit as Unit | undefined;
    if (!unit) continue;
    registerMarshallerForTest(() => {
      const m = new QuantityMarshaller<typeof unit>();
      (m as unknown as { unit: Unit }).unit = unit;
      return m;
    }, QuantityMarshaller.pathFor(unit));
  }
  installV1QuantityTagTables();
  buildAllModalities();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

/**
 * Stand the taxonomy up as LIVE singletons. `Organism.getSpecies()`
 * resolves `_speciesPath` through `findByTemplatePath` — a live-instance
 * lookup, not a clone — so a species row sitting in the store is invisible
 * until something materializes it (a content pack's job in production).
 */
async function bootTaxonomy(): Promise<void> {
  await StuffApi.singleton('/obj/species/BodyPlan/sessile');
  await StuffApi.singleton('/obj/species/plantae');
  await StuffApi.singleton(LILY_SPECIES);
  await StuffApi.singleton(SNAKE_SPECIES);
  // Materials resolve the same way — `BulkSlot.getMaterial()` and
  // `Tangible.getMaterial()` both walk `findByTemplatePath`, so an
  // unmaterialized row reads as "this holder is empty".
  for (const path of [
    '/obj/material/bulk/water',
    '/obj/material/bulk/potting-soil',
    '/obj/material/ceramic/ceramic',
    '/obj/material/alloy/steel',
    '/obj/material/tissue/plant-tissue',
  ]) {
    await StuffApi.singleton(path);
  }
}

async function bootRegistries(): Promise<void> {
  const groups = makeStuffAtPath(
    () => new GroupRegistry(),
    '/obj/GroupRegistry',
  );
  await groups.postRegister();
  const parcels = makeStuffAtPath(
    () => new ParcelRegistry(),
    '/obj/ParcelRegistry',
  );
  await parcels.postRegister();
}

async function warren(): Promise<DormWarren> {
  return StuffApi.singleton<DormWarren>(DormWarren.WARREN_PATH);
}

function reset(): void {
  vi.restoreAllMocks();
  ParcelApi._resetRegistryRefForReload();
  // `StuffApi.clearAll()` wipes the WorldClockRegistry out of the
  // template-path index, but `WorldClockLogic` deliberately keeps a private
  // pointer to it across the clear (so `_advanceForTesting` keeps working).
  // The result is a registry that answers `WorldClockApi.getNow()` while
  // being INVISIBLE to `findByTemplatePath` — and that lookup is exactly the
  // clock guard every reconcile-on-read mixin opens with, so from the second
  // test onward every growth reconcile would silently no-op. Carry the
  // instance across the clear so the two views agree. (This is what the
  // Caster / Respiration suites avoid by never clearing at all; a suite that
  // must clear has to do this instead.)
  const clock = StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry);
  StuffApi.clearAll();
  if (clock) StuffApi.register(clock);
  WorldClockApi._resetForTesting();
}

function ctxFor(giver: Stuff, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: makeStuff(() => new Location()) as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: Noop\ndescription: stub\n`,
      '<test>',
    ),
  });
}

async function run(
  controller: { execute(m: never, c: CommandContext): unknown },
  giver: Stuff,
  model: CommandModel,
  ctx: CommandContext,
): Promise<void> {
  await withRootContext(null, 'houseplant.test', async () => {
    ExecutionContextApi.tagActingAuthor(giver);
    await controller.execute(model as never, ctx);
  });
}

function rejection(ctx: CommandContext): string | null {
  const rej = ctx.getNotes().find((n) => n.kind === 'controller-rejected') as
    | { reason?: string }
    | undefined;
  return rej?.reason ?? null;
}

/* ─────────────────────────── scene readers ─────────────────────────── */

function findIn<T>(
  host: Stuff & Container,
  pred: (s: Stuff) => boolean,
): T | null {
  return (host.getDeepContents().find(pred) as T | undefined) ?? null;
}

const potIn = (room: Stuff & Container): PlantPot | null =>
  findIn<PlantPot>(room, (s) => s instanceof PlantPot);
const plantIn = (room: Stuff & Container): Plant | null =>
  findIn<Plant>(room, (s) => s instanceof Plant);
const canIn = (room: Stuff & Container): WateringCan | null =>
  findIn<WateringCan>(room, (s) => s instanceof WateringCan);
const deskIn = (room: Stuff & Container): Desk | null =>
  findIn<Desk>(room, (s) => s instanceof Desk);
const lockerIn = (room: Stuff & Container): Footlocker | null =>
  findIn<Footlocker>(room, (s) => s instanceof Footlocker);
/** The tap — the room's unbounded water source. */
function tapIn(room: Stuff & Container): Stuff | null {
  return (
    room
      .getDeepContents()
      .find(
        (s) =>
          MixinApi.isBulkable(s) &&
          !(s instanceof WateringCan) &&
          !(s instanceof PlantPot) &&
          s.getBulkMaterialPath('interior') === '/obj/material/bulk/water',
      ) ?? null
  );
}

function luxAt(loc: Stuff & Container): number {
  const vision = PerceptionApi.modalityByName('vision');
  const light = (vision.signalAt(loc) as Light | null) ?? Light.ZERO;
  return light.intensity.rawValue();
}

/** The long-description lines the condition augmenter appends. */
function conditionLines(plant: Plant): string {
  const augs = (
    plant as unknown as {
      constructor: {
        markupAugmenters: Array<(s: string, h: unknown, v: unknown) => string>;
      };
    }
  ).constructor.markupAugmenters;
  return augs.reduce((text, aug) => aug(text, plant, plant), '');
}

async function makeAvatar(playerId: string): Promise<Avatar> {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

/* ══════════════════ Wave 6 — content, placement, the loop ═════════════ */

describe('the dorm houseplant — content and placement', () => {
  beforeEach(async () => {
    reset();
    installStore();
    await AppSettings.warm();
    await bootRegistries();
    await bootTaxonomy();
    // The clock LAST: `AppSettings.warm()` applies the configured scale, so
    // installing the test provider before it would have the scale reset out
    // from under the anchor. Scale 1000 makes one provider unit one
    // game-second, so `setNow(gameSeconds)` means what it says (the
    // Wet.test.ts idiom).
    setNow(0);
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    reset();
  });

  it('a fresh dorm room comes with a planted pot on the desk, a can, and water', async () => {
    const w = await warren();
    const room = await w.admit(seedUnit(1, 1));

    const pot = potIn(room);
    const plant = plantIn(room);
    const can = canIn(room);
    const tap = tapIn(room);
    const desk = deskIn(room);

    expect(pot).not.toBeNull();
    expect(plant).not.toBeNull();
    expect(can).not.toBeNull();
    expect(tap).not.toBeNull();

    // Soil-filled, and the plant is IN THE SLOT (not merely in the pot) —
    // a slot-only-or-contents-only occupant is the capture-slice trap.
    expect(pot!.hasSoil()).toBe(true);
    expect(pot!.getSoilVolume()).toBeGreaterThan(0);
    expect(pot!.getOccupant(PLANT_SLOT)).toBe(plant);
    expect(pot!.getContents()).toContain(plant);
    expect(plant!.getBed()).toBe(pot);

    // Resting on the desk (the `onto:` populate spec).
    expect(pot!.getRestingOn()).toBe(desk);

    // A real peace lily: species resolved, alive, healthy, and its own host.
    expect(plant!.getSpecies()?.getBinomial()).toBe('Spathiphyllum wallisii');
    expect(plant!.isAlive()).toBe(true);
    expect(plant!.getConditionBand()).toBe('healthy');
    expect(MixinApi.isPersistable(plant!)).toBe(true);

    // The room is lit enough for it, and the tap is inexhaustible.
    expect(luxAt(room as Stuff & Container)).toBeGreaterThanOrEqual(20);
    expect(plant!.getLimitingFactor()).toBeNull();
  });

  it('the care loop runs through real verbs: fill at the tap, water the plant', async () => {
    const w = await warren();
    const room = await w.admit(seedUnit(1, 1));
    const plant = plantIn(room)!;
    const can = canIn(room)!;
    const tap = tapIn(room)!;
    const tenant = await makeAvatar('tenant');
    ContainmentApi.move(tenant, room as unknown as Stuff & Container);
    ContainmentApi.move(can, tenant); // carried — the verb needs it in hand

    // Let the soil dry a while so there is room for water.
    plant.getVigor();
    setNow(6 * DAY);
    const before = plant.getSoilMoisture();
    expect(before).toBeLessThan(1);

    // `fill` the can at the tap.
    const fillCtx = ctxFor(tenant, 'fill');
    await run(
      makeStuff(() => new FillController()),
      tenant,
      {
        target: { stuff: can, raw: 'can' },
        source: { stuff: tap, raw: 'tap', prep: 'from' },
      } as unknown as CommandModel,
      fillCtx,
    );
    expect(can.getBulkAmount('interior').rawValue()).toBeGreaterThan(0);

    // `water` the plant.
    const ctx = ctxFor(tenant, 'water');
    await run(
      makeStuff(() => new WaterController()),
      tenant,
      { target: { stuff: plant, raw: 'lily' } } as unknown as CommandModel,
      ctx,
    );
    expect(rejection(ctx)).toBeNull();
    expect(plant.getSoilMoisture()).toBeGreaterThan(before);
  });

  it('the dim corridor is a genuinely darker place, and the cause line says so', async () => {
    const w = await warren();
    const room = await w.admit(seedUnit(1, 1));
    const plant = plantIn(room)!;
    const pot = potIn(room)!;
    const tenant = await makeAvatar('tenant');
    ContainmentApi.move(tenant, room as unknown as Stuff & Container);
    // The darker place is the CORRIDOR, not the footlocker: a Footlocker is
    // a plain Vessel with no lid to close, so `signalAt` climbs past it to
    // the room and it reads exactly as bright. Room-to-room placement is
    // what carries the light axis, which is why this build authors ambient
    // light on the corridor (`dim`, 9 lux) as well as the room (`lit`, 30).
    const corridor = (StuffApi.findAllByTemplatePath(
      DormWarren.CORRIDOR_TEMPLATE,
    )[0] ??
      (await StuffApi.clone(
        DormWarren.CORRIDOR_TEMPLATE,
      ))) as unknown as Stuff & Container;
    expect(corridor).toBeTruthy();

    plant.getVigor();
    // Keep it watered throughout so LIGHT is the only variable — and stay
    // inside the `seedling` stage (30 good game-days), because the starter
    // pot's 0.5 L cannot carry the lily's `young` root demand and ROOT would
    // otherwise become the limiting factor instead.
    for (let d = 4; d <= 12; d += 4) {
      setNow(d * DAY);
      plant.waterPlant(1);
    }
    expect(plant.getLimitingFactor()).toBeNull();
    expect(luxAt(room as unknown as Stuff & Container)).toBeGreaterThanOrEqual(20);

    expect(luxAt(corridor)).toBeLessThan(luxAt(room as unknown as Stuff & Container));

    // Out into the corridor.
    ContainmentApi.move(pot, corridor);
    setNow(16 * DAY);
    plant.waterPlant(1);
    expect(plant.getLimitingFactor()).toBe('light');
    expect(conditionLines(plant)).toContain('not getting enough light');

    // Back out onto the desk and the cause clears.
    ContainmentApi.move(pot, room as unknown as Stuff & Container);
    setNow(20 * DAY);
    plant.waterPlant(1);
    expect(plant.getLimitingFactor()).toBeNull();
  });

  it('⭐ the acceptance walk: soil → plant → tend → flower → outgrow → repot', async () => {
    const w = await warren();
    const room = await w.admit(seedUnit(1, 1));
    const tenant = await makeAvatar('tenant');
    ContainmentApi.move(tenant, room as unknown as Stuff & Container);

    // Acquire the kit (buyability itself is proven in the store test).
    const sack = await StuffApi.clone<Stuff>('/obj/vessel/soil-sack');
    const small = await StuffApi.clone<PlantPot>('/obj/pot/small');
    const seed = await StuffApi.clone<Seed>('/obj/seed/snake-plant');
    for (const item of [sack, small, seed]) {
      ContainmentApi.move(item as Stuff & Containable, tenant);
    }
    expect(small.hasSoil()).toBe(false);

    // 1. `pour` the soil in — no new verb for filling a pot.
    await run(
      makeStuff(() => new PourController()),
      tenant,
      {
        source: { stuff: sack, raw: 'sack' },
        target: { stuff: small, raw: 'pot', prep: 'into' },
      } as unknown as CommandModel,
      ctxFor(tenant, 'pour'),
    );
    expect(small.hasSoil()).toBe(true);

    // 2. `plant` the seed.
    const plantCtx = ctxFor(tenant, 'plant');
    await run(
      makeStuff(() => new PlantController()),
      tenant,
      {
        seed: { stuff: seed, raw: 'seed' },
        pot: { stuff: small, raw: 'pot', prep: 'in' },
      } as unknown as CommandModel,
      plantCtx,
    );
    expect(rejection(plantCtx)).toBeNull();
    const grown = small.getOccupant(PLANT_SLOT) as Plant;
    expect(grown).toBeInstanceOf(Plant);
    expect(grown.getSpecies()?.getBinomial()).toBe('Dracaena trifasciata');
    expect(seed.isDestroyed()).toBe(true);

    // 3. Tend it. The snake plant's `established` demand (1.2 L) exceeds the
    //    small pot's 0.5 L, so it advances and then binds.
    for (let d = 10; d <= 700; d += 10) {
      setNow(d * DAY);
      grown.waterPlant(1);
    }
    expect(grown.getLimitingFactor()).toBe('root');
    expect(conditionLines(grown)).toContain('outgrown its pot');
    const stalledAt = grown.getGrowthStage();
    expect(grown.isAlive()).toBe(true); // stalls, never dies of it

    // 4. Buy the large pot, fill it, `repot`.
    const large = await StuffApi.clone<PlantPot>('/obj/pot/large');
    ContainmentApi.move(large, room as unknown as Stuff & Container);
    const sack2 = await StuffApi.clone<Stuff>('/obj/vessel/soil-sack');
    ContainmentApi.move(sack2 as Stuff & Containable, tenant);
    await run(
      makeStuff(() => new PourController()),
      tenant,
      {
        source: { stuff: sack2, raw: 'sack' },
        target: { stuff: large, raw: 'large pot', prep: 'into' },
      } as unknown as CommandModel,
      ctxFor(tenant, 'pour'),
    );
    expect(large.hasSoil()).toBe(true);

    const repotCtx = ctxFor(tenant, 'repot');
    await run(
      makeStuff(() => new RepotController()),
      tenant,
      {
        plant: { stuff: grown, raw: 'snake plant' },
        pot: { stuff: large, raw: 'large pot', prep: 'into' },
      } as unknown as CommandModel,
      repotCtx,
    );
    expect(rejection(repotCtx)).toBeNull();
    expect(large.getOccupant(PLANT_SLOT)).toBe(grown);
    expect(grown.getLimitingFactor()).toBeNull(); // the bind is released

    // 5. Maturation resumes, it flowers, and it sets a seed.
    for (let d = 710; d <= 1400; d += 10) {
      setNow(d * DAY);
      grown.waterPlant(1);
    }
    const stageOrder = ['seedling', 'young', 'established', 'mature'];
    expect(stageOrder.indexOf(grown.getGrowthStage())).toBeGreaterThan(
      stageOrder.indexOf(stalledAt),
    );
    expect(grown.getGrowthStage()).toBe('mature');
    expect(grown.isFlowering()).toBe(true);
    // The seed clone is a real async chain (template read + gated clone),
    // not one microtask — poll for it.
    let setSeed: Seed | undefined;
    for (let i = 0; i < 50 && !setSeed; i++) {
      await new Promise((r) => setTimeout(r, 5));
      setSeed = large.getContents().find((c) => c instanceof Seed) as Seed;
    }
    expect(setSeed).toBeInstanceOf(Seed);
    if (!setSeed) throw new Error('unreachable — asserted above');
    // …and that seed grows the same species: the loop closes with no money.
    expect(setSeed.getGrowsIntoPath()).toBe('/obj/plant/snake-plant');
  });
});

/* ══════════════════ Wave 7 — durability where it matters ══════════════ */

describe('the dorm houseplant — durability', () => {
  beforeEach(async () => {
    reset();
    installStore();
    await AppSettings.warm();
    await bootRegistries();
    await bootTaxonomy();
    // The clock LAST: `AppSettings.warm()` applies the configured scale, so
    // installing the test provider before it would have the scale reset out
    // from under the anchor. Scale 1000 makes one provider unit one
    // game-second, so `setNow(gameSeconds)` means what it says (the
    // Wet.test.ts idiom).
    setNow(0);
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    reset();
  });

  /**
   * Reap the room (capture + destruct) and re-admit a fresh clone.
   *
   * Destructing the room evacuates its contents rather than culling them,
   * so the pot and its plant can outlive the room object. In production the
   * residency sweep culls that cold tail; here we cull it explicitly, since
   * leaving a live plant registered under the key its record now owns is
   * exactly the `(scope, key)` collision the spine refuses.
   */
  async function reapAndReadmit(
    w: DormWarren,
    room: Stuff & Container,
    unit: string,
  ): Promise<Stuff & Container> {
    // Capture each nested HOST first. The room's own record only refs a
    // plant by `{ref, key}` — the plant's state lives in its own record, and
    // in production that record is written by the act that changed it (the
    // `water` verb's `captureHostOf`) and by the residency sweep before it
    // culls. A test that pokes `waterPlant` directly has to do the same, or
    // the plant restores from a record that was never written.
    // Snapshot the subtree BEFORE anything is torn down — a destroyed room
    // no longer answers `getDeepContents`.
    const subtree = room.getDeepContents() as Stuff[];
    const hosts = subtree.filter((x) => x instanceof Plant);
    for (const h of hosts) await PersistableApi.capture(h);
    await PersistableApi.capture(room, unit);
    await (w as unknown as { reconcile(): Promise<void> }).reconcile();
    if (!room.isDestroyed()) StuffApi.destruct(room);
    // Destructing the room evacuates rather than culls, so the pot and its
    // plant can outlive it. In production the residency sweep culls that
    // cold tail; leaving a live plant registered under the key its record
    // now owns is exactly the `(scope, key)` collision the spine refuses.
    for (const s of subtree) {
      if (s instanceof Plant || s instanceof PlantPot) StuffApi.unregister(s);
    }
    return (await w.admit(unit)) as unknown as Stuff & Container;
  }

  it('a potted plant on the desk survives a reap/restore intact', async () => {
    const w = await warren();
    const unit = seedUnit(1, 1);
    const room = await w.admit(unit);
    const plant = plantIn(room)!;

    // Give it real state to lose.
    plant.getVigor();
    for (let d = 4; d <= 40; d += 4) {
      setNow(d * DAY);
      plant.waterPlant(1);
    }
    const before = {
      moisture: plant.getSoilMoisture(),
      vigor: plant.getVigor(),
      stage: plant.getGrowthStage(),
      key: plant.getPersistenceKey(),
      soil: potIn(room)!.getSoilVolume(),
    };

    const reborn = await reapAndReadmit(w, room as unknown as Stuff & Container, unit);

    const pot2 = potIn(reborn);
    const plant2 = plantIn(reborn);
    expect(pot2).not.toBeNull();
    expect(plant2).not.toBeNull();
    // Its pot and soil, its slot occupancy, and its resting surface.
    expect(pot2!.getSoilVolume()).toBeCloseTo(before.soil, 6);
    expect(pot2!.getOccupant(PLANT_SLOT)).toBe(plant2);
    expect(pot2!.getContents()).toContain(plant2);
    expect(pot2!.getRestingOn()).toBe(deskIn(reborn));
    // Its growth state, and its own record key.
    expect(plant2!.getSoilMoisture()).toBeCloseTo(before.moisture, 4);
    expect(plant2!.getVigor()).toBeCloseTo(before.vigor, 4);
    expect(plant2!.getGrowthStage()).toBe(before.stage);
    expect(plant2!.getPersistenceKey()).toBe(before.key);
  });

  it('⭐ carry it out of the dorm and it stays yours — its own record, no dorm in the path', async () => {
    const w = await warren();
    const unit = seedUnit(1, 1);
    const room = await w.admit(unit);
    const plant = plantIn(room)!;
    const pot = potIn(room)!;
    const tenant = await makeAvatar('tenant');
    ContainmentApi.move(tenant, room as unknown as Stuff & Container);

    plant.getVigor();
    for (let d = 4; d <= 40; d += 4) {
      setNow(d * DAY);
      plant.waterPlant(1);
    }
    // Pick the pot up: the plant now rides the AVATAR's record, by
    // `{ref, key}` through the pot's nested slice.
    ContainmentApi.move(pot, tenant);
    const key = plant.getPersistenceKey()!;
    const stage = plant.getGrowthStage();
    const vigorAtPack = plant.getVigor();

    await PersistableApi.capture(plant);
    await PersistableApi.capture(tenant);

    // The plant's record exists under its OWN scope and key — nothing about
    // the dorm is involved.
    const records = col('holder_snapshots');
    const own = records.find(
      (r) => r.scope === '/obj/plant/peace-lily' && r.owner === key,
    );
    expect(own).toBeDefined();
    // The avatar's slice refs it by (ref, key), not by absorbing it.
    const avatarRec = records.find(
      (r) => r.scope === tenant.getTemplatePath(),
    )!;
    const refs = JSON.stringify(avatarRec.state);
    expect(refs).toContain('/obj/plant/peace-lily');
    expect(refs).toContain(key);

    // Time passes while everything is torn down, then the avatar restores.
    setNow(80 * DAY);
    for (const s of [plant, pot, tenant]) StuffApi.unregister(s);
    StuffApi.unregister(room);

    const reborn = makeStuffAtPath(
      () => new Avatar(),
      `/obj/Avatar/tenant`,
    );
    reborn.setPlayerId('tenant');
    await PersistableApi.materialize(reborn);

    const carriedPot = findIn<PlantPot>(
      reborn as unknown as Stuff & Container,
      (s) => s instanceof PlantPot,
    );
    const carriedPlant = findIn<Plant>(
      reborn as unknown as Stuff & Container,
      (s) => s instanceof Plant,
    );
    expect(carriedPot).not.toBeNull();
    expect(carriedPlant).not.toBeNull();
    expect(carriedPlant!.getPersistenceKey()).toBe(key);
    expect(carriedPlant!.getGrowthStage()).toBe(stage);
    expect(carriedPot!.getOccupant(PLANT_SLOT)).toBe(carriedPlant);

    // And it kept GROWING across the gap, not merely survived it: with no
    // watering for 40 game-days its vigor fell.
    expect(carriedPlant!.getVigor()).toBeLessThan(vigorAtPack);
    expect(carriedPlant!.getSoilMoisture()).toBeLessThan(1);
  });

  it('⭐ two dorm rooms, two plants, no bleed', async () => {
    const w = await warren();
    const u1 = seedUnit(1, 1);
    const u2 = seedUnit(1, 2);
    const r1 = await w.admit(u1);
    const r2 = await w.admit(u2);
    const p1 = plantIn(r1)!;
    const p2 = plantIn(r2)!;

    // Same template, distinct records.
    expect(p1.getTemplatePath()).toBe(p2.getTemplatePath());
    expect(p1.getPersistenceKey()).not.toBe(p2.getPersistenceKey());

    // Tend one, neglect the other.
    p1.getVigor();
    p2.getVigor();
    for (let d = 4; d <= 60; d += 4) {
      setNow(d * DAY);
      p1.waterPlant(1);
    }
    expect(p1.getVigor()).toBeGreaterThan(p2.getVigor());

    // Round-trip BOTH and the divergence holds. One `reconcile()` reaps every
    // empty room, so the two rooms have to be captured and culled together
    // rather than one at a time.
    const subtrees = [r1, r2].map(
      (r) => (r as unknown as Stuff & Container).getDeepContents() as Stuff[],
    );
    for (const [i, unit] of [u1, u2].entries()) {
      for (const h of subtrees[i]!.filter((x) => x instanceof Plant)) {
        await PersistableApi.capture(h);
      }
      await PersistableApi.capture([r1, r2][i] as Stuff, unit);
    }
    await (w as unknown as { reconcile(): Promise<void> }).reconcile();
    for (const s of subtrees.flat()) {
      if (s instanceof Plant || s instanceof PlantPot) StuffApi.unregister(s);
    }
    const r1b = (await w.admit(u1)) as unknown as Stuff & Container;
    const r2b = (await w.admit(u2)) as unknown as Stuff & Container;
    const p1b = plantIn(r1b)!;
    const p2b = plantIn(r2b)!;
    expect(p1b.getPersistenceKey()).not.toBe(p2b.getPersistenceKey());
    expect(p1b.getVigor()).toBeGreaterThan(p2b.getVigor());
  });

  it('a dead plant is still dead after restore, and is not re-seeded', async () => {
    const w = await warren();
    const unit = seedUnit(1, 1);
    const room = await w.admit(unit);
    const plant = plantIn(room)!;

    plant.getVigor();
    setNow(12 * 360 * DAY); // a simulated real year of total neglect
    expect(plant.getConditionBand()).toBe('dead');

    const reborn = await reapAndReadmit(w, room as unknown as Stuff & Container, unit);
    const plant2 = plantIn(reborn)!;
    expect(plant2.getConditionBand()).toBe('dead');
    expect(plant2.isDead()).toBe(true);
    // `seedBornWith` does NOT re-run on a room that has a record, so no
    // replacement lily appears alongside the dead one.
    const plants = (reborn.getDeepContents() as Stuff[]).filter(
      (s) => s instanceof Plant,
    );
    expect(plants).toHaveLength(1);
  });

  it('the abandonment rule holds and is observable', async () => {
    // Growing ⇒ cultivated ⇒ durable — but durable IN A PERSISTABLE HOST.
    // Left loose in a transient room, a plant goes down with it and does not
    // come back. One rule across all owned things; no rescue registry, no
    // boot walk.
    const w = await warren();
    const room = await w.admit(seedUnit(1, 1));
    const plant = plantIn(room)!;
    const pot = potIn(room)!;
    const key = plant.getPersistenceKey()!;

    const transient = makeStuff(() => new Location());
    ContainmentApi.move(pot, transient);
    expect(plant.getBed()).toBe(pot);

    // Cull the transient room. Nothing captured it, so nothing wrote a
    // record: `ContainerMixin.cleanupOnDestruct` has nowhere to evacuate a
    // top-level room's contents to, so it destroys the pot outright, and the
    // plant is left stranded inside a dead room — unreachable, and with no
    // record to be brought back from.
    StuffApi.destruct(transient);
    expect(pot.isDestroyed()).toBe(true);
    expect(transient.isDestroyed()).toBe(true);
    expect(plant.getBed()).toBeNull(); // its slot went with the pot

    const records = col('holder_snapshots');
    expect(
      records.find(
        (r) => r.scope === '/obj/plant/peace-lily' && r.owner === key,
      ),
    ).toBeUndefined();
    // The room's record still REFERS to the key (it was written while the
    // pot was on the desk), and that is the point: the ref resolves to a
    // `(scope, key)` record that does not exist, so a re-admit mints a
    // default plant rather than restoring the abandoned one. Nothing carries
    // the tended state forward — no rescue registry, no boot walk.
  });

  it('⭐ the restart-rollback property: the elapsed time survives, the watering needs a capture', async () => {
    const w = await warren();
    const unit = seedUnit(1, 1);
    const room = await w.admit(unit);
    const plant = plantIn(room)!;
    const pot = potIn(room)!;
    const key = plant.getPersistenceKey()!;

    // Part-dry it, then capture the checkpoint. Deliberately NOT bone dry:
    // the assertion below is that ten more elapsed days leave it drier
    // still, which needs somewhere left to fall.
    plant.getVigor();
    setNow(3 * DAY);
    const dryMoisture = plant.getSoilMoisture();
    expect(dryMoisture).toBeLessThan(1);
    expect(dryMoisture).toBeGreaterThan(0);
    await PersistableApi.capture(plant, key);
    const checkpointStamp = plant.growthClockStamp;
    // Since phase 2 the WATER is the pot's, so a faithful restart has to
    // check the pot back in too — restoring the plant alone would restore
    // half the world and leave it rooted in nothing.
    const potMoistureAtCheckpoint = pot
      .getReserve(SOIL_MOISTURE_RESERVE_KEY)!
      .current.rawValue();

    // Water it — and DO NOT capture (the crash-before-capture case).
    plant.waterPlant(1);
    expect(plant.getSoilMoisture()).toBeCloseTo(1, 3);
    // The crash takes the plant with it — vacate its place so the
    // restored instance can take it back.
    pot.vacate(PLANT_SLOT, plant);
    StuffApi.unregister(plant);

    // Restart, ten game-days later, restoring from that record — the
    // plant back into a pot rolled back to its checkpoint water.
    setNow(20 * DAY);
    pot.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        pot.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.capacity,
        Quantity.of(potMoistureAtCheckpoint, 'L'),
        'cultivation',
        'wilting',
      ),
    );
    // The pot's clock cursor is public (`Hydrator` reflects into it), so
    // this is a plain write, not a cast through the contract. Winding it
    // back is HOW you simulate a restart: production restores the stamp
    // from the record, and there is no other seam that puts a pot's soil
    // clock where a checkpoint left it.
    pot.soilClockStamp = checkpointStamp;
    const restored = makeStuffAtPath(
      () => new Plant(),
      '/obj/plant/peace-lily',
    );
    restored.setPersistenceKey(key);
    await PersistableApi.materialize(restored, key);
    // The record put the clock cursor back where the checkpoint left it…
    // (asserted BEFORE re-seating: being placed is an environment change,
    // and a reconcile is exactly what that is supposed to trigger.)
    expect(restored.growthClockStamp).toBe(checkpointStamp);
    ContainmentApi.move(restored, pot);
    pot.occupy(restored, PLANT_SLOT);

    // (a) The watering is LOST — an intervention cannot be re-derived.
    // (b) The elapsed TIME is not: state derives from that clock stamp, so
    //     the first read re-derives forward through the whole gap. A
    //     tick-based model would have lost those ten days outright. This is
    //     what makes reconcile-on-read survivable under an event-driven
    //     capture spine, and the whole family inherits it.
    const afterRollback = restored.getSoilMoisture();
    expect(afterRollback).toBeLessThan(dryMoisture);
    expect(restored.growthClockStamp).toBeGreaterThan(checkpointStamp);

    // Now re-run WITH the capture wired (what the `water` verb actually
    // does) and the watering survives the same restart. Since phase 2 the
    // litres land in the POT, so the capture that has to happen is the
    // ground's — which is what WaterController now does.
    restored.waterPlant(1);
    await PersistableApi.captureHostOf(restored);
    await PersistableApi.captureHostOf(pot);
    const wetMoisture = restored.getSoilMoisture();
    expect(wetMoisture).toBeGreaterThan(afterRollback);
    pot.vacate(PLANT_SLOT, restored);
    StuffApi.unregister(restored);

    const restored2 = makeStuffAtPath(
      () => new Plant(),
      '/obj/plant/peace-lily',
    );
    restored2.setPersistenceKey(key);
    await PersistableApi.materialize(restored2, key);
    ContainmentApi.move(restored2, pot);
    pot.occupy(restored2, PLANT_SLOT);
    expect(restored2.getSoilMoisture()).toBeCloseTo(wetMoisture, 4);
  });

  it('growth advances across a multi-day absence with no player and no scheduler', async () => {
    const w = await warren();
    const room = await w.admit(seedUnit(1, 1));
    const plant = plantIn(room)!;

    plant.getVigor();
    const stage = plant.getGrowthStage();
    expect(stage).toBe('seedling');

    // Nobody logs in; nothing ticks. One read, much later.
    setNow(40 * DAY); // over three real days
    expect(plant.getSoilMoisture()).toBe(0); // the absence was integrated
    expect(plant.getVigor()).toBeLessThan(0.7); // and it cost the plant
  });
});
