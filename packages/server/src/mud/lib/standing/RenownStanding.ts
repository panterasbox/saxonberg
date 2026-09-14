/**
 * RenownStanding — one row of the materialized per-`{subject, scope}`
 * renown aggregate, in the `renown` collection.
 *
 * A **derived cache**, never authoritative: the batch recompute
 * (`RenownLogic.recompute`) rebuilds every row from the raw
 * `renown_events` log, so dropping this collection and replaying the log
 * reproduces identical standings. Reads (`RenownApi.renownOf`) hit the
 * in-memory `_cache` warmed at boot (mirroring `AppSettings.warm`), so the
 * read surface never awaits.
 *
 * `scope` is the stored scope key: the sentinel `'*'` for the
 * Compact-wide roll-up (the scope governance reads), else a `Group`
 * ref or a locality address prefix. `value` is the signed standing
 * (esteem ↔ notoriety).
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
import { SecurityApi } from '../../api/security';
import type { FieldMeta } from '../mixin';
import { WarmedIndex } from '../persistence/WarmedIndex';

/** The stored `scope` sentinel for the Compact-wide roll-up. */
export const COMPACT_WIDE = '*';

export default class RenownStanding extends Document {
  static collectionName = Collections.Renown;
  static fieldMeta: FieldMeta = {
    subject: { persistent: true },
    scope: { persistent: true },
    value: { persistent: true },
    recomputedAt: { persistent: true },
    recomputedRealAt: { persistent: true },
  };

  /** Durable subject id the standing is about. */
  subject = "";
  /** Scope key — `'*'` (Compact-wide), a `Group` ref, or a locality. */
  scope = COMPACT_WIDE;
  /** The signed standing (esteem positive ↔ notoriety negative). */
  value = 0;
  /** Game-time SECONDS of the recompute that produced this row (world clock). */
  recomputedAt = 0;
  /** Real-time epoch MILLISECONDS of that recompute (wall clock). */
  recomputedRealAt = 0;

  /**
   * The warmed read index — `{subject}|{scope}` → the signed standing.
   *
   * ⭐ The storage is {@link WarmedIndex}; the WARM below is this
   * subsystem's, because what a row means is. See that class for why a
   * cold read is neutral rather than an error, and for why this cannot
   * live on the logic singleton.
   */
  static #index = new WarmedIndex<number>();

  /** The composite cache key (pipe-joined; neither part contains a pipe). */
  static key(subject: string, scope: string): string {
    return `${subject}|${scope}`;
  }

  /**
   * Load all standings into the read index. Called at boot + post-recompute.
   *
   * @internal the callable door is `RenownApi.renownOf`; the warm is
   * `RenownStandings.postRegister`'s. Not author surface.
   */
  static async warm(): Promise<void> {
    const rows = await RenownStanding.find({});
    RenownStanding.#index.replaceWith(
      rows.map((r) => [RenownStanding.key(r.subject, r.scope), r.value] as const),
    );
  }

  /**
   * The warmed read index (empty until first warm → neutral 0 reads).
   *
   * @internal the callable door is `RenownApi.renownOf`.
   */
  static cached(): ReadonlyMap<string, number> {
    return RenownStanding.#index.entries();
  }

  /**
   * Seed one entry — the test seam.
   *
   * ⭐ It exists because `cached()` now hands back a `ReadonlyMap`, and
   * four tests were writing standings straight through that read
   * accessor. A read surface a caller can mutate is not a read surface;
   * the write is honest here, named, and test-gated.
   */
  static _putForTesting(key: string, value: number): void {
    SecurityApi.assertTestOnly('RenownStanding._putForTesting');
    RenownStanding.#index.put(key, value);
  }

  /** Test seam — drop the index so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly('RenownStanding._resetForTesting');
    RenownStanding.#index.clear();
  }
}
