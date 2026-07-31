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

/** The stored `scope` sentinel — participation is Compact-wide only. */
export const PARTICIPATION_WIDE = '*';

export default class ParticipationStanding extends Document {
  static collectionName = Collections.Participation;
  static persistentFields = [
    'subject',
    'scope',
    'value',
    'recomputedAt',
    'recomputedRealAt',
  ];

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
   * The warmed read cache: `key(subject, scope) → value`. Always a Map
   * (starts empty) so a cold read returns the neutral 0, never throws.
   * `warm()` and `recompute()` replace it.
   */
  private static _cache = new Map<string, number>();

  /** The composite cache key (pipe-joined; neither part contains a pipe). */
  static key(subject: string, scope: string): string {
    return `${subject}|${scope}`;
  }

  /** Load all standings into the read cache. Called at boot + post-recompute. */
  static async warm(): Promise<void> {
    const rows = await ParticipationStanding.find({});
    const next = new Map<string, number>();
    for (const r of rows) {
      next.set(ParticipationStanding.key(r.subject, r.scope), r.value);
    }
    ParticipationStanding._cache = next;
  }

  /** The warmed read cache (empty until first warm → neutral 0 reads). */
  static cached(): Map<string, number> {
    return ParticipationStanding._cache;
  }

  /** Test seam — drop the cache so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly('ParticipationStanding._resetForTesting');
    ParticipationStanding._cache = new Map();
  }
}
