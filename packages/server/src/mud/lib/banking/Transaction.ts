/**
 * BankTransaction — the conservation rule, as a pure value-object.
 *
 * A transaction is a `kind` plus a list of {@link LedgerLeg} transfers. The
 * **conservation invariant** is structural: each leg's counterparties are
 * constrained by its kind, so money can be created or destroyed *only* by a
 * mint/drain against the issuance sentinel, converted coin↔balance *only*
 * across the cash bridge, and otherwise merely moved between real accounts.
 * {@link BankTransaction.assertConserving} enforces this and **throws** on a
 * breach (the crafting/containment discipline: contract violations are
 * exceptions, not boolean flags).
 *
 * Kept pure and side-effect free so it runs *before* any persistence (the
 * throw is the same with or without a DB connection) and is independently
 * testable — the seam the conservation invariant test drives directly.
 * {@link BankingLogic} `postTransaction` calls it, then persists; nothing
 * else writes a {@link LedgerEntry}.
 */

import { Account } from "./Account";
import type { LedgerKind, PnlCategory } from "./LedgerEntry";

/** One transfer leg: `amount` positive minor units, `from` → `to`. */
export interface LedgerLeg {
  /** Debited account id (or a sentinel). */
  from: string;
  /** Credited account id (or a sentinel). */
  to: string;
  /** Positive minor units moved by this leg. */
  amount: number;
  /** The P&L line this leg rolls up into. */
  category?: PnlCategory;
  /** Free-text note for the row. */
  memo?: string;
}

export class BankTransaction {
  /**
   * Validate every leg against what its `kind` may touch, throwing on the
   * first breach. The conservation chokepoint's pure half.
   */
  public static assertConserving(kind: LedgerKind, legs: LedgerLeg[]): void {
    if (legs.length === 0) {
      throw new Error(
        `BankTransaction: a '${kind}' transaction must have at least one leg`
      );
    }
    for (const leg of legs) {
      if (!Number.isInteger(leg.amount) || leg.amount <= 0) {
        throw new Error(
          `BankTransaction: leg amount must be a positive integer (got ${leg.amount})`
        );
      }
      if (leg.from === leg.to) {
        throw new Error(
          `BankTransaction: a leg cannot move money to itself (${leg.from})`
        );
      }
      BankTransaction.assertLegKind(kind, leg);
    }
  }

  /** The per-kind counterparty rule for one leg. */
  private static assertLegKind(kind: LedgerKind, leg: LedgerLeg): void {
    const fromSentinel = Account.isSentinel(leg.from);
    const toSentinel = Account.isSentinel(leg.to);
    switch (kind) {
      case "transfer":
      case "payment":
      case "wage":
      case "tax":
      case "escrow-hold":
      case "escrow-release":
      case "escrow-revert":
      case "draw":
        // Pure on-ledger movement — both sides must be real accounts, or
        // the posting would create/destroy money outside a logged mint.
        // The escrow family moves through a per-contract REAL account
        // (never a sentinel — a sentinel has no balance row, which would
        // take held funds out of the reconcile audit while in flight).
        if (fromSentinel || toSentinel) {
          throw new Error(
            `BankTransaction: a '${kind}' leg must move between real ` +
              `accounts (got ${leg.from} → ${leg.to}); only mint/drain may ` +
              `touch the issuance sentinel.`
          );
        }
        break;
      case "mint":
        // Issuance → a real account (credit a balance) OR the cash bridge
        // (mint physical coin into the world). Both grow supply.
        if (leg.from !== Account.ISSUANCE) {
          throw new Error(
            `BankTransaction: a 'mint' leg must be sourced from issuance ` +
              `(got ${leg.from} → ${leg.to}).`
          );
        }
        if (toSentinel && leg.to !== Account.CASH_BRIDGE) {
          throw new Error(
            `BankTransaction: a 'mint' leg may target a real account or the ` +
              `cash bridge, not ${leg.to}.`
          );
        }
        break;
      case "drain":
        // A real account OR the cash bridge → issuance. Both shrink supply.
        if (leg.to !== Account.ISSUANCE) {
          throw new Error(
            `BankTransaction: a 'drain' leg must sink to issuance ` +
              `(got ${leg.from} → ${leg.to}).`
          );
        }
        if (fromSentinel && leg.from !== Account.CASH_BRIDGE) {
          throw new Error(
            `BankTransaction: a 'drain' leg may come from a real account or ` +
              `the cash bridge, not ${leg.from}.`
          );
        }
        break;
      case "deposit":
        if (leg.from !== Account.CASH_BRIDGE || toSentinel) {
          throw new Error(
            `BankTransaction: a 'deposit' leg must be the cash bridge → a ` +
              `real account (got ${leg.from} → ${leg.to}).`
          );
        }
        break;
      case "withdraw":
        if (leg.to !== Account.CASH_BRIDGE || fromSentinel) {
          throw new Error(
            `BankTransaction: a 'withdraw' leg must be a real account → the ` +
              `cash bridge (got ${leg.from} → ${leg.to}).`
          );
        }
        break;
      default: {
        // Exhaustiveness backstop — a kind this switch doesn't name would
        // otherwise fall through *unchecked* (the audit's one genuine hole).
        // The `never` binding makes a new LedgerKind a compile error here.
        const unhandled: never = kind;
        throw new Error(
          `BankTransaction: no counterparty rule for kind '${String(unhandled)}'`
        );
      }
    }
  }

  /**
   * The net supply change a conserving transaction produces: mint adds,
   * drain removes, everything else is supply-neutral.
   */
  public static supplyDelta(
    kind: LedgerKind,
    legs: LedgerLeg[]
  ): { minted: number; drained: number } {
    const total = legs.reduce((sum, leg) => sum + leg.amount, 0);
    if (kind === "mint") return { minted: total, drained: 0 };
    if (kind === "drain") return { minted: 0, drained: total };
    return { minted: 0, drained: 0 };
  }
}
