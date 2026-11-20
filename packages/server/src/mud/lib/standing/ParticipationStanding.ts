/**
 * ParticipationStanding — one row of the materialized per-subject
 * participation aggregate, in the `participation` collection.
 *
 * A **derived cache**, never authoritative: the batch recompute
 * (`ConsumerLogic.recompute`) rebuilds every row from the raw
 * `participation_events` log, so dropping this collection and replaying
 * the log reproduces identical standings. Reads
 * (`ConsumerApi.participationOf`) hit the in-memory `_cache` warmed at boot
 * (mirroring `RenownStanding` / `AppSettings.warm`), so the read surface
 * never awaits.
 *
 * Participation has no scope partition (it is not scope-tagged the way
 * reactions are) — every standing is Compact-wide, the sentinel `'*'`.
 * The `scope` field + `{subject, scope}` shape are retained for parity
 * with `RenownStanding` (and so the read key composes the same way).
 * `value` is the recency-decayed active-bucket count.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
import { SecurityApi } from '../../api/security';
import type { FieldMeta } from '../mixin';
import { WarmedIndex } from '../persistence/WarmedIndex';
import type { StandingPoint } from './InfluenceStanding';

/** The stored `scope` sentinel — participation is Compact-wide only. */
export const PARTICIPATION_WIDE = '*';

export default class ParticipationStanding extends Document {
  static collectionName = Collections.Participation;
  static fieldMeta: FieldMeta = {
    subject: { persistent: true },
    scope: { persistent: true },
    value: { persistent: true },
    recomputedAt: { persistent: true },
    recomputedRealAt: { persistent: true },
  };

  /** Durable subject id the standing is about. */
  subject = '';
  /** Scope key — always `'*'` (Compact-wide) in v1. */
  scope = PARTICIPATION_WIDE;
  /** The recency-decayed active-bucket count (always ≥ 0). */
  value = 0;
  /** Game-time SECONDS of the recompute that produced this row (parity). */
  recomputedAt = 0;
  /** Real-time epoch MILLISECONDS of that recompute (the decay clock). */
  recomputedRealAt = 0;

  /**
   * The warmed read index — `{subject}|{scope}` → the signed standing.
   *
   * ⭐ The storage is {@link WarmedIndex}; the WARM below is this
   * subsystem's, because what a row means is. See that class for why a
   * cold read is neutral rather than an error, and for why this cannot
   * live on the logic singleton.
   */
  static #index = new WarmedIndex<StandingPoint>();

  /** The composite cache key (pipe-joined; neither part contains a pipe). */
  static key(subject: string, scope: string): string {
    return `${subject}|${scope}`;
  }

  /**
   * Load all standings into the read index. Called at boot + post-recompute.
   *
   * @internal the callable door is `ConsumerApi.participationOf`; the warm is
   * `ParticipationStandings.onCreate`'s. Not author surface.
   */
  static async warm(): Promise<void> {
    const rows = await ParticipationStanding.find({});
    ParticipationStanding.#index.replaceWith(
      rows.map((r) => [ParticipationStanding.key(r.subject, r.scope), r.point()] as const),
    );
  }

  /**
   * The warmed read index (empty until first warm → neutral 0 reads).
   *
   * @internal the callable door is `ConsumerApi.participationOf`.
   */
  static cached(): ReadonlyMap<string, StandingPoint> {
    return ParticipationStanding.#index.entries();
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
    SecurityApi.assertTestOnly('ParticipationStanding._putForTesting');
    // No instant: read flat, never decayed (db-performance D5).
    ParticipationStanding.#index.put(key, { value });
  }

  /**
   * ⭐ This row as a point of the read index: the figure and the
   * real-time instant it was computed at, so a read decays it to now
   * (db-performance D5). A row with no instant reads flat.
   */
  public point(): StandingPoint {
    return this.recomputedRealAt > 0
      ? { value: this.value, at: this.recomputedRealAt }
      : { value: this.value };
  }

  /**
   * Put this row into the read index — what a scoring pass does with each
   * row it wrote, instead of re-reading the whole collection.
   *
   * @internal the scoring pass's; the callable door is `ConsumerApi.participationOf`.
   */
  public remember(): void {
    ParticipationStanding.#index.put(ParticipationStanding.key(this.subject, this.scope), this.point());
  }

  /** Test seam — drop the index so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly('ParticipationStanding._resetForTesting');
    ParticipationStanding.#index.clear();
  }
}
