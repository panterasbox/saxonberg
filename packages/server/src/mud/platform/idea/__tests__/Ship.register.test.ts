/**
 * Ship — ⭐ her register, her owners, her flag, her gangway (harbors B2),
 * over synthetic rows under `/test/**` and the platform's own branches.
 *
 * - `commission` names a ship of a kind, mints HER company — a kept
 *   business whose cap table is her buyer's, all sixty-four units, and whose
 *   authority is that table (review 1) — enters her in the register as that
 *   company's, keys her (gangway locked), makes her buyer master, and
 *   brings her alongside; only her master takes the helm;
 * - ⭐ she knows her register (review 1): her entry is read off it under
 *   her registered name, never searched for;
 * - ⭐ the landing keeps who lies at it (its own roll): she tells it as she
 *   makes fast and casts off, and after a restart the landing's first use
 *   stands a sleeping smack up from its OWN list, and her way is back;
 * - asleep, her way aboard still answers for the gangway (`lock`/`unlock`);
 * - the flag on her flagstaff is the flag she flies (a derived look line);
 * - `subjectTo` aboard: at sea the flag state's law, made fast in a port
 *   the port's AND the flag state's.
 */

import '../../../../test-bootstrap';
import { KERNEL_CONTENT_ROWS } from '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Ship from '../Ship';
import { AUTHORED_SHIP_WARREN } from '../ShipWarren';
import BerthExit from '../BerthExit';
import GovernmentCatalogue from '../GovernmentCatalogue';
import TemplateApplier from '../TemplateApplier';
import Avatar from '../../agent/PrimaryAvatar';
import Flag from '../../thing/Flag';
import { Document } from '../../../lib/persistence/Document';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { PersistableApi } from '../../../api/persistable';
import { EmploymentApi } from '../../../api/employment';
import ShipRegister from '../ShipRegister';
import RegisterBook from '../../thing/RegisterBook';
import BerthRoll, { BERTH_ROLL_ROW } from '../BerthRoll';
import { NavigationApi } from '../../../api/navigation';
import type { FrameSited } from '../../../lib/expanse/FrameSited';
import type { FrameStuff } from '../../../lib/expanse/Frame';
import { GovernmentApi } from '../../../api/government';
import { AddressApi } from '../../../api/address';
import { CorpoApi } from '../../../api/corpo';
import { TemplatePaths } from '../../../lib/paths';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Exitable } from '../../../lib/boundary/Exitable';
import type Rope from '../../thing/Rope';
import type Locality from '../Locality';
import { PersistenceManager } from '../../../lib/persistence/__tests__/backend-store';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const KIND = '/test/ship/smack';
const WARREN = '/test/ship/smack-plan';
const ROOMS = '/test/ship/rooms';
const DECK = `${ROOMS}/deck`;
const HOLD = `${ROOMS}/hold`;
const COMPANY = '/test/ship/company';
const STAFF = '/test/ship/flagstaff';
const FLAG = '/test/ship/flag';
const LANDING = '/test/quay/landing';
const BOLLARD = '/test/quay/bollard';
const REG = '/platform/idea/ShipRegister/test-city';

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
    keywords: ['smack', 'ship'],
    entrance: DECK,
    warren: WARREN,
    house: COMPANY,
    hull: { lengthM: 9, beamM: 3, draftM: 1.2, depthM: 1.8 },
  });
  // ⭐ Her kind's blueprint (harbors review 3): a Structure over ordinary rows.
  add(WARREN, '/platform/idea/ShipWarren', { blueprint: `${ROOMS}-blueprint` });
  add(`${ROOMS}-blueprint`, '/platform/idea/Structure', { extent: ROOMS, entrance: DECK });
  add(ROOMS, '/platform/idea/location/CartesianZone', { name: 'a smack' });
  add(DECK, '/platform/location/Compartment', {
    floorM: 1.8, exits: { down: { destination: HOLD } },
    shortDescription: 'smack deck',
    props: [{ template: STAFF, as: 'flagstaff' }, { template: FLAG, on: 'flagstaff' }],
  });
  add(HOLD, '/platform/location/Hold', { shortDescription: 'fish hold', floorM: 0.3, exits: { up: { destination: DECK } } });
  add(STAFF, '/platform/thing/Flagstaff', { shortDescription: 'flagstaff' });
  add(FLAG, '/platform/thing/Flag', { shortDescription: 'test ensign', keywords: ['flag', 'ensign'], _brandKey: 'flag-test-city' });
  add(COMPANY, '/platform/idea/PersistentBusiness', {
    name: "a ship's company",
    appointingAuthority: { kind: 'owners' },
    capTable: { units: 64, transfer: 'free', rows: [] },
    positions: [{ key: 'master', noun: 'master', label: 'in command of her', wageRate: 5, headcount: 1 }],
    startsShiftOnHire: true,
  });
  // A landing on a frame keeps who lies at it (its roll); a Shore is the plain one.
  add(LANDING, '/platform/location/Shore', { shortDescription: 'a landing', props: [BOLLARD] });
  add(BERTH_ROLL_ROW, '/platform/idea/BerthRoll');
  add(BOLLARD, '/platform/thing/Bollard', { shortDescription: 'a bollard', fixedInPlace: true });
  add('/stuff/thing/Key', '/platform/thing/Key', { shortDescription: 'a key' });
  add('/platform/idea/Government/test-city', '/platform/idea/Government', { key: 'test-city', name: 'the City of Test', shipRegister: REG });
  add('/platform/idea/Government/test-port', '/platform/idea/Government', { key: 'test-port', name: 'the Port of Test' });
  add(REG, '/platform/idea/ShipRegister', {
    government: 'test-city',
    registerOwner: '/platform',
    registerPrefix: '/platform/ships/test-city',
    registerKind: 'ship',
  });

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

function makeAvatar(id: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
  av.setPlayerId(id);
  return av;
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) await tick();
}

async function bootGovernments(): Promise<void> {
  const cat = makeStuffAtPath(() => new GovernmentCatalogue(), TemplatePaths.governmentCatalogue);
  await cat.onCreate();
}

/** A smack bought by `buyer` — minted under `<kind>/<serial>` (as `buy` does), commissioned as `name`. */
async function buy(buyer: Stuff, serial: string, name: string): Promise<{ ship: Ship; words: string }> {
  const ship = await StuffApi.clone<Ship>(KIND, undefined, { asIdentityPath: `${KIND}/${serial}` });
  await PersistableApi.restoreOrSeed(ship as unknown as Stuff, serial);
  const register = await StuffApi.singleton<ShipRegister>(REG);
  const words = await ship.commission(buyer, name, LANDING, register);
  await settle();
  return { ship, words };
}

function reset(): void {
  vi.restoreAllMocks();
  StuffApi.clearAll();
}

describe('Ship — her register, owners, flag and gangway (harbors B2)', () => {
  beforeEach(async () => {
    reset();
    installStore();
    await bootGovernments();
    vi.spyOn(Ship.prototype, 'linesAboard').mockImplementation(async () => [fakeLine(), fakeLine()]);
    vi.spyOn(CorpoApi, 'getBrand').mockImplementation((key: string) =>
      key === 'flag-test-city'
        ? { key, name: 'the colors of the City of Test', owner: '', government: 'test-city', category: 'colors', positioning: '', descriptor: '' }
        : null,
    );
  });
  afterEach(reset);

  it('⭐ commissioned: named, her own company, sixty-four shares in her buyer\'s name, keyed and locked, her buyer master, alongside', async () => {
    const ann = makeAvatar('ann');
    const bob = makeAvatar('bob');
    const { ship, words } = await buy(ann, 'g1', 'the Gull');
    expect(words).toMatch(/register of the City of Test as the Gull/);
    expect(ship.getName()).toBe('the Gull');
    expect(ship.berthWord()).toBe('gull');

    // ⭐ She knows her register, and the name she is entered under.
    expect(ship.getShipRegister()).toBe(REG);
    expect(ship.getRegisteredName()).toBe('Gull');
    expect(await ship.flagState()).toBe('test-city');
    const entry = await ship.registerEntry();
    expect(entry).toMatchObject({ name: 'Gull', kind: KIND, key: `${KIND}/g1`, flag: 'test-city' });
    // ⭐ The register keeps her title: her owner is her company, and no shares.
    expect(entry!.owner).toBe(`${COMPANY}/g1`);
    expect(entry).not.toHaveProperty('shares');
    expect(ship.getHouse()).toBe(`${COMPANY}/g1`);
    const company = StuffApi.findByTemplatePath<Stuff>(`${COMPANY}/g1`);
    expect(company && MixinApi.isOrganization(company) && company.getAppointingAuthority()).toEqual({ kind: 'owners', organization: `${COMPANY}/g1` });
    // ⭐ Her company's table: her buyer, whole — the sixty-fourths survive.
    expect((await ship.company())?.getCapTable()).toEqual({
      units: 64,
      transfer: 'free',
      rows: [{ holder: { kind: 'player', path: '/platform/agent/Avatar/ann', name: ann.getPresentation() }, units: 64 }],
    });
    expect((await ship.managingOwner())?.path).toBe('/platform/agent/Avatar/ann');
    // Whoever holds a majority of it appoints her master: Ann, not Bob.
    expect(company && MixinApi.isOrganization(company) && (await EmploymentApi.holdsAuthority(ann, company.getAppointingAuthority()))).toBe(true);
    expect(company && MixinApi.isOrganization(company) && (await EmploymentApi.holdsAuthority(bob, company.getAppointingAuthority()))).toBe(false);

    // Her gangway: a fresh keyway, the bolt thrown.
    expect(ship.getGangwayKeyway()).toMatch(/^kw-/);
    expect(ship.isGangwayLocked()).toBe(true);

    // A sole owner is her managing owner and her master: only she takes the helm.
    expect(ship.isManagingOwner(ann)).toBe(true);
    expect(ship.answersFor(ann)).toBe(true);
    expect(ship.mayBeSteeredBy(ann)).toBe(true);
    expect(ship.mayBeSteeredBy(bob)).toBe(false);
    expect(ship.answersFor(bob)).toBe(false);

    // Alongside the landing she was delivered to, by a way named for her — and the LANDING knows.
    expect(ship.getBerth()).toBe(LANDING);
    const landing = await StuffApi.singleton<Stuff & Container & Exitable & FrameSited>(LANDING);
    expect(landing.getExit('gull')).toBeInstanceOf(BerthExit);
    expect(await landing.lyingHere()).toEqual([`${KIND}/g1`]);

    // A second buyer may not take the name.
    await expect(buy(bob, 'g2', 'Gull')).rejects.toThrow(/register refused Gull/);
  });

  it('⭐ `read register`: name, kind, flag and the company that owns her — and beside it who holds that company, in sixty-fourths', async () => {
    const ann = makeAvatar('ann');
    await buy(ann, 'p1', 'Petrel');
    const book = makeStuffAtPath(() => new RegisterBook(), '/test/office/register');
    book.setGovernment('test-city');
    await book.refreshMarks(ann);
    expect(book.getMarkText()).toMatch(
      new RegExp(`The Petrel \\(smack\\), under the flag of the City of Test: owned by the Petrel's company, held ${ann.getPresentation()} 64/64\\.`),
    );
  });

  it('⭐ two smacks, two owners: her company is hers; the other owner holds none of her authority', async () => {
    const ann = makeAvatar('ann');
    const bob = makeAvatar('bob');
    const { ship: gull } = await buy(ann, 'g1', 'Gull');
    const { ship: tern } = await buy(bob, 't1', 'Tern');
    expect(gull.getHouse()).not.toBe(tern.getHouse());
    expect(gull.mayBeSteeredBy(bob)).toBe(false);
    expect(tern.mayBeSteeredBy(ann)).toBe(false);
    expect(tern.mayBeSteeredBy(bob)).toBe(true);
    const landing = await StuffApi.singleton<Stuff & Container & Exitable & FrameSited>(LANDING);
    expect(landing.getExit('gull')).toBeInstanceOf(BerthExit);
    expect(landing.getExit('tern')).toBeInstanceOf(BerthExit);
    // Casting off, she tells the landing she has gone.
    await gull.castOff();
    await settle();
    expect(await landing.lyingHere()).toEqual([`${KIND}/t1`]);
  });

  it('⭐⭐ after a restart, the landing\'s first use stands a sleeping smack up from its OWN roll — her way aboard is back', async () => {
    const ann = makeAvatar('ann');
    const { ship } = await buy(ann, 'r1', 'Razorbill');
    expect(ship.isMoored()).toBe(true);
    // She sleeps (her record kept), and then the process goes: nothing is loaded.
    await ship.sleep();
    await settle();
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    expect((StuffApi.findByIdentityPath(`${KIND}/r1`)[0] ?? null)).toBeNull();

    // The landing comes back bare — no way aboard her (a way is runtime).
    const landing = await StuffApi.singleton<Stuff & Container & Exitable & FrameSited>(LANDING);
    expect(landing.getExit('razorbill')).toBeFalsy();
    // Its roll came back from its record — nobody asked a register.
    expect(await landing.lyingHere()).toEqual([`${KIND}/r1`]);
    const roll = await PersistableApi.standUpKeyed(BERTH_ROLL_ROW, LANDING);
    expect(roll).toBeInstanceOf(BerthRoll);

    // First use: a frame-sited landing tells its frame, then reads its roll.
    landing.setFrameSite({ frame: '/test/frame', cite: 'here' });
    const frame = { onSiteStood: async () => undefined, craft: () => [], getTemplatePath: () => '/test/frame' } as unknown as FrameStuff;
    vi.spyOn(landing, 'liveSiteFrame').mockResolvedValue(frame);
    vi.spyOn(NavigationApi, 'attachedTo').mockResolvedValue([]);
    await landing.frameSiteStood();
    await settle();

    const woke = (StuffApi.findByIdentityPath<Ship>(`${KIND}/r1`)[0] ?? null);
    expect(woke).toBeInstanceOf(Ship);
    expect(woke!.isMoored()).toBe(true);
    expect(landing.getExit('razorbill')).toBeInstanceOf(BerthExit);
    // ⭐ Her company was kept with her: its table restored, her owner answers for her.
    expect(woke!.isManagingOwner(ann)).toBe(true);
    expect((await woke!.shareHolders()).map((h) => h.path)).toEqual(['/platform/agent/Avatar/ann']);
    expect(await landing.lyingHere()).toEqual([`${KIND}/r1`]);
  });

  it('a ship on the roll who stands up and is not made fast is struck off it at the landing\'s first use', async () => {
    const ann = makeAvatar('ann');
    const { ship } = await buy(ann, 'x1', 'Shag');
    await ship.castOff();
    const landing = await StuffApi.singleton<Stuff & Container & FrameSited>(LANDING);
    expect(await landing.lyingHere()).toEqual([]);
    // A stale line on the roll, and she sleeps unmoored.
    await landing.noteAlongside(`${KIND}/x1`);
    await ship.sleep();
    await settle();
    landing.setFrameSite({ frame: '/test/frame', cite: 'here' });
    const frame = { onSiteStood: async () => undefined, craft: () => [], getTemplatePath: () => '/test/frame' } as unknown as FrameStuff;
    vi.spyOn(landing, 'liveSiteFrame').mockResolvedValue(frame);
    vi.spyOn(NavigationApi, 'attachedTo').mockResolvedValue([]);
    await landing.frameSiteStood();
    expect(await landing.lyingHere()).toEqual([]);
  });

  it('⭐ asleep, her way aboard still answers for the gangway — the bolt, the keyway, and `unlock` keeps', async () => {
    const ann = makeAvatar('ann');
    const { ship } = await buy(ann, 's1', 'Skua');
    const keyway = ship.getGangwayKeyway();
    const landing = await StuffApi.singleton<Stuff & Container & Exitable>(LANDING);
    const way = landing.getExit('skua') as BerthExit;
    await ship.sleep();
    expect(ship.isDestroyed()).toBe(true);
    expect(way.ship()).toBeNull();
    expect(way.isLocked()).toBe(true);
    expect(way.getLock().keyway).toBe(keyway);
    expect(way.opensFor(makeAvatar('stranger'))).toBe(false);
    // Her key is with her owner: it fits her gangway while she sleeps.
    expect(way.opensFor(ann)).toBe(true);

    // Unlocked while she sleeps: the way takes it at once, and she keeps it.
    way.setLocked(false);
    expect(way.isLocked()).toBe(false);
    await settle();
    const woke = StuffApi.findByIdentityPath<Ship>(`${KIND}/s1`)[0]!;
    expect(woke).toBeInstanceOf(Ship);
    expect(woke.isGangwayLocked()).toBe(false);
    expect(woke.getGangwayKeyway()).toBe(keyway);
    // She woke with her owner and her company.
    expect(woke.isManagingOwner(ann)).toBe(true);
    expect(StuffApi.findByTemplatePath(`${COMPANY}/s1`)).toBeDefined();
  });

  it('⭐ the flag on her flagstaff is the flag she flies — a claim, said on her look', async () => {
    const ann = makeAvatar('ann');
    const { ship } = await buy(ann, 'f1', 'Fulmar');
    const flag = ship.flownFlag();
    expect(flag).toBeInstanceOf(Flag);
    expect(flag!.colorsOf()).toBe('test-city');
    const look = MixinApi.getAllMarkupAugmenters(Ship).reduce(
      (text, aug) => aug(text, ship, ann),
      'A smack.',
    );
    expect(look).toMatch(/She flies the colors of the City of Test\./);
    // Struck: she flies nothing, and the look says nothing of colors.
    StuffApi.destruct(flag as unknown as Stuff);
    expect(ship.flownFlag()).toBeNull();
    const bare = MixinApi.getAllMarkupAugmenters(Ship).reduce((text, aug) => aug(text, ship, ann), 'A smack.');
    expect(bare).not.toMatch(/colors/);
  });

  it('⭐ the law aboard: made fast in a port, the port\'s and the flag state\'s; at sea, the flag state\'s alone', async () => {
    const ann = makeAvatar('ann');
    const { ship } = await buy(ann, 'l1', 'Petrel');
    const deck = (await ship.watchRoom())!;
    const port = { getGovernmentKey: () => 'test-port' } as unknown as Locality;
    vi.spyOn(AddressApi, 'resolveFor').mockImplementation(async (scope: Stuff) =>
      ({ address: scope.getTemplatePath() === LANDING ? 'test/port' : null }) as never,
    );
    vi.spyOn(AddressApi, 'coverageChainOf').mockImplementation((address: string) => (address === 'test/port' ? [port] : []));
    expect((await GovernmentApi.subjectTo(deck)).map((g) => g.key)).toEqual(['test-port', 'test-city']);
    await ship.castOff();
    expect((await GovernmentApi.subjectTo(deck)).map((g) => g.key)).toEqual(['test-city']);
    // ⚠ Risk 5: the branch is "is this a ship", never "is the chain empty" —
    // an unaddressed room ashore is under nobody's law, not the flag's.
    const ashore = await StuffApi.singleton<Stuff & Container>(LANDING);
    vi.spyOn(AddressApi, 'resolveFor').mockResolvedValue({ address: null } as never);
    expect(await GovernmentApi.subjectTo(ashore)).toEqual([]);
  });
});
