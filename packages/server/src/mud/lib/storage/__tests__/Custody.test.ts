/**
 * ⭐⭐ Custody (storage-and-ice W3, D6): receipts on the kernel, the book is
 * the instrument, the keeper is a seat.
 *
 *  1. A deposit writes a receipt with the fields a depositor needs.
 *  2. With nobody keeping the book, a stranger is refused; staff on shift
 *     need no keeper and deposit on the HOUSE's claim.
 *  3. A withdrawal pays out the grade at the line's state, debits the
 *     receipt and charges the printed fee.
 *  4. ⭐ A shortfall is shared pro rata, and the receipt records whether it
 *     was within the allowance.
 *  5. A block put on the stack by hand: staff on shift → the house's claim
 *     rises; anyone else → stock rises and no claim does.
 *  6. The house's draw (a counter bringing stock up) debits its claim.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Material from '../../material/Material';
import Stockpile from '../../../platform/thing/Stockpile';
import IceBlock from '../../../platform/thing/IceBlock';
import BusinessEntity from '../../../platform/idea/Business';
import { Idea } from '../../stuff/Idea';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { NamedMixin } from '../../description/Named';
import { EmployedMixin } from '../../employment/Employed';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { EmploymentApi } from '../../../api/employment';
import { AccessApi } from '../../../api/access';
import { PersistApi } from '../../../api/persist';
import { WorldClockApi } from '../../../api/worldclock';
import { Collections } from '../../persistence/Collections';
import { Quantity } from '../../quantity';
import type { Stuff } from '../../stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { Document } from '../../persistence/Document';

const ICE = '/stuff/idea/material/bulk/ice';
const BLOCK = '/stuff/thing/ice-block';
const BIZ = '/stuff/test/ice/company';
const STACK = '/stuff/test/ice/stack';

class Room extends ContainerMixin(Idea) {
  static _mixinName = 'CustodyTestRoom';
}
class Person extends EmployedMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))) {
  static _mixinName = 'CustodyTestPerson';
}

let docs: Map<string, Record<string, unknown>>;
let room: Room;
let store: Stockpile;

function person(name: string, onShiftAs?: string): Person {
  const p = makeStuffAtPath(() => new Person(), `/platform/agent/Avatar/${name}`);
  if (onShiftAs) {
    (p as unknown as { employments: unknown }).employments = [
      { organizationPath: BIZ, positionKey: onShiftAs, status: 'on-shift', hiredAt: 0, onShiftSince: 0 },
    ];
  }
  ContainmentApi.move(p, room as unknown as Stuff & never);
  return p;
}

function block(kg = 4, quality: 'black' | 'cloudy' = 'black'): IceBlock {
  const b = makeStuff(() => new IceBlock());
  stampTemplatePathForTest(b, BLOCK);
  b.setMaterial(StuffApi.findByTemplatePath<Material>(ICE) as Material);
  b.setMass(Quantity.of(kg, 'kg'));
  b.setIceQuality(quality);
  b.setStampedTemperatureK(271);
  return b;
}

function carry(p: Person, b: IceBlock): IceBlock {
  ContainmentApi.move(b, p as unknown as Stuff & never);
  return b;
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
  WorldClockApi._resetForTesting();
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(10_000, 's'));
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('ice');
    m.setDensity(Quantity.of(917, 'kg/m³'));
    return m;
  }, ICE);
  makeStuffAtPath(() => new BusinessEntity(), BIZ);

  docs = new Map();
  let id = 0;
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(PersistApi, 'find').mockImplementation(async (col: string, q: Record<string, unknown>) =>
    col !== Collections.Documents
      ? []
      : [...docs.values()].filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)),
  );
  vi.spyOn(PersistApi, 'save').mockImplementation(async (col: string, doc: Record<string, unknown>) => {
    const key = (doc._id as string | undefined) ?? `id-${id++}`;
    if (col === Collections.Documents) docs.set(key, { ...doc, _id: key });
    return key;
  });
  vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === BLOCK) return block(1);
    throw new Error(`unexpected clone ${path}`);
  }) as unknown as typeof StuffApi.clone);

  room = makeStuff(() => new Room());
  store = makeStuff(() => new Stockpile());
  stampTemplatePathForTest(store, STACK);
  store.businessPath = BIZ;
  store.keeperPositions = ['keeper'];
  store.terms = { allowancePct: 10, feeMinorPerKg: 2 };
  ContainmentApi.move(store, room as unknown as Stuff & never);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('deposit — a receipt with the fields a depositor needs', () => {
  it('⭐ the keeper takes it in and the book writes the receipt', async () => {
    person('keeper', 'keeper');
    const mira = person('mira');
    const out = await store.deposit(carry(mira, block(4)), mira);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.receipt).toMatchObject({
      depositor: '/platform/agent/Avatar/mira',
      bailee: BIZ,
      store: STACK,
      poolKey: 'ice|black',
      unit: 'kg',
      amountKg: 4,
      terms: { allowancePct: 10, feeMinorPerKg: 2 },
    });
    expect(out.receiptPath).toMatch(`${BIZ}/warehouse-receipts/`);
    expect(store.getLine('ice|black')!.amountKg).toBe(4);
    expect((await store.receiptsFor('/platform/agent/Avatar/mira'))[0]!.amountKg).toBe(4);
  });

  it('a second deposit of the same grade adds to the same receipt', async () => {
    person('keeper', 'keeper');
    const mira = person('mira');
    await store.deposit(carry(mira, block(4)), mira);
    await store.deposit(carry(mira, block(4)), mira);
    const mine = await store.receiptsFor('/platform/agent/Avatar/mira');
    expect(mine).toHaveLength(1);
    expect(mine[0]!.amountKg).toBe(8);
  });

  it('nobody keeping the book → refused; staff on shift need no keeper and deposit for the house', async () => {
    const mira = person('mira');
    const b = carry(mira, block(4));
    const out = await store.deposit(b, mira);
    expect(out).toMatchObject({ ok: false, reason: 'no-keeper' });
    expect(b.getContainer()).toBe(mira);

    const hand = person('hand', 'house-hand');
    const staffOut = await store.deposit(carry(hand, block(4)), hand);
    expect(staffOut.ok && staffOut.receipt.depositor).toBe(BIZ);
  });
});

describe('withdraw — the grade back, the receipt debited, the fee charged', () => {
  it('⭐ pays out a block of the line\'s grade and charges the fee', async () => {
    const fee = vi.spyOn(EmploymentApi, 'settleSale').mockResolvedValue(null);
    person('keeper', 'keeper');
    const mira = person('mira');
    await store.deposit(carry(mira, block(4)), mira);
    await store.deposit(carry(mira, block(4)), mira);
    const out = await store.withdraw(mira, 'ice', 1);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.goods).toHaveLength(1);
    const got = out.goods[0] as unknown as IceBlock;
    expect(got.getContainer()).toBe(mira);
    expect(got.getIceQuality()).toBe('black');
    expect(out.amountKg).toBe(4);
    expect(out.receipt.amountKg).toBe(4);
    expect(store.getLine('ice|black')!.amountKg).toBe(4);
    expect(fee).toHaveBeenCalledWith(STACK, 8, 8, 'storage fee');
  });

  it('a withdrawal with no receipt is refused', async () => {
    person('keeper', 'keeper');
    const tom = person('tom');
    expect(await store.withdraw(tom, 'ice', 1)).toMatchObject({ ok: false, reason: 'no-claim' });
  });

  it('⭐⭐ a shortfall is shared pro rata, and the receipt says whether it was within the allowance', async () => {
    vi.spyOn(EmploymentApi, 'settleSale').mockResolvedValue(null);
    person('keeper', 'keeper');
    const mira = person('mira');
    const tom = person('tom');
    for (let i = 0; i < 5; i++) await store.deposit(carry(mira, block(4)), mira);
    for (let i = 0; i < 5; i++) await store.deposit(carry(tom, block(4)), tom);
    // 40 kg claimed; the stack shrinks to 32 (a 20 % loss — beyond 10 %).
    const line = (store as unknown as { lines: { amountKg: number }[] }).lines[0]!;
    line.amountKg = 32;
    // Mira takes all she can: 20 × 0.8 = 16 kg = four blocks, and her
    // claim is debited by what was CLAIMED (16 / 0.8 = 20) — settled.
    const out = await store.withdraw(mira, 'ice', 10);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.goods).toHaveLength(4);
    expect(out.receipt.amountKg).toBe(0);
    expect(out.receipt.settledAtS).toBeDefined();
    expect(out.receipt.shortfallPct).toBeCloseTo(20, 6);
    expect(out.receipt.withinAllowance).toBe(false);
    // Tom is paid at the same rate.
    const tomOut = await store.withdraw(tom, 'ice', 10);
    expect(tomOut.ok && tomOut.goods.length).toBe(4);
  });
});

describe('put by hand — off the books, or on the house\'s claim', () => {
  it('⭐ staff on shift put it on the house\'s claim; a stranger adds stock and no claim', async () => {
    const hand = person('hand', 'house-hand');
    const b = carry(hand, block(4));
    expect(store.canAddContainable(b as Stuff & never).ok).toBe(true);
    ContainmentApi.move(b, store as unknown as Stuff & never);
    await store.whenSettled();
    expect((await store.receiptsFor(BIZ))[0]!.amountKg).toBe(4);

    const tom = person('tom');
    const t = carry(tom, block(4));
    store.canAddContainable(t as Stuff & never);
    ContainmentApi.move(t, store as unknown as Stuff & never);
    await store.whenSettled();
    expect(store.getLine('ice|black')!.amountKg).toBe(8);
    expect(await store.receiptsFor('/platform/agent/Avatar/tom')).toEqual([]);
    expect((await store.receiptsFor(BIZ))[0]!.amountKg).toBe(4);
  });

  it('taking the face by hand changes no receipt — only a stocktake shows it', async () => {
    const hand = person('hand', 'house-hand');
    for (let i = 0; i < 3; i++) {
      const b = carry(hand, block(4));
      store.canAddContainable(b as Stuff & never);
      ContainmentApi.move(b, store as unknown as Stuff & never);
    }
    await store.whenSettled();
    const thief = person('thief');
    ContainmentApi.move(store.faceFor('ice|black') as Stuff & never, thief as unknown as Stuff & never);
    await store.whenSettled();
    expect(store.getLine('ice|black')!.amountKg).toBe(8);
    expect((await store.receiptsFor(BIZ))[0]!.amountKg).toBe(12);
  });
});

describe('the house draws on its own claim (a counter bringing stock up)', () => {
  it('drawForHouse mints from the line and debits the house\'s claim; an empty claim brings nothing', async () => {
    const hand = person('hand', 'house-hand');
    const b = carry(hand, block(4));
    store.canAddContainable(b as Stuff & never);
    ContainmentApi.move(b, store as unknown as Stuff & never);
    const c = carry(hand, block(4));
    store.canAddContainable(c as Stuff & never);
    ContainmentApi.move(c, store as unknown as Stuff & never);
    await store.whenSettled();
    const goods = await store.drawForHouse(BLOCK, 1);
    expect(goods).toHaveLength(1);
    expect((await store.receiptsFor(BIZ))[0]!.amountKg).toBe(4);
    expect(store.getLine('ice|black')!.amountKg).toBe(4);
    await store.drawForHouse(BLOCK, 1);
    expect(await store.drawForHouse(BLOCK, 1)).toEqual([]);
  });
});
