/**
 * ShipRegister — ⭐ a government's book of ships.
 *
 * - a name is unique in its register (article and case do not make a new
 *   name); the same name under another flag is another ship;
 * - ⭐ the register keeps TITLE — name, flag, owner (the company that holds
 *   her) — and no shares: an entry with no owner is a caller error;
 * - ⚠ the read verifies the PATH, not the kind tag — a `kind: 'ship'`
 *   document on somebody's home branch is not in any register;
 * - ⭐ a ship knows her register (no Api searches the
 *   registers): her entry and flag are read off her OWN register under
 *   the name she was entered as; her owners are her company's table
 *   (CapTable.test, Ship.register.test);
 * - the one write is narrow-entry: `enter` only by the ship herself, about
 *   herself.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ShipRegister, { SHIP_ENTRY_KIND, type ShipEntry } from '../ShipRegister';
import Ship from '../Ship';
import { StuffApi } from '../../../api/stuff';
import { GovernmentApi } from '../../../api/government';
import { StoredDocument } from '../../../lib/document/StoredDocument';
import { Document } from '../../../lib/persistence/Document';
import { PersistenceManager } from '../../../lib/persistence/__tests__/backend-store';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuffAtPath, withRootContext } from '../../../lib/security/__tests__/test-setup';
import type { GovernmentDescriptor } from '../Government';

const REG_A = '/platform/idea/ShipRegister/test-city';
const REG_B = '/platform/idea/ShipRegister/test-isle';
const SMACK = '/test/ship/smack';
/** Authored ships (her handle is her row) — what the tests' callers are. */
const GULL = '/test/ship/gull';
const TERN = '/test/ship/tern';
const OWNER = '/test/ship/company';

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
  // The government dictionary loads with the register (D7); this suite fakes
  // its reads, so the load is not waited for — only kept from leaking.
  void reg.setGovernment(gov)?.catch(() => undefined);
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

function entry(name: string, key: string, owner = OWNER): Omit<ShipEntry, 'flag' | 'registeredAtS'> {
  return { name, kind: SMACK, key, owner };
}

/** A ship at her own row — the one caller `enter` admits, about herself. */
function shipAt(path: string): Ship {
  return StuffApi.findByTemplatePath<Ship>(path) ?? makeStuffAtPath(() => new Ship(), path);
}

/** `reg.enter(e)` as the ship whose handle `e.key` is — her commissioning, in miniature. */
function enterAs(reg: ShipRegister, e: Omit<ShipEntry, 'flag' | 'registeredAtS'>): Promise<string | null> {
  return withRootContext(shipAt(e.key), 'commission', () => reg.enter(e));
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
    expect(await enterAs(a, entry('Gull', GULL))).toBeNull();
    expect(await enterAs(a, entry('the gull', TERN))).toMatch(/named the gull in the register already|named gull/i);
    expect(await a.isNameTaken('GULL')).toBe(true);
    expect(await enterAs(a, entry('!!!', '/test/ship/x'))).toMatch(/letters/);
    // The same name under another flag is another ship.
    expect(await enterAs(b, entry('Gull', '/test/ship/y'))).toBeNull();
    const gull = await a.entryNamed('Gull');
    expect(gull?.key).toBe(GULL);
    expect(gull?.flag).toBe('test-city');
    expect((await b.entryNamed('gull'))?.flag).toBe('test-isle');
  });

  it('⭐ the register keeps title, not shares: an entry names her owner, and one that does not is a caller error, thrown', async () => {
    await enterAs(a, entry('Skua', GULL));
    const e = await a.entryNamed('Skua');
    expect(e).toMatchObject({ name: 'Skua', key: GULL, flag: 'test-city', owner: OWNER });
    expect(e).not.toHaveProperty('shares');
    await expect(enterAs(a, entry('Petrel', TERN, ''))).rejects.toThrow(/owner/);
  });

  it('⚠⚠ the read verifies the PATH, not the kind tag — a forged entry on a home branch is in no register', async () => {
    const doc = new StoredDocument();
    doc.path = '/home/iris/ships/gull';
    doc.owner = '/home/iris';
    doc.kind = SHIP_ENTRY_KIND;
    doc.data = { name: 'Gull', key: `${SMACK}#1`, kind: SMACK, flag: 'test-city', owner: '/home/iris' };
    await doc.save();
    expect(await a.entries()).toEqual([]);
    expect(await a.entryNamed('Gull')).toBeNull();
  });

  it('⭐ a ship knows her register — her entry and flag are read off it, never searched for', async () => {
    governments();
    await enterAs(a, entry('Gull', GULL));
    await enterAs(b, entry('Tern', TERN));
    const gull = shipAt(GULL);
    gull.setShipRegister(REG_A);
    gull.setRegisteredName('Gull');
    const tern = shipAt(TERN);
    tern.setShipRegister(REG_B);
    tern.setRegisteredName('Tern');
    expect(await gull.flagState()).toBe('test-city');
    expect(await tern.flagState()).toBe('test-isle');
    expect((await gull.registerEntry())?.owner).toBe(OWNER);
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

  it('⚠ the write is narrow-entry: a test file (no ship) is refused, and a ship enters only herself', async () => {
    // The gate throws before the body runs (synchronously, as every narrow entry does).
    expect(() => a.enter(entry('Gull', GULL))).toThrow(/platform\/idea\/Ship/);
    // A ship entering ANOTHER ship is refused too.
    expect(() => withRootContext(shipAt(TERN), 'commission', () => a.enter(entry('Gull', GULL)))).toThrow(/TheHandleIsHerOwn/);
  });
});
