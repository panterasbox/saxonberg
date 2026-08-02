/**
 * ParticipationEvent — one row of the append-only participation signal
 * log, one document per *active time bucket* in the dedicated
 * `participation_events` collection.
 *
 * A plain `Document` (not Stuff): the row IS the signal. This is the
 * quantity-axis substrate of consumer influence — the sibling of renown's
 * `renown_events` (the quality axis). The recompute (`ConsumerLogic`)
 * reads only this log.
 *
 * **Dumb store, smart consumer** (the renown precedent). The row stores
 * the RAW active-bucket fact — no score, no decay. The value-function is
 * applied at recompute time, so re-legislating decay re-scores history
 * without rewriting a single row.
 *
 * **Per-bucket, not per-signal** — the deliberate divergence from renown
 * (which appends one row per signal). A member is credited *once per
 * coarse time bucket* in which they take ≥1 recognized action; the append
 * path is find-or-skip on `{subject, bucket}` (anti-AFK: idle buckets
 * never appear; anti-spam: a macro spamming a bucket earns the one row the
 * bucket already has). `subject` is the giver's durable `templatePath`
 * (`/obj/Avatar/<playerId>`), not the re-minted `stuffId` — the
 * `ConsumerLogic` dispatch tap converts at the storage boundary so standing
 * survives re-clone; the collection is indexed on `{subject}` and
 * `{subject, bucket}` (the dedup
 * lookup) so both stay O(rows-for-this-subject).
 *
 * `bucket` is the real-time bucket key (`floor(realAt / bucketMs)`) —
 * participation measures a *human showing up*, so its clock is wall-clock,
 * not game-time (the divergence from renown's game-time decay). `at` is
 * recorded for parity / correlation only.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
import type { FieldMeta } from '../mixin';

/**
 * Provenance of a participation signal. Open vocabulary; `command` (a
 * recognized player command) is the v1 kind. A later, stricter "meaningful
 * action" filter slots in here with no schema change.
 */
export type ParticipationEventKind = 'command';

/**
 * The fields a caller supplies to append one participation signal — the
 * `ConsumerApi.append` call shape. `subject` is required; `kind` defaults
 * to `command`, `at` to the game-time witness, `realAt` to the wall clock
 * (resolved by the `ConsumerLogic` append seam when omitted).
 */
export interface ParticipationEventFields {
  /** Durable subject id (the giver's `templatePath`). */
  subject: string;
  kind?: ParticipationEventKind;
  /** Game-time SECONDS witness (parity only). */
  at?: number;
  /** Real-time epoch MILLISECONDS — the bucket key + decay clock. */
  realAt?: number;
}

export default class ParticipationEvent extends Document {
  static collectionName = Collections.ParticipationEvents;
  static fieldMeta: FieldMeta = {
    subject: { persistent: true },
    bucket: { persistent: true },
    kind: { persistent: true },
    at: { persistent: true },
    realAt: { persistent: true },
  };

  /** Durable subject id (the giver's `templatePath`) — indexed. */
  subject = '';
  /** The real-time bucket key (`floor(realAt / bucketMs)`) — the dedup key. */
  bucket = 0;
  /** Signal provenance; `command` is the v1 kind. */
  kind: ParticipationEventKind = 'command';
  /** Game-time SECONDS witness — parity / correlation only. */
  at = 0;
  /** Real-time epoch MILLISECONDS — the bucket key + decay clock. */
  realAt = 0;
}
