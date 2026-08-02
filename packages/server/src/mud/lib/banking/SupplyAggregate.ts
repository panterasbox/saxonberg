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
    minted: { persistent: true },
    drained: { persistent: true },
  };

  /** Cumulative minted minor units (faucet). */
  minted = 0;
  /** Cumulative drained minor units (sink). */
  drained = 0;

  /** Warmed mirror of the single row — keeps the supply read sync. */
  private static _cache = { minted: 0, drained: 0 };

  /** Load the single row into the warmed mirror. Called at boot + rebuild. */
  static async warm(): Promise<void> {
    const [row] = await SupplyAggregate.find<SupplyAggregate>({});
    SupplyAggregate._cache = row
      ? { minted: row.minted, drained: row.drained }
      : { minted: 0, drained: 0 };
  }

  /** Sync read of net supply (minted − drained) off the warmed mirror. */
  static cachedSupply(): number {
    return SupplyAggregate._cache.minted - SupplyAggregate._cache.drained;
  }

  /** The warmed mirror (minted / drained). */
  static cached(): { minted: number; drained: number } {
    return { ...SupplyAggregate._cache };
  }

  /** Test seam — reset the warmed mirror. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly("SupplyAggregate._resetForTesting");
    SupplyAggregate._cache = { minted: 0, drained: 0 };
  }
}
