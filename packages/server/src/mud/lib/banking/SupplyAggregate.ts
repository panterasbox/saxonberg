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
import { WarmedIndex } from "../persistence/WarmedIndex";

export default class SupplyAggregate extends Document {
  static collectionName = Collections.BankSupply;
  static fieldMeta: FieldMeta = {
    currency: { persistent: true },
    minted: { persistent: true },
    drained: { persistent: true },
    lanes: { persistent: true },
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

  /**
   * ⭐ The same two sums PER LANE — by the leg's category (`window`,
   * `perpetual`, `override` …), so *what the window has outstanding* is a
   * warmed read and not a scan of the ledger. The ledger stays the truth;
   * this is its running total, kept in step by the same post that keeps
   * `minted`/`drained`. Found by the drive: with every keeper's beat on the
   * ledger, the reserve's dashboard took seven seconds to sum it.
   */
  lanes: Record<string, { minted: number; drained: number }> = {};

  /** Warmed mirror, keyed by currency — keeps the supply read sync. */
  /**
   * The warmed read index: `currency → {minted, drained}`.
   *
   * Storage is {@link WarmedIndex}; the WARM below stays here, because
   * the SUM it performs is the invariant that matters (see it).
   */
  static #index = new WarmedIndex<{ minted: number; drained: number }>();
  /** The warmed per-lane mirror: `currency → category → {minted, drained}`. */
  static #lanes = new WarmedIndex<Record<string, { minted: number; drained: number }>>();

  /**
   * Load every row into the warmed mirror. Called at boot + rebuild.
   *
   * ⚠ **Throws on a currency-less row** — see {@link AccountBalance.warm};
   * booting on an unmigrated database is a failure, not a degraded mode.
   *
   * @internal the callable doors are `BankingApi`'s supply + audit reads; the warm is boot's. Not author surface.
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
      // ⭐ SUM, never last-wins. One row per currency is the invariant, not a
      // guarantee: a duplicate (a concurrent create, a hand-edited
      // collection) used to make this silently REPORT ONE OF THEM — and the
      // number it drops is the money supply, the one figure the whole
      // conservation audit is built on. Summing is both the correct read of
      // a cumulative aggregate and self-healing: the collection is a
      // rebuildable cache over `bank_ledger`, which stays the record.
      const seen = next.get(row.currency);
      next.set(row.currency, {
        minted: (seen?.minted ?? 0) + row.minted,
        drained: (seen?.drained ?? 0) + row.drained,
      });
    }
    SupplyAggregate.#index.replaceWith(next);
    const lanes = new Map<string, Record<string, { minted: number; drained: number }>>();
    for (const row of rows) {
      const acc = lanes.get(row.currency) ?? {};
      for (const [category, sums] of Object.entries(row.lanes ?? {})) {
        const cur = acc[category] ?? { minted: 0, drained: 0 };
        acc[category] = { minted: cur.minted + (sums?.minted ?? 0), drained: cur.drained + (sums?.drained ?? 0) };
      }
      lanes.set(row.currency, acc);
    }
    SupplyAggregate.#lanes.replaceWith(lanes);
  }

  /**
   * Sync read of one lane's net (minted − drained) for a currency — the
   * window's advances outstanding, the perpetual held.
   *
   * @internal the callable door is `BankingApi`'s lane read. Not author surface.
   */
  static cachedLane(currency: string, category: string): number {
    const lane = SupplyAggregate.#lanes.get(currency)?.[category];
    return lane ? lane.minted - lane.drained : 0;
  }

  /** Keep the per-lane mirror in step after a posting. @internal */
  static putCachedLanes(currency: string, lanes: Record<string, { minted: number; drained: number }>): void {
    SupplyAggregate.#lanes.put(currency, { ...lanes });
  }

  /**
   * Sync read of net supply (minted − drained) for one currency.
   *
   * @internal the callable doors are `BankingApi`'s supply + audit reads. Not author surface.
   */
  static cachedSupply(currency: string): number {
    const row = SupplyAggregate.#index.get(currency);
    return row ? row.minted - row.drained : 0;
  }

  /**
   * The warmed mirror for one currency (minted / drained).
   *
   * @internal the callable doors are `BankingApi`'s supply + audit reads. Not author surface.
   */
  static cached(currency: string): { minted: number; drained: number } {
    return { ...(SupplyAggregate.#index.get(currency) ?? { minted: 0, drained: 0 }) };
  }

  /** Every warmed row, by currency — what per-currency reports iterate. */
  private static allCached(): Map<string, { minted: number; drained: number }> {
    return new Map(SupplyAggregate.#index.entries());
  }

  /**
   * Keep the warmed mirror in step after a posting / rebuild.
   *
   * @internal the callable doors are `BankingApi`'s supply + audit reads. Not author surface.
   */
  static putCached(currency: string, minted: number, drained: number): void {
    SupplyAggregate.#index.put(currency, { minted, drained });
  }

  /** Test seam — reset the warmed mirror. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly("SupplyAggregate._resetForTesting");
    SupplyAggregate.#index.clear();
    SupplyAggregate.#lanes.clear();
  }
}
