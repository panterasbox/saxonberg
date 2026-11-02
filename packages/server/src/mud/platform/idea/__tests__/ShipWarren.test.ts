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
 *   `extent` through the platform's blueprint-less warren.
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
import type Rope from '../../thing/Rope';
import { PersistenceManager } from '../../../lib/persistence/__tests__/backend-store';
import { PersistableMixin } from '../../../lib/persistence/Persistable';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { Idea } from '../../../lib/stuff/Idea';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
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
const GEAR = '/test/ship/gear';
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
  add(AUTHORED_SHIP_WARREN, '/platform/idea/ShipWarren', {});
  // A ship kind, its blueprint and its rooms (the rooms stand in the rows' zone).
  add(KIND, '/platform/idea/Ship', {
    name: 'the smack',
    entrance: DECK,
    warren: WARREN,
    hull: { lengthM: 9, beamM: 3, draftM: 1.2, depthM: 1.8 },
  });
  // ⭐ Her kind's blueprint (harbors review 3): a Structure over ordinary rows.
  add(WARREN, '/platform/idea/ShipWarren', { blueprint: `${ROOMS}-blueprint` });
  add(`${ROOMS}-blueprint`, '/platform/idea/Structure', { extent: ROOMS, entrance: DECK });
  add(ROOMS, '/platform/idea/location/CartesianZone', { name: 'a smack' });
  add(DECK, '/platform/location/Compartment', {
    floorM: 1.8, exits: { down: { destination: HOLD } },
    shortDescription: 'smack deck',
    props: [GEAR],
    details: { sea: { keywords: ['sea'], description: 'Below the rail, the water.' } },
  });
  add(GEAR, '/platform/thing/Thing', { shortDescription: 'a coil of gear' });
  add(HOLD, '/platform/location/Hold', { shortDescription: 'fish hold', floorM: 0.3, exits: { up: { destination: DECK } } });
  add(CRATE, '/platform/thing/Thing', { shortDescription: 'a crate' });
  add(LANDING, '/platform/location/Locale', { shortDescription: 'a landing', props: [BOLLARD] });
  add(BOLLARD, '/platform/thing/Bollard', { shortDescription: 'a bollard', fixedInPlace: true });
  // An authored ship: one row, her rooms rows of their own under her extent.
  add(AUTHORED, '/platform/idea/Ship', { name: 'the Hesper', extent: '/test/hesper', entrance: A_DECK });
  add(A_DECK, '/platform/location/Compartment', { shortDescription: "Hesper's deck" });
  add(A_HOLD, '/platform/location/Hold', { shortDescription: "Hesper's hold" });

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

/** A line of hers by the rope's surface, without its end: enough to make her fast. */
function fakeLine(): Rope {
  let by: unknown = null;
  let to: unknown = null;
  return {
    isDestroyed: () => false,
    tieTo: async (who: unknown, load: unknown) => {
      by = who;
      to = load;
      return { ok: true, line: '' };
    },
    acrossFor: () => by,
    acrossTo: () => to,
    castOff: async () => {
      by = null;
      to = null;
    },
  } as unknown as Rope;
}

/** Mint a ship of the kind under her identity `<kind>/<serial>` (as `buy` does), and stand her up. */
async function mint(serial: string): Promise<Ship> {
  const ship = await StuffApi.clone<Ship>(KIND, undefined, { asIdentityPath: `${KIND}/${serial}` });
  await PersistableApi.restoreOrSeed(ship as unknown as Stuff, serial);
  return ship;
}

/** The one live thing filed at `path` (a ship at her identity). */
function filed<T extends Stuff>(path: string): T | null {
  return (StuffApi.findByIdentityPath<T>(path).find((s) => !s.isDestroyed()) ?? null) as T | null;
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
    // ⭐ A ship of a kind is a minted identity (review 1): her handle IS it.
    expect(a.getDurableHandle()).toBe(`${KIND}/a1`);
    expect(b.getDurableHandle()).toBe(`${KIND}/b2`);
    expect(a.getIdentityPath()).toBe(`${KIND}/a1`);
    expect(filed(`${KIND}/a1`)).toBe(a);
    expect(filed(`${KIND}/b2`)).toBe(b);
    expect(a.isOfKind()).toBe(true);
    // The row is every smack's: nothing is filed at it.
    expect(filed(KIND)).toBeNull();

    const deckA = await deckOf(a);
    const deckB = await deckOf(b);
    expect(deckA).not.toBe(deckB);
    expect(deckA).toBeInstanceOf(Compartment);
    expect(deckA.getTemplatePath()).toBe(DECK);
    // ⭐ A deck keeps no record (review 2): it is told apart by the key
    // her warren stood it up under, and has no handle of its own.
    expect(MixinApi.isPersistable(deckA)).toBe(false);
    expect(deckA.getDurableHandle()).toBeNull();
    expect((deckA as unknown as { getWarren(): ShipWarren }).getWarren().mintedKeyOf(deckA)).toBe('a1/deck');
    expect((deckB as unknown as { getWarren(): ShipWarren }).getWarren().mintedKeyOf(deckB)).toBe('b2/deck');
    // Her blueprint's way below is wired keyed, to HER hold.
    const down = (deckA as unknown as Exitable).getExit('down');
    expect(down?.getDestination()?.getDurableHandle()).toBe(`${HOLD}#a1/hold`);

    // ⭐ Her cargo is in her HOLD (review 2): two smacks keep separate cargo.
    const holdA = (deckA as unknown as Exitable).getExit('down')!.getDestination() as unknown as Stuff & Container;
    const holdB0 = (deckB as unknown as Exitable).getExit('down')!.getDestination() as unknown as Stuff & Container;
    expect(MixinApi.isPersistable(holdA)).toBe(true);
    const crate = await StuffApi.clone<Stuff & Containable>(CRATE);
    ContainmentApi.move(crate, holdA);
    expect(holdA.getContents()).toContain(crate);
    expect(holdB0.getContents()).not.toContain(crate);
    expect(await a.cargoKg()).toBeGreaterThanOrEqual(0);

    // Which ship a room is: its warren's answer — the ROOM is asked.
    expect(await (deckA as unknown as Compartment).structure()).toBe(a);
    expect(await (deckB as unknown as Compartment).structure()).toBe(b);
    const holdB = (deckB as unknown as Exitable).getExit('down')!.getDestination() as unknown as Compartment;
    expect(holdB.structureNow()).toBe(b);
    // A keyed room's handle names it; it is no way to find it.
    expect(() => NavigationApi.structureAtNow(`${HOLD}#b2/hold`)).toThrow(/ask the place/);
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
    expect(await PersistableApi.hasRecord(`${KIND}/s1`, 's1')).toBe(true);
    expect(await PersistableApi.hasRecord(HOLD, 's1/hold')).toBe(true);
    // ⭐ Her deck keeps none (review 2): it comes up from its row.
    expect(await PersistableApi.hasRecord(DECK, 's1/deck')).toBe(false);
    // Woken: the hold still holds the crate.
    const back = await ExpanseApi.standUpCraft(`${KIND}/s1`);
    expect(back).toBeInstanceOf(Ship);
    const deck2 = await deckOf(back as unknown as Ship);
    const hold2 = (deck2 as unknown as Exitable).getExit('down')!.getDestination() as unknown as Stuff & Container;
    expect(hold2.getContents().filter((c) => c.getTemplatePath() === CRATE)).toHaveLength(1);
  });

  it('⭐⭐ review 2: asleep, what is loose on deck is stowed in her hold, and gear carried off her stays gone', async () => {
    const ship = await mint('g1');
    const deck = await deckOf(ship);
    const gearOf = (room: Stuff & Container) => room.getContents().filter((c) => c.getTemplatePath() === GEAR);
    expect(gearOf(deck)).toHaveLength(1);
    // Her gear carried ashore; a crate of yours left on her deck.
    const away = await StuffApi.singleton<Stuff & Container>(LANDING);
    ContainmentApi.move(gearOf(deck)[0] as Stuff & Containable, away);
    const crate = await StuffApi.clone<Stuff & Containable>(CRATE);
    ContainmentApi.move(crate, deck);
    await ship.sleep();
    expect(ship.isDestroyed()).toBe(true);

    let back = (await ExpanseApi.standUpCraft(`${KIND}/g1`)) as unknown as Ship;
    let deck2 = await deckOf(back);
    const hold2 = (deck2 as unknown as Exitable).getExit('down')!.getDestination() as unknown as Stuff & Container;
    // The crate is below; the row did not hand her the gear again.
    expect(hold2.getContents().filter((c) => c.getTemplatePath() === CRATE)).toHaveLength(1);
    expect(deck2.getContents().filter((c) => c.getTemplatePath() === CRATE)).toHaveLength(0);
    expect(gearOf(deck2)).toHaveLength(0);

    // Slept again with nothing carried off: still none, never two.
    await back.sleep();
    back = (await ExpanseApi.standUpCraft(`${KIND}/g1`)) as unknown as Ship;
    deck2 = await deckOf(back);
    expect(gearOf(deck2)).toHaveLength(0);
  });

  it('⭐ review 2: gear left aboard comes up from her row — once', async () => {
    const ship = await mint('g2');
    await ship.sleep();
    const back = (await ExpanseApi.standUpCraft(`${KIND}/g2`)) as unknown as Ship;
    const deck = await deckOf(back);
    expect(deck.getContents().filter((c) => c.getTemplatePath() === GEAR)).toHaveLength(1);
  });

  it('⭐ review 2: somebody on a smack\'s deck is placed by the key her warren holds it under, never the shared row', async () => {
    const ship = await mint('p1');
    const deck = await deckOf(ship);
    class Rover extends PersistableMixin(ContainableMixin(Idea)) {}
    const who = makeStuffAtPath(() => new Rover(), '/test/rover') as unknown as Stuff & Containable;
    vi.spyOn(MixinApi, 'isHasInteractive').mockImplementation(((s: Stuff) => s === who) as never);
    ContainmentApi.move(who, deck);
    await PersistableApi.capture(who as unknown as Stuff, 'rover-2');
    const rec = col('holder_snapshots').find((d) => d.scope === '/test/rover' && d.owner === 'rover-2');
    expect(rec?.place).toEqual({ container: DECK, containerKey: 'p1/deck' });
  });

  it('⭐ review 2: the deck stamps itself a shore of the sea she lies on as her warren wakes it (the one wake hook)', async () => {
    vi.spyOn(Ship.prototype, 'getExpanse').mockReturnValue('/test/sea');
    const ship = await mint('s9');
    const deck = (await deckOf(ship)) as unknown as Compartment;
    expect(deck.getWaters().sea).toBe('/test/sea');
    const hold = (deck as unknown as Exitable).getExit('down')!.getDestination() as unknown as Compartment;
    expect(hold.getWaters().sea).toBeUndefined(); // no sea over its side
  });

  it('⭐ review 2: saving her saves her hold — her warren is her dependent, her hold its', async () => {
    const ship = await mint('d1');
    const deck = await deckOf(ship);
    const hold = (deck as unknown as Exitable).getExit('down')!.getDestination() as unknown as Stuff & Container;
    const warren = (deck as unknown as { getWarren(): ShipWarren }).getWarren();
    expect(ship.dependentPersistables()).toEqual([warren]);
    expect(warren.dependentPersistables()).toEqual([hold]);
    const crate = await StuffApi.clone<Stuff & Containable>(CRATE);
    ContainmentApi.move(crate, hold);
    await PersistableApi.capture(ship as unknown as Stuff);
    expect(await PersistableApi.hasRecord(`${KIND}/d1`, 'd1')).toBe(true);
    expect(await PersistableApi.hasRecord(WARREN, 'd1')).toBe(true);
    expect(await PersistableApi.hasRecord(HOLD, 'd1/hold')).toBe(true);
    expect(await PersistableApi.hasRecord(DECK, 'd1/deck')).toBe(false);
    // Marked for revert, she marks them too.
    ship.markForRevert();
    expect((warren as unknown as { shouldPersist(): boolean }).shouldPersist()).toBe(false);
    expect((hold as unknown as { shouldPersist(): boolean }).shouldPersist()).toBe(false);
  });

  it('⭐ review 2: standUpKeyed resolves by key — no scan — and never mints her hold outside her warren', async () => {
    const ship = await mint('q1');
    const deck = await deckOf(ship);
    const hold = (deck as unknown as Exitable).getExit('down')!.getDestination() as unknown as Stuff & Container;
    const warren = (deck as unknown as { getWarren(): ShipWarren }).getWarren();
    const scan = vi.spyOn(StuffApi, 'findAllByTemplatePath');
    // Standing: the pair is a lookup.
    expect(await PersistableApi.standUpKeyed(WARREN, 'q1')).toBe(warren);
    expect(await PersistableApi.standUpKeyed(HOLD, 'q1/hold')).toBe(hold);
    expect(scan).not.toHaveBeenCalled();
    // Asleep: her hold is refused alone — nothing minted.
    await ship.sleep();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await PersistableApi.standUpKeyed(HOLD, 'q1/hold')).toBeNull();
    expect(StuffApi.findAllByTemplatePath(HOLD).filter((h) => !h.isDestroyed())).toHaveLength(0);
    warn.mockRestore();
    // Stood up with her, the one hold; asked by key, the same object.
    const back = (await ExpanseApi.standUpCraft(`${KIND}/q1`)) as unknown as Ship;
    const deck2 = await deckOf(back);
    const hold2 = (deck2 as unknown as Exitable).getExit('down')!.getDestination() as unknown as Stuff;
    expect(await PersistableApi.standUpKeyed(HOLD, 'q1/hold')).toBe(hold2);
    expect(StuffApi.findAllByTemplatePath(HOLD).filter((h) => !h.isDestroyed())).toHaveLength(1);
  });

  it('⭐ her way aboard outlives her sleep: taking it stands her up, made fast as she was', async () => {
    vi.spyOn(Ship.prototype, 'linesAboard').mockImplementation(async () => [fakeLine(), fakeLine()]);
    const ship = await mint('w1');
    const words = await ship.comeAlongside(LANDING);
    expect(words).toMatch(/made fast/);
    const landing = await StuffApi.singleton<Stuff & Container & Exitable>(LANDING);
    const way = landing.getExit('smack');
    expect(way).toBeInstanceOf(BerthExit);
    expect((way as BerthExit).getShipHandle()).toBe(`${KIND}/w1`);

    await ship.sleep();
    expect(ship.isDestroyed()).toBe(true);
    // The way stays, reading her name while she sleeps.
    expect(landing.getExit('smack')).toBe(way);
    expect((way as BerthExit).ship()).toBeNull();
    expect((way as BerthExit).alongsideName()).toBe('the smack');

    const deck = await (way as BerthExit).resolveDestination();
    expect(deck.getTemplatePath()).toBe(DECK);
    const woke = filed<Ship>(`${KIND}/w1`)!;
    expect(woke).not.toBe(ship);
    expect(woke.isMoored()).toBe(true);
    expect(woke.getBerth()).toBe(LANDING);
    // Her re-wire adopted the way that was waiting — still one, still hers.
    expect(landing.getExit('smack')).toBe(way);
    expect((way as BerthExit).ship()).toBe(woke);
  });

  it('⭐ a restart: standUpCraft resolves first, and brings her back from her record under her identity', async () => {
    const ship = await mint('r1');
    ship.setAground(true);
    await PersistableApi.capture(ship as unknown as Stuff);
    // Resolve-first: asked while she stands, the one ship.
    expect(await ExpanseApi.standUpCraft(`${KIND}/r1`)).toBe(ship);

    // The process ends: nothing stands. Her record does.
    StuffApi.clearAll();
    const back = await ExpanseApi.standUpCraft(`${KIND}/r1`);
    expect(back).toBeInstanceOf(Ship);
    expect(back).not.toBe(ship);
    expect((back as unknown as Ship).isAground()).toBe(true);
    expect((back as unknown as Ship).getDurableHandle()).toBe(`${KIND}/r1`);
    expect(await ExpanseApi.standUpCraft(`${KIND}/r1`)).toBe(back);
    // A serial with no record names nothing: nothing is minted.
    expect(await ExpanseApi.standUpCraft(`${KIND}/nobody`)).toBeNull();
    expect(filed(`${KIND}/nobody`)).toBeNull();
    const deck = await (back as unknown as Ship).watchRoom();
    expect(deck?.getTemplatePath()).toBe(DECK);
    expect((deck as unknown as { getWarren(): ShipWarren }).getWarren().mintedKeyOf(deck!)).toBe('r1/deck');
  });

  it('⭐ B6: somebody on an authored ship\'s deck is placed by the ROOM, never by the shared authored-warren row', async () => {
    // Two authored ships: two warrens off the one `authored` row, each keyed by her path.
    const ship = await StuffApi.singleton<Ship>(AUTHORED);
    const deck = await StuffApi.singleton<Stuff & Container>(A_DECK);
    class Rover extends PersistableMixin(ContainableMixin(Idea)) {}
    const who = makeStuffAtPath(() => new Rover(), '/test/rover') as unknown as Stuff & Containable;
    vi.spyOn(MixinApi, 'isHasInteractive').mockImplementation(((s: Stuff) => s === who) as never);
    ContainmentApi.move(who, deck);
    await ship.aboard();
    const warren = (deck as unknown as { getWarren(): ShipWarren | null }).getWarren();
    expect(warren?.getTemplatePath()).toBe(AUTHORED_SHIP_WARREN);
    await PersistableApi.capture(who as unknown as Stuff, 'rover-1');
    const rec = col('holder_snapshots').find((d) => d.scope === '/test/rover' && d.owner === 'rover-1');
    expect(rec?.place).toEqual({ container: A_DECK });
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
    // The deck is asked: its warren says (a path read is the location graph's alone).
    expect(await (deck as unknown as Compartment).structure()).toBe(ship);

    // The last one off an authored ship: she stands while her zone does.
    ContainmentApi.move(who, hold);
    ContainmentApi.move(who, await StuffApi.singleton<Stuff & Container>(LANDING));
    await tick();
    await tick();
    expect(ship.isDestroyed()).toBe(false);
    expect(deck.isDestroyed()).toBe(false);
  });
});
