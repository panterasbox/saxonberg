/**
 * SupplyAggregate — the single-row running headline of total money supply
 * in the `bank_supply` collection: cumulative `minted` and `drained` minor
 * units, so `supply = minted − drained` is an O(1) read.
 *
 * Total money supply changes **only** by a central-bank mint (faucet) or
 * drain (sink); every other ledger posting conserves it. This aggregate is
 * bumped by {@link BankingLogic} `postTransaction` on those two kinds and is
 * **rebuildable** by a full scan of the `bank_ledger` (sum mint amounts −
 * sum drain amounts) — the conservation audit's top-down term.
 *
 * A derived cache like {@link AccountBalance}: a warmed static mirror keeps
 * the read sync; the persisted single row is the durable copy.
 */

import { Document } from "../persistence/Document";
import { Collections } from "../persistence/Collections";
import { SecurityApi } from "../../api/security";
import type { FieldMeta } from "../mixin";

export default class SupplyAggregate extends Document {
  static collectionName = Collections.BankSupply;
  static fieldMeta: FieldMeta = {
    currency: { persistent: true },
    minted: { persistent: true },
    drained: { persistent: true },
  };

  /**
   * The currency this row aggregates. **One row per currency** — conservation
   * is N independent domains, one per issuer's money, and a leg may never
   * cross between them.
   *
   * ⚠ Defaults to `""` so an unmigrated row is loud, never plausible.
   */
  currency = "";

  /** Cumulative minted minor units (faucet). */
  minted = 0;
  /** Cumulative drained minor units (sink). */
  drained = 0;

  /** Warmed mirror, keyed by currency — keeps the supply read sync. */
  private static _cache = new Map<string, { minted: number; drained: number }>();

  /**
   * Load every row into the warmed mirror. Called at boot + rebuild.
   *
   * ⚠ **Throws on a currency-less row** — see {@link AccountBalance.warm};
   * booting on an unmigrated database is a failure, not a degraded mode.
   */
  static async warm(): Promise<void> {
    const rows = await SupplyAggregate.find<SupplyAggregate>({});
    const next = new Map<string, { minted: number; drained: number }>();
    for (const row of rows) {
      if (!row.currency) {
        throw new Error(
          "SupplyAggregate.warm: a supply row has no currency — this " +
            "database predates the currency build and must be migrated first " +
            "(packages/server/scripts/migrate-currency.ts --apply)"
        );
      }
      next.set(row.currency, { minted: row.minted, drained: row.drained });
    }
    SupplyAggregate._cache = next;
  }

  /** Sync read of net supply (minted − drained) for one currency. */
  static cachedSupply(currency: string): number {
    const row = SupplyAggregate._cache.get(currency);
    return row ? row.minted - row.drained : 0;
  }

  /** The warmed mirror for one currency (minted / drained). */
  static cached(currency: string): { minted: number; drained: number } {
    return { ...(SupplyAggregate._cache.get(currency) ?? { minted: 0, drained: 0 }) };
  }

  /** Every warmed row, by currency — what per-currency reports iterate. */
  static allCached(): Map<string, { minted: number; drained: number }> {
    return new Map(SupplyAggregate._cache);
  }

  /** Keep the warmed mirror in step after a posting / rebuild. */
  static putCached(currency: string, minted: number, drained: number): void {
    SupplyAggregate._cache.set(currency, { minted, drained });
  }

  /** Test seam — reset the warmed mirror. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly("SupplyAggregate._resetForTesting");
    SupplyAggregate._cache = new Map();
  }
}
