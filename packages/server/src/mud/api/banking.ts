/**
 * BankingApi — the gated surface for the monetary substrate: cash, accounts,
 * the append-only ledger, and the central-bank faucet/sink.
 *
 * **Append-only log → rebuildable materialized balance** (the `lib/standing/`
 * precedent — renown / participation / producer), with one hard addition:
 * **conservation**. Money is neither created nor destroyed except by the
 * central bank's logged mint/drain; every other posting is balanced. The
 * invariant is enforced at a single sealed chokepoint (`postTransaction`)
 * inside the logic singleton — the only code path that writes a
 * `LedgerEntry` or mutates an `AccountBalance`.
 *
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link BankingLogic} singleton at `/obj/api/banking`,
 * reached synchronously via `StuffApi.singletonSync`. `dest /obj/api/banking`
 * reloads it. The central-bank mint/drain/float ops are
 * operator/developer-gated at the *verb* layer (`AccessApi.isWizard`),
 * not here; this surface is the mechanism, the verbs are the policy.
 */

import { Money } from "../lib/banking/Money";
import type { Currency } from "../lib/banking/Money";
import { Account } from "../lib/banking/Account";
import type LedgerEntry from "../lib/banking/LedgerEntry";
import type {
  LedgerKind,
  PnlCategory,
  LedgerEntryFields,
  ProfitAndLoss,
  ReconcileResult,
} from "../lib/banking/LedgerEntry";
import type { Container } from "../lib/spatial/Container";
import type { LedgerLeg } from "../lib/banking/Transaction";
import type { Bank } from "../lib/banking/Bank";
import type { PaymentCredential } from "../lib/credential/Credential";
import type { CredentialWallet } from "../lib/credential/CredentialWallet";
import type {
  Charge,
  SettlementMethod,
  RemittanceSplit,
  SettlementReceipt,
} from "../lib/banking/Charge";
import type AccountBalance from "../lib/banking/AccountBalance";
import type { Stuff } from "../lib/stuff/Stuff";
import type { Globbable } from "../lib/stuff/Globbable";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { SecurityApi } from "./security";
import { BankingLogic } from "../obj/api/BankingLogic";
import { fileURLToPath } from "url";

export { Money, Account };
export type {
  Currency,
  LedgerKind,
  PnlCategory,
  LedgerEntryFields,
  ProfitAndLoss,
  ReconcileResult,
  LedgerLeg,
  Charge,
  SettlementMethod,
  RemittanceSplit,
  SettlementReceipt,
  PaymentCredential,
  CredentialWallet,
};

const LOGIC_PATH = "/obj/api/banking";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/BankingLogic", import.meta.url),
);

/** Resolve the HMR-able BankingLogic singleton (sync). */
function logic(): BankingLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new (
        (HotReloadApi.getCurrentExport(LOGIC_CLASS_FILE, "BankingLogic") as
          typeof BankingLogic | null) ?? BankingLogic
      )(),
  );
}

export class BankingApi {
  /**
   * Boot seam (idempotent). The warm caches are loaded separately by
   * `AccountBalance.warm()` / `SupplyAggregate.warm()` (awaited in
   * `AppBootstrap` before this). Activation = the singleton's presence.
   */
  public static boot(): void {
    logic().boot();
  }

  /**
   * Mint money into an account — the central-bank faucet. Supply grows by
   * `amount`; one logged `mint` row from the issuance sentinel to the
   * target. Developer-gated at the verb layer; the actor is the
   * context-derived author, never a parameter.
   */
  public static async mint(
    toAccountId: string,
    amount: Money,
    memo = "",
    category: PnlCategory = "float",
  ): Promise<void> {
    return logic().mint(toAccountId, amount, memo, category);
  }

  /**
   * Drain money out of an account — the central-bank sink. Supply shrinks
   * by `amount`; one logged `drain` row to the issuance sentinel. Throws if
   * the account holds less than `amount`.
   */
  public static async drain(
    fromAccountId: string,
    amount: Money,
    memo = "",
  ): Promise<void> {
    return logic().drain(fromAccountId, amount, memo);
  }

  /** Float liquidity into an account — convenience over {@link mint}. */
  public static async float(accountId: string, amount: Money): Promise<void> {
    return logic().float(accountId, amount);
  }

  /** The sync materialized balance of `accountId` (0 for an unknown id). */
  public static balanceOf(accountId: string): Money {
    return logic().balanceOf(accountId);
  }

  /** The sync total money supply (Σ mints − Σ drains). */
  public static moneySupply(): Money {
    return logic().moneySupply();
  }

  /** Every ledger row touching `accountId` on either side — the substrate read. */
  public static async entriesFor(accountId: string): Promise<LedgerEntry[]> {
    return logic().entriesFor(accountId);
  }

  /**
   * Replay the ledger for `accountId` into its balance — the audit seam.
   * Byte-identical to the materialized cache (the rebuild-from-log
   * invariant).
   */
  public static async rebuildBalance(accountId: string): Promise<Money> {
    return logic().rebuildBalance(accountId);
  }

  /** Rebuild the supply aggregate from a full ledger scan — the audit/repair. */
  public static async recomputeSupply(): Promise<void> {
    return logic().recomputeSupply();
  }

  /* ───────────────────────── custodial bank ops ───────────────────────── */

  /**
   * Open the acting owner's account at a branch (idempotent). The first
   * account an owner opens becomes their primary (receive-by-identity
   * default); the bank's `corpoKey` affiliation is recorded on the row. The
   * owner is the context-derived author, never a parameter. Returns the
   * durable account id.
   */
  public static async openAccount(
    bankPath: string,
    corpoKey: string,
  ): Promise<string> {
    return logic().openAccount(bankPath, corpoKey);
  }

  /** The acting owner's account id at `bankPath` (no number typed). */
  public static async myAccountAt(bankPath: string): Promise<string | null> {
    return logic().myAccountAt(bankPath);
  }

  /** Every account the acting owner holds (the multi-account read). */
  public static async accountsOf(): Promise<AccountBalance[]> {
    return logic().accountsOf();
  }

  /** The `ownerKey`'s primary account id — the receive-by-identity target. */
  public static async primaryAccountIdOf(
    ownerKey: string,
  ): Promise<string | null> {
    return logic().primaryAccountIdOf(ownerKey);
  }

  /** The corpo affiliation recorded on an account (readable via corpo). */
  public static async corpoKeyOf(accountId: string): Promise<string | null> {
    return logic().corpoKeyOf(accountId);
  }

  /** Deposit a coin stack: coin → vault, balance credited 1:1 (custodial). */
  public static async deposit(
    bank: Stuff & Bank,
    coinStack: Stuff & Globbable,
  ): Promise<void> {
    return logic().deposit(bank, coinStack);
  }

  /** Withdraw cash: balance → coin, bounded by the branch till liquidity. */
  public static async withdraw(
    bank: Stuff & Bank,
    amount: Money,
  ): Promise<void> {
    return logic().withdraw(bank, amount);
  }

  /** Transfer balance → balance (conserving); only from your own account. */
  public static async transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: Money,
    memo = "",
  ): Promise<void> {
    return logic().transfer(fromAccountId, toAccountId, amount, memo);
  }

  /* ──────────────── settlement + the credential ladder ──────────────── */

  /**
   * The uniform settlement primitive — one Charge, one method-as-parameter.
   * Cash hands coin to the payee (off the governed ledger); credential
   * authorizes an on-ledger debit/credit routed through the owning corpo
   * bank (with optional remittance splits). Returns a receipt the scene
   * reads to name what cleared.
   */
  public static async settle(
    charge: Charge,
    method: SettlementMethod,
  ): Promise<SettlementReceipt> {
    return logic().settle(charge, method);
  }

  /** The acting owner's routing payment credential (implant-first), or null. */
  public static activeCredential(): PaymentCredential | null {
    return logic().activeCredential();
  }

  /** Switch a credential's active account (the `wallet` verb; persists). */
  public static setActiveAccount(
    credential: PaymentCredential,
    accountId: string,
  ): void {
    return logic().setActiveAccount(credential, accountId);
  }

  /** Report-lost: freeze a credential (account + balance untouched). */
  public static freezeCredential(credential: PaymentCredential): void {
    return logic().freezeCredential(credential);
  }

  /** Issue/reissue a payment card linked 1:1 to `accountId`, into inventory. */
  public static async issueCard(
    accountId: string,
    capMinor: number,
  ): Promise<Stuff & CredentialWallet> {
    return logic().issueCard(accountId, capMinor);
  }

  /* ──────────────── wages + reporting ──────────────── */

  /**
   * Pay a wage from an employer account to a worker's primary account — the
   * P&L's labor line (`wage`/`wages`). *Who* is employed is authored; this
   * is the payment only. Developer/employer-gated at the verb layer.
   */
  public static async payWage(
    employerAccountId: string,
    workerKey: string,
    amount: Money,
  ): Promise<void> {
    return logic().payWage(employerAccountId, workerKey, amount);
  }

  /**
   * A categorized read of an account's ledger — the bar's P&L: per-category
   * signed net flow + a running balance that sits red by design (Law 1: a
   * count, not a worth-assertion). A derive-on-read consumer, no backfill.
   */
  public static async profitAndLoss(accountId: string): Promise<ProfitAndLoss> {
    return logic().profitAndLoss(accountId);
  }

  /**
   * Remit the demo sales tax on a sale from the seller's account to the
   * placeholder treasury at the authored, inert rate — seller-collected, so
   * it shows in the seller's P&L as a `tax` line; the treasury merely
   * accumulates (no appropriation path). Returns the tax remitted (zero when
   * the rate is absent). The bar loop calls this at point of sale.
   */
  public static async remitDemoTax(
    sellerAccountId: string,
    saleAmount: Money,
  ): Promise<Money> {
    return logic().remitDemoTax(sellerAccountId, saleAmount);
  }

  /* ──────────────── reporting consumers ──────────────── */

  /**
   * Mint physical cash into `into` — the central-bank cash faucet (the
   * genesis of circulating coin; supply grows). Returns the coin stack.
   */
  public static async issueCash(
    into: Stuff & Container,
    amount: Money,
    category: PnlCategory = "float",
  ): Promise<Stuff> {
    return logic().issueCash(into, amount, category);
  }

  /**
   * The conservation audit: top-down supply vs bottom-up (Σ account balances
   * + Σ circulating coins). `balanced` is the reconciliation invariant; one
   * of the two and only two reporting consumers (with the bar P&L).
   */
  public static reconcile(): ReconcileResult {
    return logic().reconcile();
  }

  /**
   * Ensure a venue's P&L account exists (owner = the venue's durable path),
   * creating a primary one if absent — lazily, on first banking interaction
   * at the venue. The bar's account the order/pnl/payroll flows resolve.
   */
  public static async ensureVenueAccount(
    ownerPath: string,
    bankPath: string,
    corpoKey: string,
  ): Promise<string> {
    return logic().ensureVenueAccount(ownerPath, bankPath, corpoKey);
  }

  /**
   * Ensure the corpo's own treasury account exists — the royalty target,
   * keyed on `corpoKey`, held at `bankPath` (the corpo's own bank). The mirror
   * of {@link ensureVenueAccount}; corpo income begins from the first fee.
   */
  public static async ensureCorpoTreasury(
    corpoKey: string,
    bankPath: string,
  ): Promise<string> {
    return logic().ensureCorpoTreasury(corpoKey, bankPath);
  }

  /**
   * Cash withdrawn from `accountId` this game-day (derive-on-read over the
   * ledger) — the value the per-account common-pool quota reads against its cap.
   */
  public static async withdrawnToday(accountId: string): Promise<number> {
    return logic().withdrawnToday(accountId);
  }

  /**
   * Set the **Circle** affiliation marker on an account (the Goodkin
   * enrollment write) — confers the raised withdrawal quota (and the Attendant
   * reception skip). Idempotent.
   */
  public static async setAccountCircle(
    accountId: string,
    isCircle: boolean,
  ): Promise<void> {
    return logic().setAccountCircle(accountId, isCircle);
  }
}

SecurityApi.decorateApiClass(BankingApi);
