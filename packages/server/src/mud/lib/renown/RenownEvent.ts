/**
 * RenownEvent — one row of the append-only, scope-tagged renown signal
 * log, one document per signal in the dedicated `renown_events`
 * collection.
 *
 * A plain `Document` (not Stuff): the row IS the signal. This is the
 * **system of record** for renown — distinct from the `chronicle`
 * (a curated narrative timeline) and from `regard` (a per-pair belief
 * scalar). Renown is the sibling aggregate that sums *these* rows; the
 * recompute reads only this log, never the belief store.
 *
 * **Dumb store, smart consumer.** The row stores the RAW, pre-valence
 * signal — no score, no polarity. The value-function is applied at
 * recompute time (see `RenownLogic`), so re-legislating the valence map
 * re-scores history without rewriting a single row.
 *
 * `subject` is the durable id the signal is *about* (the credited author
 * of the reacted-to act); the `renown_events` collection is indexed on it
 * (see `PersistenceManager.createIndexes`) so the owner-scoped read
 * (`RenownEvent.find({ subject })`) and the decay-ordered slice stay
 * O(rows-for-this-subject). `source` (who emitted the signal) is retained
 * for the future eigenvector weighting — v1 sums flat. A self-reaction is
 * derivable as `source === subject`, so it is not stored.
 *
 * `scope` is flattened to two stored axes — `locality` (the address
 * prefix where it happened, or `null` = global) and `groups` (the
 * objective `Group`s shared by source & subject) — so renown can be
 * aggregated along either axis. `kind` is an open vocabulary: reactions
 * are the v1 signal (`signal = { emote, tags, … }`); engagement samples
 * and recognition-spread slot in later with no schema change.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../../../backend/PersistenceManager';

/** The signal sources that feed renown. Open vocabulary (Wave-1: reaction). */
export type RenownEventKind =
  | 'reaction'
  | 'engagement-sample'
  | 'recognition-spread';

/**
 * A renown scope — the circle a standing is asked about.
 *   - `null` = cooperative-wide (the global polity scope; matches every
 *     event). This is the scope governance reads.
 *   - a `Group` ref (e.g. `'contacts:thieves-guild'`) — matches events
 *     whose `groups` axis contains it.
 *   - a locality address prefix (e.g. `'/university-avenue'`) — matches
 *     events whose `locality` is that prefix or nested under it.
 */
export type RenownScope = string | null;

/**
 * The fields a caller supplies to append one renown signal — the
 * `RenownApi.append` call shape. `subject`/`source` are required; `kind`
 * defaults to `reaction`, `signal` to `{}`, `locality` to `null`,
 * `groups` to `[]`, and `at` to the game-time witness (resolved by the
 * `RenownLogic` append seam when omitted).
 */
export interface RenownEventFields {
  /** Durable id the signal is about (the credited subject). */
  subject: string;
  /** Durable id of the emitter (retained for eigenvector weighting). */
  source: string;
  kind?: RenownEventKind;
  /** Raw, kind-specific payload — for reactions: `{ emote, tags, … }`. */
  signal?: Record<string, unknown>;
  /** Address-prefix scope, or `null` = global. */
  locality?: string | null;
  /** Objective `Group`s shared by source & subject. */
  groups?: string[];
  /** Game-time SECONDS magnitude (for decay). */
  at?: number;
}

export default class RenownEvent extends Document {
  static collectionName = Collections.RenownEvents;
  static persistentFields = [
    'subject',
    'source',
    'kind',
    'signal',
    'locality',
    'groups',
    'at',
  ];

  /** Durable subject id (what the signal is about) — indexed. */
  subject = "";
  /** Durable source id (who emitted it) — retained for eigenvector v2. */
  source = "";
  /** Signal provenance; reactions are the v1 kind. */
  kind: RenownEventKind = 'reaction';
  /** Raw, pre-valence, kind-specific payload. Scored only at recompute. */
  signal: Record<string, unknown> = {};
  /** Address-prefix scope where it happened, or `null` = global. */
  locality: string | null = null;
  /** Objective `Group` refs shared by source & subject (scope axis). */
  groups: string[] = [];
  /** Game-time SECONDS magnitude (for decay weighting at recompute). */
  at = 0;
}
