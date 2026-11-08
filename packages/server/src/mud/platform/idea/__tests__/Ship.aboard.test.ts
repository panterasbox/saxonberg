/**
 * Aboard a ship of a KIND: `route`, `locate` and the
 * weather's lean ask the ROOM which ship it is part of, never its row —
 * a smack's deck is keyed `(deck row, <serial>/deck)` and the row is every
 * smack's.
 *
 * - `route` from her deck, moored: planned from the landing she lies at,
 *   one `ashore` away (her rooms are on no map — *maps never name a ship*);
 *   at sea: no road, `course` named; a sea node on HER expanse refuses as
 *   open water.
 * - `locate` from her deck: made fast alongside the landing; at sea, her
 *   reckoning.
 */

import '../../../../test-bootstrap';
import { KERNEL_CONTENT_ROWS } from '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Ship from '../Ship';
import { AUTHORED_SHIP_WARREN } from '../ShipWarren';
import TemplateApplier from '../TemplateApplier';
import RouteController from '../cmd/movement/RouteController';
import LocateController from '../cmd/perception/LocateController';
import LookController from '../cmd/perception/LookController';
import { candidatesForHere } from '../../../api/mql/scope-walk';
import { CardApi } from '../../../api/card';
import { MqlApi } from '../../../api/mql';
import type BerthExit from '../BerthExit';
import type Compartment from '../../location/Compartment';
import type { Exitable } from '../../../lib/boundary/Exitable';
import { Document } from '../../../lib/persistence/Document';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { PersistableApi } from '../../../api/persistable';
import { CommandApi } from '../../../api/command';
import { DocumentApi } from '../../../api/document';
import { MessageApi } from '../../../api/message';
import { ExpanseApi } from '../../../api/expanse';
import { Expanse } from '../../../lib/expanse/Expanse';
import { GeoPosition } from '../../../lib/expanse/GeoPosition';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type Rope from '../../thing/Rope';
import type { MapClaim } from '../../../lib/location/MapClaim';
import { PersistenceManager } from '../../../lib/persistence/__tests__/backend-store';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
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
const SQUARE = '/test/town/square';
const VIEWER = '/platform/agent/Avatar/p1';

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
  // The row's authored data, as `exits/berth.yaml` carries it.
  add('/platform/idea/exits/berth', '/platform/idea/BerthExit', {
    longDescription: "A gangway runs up to {{ ship }}'s deck.",
    keywords: ['gangway'],
  });
  add(AUTHORED_SHIP_WARREN, '/platform/idea/ShipWarren', {});
  // A ship kind (her plan on her row) and its rooms (the rooms stand in the rows' zone).
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
  add(CRATE, '/platform/thing/Thing', { shortDescription: 'a crate' });
  add(LANDING, '/platform/location/Locale', { shortDescription: 'a landing', props: [BOLLARD] });
  add(BOLLARD, '/platform/thing/Bollard', { shortDescription: 'a bollard', fixedInPlace: true });

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

async function mint(serial: string): Promise<Ship> {
  const ship = await StuffApi.clone<Ship>(KIND, undefined, { asIdentityPath: `${KIND}/${serial}` });
  await PersistableApi.restoreOrSeed(ship as unknown as Stuff, serial);
  return ship;
}

let said: string[];

function claim(c: Partial<MapClaim>): MapClaim {
  return { kind: 'place', place: '', channel: 'walked', firstSeen: 0, lastSeen: 0, recordedBy: VIEWER, ...c } as MapClaim;
}

/** The player's map: the landing and the square north of it — nothing of any ship. */
function withMap(): void {
  vi.spyOn(DocumentApi, 'readMaps').mockResolvedValue([
    {
      path: '/home/p1/map/town',
      data: {
        locality: '/test/town',
        claims: [
          claim({ place: LANDING, name: 'the landing' }),
          claim({ place: SQUARE, name: 'the market square' }),
          claim({ kind: 'edge', place: LANDING, dir: 'north', toLabel: SQUARE }),
        ],
      },
    },
  ] as never);
}

/** A body standing on `room` (a crate does: containable, and named). */
async function standOn(room: Stuff & Container): Promise<Stuff> {
  const who = await StuffApi.clone<Stuff & Containable>(CRATE);
  ContainmentApi.move(who, room);
  vi.spyOn(who, 'getIdentityPath').mockReturnValue(VIEWER);
  return who;
}

async function run(
  controller: { execute(m: never, c: never): void | Promise<void> },
  verb: string,
  model: Record<string, unknown>,
  giver: Stuff,
  location: Stuff,
): Promise<{ reason: string | null; text: string }> {
  said = [];
  const context = CommandApi.createCommandContext({
    commandGiver: giver,
    location,
    verb,
    interactive: {} as never,
    commandText: verb,
    executionId: 'test-execution',
    commandId: 'test-command-id',
  } as never);
  const seen: Array<{ reason?: string }> = [];
  vi.spyOn(context as unknown as { note(n: unknown): void }, 'note').mockImplementation((n: unknown) => {
    seen.push(n as { reason?: string });
  });
  await controller.execute(model as never, context as never);
  return { reason: seen.find((n) => n.reason !== undefined)?.reason ?? null, text: said.join('\n') };
}

/** Her at sea: a position on a chart, an expanse naming one node. */
function putToSea(ship: Ship): void {
  const at = new GeoPosition(50.2, -4.4);
  vi.spyOn(ship, 'getExpansePosition').mockReturnValue(at);
  vi.spyOn(ship, 'reckonedNow').mockReturnValue(at);
  const frame = Object.assign(Object.create(Expanse.prototype) as object, {
    nodeByKeyword: async (w: string) => (/gannet/i.test(w) ? { getName: () => 'the Gannet' } : null),
  });
  vi.spyOn(ship, 'liveFrame').mockResolvedValue(frame as never);
}

function reset(): void {
  vi.restoreAllMocks();
  StuffApi.clearAll();
}

describe('aboard a ship of a kind — the room is asked, never its row', () => {
  let ship: Ship;
  let deck: Stuff & Container;

  beforeEach(async () => {
    reset();
    installStore();
    vi.spyOn(MessageApi, 'scene').mockImplementation(
      () =>
        ({
          topic: () => ({
            toSelf: (m: unknown) => ({
              send: () => {
                said.push(String((m as { text?: string }).text ?? m));
              },
            }),
          }),
        }) as never,
    );
    vi.spyOn(Ship.prototype, 'linesAboard').mockImplementation(async () => [fakeLine(), fakeLine()]);
    // A second smack of the kind, so the row names neither of them.
    await mint('z9');
    ship = await mint('k1');
    deck = (await ship.watchRoom())!;
    // A deck keeps no record: her warren holds it under her key.
    expect((deck as unknown as { getWarren(): { mintedKeyOf(s: unknown): string | null } }).getWarren().mintedKeyOf(deck)).toBe('k1/deck');
    // ⛔ Nothing may ask a path read with this room's row: break loudly.
    const craftAt = ExpanseApi.craftAt;
    vi.spyOn(ExpanseApi, 'craftAt').mockImplementation(async (p: string) => {
      if (p === DECK || p.includes('#')) throw new Error(`asked craftAt('${p}') — the room was not asked`);
      return craftAt(p);
    });
  });
  afterEach(reset);

  it('⭐ route from her deck, moored: planned from the landing she lies at, one `ashore` away', async () => {
    expect(await ship.comeAlongside(LANDING)).toMatch(/made fast/);
    withMap();
    const who = await standOn(deck);
    const route = makeStuff(() => new RouteController());
    const out = await run(route, 'route', { destination: 'the market square' }, who, deck);
    expect(out.reason, out.text).toBeNull();
    expect(out.text).toMatch(/The way to the market square/);
    expect(out.text).toMatch(/ashore from the smack/);
    expect(out.text).toMatch(/north from the landing/);
    expect(out.text).not.toMatch(/\//);
    // The landing itself: she lies alongside it.
    const there = await run(route, 'route', { destination: 'the landing' }, who, deck);
    expect(there.reason).toBe('alongside');
    expect(there.text).toMatch(/ashore/);
  });

  it('⭐ route from her deck at sea: no road from a ship under way; a sea node on her expanse is open water', async () => {
    putToSea(ship);
    withMap();
    const who = await standOn(deck);
    const route = makeStuff(() => new RouteController());
    const road = await run(route, 'route', { destination: 'the market square' }, who, deck);
    expect(road.reason).toBe('under-way');
    expect(road.text).toMatch(/aboard the smack/);
    expect(road.text).toMatch(/course/);
    const sea = await run(route, 'route', { destination: 'gannet' }, who, deck);
    expect(sea.reason).toBe('open-water');
    expect(sea.text).toMatch(/no road to the Gannet/);
  });

  it('⭐ locate from her deck: made fast alongside the landing; at sea, her reckoning', async () => {
    expect(await ship.comeAlongside(LANDING)).toMatch(/made fast/);
    const who = await standOn(deck);
    const locate = makeStuff(() => new LocateController());
    const moored = await run(locate, 'locate', { target: { stuff: who, raw: 'me' } }, who, deck);
    expect(moored.reason).toBeNull();
    expect(moored.text).toMatch(/smack deck/);
    expect(moored.text).toMatch(/aboard the smack, made fast alongside .*landing\./);
    expect(moored.text).not.toMatch(/by reckoning/);

    await ship.castOff();
    putToSea(ship);
    const atSea = await run(locate, 'locate', { target: { stuff: who, raw: 'me' } }, who, deck);
    expect(atSea.text).toMatch(/at sea, by reckoning: /);
    expect(atSea.text).not.toMatch(/made fast/);
  });

  it('⭐ review 3: from the landing, `look <her>` binds her WAY (an exit is a candidate) and the way describes itself — never a swap to her deck', async () => {
    expect(await ship.comeAlongside(LANDING)).toMatch(/made fast/);
    const landing = await StuffApi.singleton<Stuff & Container & Exitable>(LANDING);
    const way = landing.getExit('smack') as unknown as BerthExit;
    expect(way).toBeTruthy();
    // Her way shows HER deck (a second smack of the kind stands too).
    expect(way.peekDestination()).toBe(deck);
    expect((deck as unknown as Compartment).isSeenAcrossExit()).toBe(true);
    const hold = (deck as unknown as Exitable).getExit('down')!.getDestination() as unknown as Compartment;
    expect(hold.isSeenAcrossExit()).toBe(false);
    const who = await standOn(landing);
    // Her deck is in the landing's pool by its OWN name (MQL's tract rule).
    expect(candidatesForHere(landing, who).some((c) => c.stuff === deck)).toBe(true);
    // The way's own description, her name in it.
    expect(way.getLongFor(who)).toMatch(/^A gangway runs up to .+'s deck\.$/);

    // ⭐ The way is CALLED her gangway (drive 2026-11-03): her name is the
    // ship's, so a player who looks at her where she is a candidate gets
    // HER, never a prompt between two things called by one name. The way
    // keeps her name as its direction and among its keywords (`go smack`).
    expect(way.describeFor(who)).toMatch(/^the smack's gangway$/i);
    expect(way.getKeywords()).toEqual(expect.arrayContaining(['gangway', 'smack gangway']));
    // `look gangway` binds the WAY itself, and look shows what MQL bound.
    const bound = MqlApi.resolveOne('gangway', { commandGiver: who as never, scope: 'reachable' });
    expect(bound.stuff).toBe(way);
    vi.spyOn(CardApi, 'open').mockReturnValue(null as never);
    const look = makeStuff(() => new LookController());
    const seen = await run(look, 'look', { target: { stuff: way, raw: 'smack' } }, who, landing);
    expect(seen.text).toMatch(/A gangway runs up to .+'s deck\./);
    expect(seen.text).not.toMatch(/a landing/);
    // ⚠ The landing's own look no longer repeats it — the way says it.
    const quay = await run(look, 'look', { target: { stuff: landing, raw: 'here' } }, who, landing);
    expect(quay.text).not.toMatch(/gangway runs up/);

    // Sunk, she is seen by nobody on the quay.
    const sunk = vi.spyOn(ship, 'isSunk').mockReturnValue(true);
    expect((deck as unknown as Compartment).isSeenAcrossExit()).toBe(false);
    sunk.mockRestore();

    // Asleep: nothing is stood up to be looked at — the look is the landing's.
    await ship.sleep();
    expect(way.peekDestination()).toBeNull();
    expect(way.getLongFor(who)).toMatch(/gangway runs up to .+'s deck/);
    expect(StuffApi.findByIdentityPath(`${KIND}/k1`).filter((s) => !s.isDestroyed())).toHaveLength(0);
  });
});
