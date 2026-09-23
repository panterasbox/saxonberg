/**
 * The credit ladder (economic bootstrap W5, D1/D12/D13/D19): a loan is a
 * `contracts` row a chartered bank funds by an `advance` leg and, at rung
 * 1, presents at the window for `(1 − h) × principal`; the gates count
 * ledger events and a refusal names the number; repayment is a share of
 * each inflow taken as a rider split at `settle`, interest before
 * principal, the window repaid pro rata; accrual is stamp-forward; default
 * is revealed on read at the horizon and never before, and the creditor's
 * rule repossesses only the borrower's goods off the pledged counter.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BankingApi, Money } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import { ContractApi } from "../../../api/contract";
import { EmploymentApi } from "../../../api/employment";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../config/AppSettings";
import { WorldClockApi } from "../../../api/worldclock";
import { ExecutionContextApi } from "../../../api/execution-context";
import { ContainmentApi } from "../../../api/containment";
import { Quantity } from "../../quantity";
import { Idea } from "../../stuff/Idea";
import BusinessEntity from "../../../platform/idea/Business";
import BankCounter from "../../../platform/thing/BankCounter";
import StockBase from "../../retail/Stock";
import Crate from "../../../platform/thing/Crate";
import PaymentCard from "../../../platform/thing/PaymentCard";
import { ContainerMixin } from "../../spatial/Container";
import ChattelRegistry from "../../../platform/idea/ChattelRegistry";
import { ChattelApi } from "../../../api/chattel";
import type { Stuff } from "../../stuff/Stuff";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../banking/__tests__/banking-test-harness";
// The counter mechanism is kernel substrate; the instanceable twin is
// the shopkeeping pack's, which the kernel may not import. A local
// fixture over the base is the whole of what these tests need.
class Stock extends StockBase {}

const SHOP = "/test/credit/shop/idea/outfit";
const SHOP_COUNTER = "/test/credit/shop/thing/counter";
const BANK = "/test/credit/bank/idea/business";
const BANK_COUNTER = "/test/credit/bank/thing/counter";
const PATRON = "/platform/agent/Avatar/patron";
const GAME_YEAR_S = 360 * 86_400;
const GAME_DAY_S = 86_400;

class Hands extends ContainerMixin(Idea) {
  static _mixinName = "Hands";
}

const zm = (n: number) => Money.of(n, BankingApi.compactCurrency());
let gameNow = 100_000;

function advanceClock(seconds: number): void {
  gameNow += seconds;
}

async function as<T>(who: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "credit.test", () => {
    ExecutionContextApi.tagActingAuthor(who);
    return fn();
  });
}

function withRows(rows: Record<string, string>): void {
  const current = AppApi.setting.bind(AppApi);
  vi.spyOn(AppApi, "setting").mockImplementation((k: string) => rows[k] ?? current(k));
}

let shop: BusinessEntity;
let bank: BusinessEntity;
let shopCounter: Stock;
let bankCounter: BankCounter;
let shopAccount: string;
let bankAccount: string;

async function standUp(): Promise<void> {
  shop = makeStuffAtPath(() => {
    const b = new BusinessEntity();
    b.banksAt = "goodkin";
    b.operatingLocations = [SHOP_COUNTER];
    b.positions = [{ key: "keeper", label: "keeping", wageRate: 0, confers: [] }];
    return b;
  }, SHOP);
  bank = makeStuffAtPath(() => {
    const b = new BusinessEntity();
    b.banksAt = "goodkin";
    b.operatingLocations = [BANK_COUNTER];
    b.setCharter(["bank"]);
    return b;
  }, BANK);
  shopCounter = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [];
    return s;
  }, SHOP_COUNTER);
  bankCounter = makeStuffAtPath(() => {
    const c = new BankCounter();
    c.setCorpoKey("goodkin");
    c.terms = { loanRatePerGameYear: 0.05, repaymentShare: 0.25 };
    return c;
  }, BANK_COUNTER);
  EmploymentApi.noteEmployments(shop as never);
  shopAccount = await EmploymentApi.operatingAccountOf(shop);
  bankAccount = await EmploymentApi.operatingAccountOf(bank);
}

/** A person with a card on `accountId` — the shape a keeper paying as the house takes. */
function cardHolder(path: string, accountId: string): Hands {
  const who = makeStuffAtPath(() => new Hands(), path);
  const card = makeStuffAtPath(() => new PaymentCard(), `${path}/card`);
  const pay = card.ensureCredential("payment");
  pay.linkAccount(accountId);
  pay.setActiveAccount(accountId);
  ContainmentApi.move(card as never, who as never);
  return who;
}

/** Give the shop `n` completed supplier terms on its ledger (the rung-1 gate's read). */
async function completeTerms(n: number): Promise<void> {
  await BankingApi.mint(shopAccount, zm(n * 3), "harness");
  const keeper = cardHolder("/test/credit/keeper", shopAccount);
  for (let i = 0; i < n; i++) {
    // A `payment` leg of category `terms` out of the shop — what `buy` of a
    // terms good posts (W7); posted here through settle as the keeper.
    const charge: Charge = {
      amount: zm(3),
      reason: "terms",
      presented: true,
      payeeAccountId: "acct-supplier",
      category: "terms",
    };
    await as(keeper, () => BankingApi.settle(charge, { kind: "credential" }));
  }
}

describe("the credit ladder", () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    installBankingHarness();
    gameNow = 100_000;
    vi.spyOn(WorldClockApi, "getNow").mockImplementation(() => Quantity.of(gameNow, "s"));
    withRows({
      [AppSettingKeys.reserveLadderTermsRequired]: "2",
      [AppSettingKeys.reserveLadderLoansRequired]: "1",
      [AppSettingKeys.reserveLadderWorkingCapitalCap]: "500",
      [AppSettingKeys.reserveHaircut]: "0.2",
      [AppSettingKeys.reserveRepaymentShareMin]: "0.1",
      [AppSettingKeys.reserveRepaymentShareMax]: "0.5",
      [AppSettingKeys.reserveDefaultHorizonGameDays]: "30",
    });
    await standUp();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    ChattelApi._resetRegistryRefForReload();
    teardownBankingHarness();
  });

  it("⭐ the rung-1 gate is a NUMBER of ledger events, and the refusal names it", async () => {
    await BankingApi.mint(bankAccount, zm(1000), "harness");
    const refused = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 100, rung: 1 });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.reason).toBe("ladder-gate");
      expect(refused.detail).toMatch(/two completed supplier terms are required; you have zero/);
    }
    await completeTerms(2);
    const granted = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 100, rung: 1 });
    expect(granted.ok).toBe(true);
  });

  it("⭐ rung 1: the bank advances, the window refills (1 − h) × principal, the lien is on the counter; supply grew by the window only", async () => {
    await BankingApi.mint(bankAccount, zm(50), "harness");
    await completeTerms(2);
    const supply0 = BankingApi.moneySupply(BankingApi.compactCurrency()).minor;
    const shop0 = BankingApi.balanceOf(shopAccount).minor;
    const granted = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 100, rung: 1 });
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;
    expect(BankingApi.balanceOf(shopAccount).minor).toBe(shop0 + 100);
    // The bank held 50, was advanced 80 by the window, lent 100: holds 30.
    expect(BankingApi.balanceOf(bankAccount).minor).toBe(30);
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(supply0 + 80);
    const row = await ContractApi.contractById(granted.contractId);
    expect(row?.kind).toBe("loan");
    expect(row?.terms?.security).toEqual({ kind: "inventory", counterPath: SHOP_COUNTER });
    expect(row?.terms?.windowAdvanceMinor).toBe(80);
    expect(row?.terms?.share).toBe(0.25);
    const events = await ContractApi.eventsFor(granted.contractId);
    expect(events.map((e) => e.event)).toEqual(["advanced"]);
    expect(events[0]?.txId).not.toBe("");
    const d = await BankingApi.reserveDashboard(BankingApi.compactCurrency());
    expect(d.windowOutstanding).toBe(80);
    // The bank cannot fund a second one below the haircut share.
    const short = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 1000, rung: 1 });
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.reason).toBe("lender-short");
  });

  it("an unchartered lender and a counter with no rate refuse", async () => {
    await completeTerms(2);
    bank.setCharter([]);
    const un = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 10, rung: 1 });
    expect(un.ok).toBe(false);
    if (!un.ok) expect(un.reason).toBe("not-chartered");
    bank.setCharter(["bank"]);
    bankCounter.terms = {};
    const norate = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 10, rung: 1 });
    expect(norate.ok).toBe(false);
    if (!norate.ok) expect(norate.reason).toBe("no-lending-terms");
  });

  it("⭐ repayment is a share of each inflow, one conserving transaction; the window repays pro rata; the row settles at zero and the lien releases", async () => {
    await BankingApi.mint(bankAccount, zm(50), "harness");
    await completeTerms(2);
    const granted = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 100, rung: 1 });
    if (!granted.ok) throw new Error("not granted");
    const id = granted.contractId;
    // A patron buys from the shop for 200 on a card.
    const patronAcct = await BankingApi.ensureVenueAccount(PATRON, BankingApi.defaultCustodianBank(), "", BankingApi.compactCurrency());
    await BankingApi.mint(patronAcct, zm(1000), "harness");
    const patron = cardHolder(PATRON, patronAcct);
    const shop0 = BankingApi.balanceOf(shopAccount).minor;
    const bank0 = BankingApi.balanceOf(bankAccount).minor;
    const supply0 = BankingApi.moneySupply(BankingApi.compactCurrency()).minor;
    const sale: Charge = { amount: zm(200), reason: "a sale", presented: true, payeeAccountId: shopAccount, category: "sales" };
    await as(patron, () => BankingApi.settle(sale, { kind: "credential" }));
    // A quarter of 200 = 50 went to the bank; the shop kept 150.
    expect(BankingApi.balanceOf(shopAccount).minor).toBe(shop0 + 150);
    // The bank received 50 and repaid the window pro rata: 50/100 of 80 = 40 drained.
    expect(BankingApi.balanceOf(bankAccount).minor).toBe(bank0 + 50 - 40);
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(supply0 - 40);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
    let row = await ContractApi.contractById(id);
    expect(row?.owedMinor).toBe(50);
    expect(row?.state).toBe("open");
    const legs = await BankingApi.entriesFor(bankAccount);
    expect(legs.some((l) => l.kind === "payment" && l.category === "repayment" && l.amount === 50)).toBe(true);
    // A second sale clears it; the window is fully repaid; the lien releases.
    await as(patron, () => BankingApi.settle({ ...sale, reason: "another" }, { kind: "credential" }));
    row = await ContractApi.contractById(id);
    expect(row?.owedMinor).toBe(0);
    expect(row?.state).toBe("settled");
    const events = (await ContractApi.eventsFor(id)).map((e) => e.event);
    expect(events).toEqual(["advanced", "repaid", "repaid", "settled"]);
    const d = await BankingApi.reserveDashboard(BankingApi.compactCurrency());
    expect(d.windowOutstanding).toBe(0);
    // A third sale takes no share: nothing is owed.
    const shop2 = BankingApi.balanceOf(shopAccount).minor;
    await as(patron, () => BankingApi.settle({ ...sale, reason: "free" }, { kind: "credential" }));
    expect(BankingApi.balanceOf(shopAccount).minor).toBe(shop2 + 200);
  });

  it("⭐ accrual is stamp-forward: 100 at five per cent over 0, ½, 1 and 2 game-years", async () => {
    await BankingApi.mint(bankAccount, zm(50), "harness");
    await completeTerms(2);
    const granted = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 100, rung: 1 });
    if (!granted.ok) throw new Error("not granted");
    const owed = async () => (await ContractApi.instrumentsOf(SHOP)).find((l) => l.role === "owes")!.owedMinor;
    expect(await owed()).toBe(100);
    advanceClock(GAME_YEAR_S / 2);
    expect(await owed()).toBe(102); // 100 × 1.05^0.5 = 102.47 → 102
    advanceClock(GAME_YEAR_S / 2);
    expect(await owed()).toBe(105);
    advanceClock(GAME_YEAR_S);
    expect(await owed()).toBe(110); // 105 × 1.05 = 110.25 → 110
  });

  it("⭐ default is REVEALED at the horizon and never before; the lender takes only the borrower's goods off the pledged counter; the rate reads it", async () => {
    await BankingApi.mint(bankAccount, zm(50), "harness");
    await completeTerms(2);
    const granted = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 100, rung: 1 });
    if (!granted.ok) throw new Error("not granted");
    // A mark needs the registry that keeps the chain of title.
    await makeStuffAtPath(() => new ChattelRegistry(), "/platform/idea/ChattelRegistry").postRegister();
    // Two crates on the pledged counter: one the shop's, one a stranger's.
    const mine = makeStuffAtPath(() => new Crate(), "/test/credit/crate-mine");
    const theirs = makeStuffAtPath(() => new Crate(), "/test/credit/crate-theirs");
    const stranger = makeStuffAtPath(() => new Hands(), "/platform/agent/Avatar/stranger");
    ContainmentApi.move(mine as never, shopCounter as never);
    ContainmentApi.move(theirs as never, shopCounter as never);
    await mine.stampChattel(shop as never);
    await theirs.stampChattel(stranger as never);
    // Before the horizon: nothing.
    advanceClock(29 * GAME_DAY_S);
    expect(await ContractApi.reconcileLoans(SHOP)).toBe(0);
    expect((await ContractApi.contractById(granted.contractId))?.state).toBe("open");
    // Past it, with no inflow since the advance: default.
    advanceClock(2 * GAME_DAY_S);
    expect(await ContractApi.reconcileLoans(SHOP)).toBe(1);
    const row = await ContractApi.contractById(granted.contractId);
    expect(row?.state).toBe("breached");
    const events = (await ContractApi.eventsFor(granted.contractId)).map((e) => e.event);
    expect(events).toEqual(["advanced", "defaulted", "repossessed"]);
    // The shop's crate went to the bank's counter; the stranger's stayed.
    expect(bankCounter.getContents()).toContain(mine);
    expect(shopCounter.getContents()).toContain(theirs);
    expect(await mine.chattelOwner()).toEqual({ kind: "organization", templatePath: BANK });
    const rate = await ContractApi.windowDefaultRate(BankingApi.compactCurrency());
    expect(rate.advanced).toBe(80);
    expect(rate.defaulted).toBe(80);
    expect(rate.rate).toBe(1);
    // …and the borrower is barred from the ladder while it stands.
    await BankingApi.mint(bankAccount, zm(500), "harness");
    const again = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 10, rung: 1 });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.detail).toMatch(/defaulted loan/);
  });

  it("⭐⭐ the default is CURED by trading: the claim survives the breach, the bar lifts when the lender is whole, and the record keeps the default", async () => {
    await BankingApi.mint(bankAccount, zm(50), "harness");
    await completeTerms(2);
    const granted = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 100, rung: 1 });
    if (!granted.ok) throw new Error("not granted");
    // Nothing on the counter to take, so the security covers none of it:
    // the whole debt survives the default as a shortfall.
    advanceClock(31 * GAME_DAY_S);
    expect(await ContractApi.reconcileLoans(SHOP)).toBe(1);
    const owedAtDefault = (await ContractApi.contractById(granted.contractId))?.owedMinor ?? 0;
    expect(owedAtDefault).toBeGreaterThan(0);
    await BankingApi.mint(bankAccount, zm(1000), "harness");
    expect((await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 10, rung: 1 })).ok).toBe(false);

    // ⚠ Interest STOPS at the breach — a shortfall that kept compounding
    // would outrun the borrower and the cure would be a cure in name only.
    advanceClock(400 * GAME_DAY_S);
    expect((await ContractApi.contractById(granted.contractId))?.owedMinor).toBe(owedAtDefault);

    // The shop keeps trading, and the creditor's share keeps coming out
    // of its inflows even though the row says `breached`.
    const patronAcct = await BankingApi.ensureVenueAccount(PATRON, BankingApi.defaultCustodianBank(), "", BankingApi.compactCurrency());
    await BankingApi.mint(patronAcct, zm(4000), "harness");
    const patron = cardHolder(PATRON, patronAcct);
    const sale = async (n: number): Promise<void> => {
      await as(patron, () =>
        BankingApi.settle(
          { amount: zm(n), reason: "a sale", presented: true, payeeAccountId: shopAccount, category: "sales" },
          { kind: "credential" },
        ),
      );
    };
    await sale(200);
    const part = await ContractApi.contractById(granted.contractId);
    expect(part?.owedMinor).toBeLessThan(owedAtDefault);
    expect(part?.state).toBe("breached"); // still in default, still barred
    expect((await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 10, rung: 1 })).ok).toBe(false);

    // Paid off: the bar lifts.
    for (let i = 0; i < 8 && ((await ContractApi.contractById(granted.contractId))?.owedMinor ?? 0) > 0; i += 1) {
      await sale(400);
    }
    const cured = await ContractApi.contractById(granted.contractId);
    expect(cured?.owedMinor).toBe(0);
    // ⭐ The row is NOT `settled`: the default happened and says so for
    // good. What changed is that nothing is owed on it.
    expect(cured?.state).toBe("breached");
    expect((await ContractApi.eventsFor(granted.contractId)).map((e) => e.event)).toContain("satisfied");
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
    // ⭐⭐ And the window's loss falls with it — the reserve got its money
    // back, so the dial that feeds policy stops reporting a live loss.
    expect((await ContractApi.windowDefaultRate(BankingApi.compactCurrency())).defaulted).toBe(0);
    await completeTerms(3);
    const again = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 10, rung: 1 });
    expect(again.ok).toBe(true);
  });

  it("rung 2 needs M repaid inventory loans, lends from the bank's own balance, and is capped", async () => {
    await BankingApi.mint(bankAccount, zm(1000), "harness");
    await completeTerms(2);
    const r2 = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 100, rung: 2 });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.detail).toMatch(/one repaid inventory loans? (is|are) required; you have zero/);
    // Repay one rung-1 loan by a sale.
    const r1 = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 40, rung: 1 });
    if (!r1.ok) throw new Error("not granted");
    const patronAcct = await BankingApi.ensureVenueAccount(PATRON, BankingApi.defaultCustodianBank(), "", BankingApi.compactCurrency());
    await BankingApi.mint(patronAcct, zm(1000), "harness");
    const patron = cardHolder(PATRON, patronAcct);
    await as(patron, () => BankingApi.settle({ amount: zm(200), reason: "s", presented: true, payeeAccountId: shopAccount, category: "sales" }, { kind: "credential" }));
    expect((await ContractApi.contractById(r1.contractId))?.state).toBe("settled");
    const supply0 = BankingApi.moneySupply(BankingApi.compactCurrency()).minor;
    const ok = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 300, rung: 2 });
    expect(ok.ok).toBe(true);
    // From the bank's own balance: supply unchanged, no window.
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(supply0);
    if (ok.ok) expect((await ContractApi.contractById(ok.contractId))?.terms?.windowAdvanceMinor).toBe(0);
    const over = await ContractApi.issueLoan({ borrower: shop as never, counter: bankCounter, principalMinor: 300, rung: 2 });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.detail).toMatch(/capped/);
  });
});
