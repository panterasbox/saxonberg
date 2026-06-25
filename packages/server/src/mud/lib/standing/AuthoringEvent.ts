/**
 * AuthoringEvent — one row of the append-only **authorship ledger**, one
 * document per authoring act in the dedicated `authoring_events` collection.
 *
 * Authorship is **derived, never stored as a mutable stamp**. A
 * `createdByPlayerId` field on a `domain` template would be (a) not an
 * authority — the author controls the `data` blob and could overwrite it,
 * (b) re-stampable on every save, and (c) audit-gapped. So authorship is the
 * `renown_events` / `chronicle` "dumb store, smart consumer" pattern: a
 * row per authoring act, nothing ever overwritten, and `authorOf(path)`
 * **derives** the answer (v1 = the earliest row's author = the original
 * author). This is the first concrete brick of the provenance substrate
 * (see docs/slates/builds/provenance-slate.md); the contributor-set / team
 * split is the deferred enrichment behind the same derivation seam.
 *
 * `author` is the authenticated author's durable `templatePath`, threaded
 * from the gated, access-checked write path — never client-supplied, never
 * read from the author-controlled `data` blob. `path` is the authored
 * template path; the collection is indexed on both.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../../../backend/PersistenceManager';

/** Provenance of an authoring act. Open vocabulary; `save` is the v1 kind. */
export type AuthoringEventKind = 'save';

/**
 * The fields a caller supplies to record one authoring act — the
 * `ProvenanceApi.recordAuthoring` call shape. `path` + `author` are
 * required; `kind` defaults to `save`, `at` to the game-time witness,
 * `realAt` to the wall clock (resolved by the `ProvenanceLogic` seam).
 */
export interface AuthoringEventFields {
  /** The authored template path. */
  path: string;
  /** The authenticated author's durable `templatePath`. */
  author: string;
  kind?: AuthoringEventKind;
  /** Game-time SECONDS witness. */
  at?: number;
  /** Real-time epoch MILLISECONDS — the original-author ordering key. */
  realAt?: number;
}

export default class AuthoringEvent extends Document {
  static collectionName = Collections.AuthoringEvents;
  static persistentFields = ['path', 'author', 'kind', 'at', 'realAt'];

  /** The authored template path — indexed (derive authorship of a path). */
  path = '';
  /** The authenticated author's durable `templatePath` — indexed. */
  author = '';
  /** Authoring-act provenance; `save` is the v1 kind. */
  kind: AuthoringEventKind = 'save';
  /** Game-time SECONDS witness. */
  at = 0;
  /** Real-time epoch MILLISECONDS — the earliest-row ordering key. */
  realAt = 0;
}
