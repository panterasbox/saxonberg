/**
 * The implant wallet routing. Covers:
 *   - a single credential links all the owner's accounts and pays from the
 *     ACTIVE one by default;
 *   - switching the active account changes which account a default pay routes
 *     from;
 *   - `--from <bank>` (fromBankPath) overrides the route for one payment
 *     without disturbing the active setting.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BankingApi, Money } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import PaymentCard from "../../../obj/PaymentCard";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { ContainmentApi } from "../../../api/containment";
import { ExecutionContextApi } from "../../../api/execution-context";
import type { Stuff } from "../../stuff/Stuff";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

class TestAvatar extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestAvatar";
}

const BANK_A = "/domain/test/goodkin";
const BANK_B = "/domain/test/vionne";
const MERCHANT = "merchant-acct";

function avatar(path: string): TestAvatar {
  return makeStuffAtPath(() => new TestAvatar(), path);
}

async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "banking.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

function charge(amount: number): Charge {
  return {
    amount: Money.of(amount),
    reason: "purchase",
    presented: true,
    payeeAccountId: MERCHANT,
    category: "sales",
  };
}

describe("Wallet routing", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("links all accounts, pays from active, switches, and honors --from", async () => {
    const alice = avatar("/obj/Avatar/alice");
    const card = makeStuffAtPath(() => new PaymentCard(), "/obj/PaymentCard");
    ContainmentApi.move(card, alice as never);

    const acctA = await asOwner(alice, () =>
      BankingApi.openAccount(BANK_A, "goodkin")
    );
    const acctB = await asOwner(alice, () =>
      BankingApi.openAccount(BANK_B, "vionne")
    );
    await BankingApi.mint(acctA, Money.of(1000));
    await BankingApi.mint(acctB, Money.of(1000));

    // the one credential links both accounts; first opened is active
    const pay = card.getCredential("payment")!;
    expect(pay.getLinkedAccounts().has(acctA)).toBe(true);
    expect(pay.getLinkedAccounts().has(acctB)).toBe(true);
    expect(pay.getActiveAccount()).toBe(acctA);

    // default pay routes from the active account (A)
    let receipt = await asOwner(alice, () =>
      BankingApi.settle(charge(100), { kind: "credential" })
    );
    expect(receipt.accountId).toBe(acctA);
    expect(BankingApi.balanceOf(acctA).minor).toBe(900);
    expect(BankingApi.balanceOf(acctB).minor).toBe(1000);

    // switch active to B → default pay now routes from B
    pay.setActiveAccount(acctB);
    receipt = await asOwner(alice, () =>
      BankingApi.settle(charge(100), { kind: "credential" })
    );
    expect(receipt.accountId).toBe(acctB);
    expect(BankingApi.balanceOf(acctB).minor).toBe(900);

    // --from override routes ONE payment from A without disturbing active (B)
    receipt = await asOwner(alice, () =>
      BankingApi.settle(charge(50), { kind: "credential", fromBank: BANK_A })
    );
    expect(receipt.accountId).toBe(acctA);
    expect(BankingApi.balanceOf(acctA).minor).toBe(850);
    expect(pay.getActiveAccount()).toBe(acctB); // active unchanged
  });
});
