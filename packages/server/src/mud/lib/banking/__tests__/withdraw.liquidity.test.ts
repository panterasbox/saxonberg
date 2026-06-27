/**
 * Withdrawal is bounded by the branch's physical till (AC#13): a branch can
 * run low on coin even when the account is solvent — a diegetic limit, not an
 * arbitrary gate. The till binds precisely when a balance was credited
 * without backing cash (a central-bank mint to the account, no vault coin).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import BankCounter from "../BankCounter";
import Coin from "../../../obj/Coin";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { ContainmentApi } from "../../../api/containment";
import { ExecutionContextApi } from "../../../api/execution-context";
import { Quantity } from "../../quantity";
import type { Stuff } from "../../stuff/Stuff";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

class TestAvatar extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestAvatar";
}

const BANK_PATH = "/domain/test/bank";
const ALICE = "/obj/Avatar/alice";

function makeBank(): InstanceType<typeof BankCounter> {
  return makeStuffAtPath(() => {
    const b = new BankCounter();
    b.setCorpoKey("goodkin");
    return b;
  }, BANK_PATH);
}

async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "banking.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

describe("Withdraw — till-liquidity bound (AC#13)", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
  });
  afterEach(() => teardownBankingHarness());

  it("refuses a withdrawal the branch can't cover in cash, even when solvent", async () => {
    const bank = makeBank();
    const alice = makeStuffAtPath(() => new TestAvatar(), ALICE);

    const accountId = await asOwner(alice, () =>
      BankingApi.openAccount(bank.getBankPath(), bank.getCorpoKey())
    );
    // Credit the balance WITHOUT backing cash (a CB mint to the account) —
    // the account is solvent, but the till holds no coin.
    await BankingApi.mint(accountId, Money.of(1000));
    expect(BankingApi.balanceOf(accountId).minor).toBe(1000);
    expect(bank.getTillLiquidity().minor).toBe(0);

    await expect(
      asOwner(alice, () => BankingApi.withdraw(bank, Money.of(100)))
    ).rejects.toThrow(/till low/);
    // balance untouched by the refused withdrawal
    expect(BankingApi.balanceOf(accountId).minor).toBe(1000);
  });

  it("honors a withdrawal up to the till, refuses beyond it", async () => {
    const bank = makeBank();
    const alice = makeStuffAtPath(() => new TestAvatar(), ALICE);

    const accountId = await asOwner(alice, () =>
      BankingApi.openAccount(bank.getBankPath(), bank.getCorpoKey())
    );
    // Float the branch with 50 physical coins (the till) ...
    const float = makeStuffAtPath(() => new Coin(), "/obj/Coin");
    float.setMass(Quantity.of(0.01, "kg"));
    float.setQuantity(50);
    ContainmentApi.move(float, bank as never);
    // ... and credit a larger balance with no further cash.
    await BankingApi.mint(accountId, Money.of(1000));

    expect(bank.getTillLiquidity().minor).toBe(50);
    // 50 is coverable; 51 is not (till bound, not balance).
    await asOwner(alice, () => BankingApi.withdraw(bank, Money.of(50)));
    expect(bank.getTillLiquidity().minor).toBe(0);
    expect(BankingApi.balanceOf(accountId).minor).toBe(950);

    await expect(
      asOwner(alice, () => BankingApi.withdraw(bank, Money.of(1)))
    ).rejects.toThrow(/till low/);
  });
});
