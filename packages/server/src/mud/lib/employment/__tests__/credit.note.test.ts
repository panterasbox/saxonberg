/**
 * The Arrival Note, the standing facility and the wage refusal (economic
 * bootstrap W6, D9/D10/D18): a member's note is a `note` row, coin in
 * hand disbursed from the treasury (never a mint) and a paper filed at
 * `/home/<key>/papers/arrival-note`; the first wage discharges it on the
 * row and the paper; a business's first account is funded by a 0% loan
 * from the treasury; a wage the house cannot cover is refused onto the
 * book with the worker as creditor, paid first next time; with a working-
 * capital line earned, the house draws and pays.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BankingApi, Money } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import { ContractApi } from "../../../api/contract";
import { EmploymentApi } from "../../../api/employment";
import { DocumentApi } from "../../../api/document";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../config/AppSettings";
import { PlayerApi } from "../../../api/player";
import { WorldClockApi } from "../../../api/worldclock";
import { ExecutionContextApi } from "../../../api/execution-context";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { Quantity } from "../../quantity";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import BusinessEntity from "../../../platform/idea/Business";
import BankCounter from "../../../platform/thing/BankCounter";
import StockBase from "../../retail/Stock";
import Coin from "../../../platform/thing/Coin";
import PaymentCard from "../../../platform/thing/PaymentCard";
import type { Stuff } from "../../stuff/Stuff";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
  col,
} from "../../banking/__tests__/banking-test-harness";
// The counter mechanism is kernel substrate; the instanceable twin is
// the shopkeeping pack's, which the kernel may not import. A local
// fixture over the base is the whole of what these tests need.
class Stock extends StockBase {}

const NEWCOMER = "/platform/agent/Avatar/newbie";
const SHOP = "/test/note/shop/idea/outfit";
const SHOP_COUNTER = "/test/note/shop/thing/counter";
const BANK = "/test/note/bank/idea/business";
const BANK_COUNTER = "/test/note/bank/thing/counter";
const GAME_DAY_S = 86_400;

class Hands extends ContainerMixin(Idea) {
  static _mixinName = "Hands";
}

const zm = (n: number) => Money.of(n, BankingApi.compactCurrency());
let gameNow = 100_000;

async function as<T>(who: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "credit.note.test", () => {
    ExecutionContextApi.tagActingAuthor(who);
    return fn();
  });
}

function withRows(rows: Record<string, string>): void {
  const current = AppApi.setting.bind(AppApi);
  vi.spyOn(AppApi, "setting").mockImplementation((k: string) => rows[k] ?? current(k));
}

function cardHolder(path: string, accountId: string): Hands {
  const who = makeStuffAtPath(() => new Hands(), path);
  const card = makeStuffAtPath(() => new PaymentCard(), `${path}/card`);
  const pay = card.ensureCredential("payment");
  pay.linkAccount(accountId);
  pay.setActiveAccount(accountId);
  ContainmentApi.move(card as never, who as never);
  return who;
}

let bankCounter: BankCounter;

function standUpBank(charter: boolean): BusinessEntity {
  const bank = makeStuffAtPath(() => {
    const b = new BusinessEntity();
    b.banksAt = "goodkin";
    b.operatingLocations = [BANK_COUNTER];
    if (charter) b.setCharter(["bank"]);
    return b;
  }, BANK);
  bankCounter = makeStuffAtPath(() => {
    const c = new BankCounter();
    c.setCorpoKey("goodkin");
    c.terms = { loanRatePerGameYear: 0.05, repaymentShare: 0.25 };
    return c;
  }, BANK_COUNTER);
  return bank;
}

function standUpShop(): BusinessEntity {
  const shop = makeStuffAtPath(() => {
    const b = new BusinessEntity();
    b.banksAt = "goodkin";
    b.operatingLocations = [SHOP_COUNTER];
    b.positions = [{ key: "keeper", label: "keeping", wageRate: 10 }];
    return b;
  }, SHOP);
  makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [];
    return s;
  }, SHOP_COUNTER);
  EmploymentApi.noteEmployments(shop as never);
  return shop;
}

describe("the Arrival Note and the standing facility", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
    gameNow = 100_000;
    vi.spyOn(WorldClockApi, "getNow").mockImplementation(() => Quantity.of(gameNow, "s"));
    vi.spyOn(PlayerApi, "activeMemberCount").mockResolvedValue(2);
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) =>
      makeStuffAtPath(() => {
        const coin = new Coin();
        coin.currency = "zorkmid";
        coin.denomination = 1;
        return coin;
      }, path)) as unknown as typeof StuffApi.clone);
    withRows({
      [AppSettingKeys.reserveMoneyPerActiveMember]: "1000",
      [AppSettingKeys.treasuryArrivalPrincipal]: "20",
      [AppSettingKeys.treasuryNoteDischargeGameDays]: "30",
      [AppSettingKeys.treasuryOpeningAdvance]: "500",
      [AppSettingKeys.reserveLadderLoansRequired]: "0",
      [AppSettingKeys.reserveLadderWorkingCapitalCap]: "500",
      [AppSettingKeys.reserveRepaymentShareMin]: "0.1",
      [AppSettingKeys.reserveRepaymentShareMax]: "0.5",
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("⭐ issueNote: a `note` row, twenty in hand from the treasury (no mint), a paper filed in the member's papers", async () => {
    const newbie = makeStuffAtPath(() => new Hands(), NEWCOMER);
    const supply0 = BankingApi.moneySupply(BankingApi.compactCurrency()).minor;
    const issued = await as(newbie, () => ContractApi.issueNote(NEWCOMER));
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.principal).toBe(20);
    expect(issued.paperPath).toBe("/home/newbie/papers/arrival-note");
    // Coin in hand — disbursed from the treasury: the perpetual bought 2000
    // (two members at 1000), the treasury then holds 1980; supply grew by
    // the perpetual ONLY, never by the note.
    const coin = newbie.getContents().filter((c) => c instanceof Coin);
    expect(coin.length).toBeGreaterThan(0);
    const treasury = await BankingApi.treasuryAccountId(BankingApi.compactCurrency());
    expect(BankingApi.balanceOf(treasury).minor).toBe(1980);
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(supply0 + 2000);
    // The row.
    const row = await ContractApi.contractById(issued.contractId);
    expect(row?.kind).toBe("note");
    expect(row?.issuer).toEqual({ kind: "player", templatePath: NEWCOMER });
    expect(row?.holder).toEqual({ kind: "organization", templatePath: "/compact/treasury" });
    expect(row?.terms?.ratePerGameYear).toBe(0);
    expect(row?.terms?.dischargeOnFirstWage).toBe(true);
    expect(row?.owedMinor).toBe(20);
    // The paper, in the member's own record store, in words with NO digits
    // in the face (the no-gauge rule), and no recourse.
    const paper = await DocumentApi.read("/home/newbie/papers/arrival-note");
    expect(paper?.kind).toBe("instrument");
    expect(paper?.owner).toBe("/home/newbie");
    const face = String((paper?.data as { face?: string }).face);
    expect(face).toMatch(/Arrival Note/);
    expect(face).toMatch(/Rate: none/);
    expect(face).toMatch(/Recourse: none beyond the security/);
    expect(face).toMatch(/No labor is ever owed/);
    // …and `wallet`'s line.
    const lines = await ContractApi.instrumentsOf(NEWCOMER);
    expect(lines.map((l) => l.words)).toEqual([
      "You hold an Arrival Note for twenty zorkmids, at no interest, to the Treasury.",
    ]);
    // Idempotent.
    const again = await as(newbie, () => ContractApi.issueNote(NEWCOMER));
    expect(again.ok).toBe(false);
  });

  it("⭐ the first wage discharges the note: the row settles, the paper says so, `wallet` no longer lists it", async () => {
    const newbie = makeStuffAtPath(() => new Hands(), NEWCOMER);
    const issued = await as(newbie, () => ContractApi.issueNote(NEWCOMER));
    if (!issued.ok) throw new Error("no note");
    const discharged = await ContractApi.onWageLanded(NEWCOMER);
    expect(discharged).toEqual([issued.contractId]);
    const row = await ContractApi.contractById(issued.contractId);
    expect(row?.state).toBe("settled");
    expect(row?.owedMinor).toBe(0);
    expect((await ContractApi.eventsFor(issued.contractId)).map((e) => e.event)).toEqual(["advanced", "discharged"]);
    const paper = await DocumentApi.read("/home/newbie/papers/arrival-note");
    expect(String((paper?.data as { history?: string[] }).history?.[0])).toMatch(/Discharged: the first wage was earned/);
    expect(await ContractApi.instrumentsOf(NEWCOMER)).toEqual([]);
    // A second wage discharges nothing.
    expect(await ContractApi.onWageLanded(NEWCOMER)).toEqual([]);
  });

  it("the lazy discharge: past the Schedule's game-days active, the note is forgiven on any read", async () => {
    const newbie = makeStuffAtPath(() => new Hands(), NEWCOMER);
    const issued = await as(newbie, () => ContractApi.issueNote(NEWCOMER));
    if (!issued.ok) throw new Error("no note");
    gameNow += 29 * GAME_DAY_S;
    expect((await ContractApi.instrumentsOf(NEWCOMER)).length).toBe(1);
    gameNow += 2 * GAME_DAY_S;
    expect(await ContractApi.instrumentsOf(NEWCOMER)).toEqual([]);
    expect((await ContractApi.contractById(issued.contractId))?.state).toBe("settled");
  });

  it("⭐ the standing facility: a business's first account is funded by a 0% loan from the treasury, once", async () => {
    standUpBank(true);
    const shop = standUpShop();
    const supply0 = BankingApi.moneySupply(BankingApi.compactCurrency()).minor;
    const account = await EmploymentApi.operatingAccountOf(shop);
    expect(BankingApi.balanceOf(account).minor).toBe(500);
    // Supply: the perpetual bought 2000; the advance moved 500 of it.
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(supply0 + 2000);
    const treasury = await BankingApi.treasuryAccountId(BankingApi.compactCurrency());
    expect(BankingApi.balanceOf(treasury).minor).toBe(1500);
    const rows = await BankingApi.entriesFor(account);
    expect(rows.find((r) => r.kind === "advance")?.category).toBe("advance");
    const lines = await ContractApi.instrumentsOf(SHOP);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.words).toMatch(/You owe the Treasury five hundred zorkmids at no interest \(the Treasury's opening advance\)/);
    // A second touch of the account advances nothing more.
    await EmploymentApi.operatingAccountOf(shop);
    expect(BankingApi.balanceOf(account).minor).toBe(500);
    // The treasury's book reads it.
    const paper = await ContractApi.treasuryPaper(BankingApi.compactCurrency());
    expect(paper.openingAdvancesOwed).toBe(500);
    // …and it repays like any loan: a sale takes the share.
    const patronAcct = await BankingApi.ensureVenueAccount("/platform/agent/Avatar/patron", BankingApi.defaultCustodianBank(), "", BankingApi.compactCurrency());
    await BankingApi.mint(patronAcct, zm(1000), "harness");
    const patron = cardHolder("/platform/agent/Avatar/patron", patronAcct);
    const sale: Charge = { amount: zm(100), reason: "a sale", presented: true, payeeAccountId: account, category: "sales" };
    await as(patron, () => BankingApi.settle(sale, { kind: "credential" }));
    // The reserve's minimum share (a tenth) came back to the treasury.
    expect(BankingApi.balanceOf(treasury).minor).toBe(1510);
    expect((await ContractApi.treasuryPaper(BankingApi.compactCurrency())).openingAdvancesOwed).toBe(490);
  });

  it("⭐ a wage the house cannot cover is REFUSED onto the book with the worker as creditor; the next settlement pays arrears first", async () => {
    standUpBank(true);
    withRows({ [AppSettingKeys.treasuryOpeningAdvance]: "0", [AppSettingKeys.reserveLadderLoansRequired]: "1" });
    const shop = standUpShop();
    const account = await EmploymentApi.operatingAccountOf(shop);
    await BankingApi.mint(account, zm(12), "harness");
    const workerKey = "/platform/agent/Avatar/mara";
    await BankingApi.ensureVenueAccount(workerKey, BankingApi.defaultCustodianBank(), "", BankingApi.compactCurrency());
    const refused = await EmploymentApi.payHouseWage(shop, workerKey, 20);
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.reason).toBe("insufficient-funds");
    expect(refused.detail).toMatch(/one repaid inventory loans? (is|are) required; you have zero/);
    expect(BankingApi.balanceOf(account).minor).toBe(12);
    expect(shop.getPayrollArrears()).toEqual([{ workerKey, amountMinor: 20, at: gameNow }]);
    // The house earns; the next wage pays the arrear FIRST.
    await BankingApi.mint(account, zm(40), "harness");
    const paid = await EmploymentApi.payHouseWage(shop, workerKey, 10);
    expect(paid.ok).toBe(true);
    if (paid.ok) expect(paid.paidMinor).toBe(30);
    expect(shop.getPayrollArrears()).toEqual([]);
    expect(BankingApi.balanceOf(account).minor).toBe(22);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).overdraft).toBe(0);
  });

  it("with a working-capital line earned, a short house DRAWS and pays", async () => {
    const bank = standUpBank(true);
    withRows({ [AppSettingKeys.treasuryOpeningAdvance]: "0", [AppSettingKeys.reserveLadderLoansRequired]: "0" });
    const shop = standUpShop();
    const account = await EmploymentApi.operatingAccountOf(shop);
    const bankAccount = await EmploymentApi.operatingAccountOf(bank);
    await BankingApi.mint(bankAccount, zm(1000), "harness");
    await BankingApi.mint(account, zm(5), "harness");
    const workerKey = "/platform/agent/Avatar/mara";
    await BankingApi.ensureVenueAccount(workerKey, BankingApi.defaultCustodianBank(), "", BankingApi.compactCurrency());
    const paid = await EmploymentApi.payHouseWage(shop, workerKey, 20);
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.drewMinor).toBe(15);
    expect(paid.paidMinor).toBe(20);
    expect(BankingApi.balanceOf(account).minor).toBe(0);
    const loans = (await ContractApi.instrumentsOf(SHOP)).filter((l) => l.role === "owes");
    expect(loans).toHaveLength(1);
    expect(loans[0]?.rung).toBe(2);
    expect(col("bank_ledger").size).toBeGreaterThan(0);
  });
});
