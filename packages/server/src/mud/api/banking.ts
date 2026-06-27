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
 * operator/developer-gated at the *verb* layer (`AccessApi.isDeveloper`),
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
} from "../lib/banking/LedgerEntry";
import type { LedgerLeg } from "../lib/banking/Transaction";
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
  LedgerLeg,
};

const LOGIC_PATH = "/obj/api/banking";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/BankingLogic", import.meta.url)
);

/** Resolve the HMR-able BankingLogic singleton (sync). */
function logic(): BankingLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "BankingLogic"
      ) as typeof BankingLogic | null) ?? BankingLogic)()
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
    category: PnlCategory = "float"
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
    memo = ""
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
}

SecurityApi.decorateApiClass(BankingApi);
