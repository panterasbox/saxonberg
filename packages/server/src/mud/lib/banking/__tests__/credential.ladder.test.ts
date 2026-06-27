/**
 * The credential risk ladder + recourse. Covers:
 *   - a per-credential spend cap rejects an over-cap charge (AC#13 cap);
 *   - a card spends up to its cap until frozen; freeze revokes it WITHOUT
 *     touching the account balance; a reissued card works;
 *   - the implant is body-bound (hosted, not a carryable Thing).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BankingApi, Money } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import PaymentCard from "../PaymentCard";
import PaymentImplantUpdate from "../PaymentImplantUpdate";
import { MixinApi } from "../../../api/mixin";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { ExecutionContextApi } from "../../../api/execution-context";
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

const BANK_A = "/domain/test/bank-a";
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
    reason: "a purchase",
    presented: true,
    payeeAccountId: MERCHANT,
    category: "sales",
  };
}

/** alice carrying a capped card over a funded account. Returns the card + id. */
async function pocket(
  cap: number,
  funds: number
): Promise<{ alice: TestAvatar; card: PaymentCard; accountId: string }> {
  const alice = avatar("/obj/Avatar/alice");
  const card = makeStuffAtPath(() => new PaymentCard(), "/obj/PaymentCard");
  ContainmentApi.move(card, alice as never);
  const accountId = await asOwner(alice, () =>
    BankingApi.openAccount(BANK_A, "goodkin")
  ); // auto-links + active on the carried card
  await BankingApi.mint(accountId, Money.of(funds));
  card.setSpendCap(cap);
  return { alice, card, accountId };
}

describe("Credential risk ladder", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("spends within the cap, rejects over the cap", async () => {
    const { alice, accountId } = await pocket(100, 1000);

    await asOwner(alice, () =>
      BankingApi.settle(charge(50), { kind: "credential" })
    );
    expect(BankingApi.balanceOf(accountId).minor).toBe(950);

    await expect(
      asOwner(alice, () => BankingApi.settle(charge(150), { kind: "credential" }))
    ).rejects.toThrow(/cap|declined/);
    expect(BankingApi.balanceOf(accountId).minor).toBe(950); // unchanged
  });

  it("freeze revokes the card without touching the balance; reissue works", async () => {
    const { alice, card, accountId } = await pocket(1000, 1000);

    await asOwner(alice, () =>
      BankingApi.settle(charge(100), { kind: "credential" })
    );
    expect(BankingApi.balanceOf(accountId).minor).toBe(900);

    // report-lost → frozen; the account/balance are untouched
    BankingApi.freezeCredential(card);
    expect(card.isFrozen()).toBe(true);
    expect(BankingApi.balanceOf(accountId).minor).toBe(900);

    // a frozen card can no longer spend (no usable credential reachable)
    await expect(
      asOwner(alice, () => BankingApi.settle(charge(50), { kind: "credential" }))
    ).rejects.toThrow();
    expect(BankingApi.balanceOf(accountId).minor).toBe(900);

    // reissue a fresh card for the same account → spends again
    vi.spyOn(StuffApi, "clone").mockImplementation((async () => {
      return makeStuffAtPath(() => new PaymentCard(), "/obj/PaymentCard");
    }) as unknown as typeof StuffApi.clone);
    await asOwner(alice, () => BankingApi.issueCard(accountId, 1000));
    await asOwner(alice, () =>
      BankingApi.settle(charge(50), { kind: "credential" })
    );
    expect(BankingApi.balanceOf(accountId).minor).toBe(850);
  });

  it("the implant is body-bound (a hosted update, not a carryable Thing)", () => {
    const implant = makeStuffAtPath(
      () => new PaymentImplantUpdate(),
      "/lib/banking/PaymentImplantUpdate"
    );
    // A card is Containable (carryable / losable); the implant is not.
    const card = makeStuffAtPath(() => new PaymentCard(), "/obj/PaymentCard");
    expect(MixinApi.isContainable(card)).toBe(true);
    expect(MixinApi.isContainable(implant)).toBe(false);
    expect(MixinApi.isPaymentCredential(implant)).toBe(true);
  });
});
