/**
 * LedgerEntry — one row of the append-only banking ledger, one document per
 * leg in the dedicated `bank_ledger` collection. The **system of record**
 * for money: every movement is a logged, attributable row, and every
 * account balance is reconstructable by replaying these rows.
 *
 * A plain `Document` (not Stuff): the row IS the transaction leg — the
 * `RenownEvent` precedent. **Dumb store, smart consumer:** the row records
 * *what happened* (kind / from→to / amount / category / attribution /
 * both clocks / a scope tag) richly enough that every later report (P&L,
 * money supply, wages paid, tax collected, velocity) is a derive-on-read
 * aggregation with **no backfill**.
 *
 * Each row is a **transfer leg**: `amount` minor units move from
 * `fromAccount` to `toAccount`. A multi-leg transaction (e.g. a payment
 * with a remittance split) shares a `txId` across its rows. Conservation is
 * structural — a real-account→real-account leg moves money without creating
 * it; the only counterparties that change total supply are the issuance
 * sentinel (mint/drain), and the cash bridge converts coin↔balance without
 * changing supply (see {@link Account}). The single chokepoint that writes
 * these rows ({@link BankingLogic} `postTransaction`) enforces those rules.
 */

import { Document } from "../persistence/Document";
import { Collections } from "../../../backend/PersistenceManager";

/**
 * The transaction kind — the open ledger vocabulary. `mint`/`drain` change
 * total supply (the central bank faucet/sink); `deposit`/`withdraw` bridge
 * coin↔balance (supply-neutral); the rest move money between real accounts
 * (zero-sum).
 */
export type LedgerKind =
  | "mint"
  | "drain"
  | "deposit"
  | "withdraw"
  | "transfer"
  | "payment"
  | "wage"
  | "tax";

/**
 * The P&L line a row rolls up into — the categorized-flow tag the bar's
 * profit-and-loss read partitions on. Open vocabulary (reports tolerate
 * unknown categories).
 */
export type PnlCategory =
  | "sales"
  | "cogs"
  | "wages"
  | "subsidy"
  | "tax"
  | "transfer"
  | "deposit"
  | "withdraw"
  | "float"
  | "fare"
  | "networkFee"
  | "onboarding"
  | "other";

/**
 * The fields a caller supplies for one ledger leg — the
 * `BankingLogic.postTransaction` leg shape. `amount` is positive minor
 * units; `fromAccount`/`toAccount` are real account ids or {@link Account}
 * sentinels.
 */
/**
 * A categorized read of one account's ledger — the bar's P&L instrument. A
 * derive-on-read consumer (the rich tagging means no backfill): per-category
 * signed net (money in − money out, in minor units) plus the running
 * `balance` that sits red by design (a count, never a worth-assertion).
 */
export interface ProfitAndLoss {
  /** The account this P&L is for. */
  account: string;
  /** Per-category signed net flow (positive = net in), minor units. */
  lines: Partial<Record<PnlCategory, number>>;
  /** The running balance (materialized), minor units — red by design. */
  balance: number;
}

/**
 * The conservation audit — the reconciliation invariant. Top-down minted
 * supply must equal bottom-up (Σ account balances + Σ circulating coins, the
 * coins outside bank vaults). `cashInExistence = supply − accountTotal` is
 * the cash-in-hand figure even though cash transactions are off-ledger.
 */
export interface ReconcileResult {
  /** Σ mints − Σ drains over the central-bank log. */
  supply: number;
  /** Σ of every materialized account balance. */
  accountTotal: number;
  /** Σ face value of coins NOT resting in a bank vault. */
  circulatingCoin: number;
  /** `supply − accountTotal` — cash in existence (held outside accounts). */
  cashInExistence: number;
  /** Whether `supply === accountTotal + circulatingCoin`. */
  balanced: boolean;
}

export interface LedgerEntryFields {
  kind: LedgerKind;
  /** Debited account (or a sentinel — issuance / cash bridge). */
  fromAccount: string;
  /** Credited account (or a sentinel). */
  toAccount: string;
  /** Positive minor units moved by this leg. */
  amount: number;
  /** Free-text note for the row. */
  memo?: string;
  /** The P&L line this row rolls up into. */
  category?: PnlCategory;
  /** Durable key of the acting principal (from execution context). */
  actor?: string;
  /** Address-prefix scope where it happened, or `null` = global. */
  locality?: string | null;
  /** Shared id grouping the legs of one multi-leg transaction. */
  txId?: string;
  /** Game-time SECONDS magnitude (world clock). */
  at?: number;
  /** Real-time epoch MILLISECONDS (wall clock). */
  realAt?: number;
}

export default class LedgerEntry extends Document {
  static collectionName = Collections.BankLedger;
  static persistentFields = [
    "kind",
    "fromAccount",
    "toAccount",
    "amount",
    "memo",
    "category",
    "actor",
    "locality",
    "txId",
    "at",
    "realAt",
  ];

  /** The transaction kind. */
  kind: LedgerKind = "transfer";
  /** Debited account id (or a sentinel) — indexed. */
  fromAccount = "";
  /** Credited account id (or a sentinel) — indexed. */
  toAccount = "";
  /** Positive minor units moved by this leg. */
  amount = 0;
  /** Free-text note. */
  memo = "";
  /** The P&L line this row rolls up into. */
  category: PnlCategory = "other";
  /** Durable key of the acting principal (or `'system'`). */
  actor = "system";
  /** Address-prefix scope where it happened, or `null` = global. */
  locality: string | null = null;
  /** Shared id grouping the legs of one multi-leg transaction. */
  txId = "";
  /** Game-time SECONDS magnitude — the world clock. */
  at = 0;
  /** Real-time epoch MILLISECONDS — the wall clock. */
  realAt = 0;
}
