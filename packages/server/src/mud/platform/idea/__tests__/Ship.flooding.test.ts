/**
 * Ship — ⭐ flooding, settling, sinking and the wreck,
 * over synthetic rows under `/test/**`.
 *
 * - her rooms flood from the lowest up, by `floorM`, and a dry room reads
 *   dry (a compartment is a water place only while water stands in it);
 * - the water at her deck opens her settling window — PER PERSON, sized in
 *   acts: one person spending theirs does not close it, everyone does;
 *   the real-seconds backstop closes it; nobody aboard and she goes at once;
 * - pumped back below her deck in time, she holds;
 * - sunk, every room is under the bottom's depth less its floor, and she
 *   goes nowhere; her bilge read is the sea's;
 * - at a berth shallower than her hull she settles onto the mud, not sinks,
 *   and floats again once pumped;
 * - ⭐ the AC *nothing fails over a weekend away*, in arithmetic: a sound
 *   smack left alone a weekend (24 world days at 12×) — and a long one (30)
 *   — is afloat; a neglected season has her gone.
 */

import '../../../../test-bootstrap';
import { KERNEL_CONTENT_ROWS } from '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Ship from '../Ship';
import ShipWarren, { AUTHORED_SHIP_WARREN } from '../ShipWarren';
import Compartment from '../../location/Compartment';
import TemplateApplier from '../TemplateApplier';
import { Document } from '../../../lib/persistence/Document';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { PersistableApi } from '../../../api/persistable';
import { WorldClockApi } from '../../../api/worldclock';
import { TestHarnessApi } from '../../../api/test-harness';
import { ExpanseApi } from '../../../api/expanse';
import type { CommandDispatchedPayload } from '../../../lib/events/CommandDispatchedEvent';
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
  add(AUTHORED_SHIP_WARREN, '/platform/idea/ShipWarren', {});
  add(KIND, '/platform/idea/Ship', {
    name: 'the smack',
    extent: ROOMS,
    entrance: DECK,
    warren: WARREN,
    hull: { lengthM: 9, beamM: 3, draftM: 1.2, depthM: 1.8 },
  });
  // ⭐ Her kind's PLAN is her kind row's own `extent` + `entrance` (harbors
  // review, 2026-11-03 — no blueprint row); her warren row names nothing.
  add(WARREN, '/platform/idea/ShipWarren', {});
  add(ROOMS, '/platform/idea/location/CartesianZone', { name: 'a smack' });
  add(DECK, '/platform/location/Compartment', { shortDescription: 'smack deck', floorM: 1.8, exits: { down: { destination: HOLD } } });
  add(HOLD, '/platform/location/Hold', { shortDescription: 'fish hold', floorM: 0.3, exits: { up: { destination: DECK } } });
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


/** Her two rooms, standing. */
async function roomsOf(ship: Ship): Promise<{ deck: Compartment; hold: Compartment }> {
  const w = await warrenOf(ship);
  return {
    deck: w.roomForLeaf('deck') as unknown as Compartment,
    hold: w.roomForLeaf('hold') as unknown as Compartment,
  };
}

/** A body aboard: a crate the test says is an interactive organism. */
async function personIn(room: Stuff & Container, people: Set<Stuff>): Promise<Stuff & Containable> {
  const who = await StuffApi.clone<Stuff & Containable>(CRATE);
  people.add(who);
  ContainmentApi.move(who, room);
  return who;
}

function act(who: Stuff): CommandDispatchedPayload {
  return { subjectId: who.stuffId, commandId: 'c', at: now, realAt: Date.now() };
}

/** Litres that put the water `heightM` above her keel. */
const litresAt = (heightM: number): number => heightM * 9 * 3 * 0.7 * 1000;

describe('Ship — flooding, settling, sinking (harbors B5)', () => {
  let people: Set<Stuff>;

  beforeEach(() => {
    reset();
    installStore();
    now = T0;
    pinClock();
    people = new Set();
    vi.spyOn(MixinApi, 'isHasInteractive').mockImplementation(((s: Stuff) => people.has(s)) as never);
    vi.spyOn(MixinApi, 'isOrganism').mockImplementation(((s: Stuff) => people.has(s)) as never);
  });
  afterEach(reset);

  it('⭐ her rooms flood from the lowest up by floorM — and a dry room reads dry', async () => {
    const ship = await mint('f1');
    const { deck, hold } = await roomsOf(ship);
    await ship.reconcileBilge();
    expect(MixinApi.isWaterPlace(deck as unknown as Stuff)).toBe(true);
    expect(deck.stateNow()).toBe('dry');
    expect(deck.depthNow() > 0).toBe(false);
    expect(hold.stateNow()).toBe('dry');
    expect(deck.bandsNow()).toEqual([]);
    const someone = await personIn(deck as unknown as Stuff & Container, people);
    expect(deck.mediumFor(someone).immersed).toBe(false);

    // Knee-deep in her hold (its floor 0.3 m up her keel); her deck is dry.
    await TestHarnessApi.stageShip(ship.getDurableHandle()!, { bilgeL: litresAt(0.8) });
    expect(hold.depthNow()).toBeCloseTo(0.5, 6);
    expect(hold.stateNow()).toBe('wading');
    expect(hold.depthNow() > 0).toBe(true);
    expect(hold.floodWords()).toBe('Water stands waist-deep here.');
    expect(hold.mediumFor(someone).immersed).toBe(false); // standing in it, head in the air
    expect(deck.stateNow()).toBe('dry');

    // Chest-deep below — a smack's hold never floods over a man's head while
    // she floats (her deck is 1.5 m above its floor); her deck still dry.
    await TestHarnessApi.stageShip(ship.getDurableHandle()!, { bilgeL: litresAt(1.79) });
    expect(hold.stateNow()).toBe('wading');
    expect(hold.floodWords()).toBe('The water is up to your chest here.');
    expect(deck.depthNow() > 0).toBe(false);
    expect(ship.isSettling()).toBe(false);
  });

  it('⭐⭐ the water at her deck opens the window — per person, in acts', async () => {
    const ship = await mint('w1');
    const { deck, hold } = await roomsOf(ship);
    const a = await personIn(deck as unknown as Stuff & Container, people);
    const b = await personIn(hold as unknown as Stuff & Container, people);
    await TestHarnessApi.stageShip(ship.getDurableHandle()!, { bilgeL: ship.bilgeCapacityL() });
    await ship.reconcileBilge();
    expect(ship.isSettling()).toBe(true);
    expect(ship.isSunk()).toBe(false);
    const stranger = await StuffApi.clone<Stuff & Containable>(CRATE);
    people.add(stranger); // ashore: nothing to her
    for (let i = 0; i < 10; i++) await ship.countAct(act(stranger));
    // One person spending all six does not close it — the other has theirs.
    for (let i = 0; i < 6; i++) await ship.countAct(act(a));
    expect(ship.isSunk()).toBe(false);
    for (let i = 0; i < 5; i++) await ship.countAct(act(b));
    expect(ship.isSunk()).toBe(false);
    await ship.countAct(act(b));
    expect(ship.isSunk()).toBe(true);
    expect(ship.isSettling()).toBe(false);
    // Still aboard: in a room under the sea.
    expect(hold.stateNow()).toBe('swimming');
    const m = hold.mediumFor(b);
    expect(m.immersed).toBe(true);
    expect(m.atSurface).toBe(false);
    expect(hold.floodWords()).toMatch(/lies on the bottom/);
    // She goes nowhere now.
    expect('refused' in (await ship.steer({ toward: 'x' } as never))).toBe(true);
  });

  it('⭐ a person who leaves her is out of the count; the backstop closes the window', async () => {
    const ship = await mint('b1');
    const { deck } = await roomsOf(ship);
    const a = await personIn(deck as unknown as Stuff & Container, people);
    const b = await personIn(deck as unknown as Stuff & Container, people);
    await TestHarnessApi.stageShip(ship.getDurableHandle()!, { bilgeL: ship.bilgeCapacityL() });
    await ship.reconcileBilge();
    for (let i = 0; i < 6; i++) await ship.countAct(act(a));
    expect(ship.isSunk()).toBe(false);
    // `b` goes over the side: everyone still aboard has used theirs.
    const ashore = await StuffApi.clone<Stuff & Container>(DECK);
    ContainmentApi.move(b, ashore as unknown as Stuff & Container); // her room's witness asks again
    for (let i = 0; i < 10 && !ship.isSunk(); i++) await new Promise((r) => setTimeout(r, 0));
    expect(ship.isSunk()).toBe(true);

    // The backstop: nobody acts, and the real seconds run out.
    const other = await mint('b2');
    const r = await roomsOf(other);
    await personIn(r.deck as unknown as Stuff & Container, people);
    await TestHarnessApi.stageShip(other.getDurableHandle()!, { bilgeL: other.bilgeCapacityL() });
    await other.reconcileBilge();
    expect(other.isSettling()).toBe(true);
    expect(await other.checkSettling(Date.now() + 599_000)).toBe(false);
    expect(await other.checkSettling(Date.now() + 601_000)).toBe(true);
    expect(other.isSunk()).toBe(true);
  });

  it('⭐ nobody aboard: she goes at once — the wreck at the bottom, her rooms under it', async () => {
    const ship = await mint('n1');
    vi.spyOn(ship, 'bottomDepthM').mockResolvedValue(20);
    const { deck, hold } = await roomsOf(ship);
    await TestHarnessApi.stageShip(ship.getDurableHandle()!, { bilgeL: ship.bilgeCapacityL() });
    await ship.reconcileBilge();
    expect(ship.isSunk()).toBe(true);
    expect(ship.getWreck()!.depthM).toBe(20);
    expect(hold.depthNow()).toBeCloseTo(19.7, 6);
    expect(deck.depthNow()).toBeCloseTo(18.2, 6);
    expect(deck.depthNow() > 0).toBe(true);
    // ⭐ The register entry and her title are not hers to lose by sinking: she is still the ship.
    expect(ship.isDestroyed()).toBe(false);
    expect(ship.getDurableHandle()).toBe(`${KIND}/n1`);
  });

  it('⭐ review 2: a wreck stood up after a restart is under the sea again — her plain rooms read it off HER', async () => {
    const ship = await mint('w2');
    vi.spyOn(Ship.prototype, 'bottomDepthM').mockResolvedValue(20);
    await roomsOf(ship);
    await TestHarnessApi.stageShip(ship.getDurableHandle()!, { bilgeL: ship.bilgeCapacityL() });
    await ship.reconcileBilge();
    expect(ship.isSunk()).toBe(true);
    await PersistableApi.capture(ship as unknown as Stuff);
    // The process ends; her deck kept no record of its own.
    StuffApi.clearAll();
    expect(await PersistableApi.hasRecord(DECK, 'w2/deck')).toBe(false);
    const back = (await ExpanseApi.standUpCraft(`${KIND}/w2`)) as unknown as Ship;
    expect(back.isSunk()).toBe(true);
    const { deck, hold } = await roomsOf(back);
    expect(MixinApi.isPersistable(deck)).toBe(false);
    expect(deck.depthNow() > 0).toBe(true);
    expect(deck.depthNow()).toBeCloseTo(18.2, 6);
    expect(hold.depthNow()).toBeCloseTo(19.7, 6);
    expect(deck.floodWords()).toMatch(/lies on the bottom/);
  });

  it('⭐ pumped back below her deck in time, she holds', async () => {
    const ship = await mint('p1');
    const { deck } = await roomsOf(ship);
    await personIn(deck as unknown as Stuff & Container, people);
    await TestHarnessApi.stageShip(ship.getDurableHandle()!, { bilgeL: ship.bilgeCapacityL() });
    await ship.reconcileBilge();
    expect(ship.isSettling()).toBe(true);
    expect(await ship.pumpOut(12)).toBeCloseTo(12, 6);
    expect(ship.isSettling()).toBe(false);
    expect(ship.isSunk()).toBe(false);
  });

  it('⭐ at a berth shallower than her hull she settles onto the mud — and floats again pumped out', async () => {
    const ship = await mint('s1');
    vi.spyOn(ship, 'bottomDepthM').mockResolvedValue(1.5);
    const { deck } = await roomsOf(ship);
    await personIn(deck as unknown as Stuff & Container, people);
    await TestHarnessApi.stageShip(ship.getDurableHandle()!, { bilgeL: ship.bilgeCapacityL() });
    // stageBilge leaves her afloat; the read decides.
    await ship.reconcileBilge();
    expect(ship.isSettled()).toBe(true);
    expect(ship.isSettling()).toBe(false);
    expect(ship.isSunk()).toBe(false);
    expect('refused' in (await ship.steer({ toward: 'x' } as never))).toBe(true);
    // A stroke does not float her: her draft with the water in her is on the mud still.
    await ship.pumpOut(12);
    expect(ship.isSettled()).toBe(true);
    // Pumped down until her draft (1.2) and the water in her clear 1.5 m: she floats.
    await ship.pumpOut(ship.bilgeNowL() - litresAt(0.25));
    expect(ship.isSettled()).toBe(false);
  });

  it('⭐⭐ AC: nothing fails over a weekend away — a neglected season has her gone', async () => {
    const ship = await mint('wk');
    await ship.reconcileBilge(); // sound, stamped
    // A weekend at 12× is 24 world days; a long one (Fri evening–Mon morning) 30.
    for (const days of [24, 30]) {
      now = T0 + days * DAY;
      const l = await ship.reconcileBilge();
      expect(l, `day ${days}`).toBeLessThan(ship.bilgeCapacityL() * 0.6);
      expect(ship.isSettling() || ship.isSunk() || ship.isSettled()).toBe(false);
    }
    // At 24 days her cabin and hold floors (0.3 m) are barely wet.
    const twin = await mint('wk2');
    await twin.reconcileBilge();
    now = T0 + 24 * DAY;
    expect(twin.bilgeHeightNowM()).toBeLessThan(0.35);
    // A neglected season — left from sound to well into worn — and she is gone.
    now = T0 + 40 * DAY;
    await ship.reconcileBilge();
    expect(ship.isSunk()).toBe(true);
  });

  it('⭐ staging: `settling` puts the water at her deck and opens the window', async () => {
    const ship = await mint('st');
    const { deck } = await roomsOf(ship);
    await personIn(deck as unknown as Stuff & Container, people);
    await TestHarnessApi.stageShip(ship.getDurableHandle()!, { settling: true });
    expect(ship.isSettling()).toBe(true);
  });
});
