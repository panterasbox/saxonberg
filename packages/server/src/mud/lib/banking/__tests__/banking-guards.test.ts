/**
 * The Phase-5 banking additions:
 *   - Terms (the fee/minimum schedule) read at the verb;
 *   - a fee is a conserved leg → branch + a corpo royalty to the treasury;
 *   - the withdrawal quota (common-pool till guard, per-account, derive-on-read);
 *   - till security (vault coin leaves only through the banking verbs).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Currency, BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import { Terms } from "../Terms";
import BankCounter from "../../../obj/BankCounter";
import Coin from "../../../obj/Coin";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../config/AppSettings";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { ExecutionContextApi } from "../../../api/execution-context";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import type { Container } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { PropertiedMixin } from "../../stuff/Propertied";
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

// Propertied (like a real Creature/Avatar) so Circle membership can ride a
// `<corpoKey>.circle` saved prop; a container so it can hold coin.
class TestAvatar extends ContainerMixin(ContainableMixin(PropertiedMixin(Idea))) {
  static _mixinName = "TestAvatar";
}

const BANK_PATH = "/world/test/goodkin-bank";
const ALICE = "/obj/Avatar/alice";

function makeBank(terms?: Record<string, number>): InstanceType<typeof BankCounter> {
  return makeStuffAtPath(() => {
    const b = new BankCounter();
    b.setCorpoKey("goodkin");
    if (terms) b.terms = terms;
    return b;
  }, BANK_PATH);
}

function makeAvatar(path: string): TestAvatar {
  return makeStuffAtPath(() => new TestAvatar(), path);
}

function makeCoinsIn(holder: Stuff, qty: number): Coin {
  const c = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, "/obj/Coin");
  // Raw fixture state: `setQuantity` on a Coin is gated (only the glob
  // mechanics and the cash faucet may resize a money stack), so a test
  // building a starting stack writes the field, it does not mint.
  c.quantity = qty;
  ContainmentApi.move(c, holder as never);
  return c;
}

async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "banking.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

/** AppSettings aren't warmed in the unit harness — stub the dials we read. */
function stubSettings(values: Partial<Record<string, string>>): void {
  vi.spyOn(AppApi, "setting").mockImplementation(
    (k: string) => values[k] ?? "",
  );
}

/** A partial withdraw splits a vault stack (clones /obj/Coin) — stub the clone. */
function stubCoinClone(): void {
  vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
    return makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, path);
  }) as unknown as typeof StuffApi.clone);
}

describe("Terms — the fee schedule value-object", () => {
  it("defaults every fee to zero (the fee-free baseline)", () => {
    const t = Terms.free();
    expect(t.isFeeFree()).toBe(true);
    expect(t.getTransactionFee()).toBe(0);
    expect(t.describe()).toMatch(/free/i);
  });

  it("reads authored fees and lists only non-zero lines", () => {
    const t = Terms.fromData({ crossCorpoFee: 3, transactionFee: 0 });
    expect(t.isFeeFree()).toBe(false);
    expect(t.getCrossCorpoFee()).toBe(3);
    expect(t.describe()).toMatch(/Cross-corpo/);
  });
});

describe("Till security — vault coin leaves only via the banking verbs", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("vetoes a loose removal of vault coin, but withdraw dispenses it", async () => {
    const bank = makeBank();
    const alice = makeAvatar(ALICE);
    const coins = makeCoinsIn(alice, 100);
    await asOwner(alice, async () => {
      await BankingApi.openAccount(bank.getBank(), bank.getCorpoKey(), Currency.compact());
      await BankingApi.deposit(bank, coins);
    });
    // The vault now holds the coin. A loose grab is vetoed by till security.
    const vaultCoin = (bank as Stuff & Container).getContents().find(
      (s) => s instanceof Coin,
    ) as Coin;
    expect(vaultCoin).toBeTruthy();
    expect(() => ContainmentApi.move(vaultCoin as never, alice as never)).toThrow();
    // The coin stayed in the vault.
    expect(bank.getTillLiquidity().minor).toBe(100);
    // But the banking verb opens the disbursement window and dispenses it.
    await asOwner(alice, () => BankingApi.withdraw(bank, Money.of(100, Currency.compact())));
    expect(bank.getTillLiquidity().minor).toBe(0);
  });
});

describe("Withdrawal quota — the common-pool till guard", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("refuses an over-cap cash withdrawal (per-account, derive-on-read)", async () => {
    stubSettings({ [AppSettingKeys.bankingWithdrawalDailyCap]: "60" });
    stubCoinClone();
    const bank = makeBank();
    const alice = makeAvatar(ALICE);
    const coins = makeCoinsIn(alice, 100);
    const acct = await asOwner(alice, async () => {
      const id = await BankingApi.openAccount(bank.getBank(), bank.getCorpoKey(), Currency.compact());
      await BankingApi.deposit(bank, coins);
      return id;
    });
    // First 50 is under the 60 cap.
    await asOwner(alice, () => BankingApi.withdraw(bank, Money.of(50, Currency.compact())));
    expect(BankingApi.balanceOf(acct).minor).toBe(50);
    // A further 25 would breach the cap (50 already drawn + 25 > 60) → refused
    // (the quota derives the day's withdrawals over the ledger).
    await expect(
      asOwner(alice, () => BankingApi.withdraw(bank, Money.of(25, Currency.compact()))),
    ).rejects.toThrow(/limit/);
    // The balance is untouched by the refusal.
    expect(BankingApi.balanceOf(acct).minor).toBe(50);
  });

  it("a Circle member gets the raised cap", async () => {
    stubSettings({
      [AppSettingKeys.bankingWithdrawalDailyCap]: "60",
      [AppSettingKeys.bankingWithdrawalDailyCapCircle]: "500",
    });
    stubCoinClone();
    const bank = makeBank();
    const alice = makeAvatar(ALICE);
    const coins = makeCoinsIn(alice, 100);
    const acct = await asOwner(alice, async () => {
      const id = await BankingApi.openAccount(bank.getBank(), bank.getCorpoKey(), Currency.compact());
      await BankingApi.deposit(bank, coins);
      return id;
    });
    // Enrol Alice into the Circle (the real enrollment write) → raised cap.
    expect(await BankingApi.enrollCircle(ALICE, "goodkin")).toBe(true);
    // 90 would breach the stranger cap (60) but is under the Circle cap (500).
    await asOwner(alice, () => BankingApi.withdraw(bank, Money.of(90, Currency.compact())));
    expect(BankingApi.balanceOf(acct).minor).toBe(10);
  });
});

describe("Fees + corpo royalty — conserved, split to the treasury", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("a transaction fee splits a royalty to the corpo treasury (conserved)", async () => {
    stubSettings({ [AppSettingKeys.bankingCorpoRoyaltyRate]: "0.5" });
    const bank = makeBank({ transactionFee: 10 });
    const alice = makeAvatar(ALICE);
    const coins = makeCoinsIn(alice, 100);
    const acct = await asOwner(alice, async () => {
      const id = await BankingApi.openAccount(bank.getBank(), bank.getCorpoKey(), Currency.compact());
      await BankingApi.deposit(bank, coins); // credits 100, then a 10 fee
      return id;
    });
    // Customer paid the 10 fee out of the 100 deposited.
    expect(BankingApi.balanceOf(acct).minor).toBe(90);
    // 50% royalty → the Goodkin treasury; the rest → the branch account.
    const treasury = await BankingApi.ensureCorpoTreasury("goodkin", "goodkin", Currency.compact());
    const branch = await BankingApi.ensureVenueAccount(BANK_PATH, "goodkin", "goodkin", Currency.compact());
    expect(BankingApi.balanceOf(treasury).minor).toBe(5);
    expect(BankingApi.balanceOf(branch).minor).toBe(5);
    // The fee split conserves: customer −10, branch +5, treasury +5.
    expect(
      BankingApi.balanceOf(acct).minor +
        BankingApi.balanceOf(treasury).minor +
        BankingApi.balanceOf(branch).minor,
    ).toBe(100);
  });
});
