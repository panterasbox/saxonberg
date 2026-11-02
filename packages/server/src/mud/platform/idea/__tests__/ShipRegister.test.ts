/**
 * ShipRegister — ⭐ a government's book of ships (harbors B2, P12/P14/P15).
 *
 * - a name is unique in its register (article and case do not make a new
 *   name); the same name under another flag is another ship;
 * - the managing owner is derived: more than half, else the largest
 *   holding, ties to the earliest entered;
 * - shares move only from a holder who has them, and a holding that falls
 *   to nothing comes off;
 * - ⚠ the read verifies the PATH, not the kind tag — a `kind: 'ship'`
 *   document on somebody's home branch is not in any register;
 * - ⭐ a ship knows her register (review 1 — no Api searches the
 *   registers): her entry, flag, holders and managing owner are read off
 *   her OWN register under the name she was entered as;
 * - the writes are narrow-entry: `enter` only by the ship herself, about
 *   herself; `transferShares` only by the `transfer` verb;
 * - `holdsAuthority({kind: 'register'})`: a player managing owner by
 *   identity, an organization owner by its own authority.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ShipRegister, { SHIP_ENTRY_KIND, type ShipEntry } from '../ShipRegister';
import Ship from '../Ship';
import TransferController from '../cmd/system/TransferController';
import BusinessEntity from '../Business';
import Avatar from '../../agent/PrimaryAvatar';
import { StuffApi } from '../../../api/stuff';
import { GovernmentApi } from '../../../api/government';
import { EmploymentApi } from '../../../api/employment';
import { StoredDocument } from '../../../lib/document/StoredDocument';
import { Document } from '../../../lib/persistence/Document';
import { PersistenceManager } from '../../../lib/persistence/__tests__/backend-store';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff, makeStuffAtPath, withRootContext } from '../../../lib/security/__tests__/test-setup';
import type { GovernmentDescriptor } from '../Government';

const REG_A = '/platform/idea/ShipRegister/test-city';
const REG_B = '/platform/idea/ShipRegister/test-isle';
const SMACK = '/test/ship/smack';
/** Authored ships (her handle is her row) — what the tests' callers are. */
const GULL = '/test/ship/gull';
const TERN = '/test/ship/tern';
const LINE = '/test/line/office';

let store: Map<string, Array<Record<string, unknown>>>;
let ids = 0;

function col(name: string): Array<Record<string, unknown>> {
  let a = store.get(name);
  if (!a) {
    a = [];
    store.set(name, a);
  }
  return a;
}

function installStore(): void {
  store = new Map();
  ids = 0;
  const save = vi.fn(async (c: string, doc: Record<string, unknown>) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc };
      else arr.push({ ...doc });
      return doc._id as string;
    }
    const id = String(++ids);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) =>
    col(c).filter((d) =>
      Object.keys(q).every((k) => {
        const want = q[k];
        if (want && typeof want === 'object' && '$regex' in (want as object)) {
          return typeof d[k] === 'string' && new RegExp((want as { $regex: string }).$regex).test(d[k] as string);
        }
        return d[k] === want;
      }),
    ),
  );
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById: vi.fn(async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null),
    delete: vi.fn(async () => undefined),
    isConnected: () => true,
  } as unknown as PersistenceManager);
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

function register(path: string, gov: string): ShipRegister {
  const reg = makeStuffAtPath(() => new ShipRegister(), path);
  reg.setRegisterOwner('/platform');
  reg.setRegisterPrefix(`/platform/ships/${gov}`);
  reg.setRegisterKind(SHIP_ENTRY_KIND);
  reg.setGovernment(gov);
  return reg;
}

function governments(): void {
  const gov = (key: string, reg: string): GovernmentDescriptor => ({
    key,
    name: `the ${key}`,
    description: '',
    charter: '',
    treasury: '',
    departments: [],
    seats: [],
    standards: [],
    shipRegister: reg,
  });
  vi.spyOn(GovernmentApi, 'listGovernments').mockReturnValue([gov('test-city', REG_A), gov('test-isle', REG_B)]);
  vi.spyOn(GovernmentApi, 'getGovernment').mockImplementation((k: string) =>
    k === 'test-city' ? gov('test-city', REG_A) : k === 'test-isle' ? gov('test-isle', REG_B) : null,
  );
}

const player = (path: string, name?: string) => ({ kind: 'player' as const, path, ...(name ? { name } : {}) });

function entry(name: string, key: string, shares: ShipEntry['shares']): Omit<ShipEntry, 'flag' | 'registeredAtS'> {
  return { name, kind: SMACK, key, shares, house: '' };
}

/** A ship at her own row — the one caller `enter` admits, about herself. */
function shipAt(path: string): Ship {
  return StuffApi.findByTemplatePath<Ship>(path) ?? makeStuffAtPath(() => new Ship(), path);
}

/** `reg.enter(e)` as the ship whose handle `e.key` is — her commissioning, in miniature. */
function enterAs(reg: ShipRegister, e: Omit<ShipEntry, 'flag' | 'registeredAtS'>): Promise<string | null> {
  return withRootContext(shipAt(e.key), 'commission', () => reg.enter(e));
}

/** `reg.transferShares(…)` as the `transfer` verb's controller. */
function transferAs(reg: ShipRegister, ...args: Parameters<ShipRegister['transferShares']>) {
  return withRootContext(makeStuff(() => new TransferController()), 'execute', () => reg.transferShares(...args));
}

function makeAvatar(id: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
  av.setPlayerId(id);
  return av;
}

describe('ShipRegister — a government keeps a book of ships (harbors B2)', () => {
  let a: ShipRegister;
  let b: ShipRegister;

  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    installStore();
    a = register(REG_A, 'test-city');
    b = register(REG_B, 'test-isle');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ a name is unique in its register — article and case make no new name — and free under another flag', async () => {
    const all = [{ holder: player('/platform/agent/Avatar/ann', 'Ann'), shares: 64 }];
    expect(await enterAs(a, entry('Gull', GULL, all))).toBeNull();
    expect(await enterAs(a, entry('the gull', TERN, all))).toMatch(/named the gull in the register already|named gull/i);
    expect(await a.isNameTaken('GULL')).toBe(true);
    expect(await enterAs(a, entry('!!!', '/test/ship/x', all))).toMatch(/letters/);
    // The same name under another flag is another ship.
    expect(await enterAs(b, entry('Gull', '/test/ship/y', all))).toBeNull();
    const gull = await a.entryNamed('Gull');
    expect(gull?.key).toBe(GULL);
    expect(gull?.flag).toBe('test-city');
    expect((await b.entryNamed('gull'))?.flag).toBe('test-isle');
  });

  it('⚠ the shares must come to sixty-four — an entry that does not is a caller error, thrown', async () => {
    await expect(enterAs(a, entry('Skua', GULL, [{ holder: player('/x'), shares: 60 }]))).rejects.toThrow(/64/);
  });

  it('⭐ the managing owner: more than half, else the largest, ties to the earliest entered', () => {
    const e = (shares: Array<[string, number]>): ShipEntry => ({
      name: 'x', kind: SMACK, key: 'k', flag: 'test-city', registeredAtS: 0, house: '',
      shares: shares.map(([p, n]) => ({ holder: player(p), shares: n })),
    });
    expect(a.managingOwnerOf(e([['/ann', 48], ['/bob', 16]]))?.path).toBe('/ann');
    expect(a.managingOwnerOf(e([['/bob', 16], ['/ann', 33], ['/cy', 15]]))?.path).toBe('/ann');
    expect(a.managingOwnerOf(e([['/ann', 20], ['/bob', 24], ['/cy', 20]]))?.path).toBe('/bob');
    expect(a.managingOwnerOf(e([['/ann', 32], ['/bob', 32]]))?.path).toBe('/ann');
    expect(a.managingOwnerOf(e([]))).toBeNull();
  });

  it('⭐ shares move only from a holder who has them; a holding that falls to nothing comes off', async () => {
    await enterAs(a, entry('Gull', GULL, [{ holder: player('/ann', 'Ann'), shares: 64 }]));
    const refusedStranger = await transferAs(a, 'Gull', player('/bob'), player('/cy'), 4);
    expect(refusedStranger).toEqual({ ok: false, reason: expect.stringMatching(/holds none/) });
    const tooMany = await transferAs(a, 'Gull', player('/ann'), player('/bob'), 65);
    expect(tooMany.ok).toBe(false);
    expect((await transferAs(a, 'Tern', player('/ann'), player('/bob'), 1)).ok).toBe(false);
    const sold = await transferAs(a, 'Gull', player('/ann'), player('/bob', 'Bob'), 16);
    expect(sold.ok).toBe(true);
    const after = await a.entryNamed('Gull');
    expect(after?.shares).toEqual([
      { holder: player('/ann', 'Ann'), shares: 48 },
      { holder: player('/bob', 'Bob'), shares: 16 },
    ]);
    expect(a.managingOwnerOf(after!)?.path).toBe('/ann');
    // Bob cannot sell more than he holds…
    expect((await transferAs(a, 'Gull', player('/bob'), player('/cy'), 17)).ok).toBe(false);
    // …and all of Ann's going leaves her off the register.
    await transferAs(a, 'Gull', player('/ann'), player('/bob'), 48);
    const last = await a.entryNamed('Gull');
    expect(last?.shares).toEqual([{ holder: player('/bob', 'Bob'), shares: 64 }]);
  });

  it('⚠⚠ the read verifies the PATH, not the kind tag — a forged entry on a home branch is in no register', async () => {
    const doc = new StoredDocument();
    doc.path = '/home/iris/ships/gull';
    doc.owner = '/home/iris';
    doc.kind = SHIP_ENTRY_KIND;
    doc.data = { name: 'Gull', key: `${SMACK}#1`, kind: SMACK, flag: 'test-city', shares: [{ holder: player('/iris'), shares: 64 }] };
    await doc.save();
    expect(await a.entries()).toEqual([]);
    expect(await a.entryNamed('Gull')).toBeNull();
  });

  it('⭐ a ship knows her register — her entry, flag, holders and owner are read off it, never searched for', async () => {
    governments();
    await enterAs(a, entry('Gull', GULL, [{ holder: player('/ann'), shares: 40 }, { holder: player('/bob'), shares: 24 }]));
    await enterAs(b, entry('Tern', TERN, [{ holder: player('/cy'), shares: 64 }]));
    const gull = shipAt(GULL);
    gull.setShipRegister(REG_A);
    gull.setRegisteredName('Gull');
    const tern = shipAt(TERN);
    tern.setShipRegister(REG_B);
    tern.setRegisteredName('Tern');
    expect(await gull.flagState()).toBe('test-city');
    expect(await tern.flagState()).toBe('test-isle');
    expect((await gull.managingOwner())?.path).toBe('/ann');
    expect((await gull.shareHolders()).map((h) => h.path)).toEqual(['/ann', '/bob']);
    expect((await gull.registerEntry())?.key).toBe(GULL);
    // A stateless ship — in no register — has no flag, no owner.
    const none = shipAt('/test/ship/none');
    expect(await none.flagState()).toBeNull();
    expect(await none.managingOwner()).toBeNull();
    expect(await none.shareHolders()).toEqual([]);
    // ⚠ An entry under her name that is not HER (another handle) is not hers.
    none.setShipRegister(REG_A);
    none.setRegisteredName('Gull');
    expect(await none.registerEntry()).toBeNull();
  });

  it('⚠ the writes are narrow-entry: a test file (no ship, no transfer verb) is refused, and a ship enters only herself', async () => {
    // The gate throws before the body runs (synchronously, as every narrow entry does).
    expect(() => a.transferShares('Gull', player('/a'), player('/b'), 1)).toThrow(/TransferController/);
    expect(() => a.enter(entry('Gull', GULL, []))).toThrow(/VoyagingMixin/);
    // A ship entering ANOTHER ship is refused too.
    expect(() =>
      withRootContext(shipAt(TERN), 'commission', () => a.enter(entry('Gull', GULL, [{ holder: player('/x'), shares: 64 }]))),
    ).toThrow(/VoyagingMixin/);
  });

  it('⭐ holdsAuthority(register): her player managing owner by identity; an owner organization by ITS authority', async () => {
    governments();
    const ann = makeAvatar('ann');
    const bob = makeAvatar('bob');
    await enterAs(a, entry('Gull', GULL, [
      { holder: player('/platform/agent/Avatar/ann'), shares: 40 },
      { holder: player('/platform/agent/Avatar/bob'), shares: 24 },
    ]));
    shipAt(GULL).setShipRegister(REG_A);
    shipAt(GULL).setRegisteredName('Gull');
    const gull = { kind: 'register' as const, ship: GULL };
    expect(await EmploymentApi.holdsAuthority(ann, gull)).toBe(true);
    expect(await EmploymentApi.holdsAuthority(bob, gull)).toBe(false);
    // A stateless ship: nobody holds her authority.
    shipAt('/test/ship/none');
    expect(await EmploymentApi.holdsAuthority(ann, { kind: 'register', ship: '/test/ship/none' })).toBe(false);

    // The line owns the Kittiwake; whoever holds the LINE's authority appoints her master.
    const line = makeStuffAtPath(() => new BusinessEntity(), LINE);
    Object.assign(line, { appointingAuthority: { kind: 'entity', path: '/platform/agent/Avatar/bob' } });
    await enterAs(a, entry('Kittiwake', '/test/ketch', [{ holder: { kind: 'organization', path: LINE }, shares: 64 }]));
    shipAt('/test/ketch').setShipRegister(REG_A);
    shipAt('/test/ketch').setRegisteredName('Kittiwake');
    const kitti = { kind: 'register' as const, ship: '/test/ketch' };
    expect(await EmploymentApi.holdsAuthority(bob, kitti)).toBe(true);
    expect(await EmploymentApi.holdsAuthority(ann, kitti)).toBe(false);
  });
});
