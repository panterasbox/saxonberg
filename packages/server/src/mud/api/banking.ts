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
 * hot-reloadable {@link BankingLogic} singleton at `/platform/idea/api/banking`,
 * reached synchronously via `StuffApi.singletonSync`. `dest /platform/idea/api/banking`
 * reloads it. The central-bank mint/drain/float ops are
 * operator/developer-gated at the *verb* layer (`AccessApi.isWizard`),
 * not here; this surface is the mechanism, the verbs are the policy.
 */

import { Money } from "../lib/banking/Money";
import type { CurrencyTag } from "../lib/banking/Money";
import { Currency } from "../lib/banking/Currency";
import type {
  CurrencyRecord,
  Denomination,
} from "../lib/banking/Currency";
import { Account } from "../lib/banking/Account";
import type LedgerEntry from "../lib/banking/LedgerEntry";
import type {
  LedgerKind,
  PnlCategory,
  LedgerEntryFields,
  ProfitAndLoss,
  ReconcileResult,
  FullReconcileResult,
  EscrowHoldResult,
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
import { BankingLogic } from "../platform/idea/api/BankingLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

export { Money, Account, Currency };
export type {
  CurrencyTag,
  CurrencyRecord,
  Denomination,
  LedgerKind,
  PnlCategory,
  LedgerEntryFields,
  ProfitAndLoss,
  ReconcileResult,
  EscrowHoldResult,
  LedgerLeg,
  Charge,
  SettlementMethod,
  RemittanceSplit,
  SettlementReceipt,
  PaymentCredential,
  CredentialWallet,
};

const LOGIC_PATH = "/platform/idea/api/banking";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/BankingLogic", import.meta.url),
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

  /**
   * Drop a circle scope's in-memory balance overlay — the sandbox reap
   * seam (a session's play-money dies with its session; the stamped
   * ledger rows are discarded separately by the PM seam). @internal
   */
  public static discardScopeOverlay(scope: string): void {
    logic().discardScopeOverlay(scope);
  }

  /** The sync total money supply (Σ mints − Σ drains). */
  public static moneySupply(currency: string): Money {
    return logic().moneySupply(currency);
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
   * Open the acting owner's account at a **bank** (an institution key,
   * e.g. `goodkin` — your account exists at the bank and is serviceable
   * at every branch of it; the verb layer passes the branch's
   * `getBank()`). Idempotent; the first account an owner opens becomes
   * their primary (receive-by-identity default); the bank's `corpoKey`
   * affiliation is recorded on the row. The owner is the context-derived
   * author, never a parameter. Returns the durable account id.
   */
  public static async openAccount(
    bank: string,
    corpoKey: string,
    currency: string
  ): Promise<string> {
    return logic().openAccount(bank, corpoKey, currency);
  }

  /** The acting owner's account id at the `bank` institution. */
  public static async myAccountAt(bank: string): Promise<string | null> {
    return logic().myAccountAt(bank);
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

  /**
   * The **owner key** recorded on an account — a player path, or a
   * Business's account path. What `buy` reads off the receipt's routing
   * account to decide whom the chattel is stamped to: a business's
   * account active in the wallet means the purchase is the business's.
   */
  public static async ownerKeyOf(accountId: string): Promise<string | null> {
    return logic().ownerKeyOf(accountId);
  }

  /**
   * Link `accountId` into `actor`'s reachable payment credential — the
   * `autoLinkToWallet` seam for an account the actor does **not** own
   * (`wallet use house` puts the business's operating account in a
   * purchasing holder's wallet). Returns false when the actor carries no
   * credential. Settlement never checks ownership of the routing account,
   * so this link IS the conferral; the caller checks the position.
   */
  public static linkAccount(actor: Stuff, accountId: string): boolean {
    return logic().linkAccount(actor, accountId);
  }

  /**
   * The inverse: take `accountId` out of the actor's reachable credential
   * (active pointer falls back to the first remaining link). Best-effort;
   * a missing credential is a no-op. What leaving a purchasing position
   * does.
   */
  public static unlinkAccount(actor: Stuff, accountId: string): void {
    return logic().unlinkAccount(actor, accountId);
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

  // Note: switching a credential's active account and freezing it are the
  // `PaymentCredential` value-object's own behavior — call `credential
  // .setActiveAccount(id)` / `.setFrozen(true)` directly (the caller holds the
  // record). They were thin forwards through here with no gate to route.

  /**
   * Issue/reissue a payment card linked 1:1 to `accountId`, into inventory —
   * the acting principal's, or `holder`'s when named (the house card a
   * purchasing NPC is dealt at hire; nobody is acting as the NPC then).
   */
  public static async issueCard(
    accountId: string,
    capMinor: number,
    holder?: Stuff,
  ): Promise<Stuff & CredentialWallet> {
    return logic().issueCard(accountId, capMinor, holder);
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
    category: PnlCategory = "wages",
    memo = "wage",
  ): Promise<void> {
    return logic().payWage(employerAccountId, workerKey, amount, category, memo);
  }

  /**
   * Pay the proprietor's **draw** — business account → the proprietor's
   * primary account, kind `draw` (owner take-home is not a wage; the
   * distinct leg kind is the future tax wedge). Solvency-checked: refuses
   * when the business balance is short (unlike `payWage`, which pays red by
   * design — the deficit model). The verb layer resolves the business from
   * the acting proprietor (participant contract), never a spoofable param.
   */
  public static async payDraw(
    businessAccountId: string,
    proprietorKey: string,
    amount: Money,
  ): Promise<void> {
    return logic().payDraw(businessAccountId, proprietorKey, amount);
  }

  /* ──────────────── escrow (the contract system's agent) ──────────────── */

  /**
   * Hold `amount` for a contract: issuer account → the per-contract escrow
   * account (`escrow:contract:<id>` — a REAL row owned by the contract,
   * custodied at the default commercial bank, so `reconcile` counts held
   * funds throughout). Returns a refusal value on a short issuer balance
   * (no credit); a successful hold carries the ledger `txId` the contract
   * event chain references.
   */
  public static async escrowHold(
    fromAccountId: string,
    contractId: string,
    amount: Money,
  ): Promise<EscrowHoldResult> {
    return logic().escrowHold(fromAccountId, contractId, amount);
  }

  /**
   * Release held funds to the contractor (`escrow-release`). Throws on an
   * over-release — the per-contract account makes the invariant breach
   * loud instead of silently commingling another contract's stake.
   */
  public static async escrowRelease(
    contractId: string,
    toAccountId: string,
    amount: Money,
  ): Promise<string> {
    return logic().escrowRelease(contractId, toAccountId, amount);
  }

  /** Revert held funds to the issuer (`escrow-revert`; breach/expiry). */
  public static async escrowRevert(
    contractId: string,
    toAccountId: string,
    amount: Money,
  ): Promise<string> {
    return logic().escrowRevert(contractId, toAccountId, amount);
  }

  /**
   * The in-flight escrow balance for a contract (sync warm read) — the
   * legibility surface: the stakes are real because the money is locked
   * and visible.
   */
  public static escrowBalanceOf(contractId: string): Money {
    return logic().escrowBalanceOf(contractId);
  }

  /**
   * Close a contract's escrow account at a terminal transition: asserts the
   * balance is zero, then deletes the `bank_accounts` row (the ledger legs
   * remain the permanent record). Idempotent; live escrow rows scale with
   * open contracts only.
   */
  public static async escrowClose(contractId: string): Promise<void> {
    return logic().escrowClose(contractId);
  }

  /**
   * The default custodian bank (`banking.defaultCustodianBank`, an
   * institution key — `goodkin`). **The legacy-restamp last resort, not a
   * default to build on**: custody is a relationship — a business banks
   * where its authored `banksAt` says, a worker's first account opens at
   * the payer's bank, escrow at the issuer's bank. This value exists for
   * the boot restamp of orphaned legacy rows (no relationship derivable)
   * and as a person-tier retail anchor in tests. Never pass it as a
   * business's custodian.
   */
  public static defaultCustodianBank(): string {
    return logic().defaultCustodianBank();
  }

  /**
   * The custodian bank (an institution key) recorded on an account, or
   * null for an unknown/uncustodied row — the relationship read a payer
   * derives a payee's new account from (e.g. a contract payout opens
   * where the escrow is custodied).
   */
  public static async custodianOf(accountId: string): Promise<string | null> {
    return logic().custodianOf(accountId);
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
  public static reconcile(currency: string): ReconcileResult {
    return logic().reconcile(currency);
  }

  /**
   * The **complete** conservation audit for `currency` — supply against
   * every reservoir of value, including vault float and coin captured in
   * `holder_snapshots`. Async, because the snapshot term is a collection
   * read; {@link reconcile} stays sync and circulating-only for paths that
   * cannot await.
   */
  public static async fullReconcile(
    currency: string
  ): Promise<FullReconcileResult> {
    return logic().fullReconcile(currency);
  }

  /**
   * Ensure a venue's P&L account exists (owner = the venue's durable
   * path, custodied at the `bank` institution), creating a primary one if
   * absent — lazily, on first banking interaction at the venue. The bar's
   * account the order/pnl/payroll flows resolve.
   *
   * `openingCapital` (minor units) is minted in on the FIRST materialization
   * only. Omit it to take the `banking.openingCapital` default; pass `0` to
   * decline — which is what a worker's payer-derived account does, since a
   * worker earns wages rather than being capitalized.
   */
  public static async ensureVenueAccount(
    ownerPath: string,
    bank: string,
    corpoKey: string,
    currency: string,
    openingCapital?: number
  ): Promise<string> {
    return logic().ensureVenueAccount(
      ownerPath,
      bank,
      corpoKey,
      currency,
      openingCapital
    );
  }

  /**
   * Ensure the corpo's own treasury account exists — the royalty target,
   * keyed on `corpoKey`, held at `bankPath` (the corpo's own bank). The mirror
   * of {@link ensureVenueAccount}; corpo income begins from the first fee.
   */
  public static async ensureCorpoTreasury(
    corpoKey: string,
    bank: string,
    currency: string
  ): Promise<string> {
    return logic().ensureCorpoTreasury(corpoKey, bank, currency);
  }

  /**
   * Enrol an owner's account at a `corpoKey`-affiliated bank into the Circle
   * (the Goodkin enrollment write) — the recognized-standing perk (raised
   * quota). Returns false when the owner has no such account yet (the officer
   * nudges instead of enrolling). The `bank-circle` dialogue effect.
   */
  public static async enrollCircle(
    ownerKey: string,
    corpoKey: string,
  ): Promise<boolean> {
    return logic().enrollCircle(ownerKey, corpoKey);
  }
}

SecurityApi.decorateApiClass(BankingApi);
