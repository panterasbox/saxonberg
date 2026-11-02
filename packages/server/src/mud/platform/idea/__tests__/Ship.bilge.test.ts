/**
 * Ship — ⭐ the hull clock, the leak, the bilge and the pump (harbors B4,
 * P19), over synthetic rows under `/test/**`.
 *
 * - the leak is her shell's band × her length (+ a hole), the house's rate;
 * - the bilge is the leak integrated over the shell's LINE, band by band —
 *   read once across a band boundary or twice either side of it, the same;
 * - `maintain` (her warren's restore) brings the bilge up to now at the
 *   old band, then she is tight: the leak stops, read live;
 * - the bilge well lifts her bilge over the side, a stroke at a time, and
 *   credits the hand at the brake with seamanship;
 * - a sounding in words, banded by seamanship;
 * - staging: `hull <band>` reads that band, `slept <days>` fills her over it.
 */

import '../../../../test-bootstrap';
import { KERNEL_CONTENT_ROWS } from '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Ship from '../Ship';
import ShipWarren, { AUTHORED_SHIP_WARREN } from '../ShipWarren';
import BilgeWell from '../../thing/BilgeWell';
import TemplateApplier from '../TemplateApplier';
import { Document } from '../../../lib/persistence/Document';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { PersistableApi } from '../../../api/persistable';
import { WorldClockApi } from '../../../api/worldclock';
import { TestHarnessApi } from '../../../api/test-harness';
import { Quantity } from '../../../lib/quantity';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import { PersistenceManager } from '../../../lib/persistence/__tests__/backend-store';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const KIND = '/test/ship/smack';
const WARREN = '/test/ship/smack-plan';
const ROOMS = '/test/ship/rooms';
const DECK = `${ROOMS}/deck`;
const HOLD = `${ROOMS}/hold`;
const WELL = '/test/ship/well';
const PUMP = '/test/ship/pump';
const CRATE = '/test/ship/crate';

const DAY = 86_400;
const T0 = 1_000_000;
/** A 9 m smack: litres a second by band (the shipped grain × her length). */
const WEATHERED_LPS = 9 * 0.0005;
const WORN_LPS = 9 * 0.004;
const CAPACITY_L = 9 * 3 * 0.7 * 1.8 * 1000;

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(name: string): Doc[] {
  let arr = store.get(name);
  if (!arr) {
    arr = [];
    store.set(name, arr);
  }
  return arr;
}

function matches(d: Doc, q: Record<string, unknown>): boolean {
  return Object.keys(q).every((k) => {
    const want = q[k];
    const stored = d[k];
    if (want !== null && typeof want === 'object' && '$regex' in (want as object)) {
      return typeof stored === 'string' && new RegExp(String((want as { $regex: string }).$regex)).test(stored);
    }
    if (Array.isArray(stored)) return stored.includes(want);
    return stored === want;
  });
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const content = col('content');
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    content.push({ _id: `d-${++idCounter}`, path, class: cls, data });
  add(TemplateApplier.templatePath, TemplateApplier.templatePath);
  for (const row of KERNEL_CONTENT_ROWS) content.push({ _id: `d-${++idCounter}`, ...row });
  add('/platform/idea/exits/berth', '/platform/idea/BerthExit');
  add(AUTHORED_SHIP_WARREN, '/platform/idea/ShipWarren', { floorplan: [] });
  add(KIND, '/platform/idea/Ship', {
    name: 'the smack',
    entrance: DECK,
    warren: WARREN,
    hull: { lengthM: 9, beamM: 3, draftM: 1.2, depthM: 1.8 },
  });
  add(WARREN, '/platform/idea/ShipWarren', {
    floorplan: [
      { leaf: 'deck', room: DECK, entry: true, floorM: 1.8, exits: [{ to: 'hold', direction: 'down', opposite: 'up' }] },
      { leaf: 'hold', room: HOLD, floorM: 0.3 },
    ],
  });
  add(ROOMS, '/platform/idea/location/CartesianZone', { name: 'a smack' });
  add(DECK, '/platform/location/Compartment', { shortDescription: 'smack deck' });
  add(HOLD, '/platform/location/Hold', { shortDescription: 'fish hold' });
  add(WELL, '/platform/thing/BilgeWell', { shortDescription: 'bilge well' });
  add(PUMP, '/platform/thing/Pump', { shortDescription: 'bilge pump', throughputLps: 0.6, strokeS: 20 });
  add(CRATE, '/platform/thing/Thing', { shortDescription: 'a crate' });

  const save = vi.fn(async (c: string, doc: Doc) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc };
      else arr.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => col(c).filter((d) => matches(d, q)));
  const findById = vi.fn(async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null);
  const del = vi.fn(async (c: string, id: string) => {
    const arr = col(c);
    const i = arr.findIndex((d) => d._id === id);
    if (i >= 0) arr.splice(i, 1);
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

let now = T0;

function pinClock(): void {
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
}

/** Mint a ship of the kind under `<kind>/<serial>` (as `buy` does), standing. */
async function mint(serial: string): Promise<Ship> {
  const ship = await StuffApi.clone<Ship>(KIND, undefined, { asIdentityPath: `${KIND}/${serial}` });
  await PersistableApi.restoreOrSeed(ship as unknown as Stuff, serial);
  return ship;
}

async function warrenOf(ship: Ship): Promise<ShipWarren> {
  const w = await ship.standWarren();
  expect(w).toBeInstanceOf(ShipWarren);
  return w!;
}

function reset(): void {
  vi.restoreAllMocks();
  StuffApi.clearAll();
}

describe('Ship — the hull clock, the leak and the bilge (harbors B4)', () => {
  beforeEach(() => {
    reset();
    installStore();
    now = T0;
    pinClock();
  });
  afterEach(reset);

  it('⭐ the leak is her band × her length, and a hole on top', async () => {
    const ship = await mint('l1');
    expect(ship.leakLpsFor('sound')).toBe(0);
    expect(ship.leakLpsFor('weathered')).toBeCloseTo(WEATHERED_LPS, 9);
    expect(ship.leakLpsFor('worn')).toBeCloseTo(WORN_LPS, 9);
    expect(ship.leakLpsFor('shabby')).toBeCloseTo(9 * 0.02, 9);
    expect(ship.leakLpsFor('dilapidated')).toBeCloseTo(9 * 0.08, 9);
    expect(await ship.hullBand()).toBe('sound');
    expect(await ship.leakLps()).toBe(0);
    ship.setHoled(true);
    expect(ship.leakLpsFor('sound')).toBeCloseTo(9 * 0.25, 9);
    expect(ship.bilgeCapacityL()).toBeCloseTo(CAPACITY_L, 6);
  });

  it('⭐ the bilge fills over her shell line band by band — the same read once or twice', async () => {
    const a = await mint('a1');
    const b = await mint('b1');
    expect(await a.reconcileBilge()).toBe(0); // stamps the shell and the bilge
    expect(await b.reconcileBilge()).toBe(0);
    // Sound for nine days (0.9 at the house's rate), then weathered.
    now = T0 + 5 * DAY;
    expect(await a.reconcileBilge()).toBe(0);
    expect(await a.hullBand()).toBe('sound');
    now = T0 + 20 * DAY;
    const want = 11 * DAY * WEATHERED_LPS;
    expect(await a.reconcileBilge()).toBeCloseTo(want, 3);
    expect(await b.reconcileBilge()).toBeCloseTo(want, 3); // one read across the boundary
    expect(await a.hullBand()).toBe('weathered');
    // Into worn, and she fills to her deck and no further.
    now = T0 + 40 * DAY;
    expect(await a.hullBand()).toBe('worn');
    expect(await a.reconcileBilge()).toBeCloseTo(CAPACITY_L, 3);
  });

  it('⭐ maintain: the water already in came in at the old band; then she is tight and the leak stops', async () => {
    const ship = await mint('m1');
    await ship.reconcileBilge();
    now = T0 + 20 * DAY;
    const w = await warrenOf(ship);
    expect(w.conditionBand()).toBe('weathered');
    const capture = vi.spyOn(PersistableApi, 'capture');
    w.restoreShell();
    expect(capture).toHaveBeenCalledWith(w);
    expect(ship.bilgeNowL()).toBeCloseTo(11 * DAY * WEATHERED_LPS, 3);
    expect(await ship.hullBand()).toBe('sound');
    expect(await ship.leakLps()).toBe(0);
    now = T0 + 21 * DAY;
    expect(await ship.reconcileBilge()).toBeCloseTo(11 * DAY * WEATHERED_LPS, 3);
    expect(w.upkeepWords().discipline).toBe('seamanship');
    expect(w.upkeepWords().kit).toBe("a caulker's kit");
  });

  it('⭐ the bilge well: a pump in it lifts her bilge over the side, crediting the hand at the brake', async () => {
    const ship = await mint('p1');
    const deck = (await ship.watchRoom())!;
    const well = await StuffApi.clone<BilgeWell>(WELL);
    ContainmentApi.move(well as unknown as Stuff & Containable, deck);
    expect(well.shipOf()).toBe(ship);
    const crate = await StuffApi.clone<Stuff & Containable>(CRATE);
    expect(well.canAddContainable(crate).ok).toBe(false);
    const pump = await StuffApi.clone<Stuff & Containable>(PUMP);
    expect(well.canAddContainable(pump).ok).toBe(true);
    ContainmentApi.move(pump, well as unknown as Stuff & Container);
    expect(well.pumpFitted()).toBe(pump);
    expect(well.receivableL()).toBe(Infinity);

    await ship.reconcileBilge();
    now = T0 + 20 * DAY;
    const before = await well.standingAvailableL();
    expect(before).toBeGreaterThan(1000);
    const depthBefore = well.standingDepthM();
    const credit = vi.fn(async () => undefined);
    const hand = { creditDeed: credit } as unknown as Stuff;
    vi.spyOn(MixinApi, 'isAdvancing').mockImplementation(((s: Stuff) => s === hand) as never);
    expect(await well.liftInto(12, hand)).toBeCloseTo(12, 9);
    expect(ship.bilgeNowL()).toBeCloseTo(before - 12, 3);
    expect(well.standingDepthM()).toBeGreaterThan(depthBefore);
    expect(credit).toHaveBeenCalledWith({ discipline: 'seamanship', difficulty: 'easy', outcome: 'success' });
    expect(well.liftedWords('Water').toString()).toMatch(/over her side/);
    // Between strokes it comes back in (weathered: she weeps).
    now += 20;
    expect(await well.standingAvailableL()).toBeCloseTo(before - 12 + 20 * WEATHERED_LPS, 3);
    // An empty bilge gives nothing back.
    expect(await ship.pumpOut(1e9)).toBeGreaterThan(0);
    expect(await ship.pumpOut(12)).toBe(0);
  });

  it('⭐ a sounding in words — how deep for all, how fast for a novice, the pump for an expert', async () => {
    const ship = await mint('w1');
    expect(await ship.bilgeWords('untrained')).toBe('Her well is dry. It is not rising.');
    now = T0 + 20 * DAY; // ~0.23 m in her, weathered
    expect(await ship.bilgeWords('untrained')).toBe('There is water knee-deep in her bilge. It is rising.');
    expect(await ship.bilgeWords('novice')).toMatch(/rising slowly/);
    expect(await ship.bilgeWords('competent')).not.toMatch(/pump/);
    expect(await ship.bilgeWords('expert')).toMatch(/One pump kept at the brake would gain on it\./);
  });

  it('⭐ staging: `hull worn slept` reads worn and has filled her over the sleep', async () => {
    const ship = await mint('s1');
    const handle = ship.getDurableHandle()!;
    await TestHarnessApi.stageShip(handle, { hull: 'worn', sleptDays: 0.25 });
    expect(await ship.hullBand()).toBe('worn');
    // Six hours at worn (her line back-extrapolated stays in the band).
    expect(ship.bilgeNowL()).toBeCloseTo(0.25 * DAY * WORN_LPS, 0);
    await TestHarnessApi.stageShip(handle, { bilgeL: 100 });
    expect(ship.bilgeNowL()).toBeCloseTo(100, 6);
    await expect(TestHarnessApi.stageShip(handle, { hull: 'rotten' })).rejects.toThrow(/hull wants a band/);
  });
});
