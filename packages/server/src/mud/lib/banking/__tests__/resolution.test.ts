/**
 * Account resolution by identity + multi-account + transfer. Covers:
 *   - AC#7: no account number is ever typed — the account resolves from who
 *     you are (context) plus the branch;
 *   - AC#8: a player holds independent accounts across banks; the first is
 *     primary (receive-by-identity), per-branch context selects the right one;
 *   - transfer is identity-addressed and only from your own account.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Currency, BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
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

const BANK_A = "/world/test/bank-a";
const BANK_B = "/world/test/bank-b";
const ALICE = "/platform/agent/Avatar/alice";
const BOB = "/platform/agent/Avatar/bob";

function avatar(path: string): TestAvatar {
  return makeStuffAtPath(() => new TestAvatar(), path);
}

async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "banking.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

describe("Account resolution (AC#7, AC#8)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("resolves your account by identity + branch — no number typed", async () => {
    const alice = avatar(ALICE);
    const id = await asOwner(alice, () =>
      BankingApi.openAccount(BANK_A, "goodkin", Currency.compact())
    );
    const resolved = await asOwner(alice, () => BankingApi.myAccountAt(BANK_A));
    expect(resolved).toBe(id);
    // a different identity has no account here
    const bob = avatar(BOB);
    expect(await asOwner(bob, () => BankingApi.myAccountAt(BANK_A))).toBeNull();
  });

  it("holds independent accounts across banks; first is primary", async () => {
    const alice = avatar(ALICE);
    const [idA, idB] = await asOwner(alice, async () => {
      const a = await BankingApi.openAccount(BANK_A, "goodkin", Currency.compact());
      const b = await BankingApi.openAccount(BANK_B, "vionne", Currency.compact());
      return [a, b];
    });
    expect(idA).not.toBe(idB);

    const all = await asOwner(alice, () => BankingApi.accountsOf());
    expect(all.map((a) => a.accountId).sort()).toEqual([idA, idB].sort());

    // per-branch context selects the right account
    expect(await asOwner(alice, () => BankingApi.myAccountAt(BANK_A))).toBe(idA);
    expect(await asOwner(alice, () => BankingApi.myAccountAt(BANK_B))).toBe(idB);

    // the first-opened is the receive-by-identity primary
    expect(await BankingApi.primaryAccountIdOf(ALICE)).toBe(idA);
  });

  it("opening again at the same bank is idempotent", async () => {
    const alice = avatar(ALICE);
    const first = await asOwner(alice, () =>
      BankingApi.openAccount(BANK_A, "goodkin", Currency.compact())
    );
    const again = await asOwner(alice, () =>
      BankingApi.openAccount(BANK_A, "goodkin", Currency.compact())
    );
    expect(again).toBe(first);
  });
});

describe("Transfer — identity-addressed, own-account only", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("transfers to a payee resolved by identity (their primary account)", async () => {
    const alice = avatar(ALICE);
    const bob = avatar(BOB);
    const aliceId = await asOwner(alice, () =>
      BankingApi.openAccount(BANK_A, "goodkin", Currency.compact())
    );
    const bobId = await asOwner(bob, () =>
      BankingApi.openAccount(BANK_B, "vionne", Currency.compact())
    );
    await BankingApi.mint(aliceId, Money.of(500, Currency.compact())); // fund alice

    const payeeAccount = await BankingApi.primaryAccountIdOf(BOB);
    expect(payeeAccount).toBe(bobId);

    await asOwner(alice, () =>
      BankingApi.transfer(aliceId, bobId, Money.of(200, Currency.compact()))
    );
    expect(BankingApi.balanceOf(aliceId).minor).toBe(300);
    expect(BankingApi.balanceOf(bobId).minor).toBe(200);
  });

  it("refuses to transfer from an account you don't own", async () => {
    const alice = avatar(ALICE);
    const bob = avatar(BOB);
    const aliceId = await asOwner(alice, () =>
      BankingApi.openAccount(BANK_A, "goodkin", Currency.compact())
    );
    const bobId = await asOwner(bob, () =>
      BankingApi.openAccount(BANK_B, "vionne", Currency.compact())
    );
    await BankingApi.mint(aliceId, Money.of(500, Currency.compact()));

    // bob tries to pull from alice's account → refused
    await expect(
      asOwner(bob, () => BankingApi.transfer(aliceId, bobId, Money.of(100, Currency.compact())))
    ).rejects.toThrow(/isn't your account/);
    expect(BankingApi.balanceOf(aliceId).minor).toBe(500);
  });
});
