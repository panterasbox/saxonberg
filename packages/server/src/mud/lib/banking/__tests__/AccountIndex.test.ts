/**
 * ⭐ Which accounts a person holds is answered from the warmed index
 * (db-performance H2): every account row is written through
 * `AccountBalance.save`, which keeps the index's copy of the row current,
 * so the owner → accounts read pays no round trip once the index is warm.
 * The answer must not move: the same accounts, the same primary, a new
 * account visible to the very next read.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BankingApi } from '../../../api/banking';
import { PersistApi } from '../../../api/persist';
import AccountBalance from '../AccountBalance';
import { installBankingHarness, teardownBankingHarness } from './banking-test-harness';

const P = '/platform/agent/Avatar/payee';
const CUR = (): string => BankingApi.compactCurrency();

async function open(owner: string, bank: string, primary: boolean): Promise<string> {
  const row = new AccountBalance();
  row.accountId = `${owner}#${bank}`;
  row.owner = owner;
  row.bank = bank;
  row.isPrimary = primary;
  row.balance = 0;
  row.currency = CUR();
  await row.save();
  return row.accountId;
}

describe('the owner → accounts read answers from the warmed index', () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  it('the same accounts, primary first, as the database answers — and no read once warm', async () => {
    await open(P, 'goodkin', false);
    await open(P, 'central-bank', true);
    await open('/someone/else', 'goodkin', true);
    // Cold: the database answers.
    const cold = await BankingApi.accountIdsOf(P);
    await AccountBalance.warm();
    const find = vi.spyOn(PersistApi, 'find');
    const warm = await BankingApi.accountIdsOf(P);
    expect(warm).toEqual(cold);
    expect(warm[0]).toBe(`${P}#central-bank`);
    expect(await BankingApi.primaryAccountIdOf(P)).toBe(`${P}#central-bank`);
    expect(find.mock.calls.filter(([c]) => c === 'bank_accounts')).toHaveLength(0);
  });

  it('an account opened after the warm is visible to the next read; a changed primary too', async () => {
    await open(P, 'goodkin', true);
    await AccountBalance.warm();
    const id = await open(P, 'central-bank', false);
    expect(await BankingApi.accountIdsOf(P)).toContain(id);
    // Re-designate: the row is saved, and the read follows.
    const [rows] = [await AccountBalance.find<AccountBalance>({ owner: P })];
    for (const r of rows) {
      r.isPrimary = r.accountId === id;
      await r.save();
    }
    expect(await BankingApi.primaryAccountIdOf(P)).toBe(id);
  });

  it('a saved row never pushes a stale balance over the posted one', async () => {
    const id = await open(P, 'goodkin', true);
    await AccountBalance.warm();
    const stale = (await AccountBalance.find<AccountBalance>({ accountId: id }))[0]!;
    AccountBalance.putCached(id, 500, CUR());
    stale.isActive = false;
    await stale.save();
    expect(AccountBalance.cached().get(id)?.balance).toBe(500);
  });
});
