/**
 * ⭐ The ledger names PEOPLE and the ACT (tropes D1/D6): a leg between two
 * players carries both parties, what the payer held before, and the act it
 * was posted in.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BankingApi } from '../../../api/banking';
import { ExecutionContextApi, FrameKind } from '../../../api/execution-context';
import { Money } from '../Money';
import AccountBalance from '../AccountBalance';
import LedgerEntry from '../LedgerEntry';
import { Idea } from '../../stuff/Idea';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import { col, installBankingHarness, teardownBankingHarness } from './banking-test-harness';

const ADA = '/platform/agent/Avatar/ada';
const BO = '/platform/agent/Avatar/bo';
const CUR = (): string => BankingApi.compactCurrency();
class Person extends Idea {}

async function open(owner: string): Promise<string> {
  const row = new AccountBalance();
  row.accountId = `${owner}#central-bank`;
  row.owner = owner;
  row.bank = 'central-bank';
  row.isPrimary = true;
  row.balance = 0;
  row.currency = CUR();
  await row.save();
  return row.accountId;
}

describe('a ledger leg names its people and its act (tropes D1/D6)', () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  it('a transfer between two players carries both parties, heldBefore and the act', async () => {
    const a = await open(ADA);
    const b = await open(BO);
    await AccountBalance.warm();
    await BankingApi.mint(a, Money.of(400, CUR()), 'seed');
    const ada = makeStuffAtPath(() => new Person(), ADA, ADA);
    await ExecutionContextApi.runRoot(ada, 'pay', () =>
      ExecutionContextApi.run(null, ada, 'executeCommand', {
        kind: FrameKind.Command,
        metadata: { causingCommandId: 'cmd-pay', commandContext: { commandGiver: ada } },
      }, () => BankingApi.transfer(a, b, Money.of(100, CUR()), 'a gift')),
    { acting: { actor: ada } });
    const legs = [...col('bank_ledger').values()].filter((r) => r.kind === 'transfer');
    expect(legs).toHaveLength(1);
    const leg = legs[0]! as unknown as LedgerEntry;
    expect(leg.fromParty).toBe(ADA);
    expect(leg.toParty).toBe(BO);
    expect(leg.heldBefore).toBe(400);
    expect(leg.actId).toBe('cmd-pay');
    expect(leg.causeId).toBeNull();
  });

  it('a mint leg has no paying party', async () => {
    const a = await open(ADA);
    await AccountBalance.warm();
    await BankingApi.mint(a, Money.of(50, CUR()), 'seed');
    const leg = [...col('bank_ledger').values()].find((r) => r.kind === 'mint')!;
    expect(leg.fromParty).toBe('');
    expect(leg.toParty).toBe(ADA);
    expect(leg.heldBefore).toBe(0);
  });
});
