/**
 * ProducerEvent — one row of the append-only producer signal log, one
 * document per *attributed-engagement bucket* in the dedicated
 * `producer_events` collection.
 *
 * A plain `Document` (not Stuff): the row IS the signal. This is the MAKE
 * faucet's substrate — the third influence stock, sibling of consumer's
 * `participation_events` (PLAY) and the deferred patron stock (FUND).
 * Production standing measures *current draw on an author's released
 * content*: when a player engages (issues a recognized command) inside a
 * zone whose covering content an author is credited for, that author earns
 * an attributed-engagement bucket.
 *
 * **Dumb store, smart consumer** (the renown / participation precedent).
 * The row stores the RAW attributed-bucket fact — no score, no decay. The
 * value-function is applied at recompute (`ProducerLogic`), so re-legislating
 * decay re-scores history without rewriting a row.
 *
 * **Routing key is the author** (`author`, a durable `templatePath` resolved
 * via the append-only authoring ledger — never a mutable stamp), not the
 * engaging player. `actor` (the engaging player's `templatePath`, same id
 * space) is retained for the `author ≠ actor` self-credit exclusion and the
 * `{author, actor, bucket}` dedup — one player engaging one author's content
 * is credited to that author once per bucket (anti-inflation). `weight`
 * (default 1) is forward-compatible with the deferred team / co-authorship
 * split (a weighted credit vector) — it needs no migration.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../../../backend/PersistenceManager';

/**
 * Provenance of a producer signal. Open vocabulary; `engagement` (a
 * recognized player command inside attributed content) is the v1 kind.
 */
export type ProducerEventKind = 'engagement';

/**
 * The fields a caller supplies to append one producer signal — the
 * `ProducerApi.append` call shape. `author` + `actor` are required; `weight`
 * defaults to 1, `kind` to `engagement`, `at` to the game-time witness,
 * `realAt` to the wall clock (the bucket is derived from `realAt` by the
 * `ProducerLogic` append seam).
 */
export interface ProducerEventFields {
  /** Durable id of the credited author (the routing key — a `templatePath`). */
  author: string;
  /** Durable id of the engaging player (`templatePath`; for A≠P + dedup). */
  actor: string;
  /** The engaged zone's template path (provenance / audit). */
  zonePath?: string;
  /** Credit weight (default 1; the co-authorship-split seam). */
  weight?: number;
  kind?: ProducerEventKind;
  /** Game-time SECONDS witness (parity only). */
  at?: number;
  /** Real-time epoch MILLISECONDS — the bucket key + decay clock. */
  realAt?: number;
}

export default class ProducerEvent extends Document {
  static collectionName = Collections.ProducerEvents;
  static persistentFields = [
    'author',
    'actor',
    'zonePath',
    'weight',
    'bucket',
    'kind',
    'at',
    'realAt',
  ];

  /** Durable author id (the routing key) — indexed. */
  author = '';
  /** Durable engaging-player id (A≠P + dedup). */
  actor = '';
  /** The engaged zone's template path. */
  zonePath = '';
  /** Credit weight (default 1) — the team-split seam. */
  weight = 1;
  /** The real-time bucket key (`floor(realAt / bucketMs)`) — the dedup key. */
  bucket = 0;
  /** Signal provenance; `engagement` is the v1 kind. */
  kind: ProducerEventKind = 'engagement';
  /** Game-time SECONDS witness — parity / correlation only. */
  at = 0;
  /** Real-time epoch MILLISECONDS — the bucket key + decay clock. */
  realAt = 0;
}
