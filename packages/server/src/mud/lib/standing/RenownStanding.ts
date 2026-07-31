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

/** The stored `scope` sentinel for the Compact-wide roll-up. */
export const COMPACT_WIDE = '*';

export default class RenownStanding extends Document {
  static collectionName = Collections.Renown;
  static persistentFields = [
    'subject',
    'scope',
    'value',
    'recomputedAt',
    'recomputedRealAt',
  ];

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
   * The warmed read cache: `key(subject, scope) → value`. Always a Map
   * (starts empty) so a cold read returns the neutral 0, never throws —
   * renown reads are best-effort. `warm()` and `recompute()` replace it.
   */
  private static _cache = new Map<string, number>();

  /** The composite cache key (pipe-joined; neither part contains a pipe). */
  static key(subject: string, scope: string): string {
    return `${subject}|${scope}`;
  }

  /** Load all standings into the read cache. Called at boot + post-recompute. */
  static async warm(): Promise<void> {
    const rows = await RenownStanding.find({});
    const next = new Map<string, number>();
    for (const r of rows) next.set(RenownStanding.key(r.subject, r.scope), r.value);
    RenownStanding._cache = next;
  }

  /** The warmed read cache (empty until first warm → neutral 0 reads). */
  static cached(): Map<string, number> {
    return RenownStanding._cache;
  }

  /** Test seam — drop the cache so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly('RenownStanding._resetForTesting');
    RenownStanding._cache = new Map();
  }
}
