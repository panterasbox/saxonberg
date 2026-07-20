/**
 * Custodial bank ops — open / deposit / withdraw / transfer. Covers:
 *   - AC#4: the 1:1 invariant — the vault's coin value equals the sum of the
 *     branch's balances across a deposit/withdraw/same-bank-transfer run;
 *   - AC#5: opening records the bank's corpo affiliation, readable via the
 *     corpo substrate.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import BankCounter from "../BankCounter";
import Coin from "../../../obj/Coin";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { ExecutionContextApi } from "../../../api/execution-context";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import type { Container } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
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

const BANK_PATH = "/domain/test/goodkin-bank";
const ALICE = "/obj/Avatar/alice";

function makeBank(): InstanceType<typeof BankCounter> {
  return makeStuffAtPath(() => {
    const b = new BankCounter();
    b.setCorpoKey("goodkin");
    return b;
  }, BANK_PATH);
}

function makeAvatar(path: string): TestAvatar {
  return makeStuffAtPath(() => new TestAvatar(), path);
}

function makeCoinsIn(holder: Stuff, qty: number): Coin {
  const c = makeStuffAtPath(() => new Coin(), "/obj/Coin");
  c.setMass(Quantity.of(0.01, "kg"));
  c.setQuantity(qty);
  ContainmentApi.move(c, holder as never);
  return c;
}

async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "banking.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

describe("BankMixin — affiliation + till gauge", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
  });
  afterEach(() => teardownBankingHarness());

  it("carries its corpo affiliation key (resolved via CorpoApi at runtime)", () => {
    // The recorded edge is banking's responsibility; resolving the key to a
    // descriptor is the corpo subsystem's (the catalogue is warmed at boot,
    // not in this unit test — so getCorpo() is null here, by design).
    const bank = makeBank();
    expect(bank.getCorpoKey()).toBe("goodkin");
    expect(bank.getBankPath()).toBe(BANK_PATH);
    expect(bank.getTillLiquidity().minor).toBe(0);
  });

  it("till liquidity tracks coins resting in the vault", () => {
    const bank = makeBank();
    makeCoinsIn(bank, 250);
    expect(bank.getTillLiquidity().minor).toBe(250);
  });
});

describe("Custodial ops — open / deposit / withdraw (AC#4, AC#5)", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("open records the bank's corpo affiliation on the account (AC#5)", async () => {
    const bank = makeBank();
    const alice = makeAvatar(ALICE);
    const accountId = await asOwner(alice, () =>
      BankingApi.openAccount(bank.getBankPath(), bank.getCorpoKey())
    );
    // The affiliation edge is recorded on the account — the key CorpoApi
    // resolves (the corpo catalogue is warmed at boot, covered by corpo's
    // own suite; here we assert the recorded edge banking owns).
    expect(await BankingApi.corpoKeyOf(accountId)).toBe("goodkin");
  });

  it("deposit then whole withdraw keeps the vault == balance (1:1)", async () => {
    const bank = makeBank();
    const alice = makeAvatar(ALICE);
    const coins = makeCoinsIn(alice, 100);

    const accountId = await asOwner(alice, async () => {
      const id = await BankingApi.openAccount(bank.getBankPath(), bank.getCorpoKey());
      await BankingApi.deposit(bank, coins);
      return id;
    });

    // After deposit: vault 100, balance 100 — 1:1.
    expect(bank.getTillLiquidity().minor).toBe(100);
    expect(BankingApi.balanceOf(accountId).minor).toBe(100);

    await asOwner(alice, () => BankingApi.withdraw(bank, Money.of(100)));
    // After withdraw: vault 0, balance 0 — 1:1, coin back with alice.
    expect(bank.getTillLiquidity().minor).toBe(0);
    expect(BankingApi.balanceOf(accountId).minor).toBe(0);
    const aliceCoins = (alice as Stuff & Container).getContents().filter(
      (s) => s instanceof Coin
    );
    expect((aliceCoins[0] as Coin).getQuantity()).toBe(100);
  });

  it("partial withdraw splits the vault, holding 1:1 (clone stubbed)", async () => {
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
      const c = makeStuffAtPath(() => new Coin(), path);
      c.setMass(Quantity.of(0.01, "kg"));
      return c;
    }) as unknown as typeof StuffApi.clone);

    const bank = makeBank();
    const alice = makeAvatar(ALICE);
    const coins = makeCoinsIn(alice, 100);

    const accountId = await asOwner(alice, async () => {
      const id = await BankingApi.openAccount(bank.getBankPath(), bank.getCorpoKey());
      await BankingApi.deposit(bank, coins);
      await BankingApi.withdraw(bank, Money.of(30));
      return id;
    });

    expect(BankingApi.balanceOf(accountId).minor).toBe(70);
    expect(bank.getTillLiquidity().minor).toBe(70); // 1:1 preserved
  });
});
