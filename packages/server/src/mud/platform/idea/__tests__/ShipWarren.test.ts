/**
 * ShipWarren — ⭐ ships from a KIND (harbors B1, P1–P3), over synthetic rows
 * under `/test/**` (lint:test-content: kernel tests never name /world/).
 *
 * - two ships of one kind are keyed apart: their own rooms, their own
 *   contents, their own durable handles, each room answering for its OWN
 *   ship (`NavigationApi.structureAt` by handle);
 * - a ship of a kind sleeps whole when the last interactive leaves her and
 *   she is not under way; under way she stays;
 * - her way aboard outlives her sleep, and taking it stands her up and
 *   leads onto her deck, made fast as she was;
 * - a restart: the spine's resolve-first `standUpKeyed` brings her back
 *   from her record, and asked twice gives the one ship;
 * - an authored ship (one row, one ship) adopts the rooms under her
 *   `extent` through the platform's empty-floorplan warren.
 */

import '../../../../test-bootstrap';
import { KERNEL_CONTENT_ROWS } from '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Ship from '../Ship';
import ShipWarren, { AUTHORED_SHIP_WARREN } from '../ShipWarren';
import BerthExit from '../BerthExit';
import Compartment from '../../location/Compartment';
import Thing from '../../thing/Thing';
import TemplateApplier from '../TemplateApplier';
import { Document } from '../../../lib/persistence/Document';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { NavigationApi } from '../../../api/navigation';
import { ContainmentApi } from '../../../api/containment';
import { PersistableApi } from '../../../api/persistable';
import { ExpanseApi } from '../../../api/expanse';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type { Exitable } from '../../../lib/boundary/Exitable';
import type { MooringLine } from '../../../lib/spatial/MooringLine';
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
const CRATE = '/test/ship/crate';
const LANDING = '/test/quay/landing';
const BOLLARD = '/test/quay/bollard';
const AUTHORED = '/test/hesper/structure';
const A_DECK = '/test/hesper/deck';
const A_HOLD = '/test/hesper/hold';

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
  // A ship kind, its floorplan and its rooms (the rooms stand in the rows' zone).
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
  add(HOLD, '/platform/location/Compartment', { shortDescription: 'fish hold' });
  add(CRATE, '/platform/thing/Thing', { shortDescription: 'a crate' });
  add(LANDING, '/platform/location/Locale', { shortDescription: 'a landing', props: [BOLLARD] });
  add(BOLLARD, '/platform/thing/Bollard', { shortDescription: 'a bollard', fixedInPlace: true });
  // An authored ship: one row, her rooms rows of their own under her extent.
  add(AUTHORED, '/platform/idea/Ship', { name: 'the Hesper', extent: '/test/hesper', entrance: A_DECK });
  add(A_DECK, '/platform/location/Compartment', { shortDescription: "Hesper's deck" });
  add(A_HOLD, '/platform/location/Compartment', { shortDescription: "Hesper's hold" });

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

/** A line by the kernel protocol, without its end: enough to make her fast. */
function fakeLine(): Stuff & MooringLine {
  let fast = false;
  return {
    isDestroyed: () => false,
    lineLengthM: () => 30,
    isMadeFast: () => fast,
    makeFastRound: async () => {
      fast = true;
      return true;
    },
    castOffMooring: async () => {
      fast = false;
    },
  } as unknown as Stuff & MooringLine;
}

/** Mint a ship of the kind, keyed `serial`, and stand her up. */
async function mint(serial: string): Promise<Ship> {
  const ship = await StuffApi.clone<Ship>(KIND);
  await PersistableApi.restoreOrSeed(ship as unknown as Stuff, serial);
  return ship;
}

async function deckOf(ship: Ship): Promise<Stuff & Container> {
  const deck = await ship.watchRoom();
  expect(deck).not.toBeNull();
  return deck!;
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function reset(): void {
  vi.restoreAllMocks();
  StuffApi.clearAll();
}

describe('ShipWarren — ships from a kind (harbors B1)', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('⭐ two smacks of one kind are keyed apart — rooms, contents, handles, and which ship a room is', async () => {
    const a = await mint('a1');
    const b = await mint('b2');
    expect(a.getDurableHandle()).toBe(`${KIND}#a1`);
    expect(b.getDurableHandle()).toBe(`${KIND}#b2`);
    expect(StuffApi.findByDurableHandle(`${KIND}#a1`)).toBe(a);
    expect(StuffApi.findByDurableHandle(`${KIND}#b2`)).toBe(b);
    // The row is every smack's: it is no durable name for either.
    expect(StuffApi.findByDurableHandle(KIND)).toBeNull();

    const deckA = await deckOf(a);
    const deckB = await deckOf(b);
    expect(deckA).not.toBe(deckB);
    expect(deckA).toBeInstanceOf(Compartment);
    expect(deckA.getTemplatePath()).toBe(DECK);
    expect(deckA.getDurableHandle()).toBe(`${DECK}#a1/deck`);
    expect(deckB.getDurableHandle()).toBe(`${DECK}#b2/deck`);
    // Her floorplan's way below is wired keyed, to HER hold.
    const down = (deckA as unknown as Exitable).getExit('down');
    expect(down?.getDestination()?.getDurableHandle()).toBe(`${HOLD}#a1/hold`);

    const crate = await StuffApi.clone<Stuff & Containable>(CRATE);
    ContainmentApi.move(crate, deckA);
    expect(deckA.getContents()).toContain(crate);
    expect(deckB.getContents()).not.toContain(crate);
    expect(await a.cargoKg()).toBeGreaterThanOrEqual(0);

    // Which ship a room is: its warren's answer, by the room's handle.
    expect(await NavigationApi.structureAt(deckA.getDurableHandle()!)).toBe(a);
    expect(await NavigationApi.structureAt(deckB.getDurableHandle()!)).toBe(b);
    expect(NavigationApi.structureAtNow(`${HOLD}#b2/hold`)).toBe(b);
    expect(MixinApi.isWarrenMember(deckA) && deckA.getWarren()).toBeInstanceOf(ShipWarren);
  });

  it('⭐ she sleeps whole when the last interactive leaves — and not while she is under way', async () => {
    const ship = await mint('s1');
    const deck = await deckOf(ship);
    const hold = (deck as unknown as Exitable).getExit('down')!.getDestination() as unknown as Stuff & Container;
    const warren = (deck as unknown as { getWarren(): ShipWarren }).getWarren();
    const who = await StuffApi.clone<Stuff & Containable>(CRATE);
    const crate = await StuffApi.clone<Stuff & Containable>(CRATE);
    ContainmentApi.move(crate, hold);
    const interactive = vi.spyOn(MixinApi, 'isHasInteractive').mockImplementation(((s: Stuff) => s === who) as never);

    // Under way she stays awake with nobody aboard.
    const course = vi.spyOn(ship, 'getCourse').mockReturnValue({} as never);
    const away = await StuffApi.singleton<Stuff & Container>(LANDING);
    ContainmentApi.move(who, deck);
    ContainmentApi.move(who, hold);
    ContainmentApi.move(who, away);
    await tick();
    await tick();
    expect(ship.isDestroyed()).toBe(false);
    expect(ship.canEvict({} as never).ok).toBe(false);
    course.mockRestore();

    // Not under way: the last one off and she goes down whole.
    ContainmentApi.move(who, deck);
    ContainmentApi.move(who, away);
    for (let i = 0; i < 10 && !ship.isDestroyed(); i++) await tick();
    expect(ship.isDestroyed()).toBe(true);
    expect(warren.isDestroyed()).toBe(true);
    expect(deck.isDestroyed()).toBe(true);
    expect(hold.isDestroyed()).toBe(true);
    interactive.mockRestore();

    // Asleep is captured: her record, her warren's, each room's.
    expect(await PersistableApi.hasRecord(KIND, 's1')).toBe(true);
    expect(await PersistableApi.hasRecord(HOLD, 's1/hold')).toBe(true);
    // Woken: the hold still holds the crate.
    const back = await ExpanseApi.standUpCraft(`${KIND}#s1`);
    expect(back).toBeInstanceOf(Ship);
    const deck2 = await deckOf(back as unknown as Ship);
    const hold2 = (deck2 as unknown as Exitable).getExit('down')!.getDestination() as unknown as Stuff & Container;
    expect(hold2.getContents().filter((c) => c.getTemplatePath() === CRATE)).toHaveLength(1);
  });

  it('⭐ her way aboard outlives her sleep: taking it stands her up, made fast as she was', async () => {
    vi.spyOn(Ship.prototype, 'linesAboard').mockImplementation(async () => [fakeLine(), fakeLine()]);
    const ship = await mint('w1');
    const words = await ship.comeAlongside(LANDING);
    expect(words).toMatch(/made fast/);
    const landing = await StuffApi.singleton<Stuff & Container & Exitable>(LANDING);
    const way = landing.getExit('smack');
    expect(way).toBeInstanceOf(BerthExit);
    expect((way as BerthExit).getShipHandle()).toBe(`${KIND}#w1`);

    await ship.sleep();
    expect(ship.isDestroyed()).toBe(true);
    // The way stays, reading her name while she sleeps.
    expect(landing.getExit('smack')).toBe(way);
    expect((way as BerthExit).ship()).toBeNull();
    expect((way as BerthExit).alongsideName()).toBe('the smack');

    const deck = await (way as BerthExit).resolveDestination();
    expect(deck.getDurableHandle()).toBe(`${DECK}#w1/deck`);
    const woke = StuffApi.findByDurableHandle<Ship>(`${KIND}#w1`)!;
    expect(woke).not.toBe(ship);
    expect(woke.isMoored()).toBe(true);
    expect(woke.getBerth()).toBe(LANDING);
    // Her re-wire adopted the way that was waiting — still one, still hers.
    expect(landing.getExit('smack')).toBe(way);
    expect((way as BerthExit).ship()).toBe(woke);
  });

  it('⭐ a restart: standUpKeyed resolves first, and brings her back from her record', async () => {
    const ship = await mint('r1');
    ship.setAground(true);
    await PersistableApi.capture(ship as unknown as Stuff);
    // Resolve-first: asked while she stands, the one ship.
    expect(await PersistableApi.standUpKeyed(KIND, 'r1')).toBe(ship);

    // The process ends: nothing stands. Her record does.
    StuffApi.clearAll();
    const back = await PersistableApi.standUpKeyed(KIND, 'r1');
    expect(back).toBeInstanceOf(Ship);
    expect(back).not.toBe(ship);
    expect((back as Ship).isAground()).toBe(true);
    expect((back as Ship).getDurableHandle()).toBe(`${KIND}#r1`);
    expect(await PersistableApi.standUpKeyed(KIND, 'r1')).toBe(back);
    const deck = await (back as Ship).watchRoom();
    expect(deck?.getDurableHandle()).toBe(`${DECK}#r1/deck`);
  });

  it('⭐ an authored ship adopts the rooms under her extent, and never sleeps', async () => {
    const ship = await StuffApi.singleton<Ship>(AUTHORED);
    expect(ship.getDurableHandle()).toBe(AUTHORED);
    expect(ship.isOfKind()).toBe(false);
    const deck = await StuffApi.singleton<Stuff & Container>(A_DECK);
    const hold = await StuffApi.singleton<Stuff & Container>(A_HOLD);
    const who = await StuffApi.clone<Stuff & Containable>(CRATE);
    vi.spyOn(MixinApi, 'isHasInteractive').mockImplementation(((s: Stuff) => s === who) as never);
    ContainmentApi.move(who, deck);
    const aboard = await ship.aboard();
    expect(aboard).toEqual([]); // a crate is no organism; the read ran through her warren
    const warren = (deck as unknown as { getWarren(): ShipWarren | null }).getWarren();
    expect(warren).toBeInstanceOf(ShipWarren);
    expect((hold as unknown as { getWarren(): ShipWarren | null }).getWarren()).toBe(warren);
    expect(warren!.ship()).toBe(ship);
    expect(await NavigationApi.structureAt(A_DECK)).toBe(ship);

    // The last one off an authored ship: she stands while her zone does.
    ContainmentApi.move(who, hold);
    ContainmentApi.move(who, await StuffApi.singleton<Stuff & Container>(LANDING));
    await tick();
    await tick();
    expect(ship.isDestroyed()).toBe(false);
    expect(deck.isDestroyed()).toBe(false);
  });
});
