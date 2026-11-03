/**
 * CapTableMixin — ⭐ a table of owners and their units (the institutions
 * slate's primitive; harbors review 1), and the `owners` appointing
 * authority that reads it.
 *
 * - an authored table is validated loudly: units, a known term, rows of
 *   holders by path, the whole or nothing;
 * - ⚠ only the template applier lays a table down whole — a script cannot
 *   rewrite who owns a business;
 * - ⭐ the majority read: MORE than half, else nobody;
 * - units move only through the `transfer` verb, and only from a holder
 *   who has them; a row that falls to nothing comes off;
 * - ⭐ the table is KEPT: a sale survives the process (a fresh stand-up of
 *   the row restores the record, not the authored table);
 * - `holdsAuthority({kind: 'owners'})`: a player majority by identity, a
 *   sole owner appoints themself, an organization majority through ITS
 *   authority, no majority → nobody; authored bare it reads its own table.
 */

import '../../../../test-bootstrap';
import { KERNEL_CONTENT_ROWS } from '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import PersistentBusiness from '../../../platform/idea/PersistentBusiness';
import TransferController from '../../../platform/idea/cmd/system/TransferController';
import Avatar from '../../../platform/agent/PrimaryAvatar';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { EmploymentApi } from '../../../api/employment';
import { Document } from '../../persistence/Document';
import { PersistenceManager } from '../../persistence/__tests__/backend-store';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff, makeStuffAtPath, withRootContext } from '../../security/__tests__/test-setup';
import type { UnitHolder } from '../CapTable';

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const ANN = '/platform/agent/Avatar/ann';
const BOB = '/platform/agent/Avatar/bob';
const CO = '/test/co/gull';
const LINE = '/test/co/line';
const HELD = '/test/co/held-by-line';
const EVEN = '/test/co/even';
const BAD = '/test/co/bad';

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

const player = (path: string, name?: string): UnitHolder => ({ kind: 'player', path, ...(name ? { name } : {}) });

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const content = col('content');
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    content.push({ _id: `d-${++idCounter}`, path, class: cls, data });
  add(TemplateApplier.templatePath, TemplateApplier.templatePath);
  for (const row of KERNEL_CONTENT_ROWS) content.push({ _id: `d-${++idCounter}`, ...row });
  const row = (rows: Array<{ holder: UnitHolder | { kind: 'organization'; path: string }; units: number }>, transfer = 'free') => ({
    name: 'a company',
    appointingAuthority: { kind: 'owners' },
    capTable: { units: 64, transfer, rows },
  });
  add(CO, '/platform/idea/PersistentBusiness', row([{ holder: player(ANN, 'Ann'), units: 64 }]));
  add(LINE, '/platform/idea/PersistentBusiness', { name: 'the line', appointingAuthority: { kind: 'entity', path: BOB } });
  add(HELD, '/platform/idea/PersistentBusiness', row([{ holder: { kind: 'organization', path: LINE }, units: 64 }]));
  add(EVEN, '/platform/idea/PersistentBusiness', row([
    { holder: player(ANN), units: 32 },
    { holder: player(BOB), units: 32 },
  ]));
  add(BAD, '/platform/idea/PersistentBusiness', row([{ holder: player(ANN), units: 60 }]));

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
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find: vi.fn(async (c: string, q: Record<string, unknown>) => col(c).filter((d) => matches(d, q))),
    findById: vi.fn(async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null),
    delete: vi.fn(async (c: string, id: string) => {
      const arr = col(c);
      const i = arr.findIndex((d) => d._id === id);
      if (i >= 0) arr.splice(i, 1);
    }),
    isConnected: () => true,
  } as unknown as PersistenceManager);
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

function makeAvatar(id: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
  av.setPlayerId(id);
  return av;
}

/** As the `transfer` verb — the one caller the table's moves admit. */
function asTransfer<T>(fn: () => T): T {
  return withRootContext(makeStuff(() => new TransferController()), 'execute', fn);
}

function reset(): void {
  vi.restoreAllMocks();
  StuffApi.clearAll();
}

describe('CapTableMixin — a table of owners and their units (harbors review 1)', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('⭐ an authored table stands, whole; a table that does not come to its units is refused loudly', async () => {
    const co = await StuffApi.singleton<PersistentBusiness>(CO);
    expect(MixinApi.isCapTable(co)).toBe(true);
    expect(co.getCapTable()).toEqual({ units: 64, transfer: 'free', rows: [{ holder: player(ANN, 'Ann'), units: 64 }] });
    await expect(StuffApi.singleton(BAD)).rejects.toThrow(/come to 60, not 64/);
  });

  it('⚠ only the applier lays a table down — a script cannot rewrite who owns a business', async () => {
    const co = await StuffApi.singleton<PersistentBusiness>(CO);
    expect(() => co.setCapTable({ units: 64, rows: [{ holder: player(BOB), units: 64 }] })).toThrow(/TemplateApplier/);
    expect(co.majorityHolder()?.path).toBe(ANN);
  });

  it('⭐ the majority read: more than half, else nobody', async () => {
    expect((await StuffApi.singleton<PersistentBusiness>(CO)).majorityHolder()?.path).toBe(ANN);
    expect((await StuffApi.singleton<PersistentBusiness>(EVEN)).majorityHolder()).toBeNull();
  });

  it('⭐ units move only from a holder who has them, only by the transfer verb; a row at nothing comes off', async () => {
    const co = await StuffApi.singleton<PersistentBusiness>(CO);
    expect(() => co.giveUnits({ from: player(ANN), to: player(BOB), units: 1 })).toThrow(/TransferController/);
    const stranger = await asTransfer(() => co.giveUnits({ from: player(BOB), to: player(ANN), units: 1 }));
    expect(stranger).toMatchObject({ ok: false, code: 'not-a-holder' });
    expect(await asTransfer(() => co.giveUnits({ from: player(ANN), to: player(BOB), units: 65 }))).toMatchObject({ ok: false, code: 'bad-count' });
    const gave = await asTransfer(() => co.giveUnits({ from: player(ANN, 'Ann'), to: player(BOB, 'Bob'), units: 40 }));
    expect(gave.ok).toBe(true);
    expect(co.majorityHolder()?.path).toBe(BOB);
    await asTransfer(() => co.giveUnits({ from: player(ANN), to: player(BOB), units: 24 }));
    expect(co.capTableRows()).toEqual([{ holder: player(BOB, 'Bob'), units: 64 }]);
  });

  it('⭐ the table is KEPT: after a sale, the process going, the row stands up with the record, not the authored table', async () => {
    const co = await StuffApi.singleton<PersistentBusiness>(CO);
    await asTransfer(() => co.giveUnits({ from: player(ANN, 'Ann'), to: player(BOB, 'Bob'), units: 16 }));
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    const again = await StuffApi.singleton<PersistentBusiness>(CO);
    expect(again.capTableRows().map((x) => [x.holder.path, x.units])).toEqual([[ANN, 48], [BOB, 16]]);
  });

  it('⭐ holdsAuthority(owners): a sole owner appoints themself; an organization majority through ITS authority; no majority, nobody', async () => {
    const ann = makeAvatar('ann');
    const bob = makeAvatar('bob');
    const co = await StuffApi.singleton<PersistentBusiness>(CO);
    // Authored bare, the authority reads the organization's OWN table.
    expect(co.getAppointingAuthority()).toEqual({ kind: 'owners', organization: CO });
    expect(await EmploymentApi.holdsAuthority(ann, co.getAppointingAuthority())).toBe(true);
    expect(await EmploymentApi.holdsAuthority(bob, co.getAppointingAuthority())).toBe(false);
    // The line holds this one; the line's authority is Bob's.
    const held = await StuffApi.singleton<PersistentBusiness>(HELD);
    expect(await EmploymentApi.holdsAuthority(bob, held.getAppointingAuthority())).toBe(true);
    expect(await EmploymentApi.holdsAuthority(ann, held.getAppointingAuthority())).toBe(false);
    // An even split: nobody appoints until somebody holds a majority.
    const even = await StuffApi.singleton<PersistentBusiness>(EVEN);
    expect(await EmploymentApi.holdsAuthority(ann, even.getAppointingAuthority())).toBe(false);
    expect(await EmploymentApi.holdsAuthority(bob, even.getAppointingAuthority())).toBe(false);
    // `organization:` names another's table; one that keeps none admits nobody.
    expect(await EmploymentApi.holdsAuthority(ann, { kind: 'owners', organization: CO })).toBe(true);
    expect(await EmploymentApi.holdsAuthority(bob, { kind: 'owners', organization: LINE })).toBe(false);
  });
});
