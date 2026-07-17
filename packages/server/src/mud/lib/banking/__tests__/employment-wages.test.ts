/**
 * Employment wage settlement — the shift-end payout, over the real banking
 * ledger (the shared in-memory harness). A completed shift pays a lump of
 * `rate × shift-hours` once, from the Business account to the worker; an
 * early clock-out pays the partial; a proprietor's own cover pays nothing;
 * a zero-length (paused-clock) shift pays nothing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BankingApi, Money } from '../../../api/banking';
import { EmploymentApi } from '../../../api/employment';
import { Employment } from '../../employment/Employment';
import BusinessEntity from '../../employment/Business';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { ExecutionContextApi } from '../../../api/execution-context';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import {
  makeStuffAtPath,
  withRootContext,
} from '../../security/__tests__/test-setup';
import {
  installBankingHarness,
  teardownBankingHarness,
} from './banking-test-harness';

const BUSINESS = '/domain/lounge/business';
const BANK = '/domain/terminus/counting-houses/bank-counter';
const DAVE = '/domain/lounge/npc/dave';
const MARA = '/domain/lounge/npc/mara';
const HOUR = 3_600;

class Person extends Idea {
  static _mixinName = 'Person';
}

/**
 * Pin the **game** clock directly (the harness's real-time provider is
 * scaled by the game-rate, so we override `getNow` to a known game-second
 * instant — the same technique as the roster-tick tests).
 */
function setGameClock(gameSeconds: number): void {
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(
    Quantity.of(gameSeconds, 's'),
  );
}

async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, 'employment.test', () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

function seedBusiness(): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
  b.proprietorPath = DAVE;
  b.positions = [
    { key: 'bartender', label: 'tending bar', wageRate: 12, confers: ['MakerMixin'] },
  ];
  return b;
}

/** An employment on shift since `onSince`. */
function shift(onSince: number): Employment {
  return Employment.of({
    businessPath: BUSINESS,
    positionKey: 'bartender',
    status: 'on-shift',
    hiredAt: 0,
    onShiftSince: onSince,
  });
}

async function balanceOf(ownerKey: string): Promise<number> {
  const acct = await BankingApi.primaryAccountIdOf(ownerKey);
  return acct ? BankingApi.balanceOf(acct).minor : 0;
}

describe('employment shift-wage settlement', () => {
  beforeEach(() => {
    installBankingHarness();
    setGameClock(8 * HOUR); // "now" = 8 game-hours in
  });

  afterEach(() => {
    teardownBankingHarness();
  });

  it('pays rate × shift-hours once, at the boundary', async () => {
    const biz = seedBusiness();
    const mara = makeStuffAtPath(() => new Person(), MARA);
    await asOwner(mara, () => BankingApi.openAccount(BANK, ''));

    // onShiftSince = 0, now = 8h  →  8 game-hours × 12 = 96
    await EmploymentApi.settleShiftWage(biz, MARA, shift(0));

    expect(await balanceOf(MARA)).toBe(96);
    const acct = await BankingApi.primaryAccountIdOf(biz.getAccountPath());
    const pnl = await BankingApi.profitAndLoss(acct!);
    expect(pnl.lines.wages).toBe(-96);
  });

  it('pays the partial for an early clock-out', async () => {
    const biz = seedBusiness();
    const mara = makeStuffAtPath(() => new Person(), MARA);
    await asOwner(mara, () => BankingApi.openAccount(BANK, ''));

    // onShiftSince = 5h, now = 8h  →  3 game-hours × 12 = 36
    await EmploymentApi.settleShiftWage(biz, MARA, shift(5 * HOUR));
    expect(await balanceOf(MARA)).toBe(36);
  });

  it('pays a proprietor-held cover nothing (no self-wage)', async () => {
    const biz = seedBusiness();
    const dave = makeStuffAtPath(() => new Person(), DAVE);
    await asOwner(dave, () => BankingApi.openAccount(BANK, ''));

    await EmploymentApi.settleShiftWage(biz, DAVE, shift(0));
    expect(await balanceOf(DAVE)).toBe(0);
  });

  it('pays nothing for a zero-length (paused-clock) shift', async () => {
    const biz = seedBusiness();
    const mara = makeStuffAtPath(() => new Person(), MARA);
    await asOwner(mara, () => BankingApi.openAccount(BANK, ''));

    // onShiftSince == now → zero hours
    await EmploymentApi.settleShiftWage(biz, MARA, shift(8 * HOUR));
    expect(await balanceOf(MARA)).toBe(0);
  });
});
