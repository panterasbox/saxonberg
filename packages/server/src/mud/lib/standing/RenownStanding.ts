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
import type { StandingPoint } from './InfluenceStanding';

/**
 * A renown standing as the read index holds it (db-performance D5): the
 * figure and the GAME-time instant it was computed at, and the three sums
 * the figure is built from — each decayed to that instant — so a read can
 * carry it forward to now with the two half-lives. A point without the
 * sums (a row written before they were kept) reads its flat `value`.
 */
export interface RenownPoint extends StandingPoint {
  esteem?: number;
  notoriety?: number;
  reception?: number;
}

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
    esteem: { persistent: true },
    notoriety: { persistent: true },
    reception: { persistent: true },
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
   * ⭐ The three terms `value` is built from, each decayed to
   * `recomputedAt` (db-performance D5): positive reactions (esteem
   * half-life), negative reactions (notoriety half-life), and the
   * reception weight before its log. `null` on a row written before they
   * were kept — that row reads its flat `value` until a full pass.
   */
  esteem: number | null = null;
  notoriety: number | null = null;
  reception: number | null = null;

  /**
   * The warmed read index — `{subject}|{scope}` → the signed standing.
   *
   * ⭐ The storage is {@link WarmedIndex}; the WARM below is this
   * subsystem's, because what a row means is. See that class for why a
   * cold read is neutral rather than an error, and for why this cannot
   * live on the logic singleton.
   */
  static #index = new WarmedIndex<RenownPoint>();

  /** The composite cache key (pipe-joined; neither part contains a pipe). */
  static key(subject: string, scope: string): string {
    return `${subject}|${scope}`;
  }

  /**
   * Load all standings into the read index. Called at boot + post-recompute.
   *
   * @internal the callable door is `RenownApi.renownOf`; the warm is
   * `RenownStandings.onCreate`'s. Not author surface.
   */
  static async warm(): Promise<void> {
    const rows = await RenownStanding.find({});
    RenownStanding.#index.replaceWith(
      rows.map((r) => [RenownStanding.key(r.subject, r.scope), r.point()] as const),
    );
  }

  /**
   * The warmed read index (empty until first warm → neutral 0 reads).
   *
   * @internal the callable door is `RenownApi.renownOf`.
   */
  static cached(): ReadonlyMap<string, RenownPoint> {
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
    // No instant: read flat, never decayed (db-performance D5).
    RenownStanding.#index.put(key, { value });
  }

  /**
   * ⭐ This row as a point of the read index — the figure, its game-time
   * instant and the three sums, so a read decays it to now. A row without
   * the sums reads flat.
   */
  public point(): RenownPoint {
    if (this.esteem === null || this.notoriety === null || this.reception === null) {
      return { value: this.value };
    }
    return {
      value: this.value,
      at: this.recomputedAt,
      esteem: this.esteem,
      notoriety: this.notoriety,
      reception: this.reception,
    };
  }

  /**
   * Put this row into the read index — what a scoring pass does with each
   * row it wrote, instead of re-reading the whole collection.
   *
   * @internal the scoring pass's; the callable door is `RenownApi.renownOf`.
   */
  public remember(): void {
    RenownStanding.#index.put(RenownStanding.key(this.subject, this.scope), this.point());
  }

  /** Test seam — drop the index so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly('RenownStanding._resetForTesting');
    RenownStanding.#index.clear();
  }
}
