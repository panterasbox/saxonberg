/**
 * ProducerStanding — one row of the materialized per-author producer
 * aggregate, in the `producer` collection.
 *
 * A **derived cache**, never authoritative: the batch recompute
 * (`ProducerLogic.recompute`) rebuilds every row from the raw
 * `producer_events` log, so dropping this collection and replaying the log
 * reproduces identical standings. Reads (`ProducerApi.producerOf`) hit the
 * in-memory `_cache` warmed at boot (mirroring `ParticipationStanding` /
 * `RenownStanding`), so the read surface never awaits.
 *
 * Producer has no scope partition — every standing is cooperative-wide, the
 * sentinel `'*'`. The `scope` field + `{subject, scope}` shape are retained
 * for parity with its siblings (and so the read key composes the same way).
 * `subject` is the author's durable `templatePath`; `value` is the
 * recency-decayed, weighted attributed-engagement count.
 *
 * The per-Player → User rollup (the franchise-gate read) is NOT stored here
 * — production doesn't dilute under a sum, so banking stays per-Player.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../../../backend/PersistenceManager';
import { SecurityApi } from '../../api/security';

/** The stored `scope` sentinel — producer is cooperative-wide only. */
export const PRODUCER_WIDE = '*';

export default class ProducerStanding extends Document {
  static collectionName = Collections.Producer;
  static persistentFields = [
    'subject',
    'scope',
    'value',
    'recomputedAt',
    'recomputedRealAt',
  ];

  /** Durable author id the standing is about. */
  subject = '';
  /** Scope key — always `'*'` (cooperative-wide) in v1. */
  scope = PRODUCER_WIDE;
  /** The recency-decayed, weighted attributed-engagement count (always ≥ 0). */
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
    const rows = await ProducerStanding.find({});
    const next = new Map<string, number>();
    for (const r of rows) {
      next.set(ProducerStanding.key(r.subject, r.scope), r.value);
    }
    ProducerStanding._cache = next;
  }

  /** The warmed read cache (empty until first warm → neutral 0 reads). */
  static cached(): Map<string, number> {
    return ProducerStanding._cache;
  }

  /** Test seam — drop the cache so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly('ProducerStanding._resetForTesting');
    ProducerStanding._cache = new Map();
  }
}
