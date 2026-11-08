/**
 * `transfer <n> shares of <ship> …` — ⭐ a ship's shares change hands with
 * the money in ONE act, or not at all — on HER COMPANY'S
 * cap table: the register names her owning company, and the
 * units move there. Driven as the dispatcher would (a real controller
 * Stuff), over a real register and a kept company on an in-memory store;
 * the money primitive is stubbed.
 *
 * - bought: the buyer acts, the holder consents; the units move and the
 *   buyer pays the holder's account;
 * - ⚠ a payment that fails leaves the table exactly as it was;
 * - the holder declines, or does not hold that many: nothing moves, nobody pays;
 * - given: the holder acts, the receiver consents; no money;
 * - under the `consent` term every other holder is asked, and a no stops it;
 * - the register entry carries no shares — only her owner.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TransferController from '../TransferController';
import ShipRegister, { SHIP_ENTRY_KIND } from '../../../ShipRegister';
import Ship from '../../../Ship';
import PersistentBusiness from '../../../PersistentBusiness';
import { ExpanseApi } from '../../../../../api/expanse';
import Avatar from '../../../../agent/PrimaryAvatar';
import { StuffApi } from '../../../../../api/stuff';
import { GovernmentApi } from '../../../../../api/government';
import { BankingApi } from '../../../../../api/banking';
import { CommandApi, type CommandContext, type CommandModel } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import Place from '../../../../../lib/stuff/Place';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { Document } from '../../../../../lib/persistence/Document';
import { PersistenceManager } from '../../../../../lib/persistence/__tests__/backend-store';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff, makeStuffAtPath, withRootContext } from '../../../../../lib/security/__tests__/test-setup';
import type { GovernmentDescriptor } from '../../../Government';

const REG = '/platform/idea/ShipRegister/test-city';
const GULL = '/test/ship/gull';
const COMPANY = '/test/ship/gull-company';
const ANN = '/platform/agent/Avatar/ann';
const BOB = '/platform/agent/Avatar/bob';

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

function makeAvatar(id: string, answer?: boolean): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
  av.setPlayerId(id);
  if (answer !== undefined) {
    vi.spyOn(av, 'getInteractives').mockReturnValue(new Set([{ promptConfirm: vi.fn().mockResolvedValue(answer), sendMessage: vi.fn() } as never]));
  }
  return av;
}

function makeContext(giver: Avatar): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: makeStuff(() => new Place()) as never,
    commandText: 'transfer',
    executionId: 'test',
    commandId: 'test',
    verb: 'transfer',
    command: CommandDefinition.fromYaml('verbs: [transfer]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
}

function rejection(ctx: CommandContext): string | null {
  const rej = ctx.getNotes().find((n) => n.kind === 'controller-rejected') as { reason?: string } | undefined;
  return rej?.reason ?? null;
}

async function run(giver: Avatar, model: Record<string, unknown>): Promise<CommandContext> {
  const ctx = makeContext(giver);
  await withRootContext(null, 'transfer-shares.test', () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return makeStuff(() => new TransferController()).execute(model as unknown as CommandModel as never, ctx);
  });
  return ctx;
}

const who = (s: Avatar, raw: string): MqlOneResult => ({ stuff: s as never, raw });

describe('transfer … shares — money and shares together, or neither (harbors B2, review 1)', () => {
  let reg: ShipRegister;
  let company: PersistentBusiness;

  beforeEach(async () => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    installStore();
    reg = makeStuffAtPath(() => new ShipRegister(), REG);
    reg.setRegisterOwner('/platform');
    reg.setRegisterPrefix('/platform/ships/test-city');
    reg.setRegisterKind(SHIP_ENTRY_KIND);
    reg.setGovernment('test-city');
    const gov: GovernmentDescriptor = {
      key: 'test-city', name: 'the City of Test', description: '', charter: '', treasury: '',
      departments: [], seats: [], standards: [], shipRegister: REG,
    };
    vi.spyOn(GovernmentApi, 'listGovernments').mockReturnValue([gov]);
    vi.spyOn(GovernmentApi, 'getGovernment').mockReturnValue(gov);
    // The register kept where the act is done: the government over the room.
    vi.spyOn(GovernmentApi, 'subjectTo').mockResolvedValue([gov]);
    vi.spyOn(BankingApi, 'primaryAccountIdOf').mockImplementation(async (k: string) => `acct:${k}`);
    // Entered as she is commissioned — by the ship herself.
    // ⭐ Her company owns her; its table is Ann's, whole (the founding a
    // row or a commissioning lays down — set raw here: the setter is the
    // applier's alone).
    company = makeStuffAtPath(() => new PersistentBusiness(), COMPANY);
    Object.assign(company, { capTable: { units: 64, transfer: 'free', rows: [{ holder: { kind: 'player', path: ANN, name: 'Ann' }, units: 64 }] } });
    const gull = makeStuffAtPath(() => new Ship(), GULL);
    gull.setHouse(COMPANY);
    vi.spyOn(ExpanseApi, 'standUpCraft').mockImplementation(async (h: string) => (h === GULL ? (gull as never) : null));
    await withRootContext(gull, 'commission', () =>
      reg.enter({ name: 'Gull', kind: '/test/ship/smack', key: GULL, owner: COMPANY }),
    );
  });

  const table = (): Array<[string, number]> => company.capTableRows().map((x) => [x.holder.path, x.units]);
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ bought: the holder says yes, the shares move AND the buyer pays the holder', async () => {
    const ann = makeAvatar('ann', true);
    const bob = makeAvatar('bob');
    const pay = vi.spyOn(BankingApi, 'settle').mockResolvedValue({ method: 'credential' } as never);
    const ctx = await run(bob, { parcel: '16 shares of the gull', holder: who(ann, 'ann'), price: '40' });
    expect(rejection(ctx)).toBeNull();
    expect(pay).toHaveBeenCalledTimes(1);
    const charge = pay.mock.calls[0]![0];
    expect(charge.payeeAccountId).toBe(`acct:${ANN}`);
    expect(charge.amount.render()).toMatch(/40/);
    expect(table()).toEqual([[ANN, 48], [BOB, 16]]);
    // ⭐ The register keeps her title, never her shares.
    expect(await reg.entryNamed('Gull')).toMatchObject({ name: 'Gull', owner: COMPANY });
    expect(await reg.entryNamed('Gull')).not.toHaveProperty('shares');
    // ⭐ The majority is Ann's still: she appoints.
    expect(company.majorityHolder()?.path).toBe(ANN);
  });

  it('⚠⚠ a payment that fails moves nothing — the entry is exactly as it was', async () => {
    const ann = makeAvatar('ann', true);
    const bob = makeAvatar('bob');
    vi.spyOn(BankingApi, 'settle').mockRejectedValue(new Error('insufficient funds'));
    const ctx = await run(bob, { parcel: '16 shares of gull', holder: who(ann, 'ann'), price: '4000' });
    expect(rejection(ctx)).toBe('unpaid');
    expect(table()).toEqual([[ANN, 64]]);
  });

  it('the holder declines, or holds too few, or is no holder: nothing moves and nobody pays', async () => {
    const pay = vi.spyOn(BankingApi, 'settle').mockResolvedValue({ method: 'credential' } as never);
    const no = makeAvatar('ann', false);
    const bob = makeAvatar('bob', true);
    expect(rejection(await run(bob, { parcel: '16 shares of gull', holder: who(no, 'ann'), price: '40' }))).toBe('declined');
    expect(rejection(await run(bob, { parcel: '65 shares of gull', holder: who(no, 'ann'), price: '40' }))).toBe('not-a-holder');
    // Bob holds none, so nobody can buy his.
    expect(rejection(await run(no, { parcel: '1 share of gull', holder: who(bob, 'bob'), price: '1' }))).toBe('not-a-holder');
    expect(rejection(await run(bob, { parcel: '2 shares of the tern', holder: who(no, 'ann'), price: '1' }))).toBe('no-such-ship');
    expect(pay).not.toHaveBeenCalled();
    expect(table()).toEqual([[ANN, 64]]);
  });

  it('⭐ given: the holder acts, the receiver accepts — title only, no money', async () => {
    const ann = makeAvatar('ann');
    const bob = makeAvatar('bob', true);
    const pay = vi.spyOn(BankingApi, 'settle');
    const ctx = await run(ann, { parcel: '8 shares of gull', recipient: who(bob, 'bob') });
    expect(rejection(ctx)).toBeNull();
    expect(pay).not.toHaveBeenCalled();
    expect(table()).toEqual([[ANN, 56], [BOB, 8]]);
    // A non-holder cannot give what they do not hold.
    expect(rejection(await run(makeAvatar('cy'), { parcel: '1 share of gull', recipient: who(bob, 'bob') }))).toBe('not-a-holder');
  });

  it('⭐ under the `consent` term every other holder is asked: a no stops the sale, a yes lets it through', async () => {
    Object.assign(company, {
      capTable: {
        units: 64,
        transfer: 'consent',
        rows: [
          { holder: { kind: 'player', path: ANN, name: 'Ann' }, units: 48 },
          { holder: { kind: 'player', path: '/platform/agent/Avatar/cy', name: 'Cy' }, units: 16 },
        ],
      },
    });
    const pay = vi.spyOn(BankingApi, 'settle').mockResolvedValue({ method: 'credential' } as never);
    const ann = makeAvatar('ann', true);
    const bob = makeAvatar('bob');
    makeAvatar('cy', false);
    expect(rejection(await run(bob, { parcel: '8 shares of gull', holder: who(ann, 'ann'), price: '10' }))).toBe('declined');
    expect(pay).not.toHaveBeenCalled();
    expect(table()).toEqual([[ANN, 48], ['/platform/agent/Avatar/cy', 16]]);
    // Cy agrees this time.
    StuffApi.findByIdentityPath<Avatar>('/platform/agent/Avatar/cy').forEach((c) =>
      vi.spyOn(c, 'getInteractives').mockReturnValue(new Set([{ promptConfirm: vi.fn().mockResolvedValue(true), sendMessage: vi.fn() } as never])),
    );
    expect(rejection(await run(bob, { parcel: '8 shares of gull', holder: who(ann, 'ann'), price: '10' }))).toBeNull();
    expect(table()).toEqual([[ANN, 40], ['/platform/agent/Avatar/cy', 16], [BOB, 8]]);
  });
});
