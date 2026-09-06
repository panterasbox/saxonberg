/**
 * TranscriptEntry — one row of a character's Transcript: the append-only
 * evidence ledger advancement derives Competence from. One document per
 * sub-check in the dedicated `transcripts` collection.
 *
 * A plain `Document` (not Stuff): the row IS the entry — the chronicle
 * spine (one row per entry, owner-indexed, no growing array, the
 * `ContactsMixin` 16MB anti-precedent). It is the **sibling** of the
 * chronicle, not a realm inside it: the `deed` / `claim` provenance
 * *concept* is reused, but the schema is the structured learning-event
 * `{discipline, difficulty, outcome}` rather than chronicle's narrative
 * `text` / `order` / `who` — the renown↔regard "sibling, not child"
 * relationship.
 *
 * **What happened, never the score.** The Transcript stores raw evidence;
 * Competence is *derived on read* over it and never stored. Re-legislating
 * the estimator re-scores history without rewriting a row.
 *
 * Two provenances, by `kind`:
 *   - **deed** — a world demonstration (you *did* the thing); minted by a
 *     consumer loop at the moment of resolution.
 *   - **claim** — a study / LMS attestation (you *studied* it); the
 *     academy faucet. Defined for the deferred learning-platform bridge;
 *     no consumer mints claims this increment.
 *
 * `owner` is the durable per-character key (`templatePath`); `discipline`
 * is the durable Discipline `key` (not its templatePath) so Catalog
 * re-paths leave evidence valid. The `transcripts` collection is indexed
 * on `owner` (see `PersistenceManager.createIndexes`) so the owner-scoped
 * read and the future per-player cleanup cascade stay
 * O(rows-for-this-owner).
 */

import { Document } from "../persistence/Document";
import { Collections } from "../persistence/Collections";
import type { Difficulty, Outcome } from "./ActSignature";
import type { FieldMeta } from "../mixin";

/**
 * The fields that compose one Transcript row. `discipline` / `difficulty`
 * / `outcome` are the sub-check; `kind` / `when` / `tags` are act-level
 * context the build seam defaults (`kind` → `deed`, `when` → the
 * game-time witness).
 */
export interface TranscriptEntryFields {
  kind?: "deed" | "claim";
  discipline: string;
  difficulty: Difficulty;
  outcome: Outcome;
  /** Game-time seconds; defaults to "now" when omitted. */
  when?: number | null;
  tags?: string[];
  /** The minting archetype (claims only) — see the field doc. */
  archetype?: string;
}

export default class TranscriptEntry extends Document {
  static collectionName = Collections.Transcripts;
  static fieldMeta: FieldMeta = {
    owner: { persistent: true },
    kind: { persistent: true },
    when: { persistent: true },
    discipline: { persistent: true },
    difficulty: { persistent: true },
    outcome: { persistent: true },
    tags: { persistent: true },
    archetype: { persistent: true },
  };

  /** Durable owner key (the character's `templatePath`) — indexed. */
  owner = "";
  /** Provenance: a world `deed` or a study `claim`. */
  kind: "deed" | "claim" = "deed";
  /** Game-time SECONDS magnitude — the estimator folds entries in this order. */
  when: number | null = null;
  /** The exercised Discipline's durable `key`. */
  discipline = "";
  /** The world-grounded difficulty of the sub-check. */
  difficulty: Difficulty = "standard";
  /** The resolved outcome of the sub-check. */
  outcome: Outcome = "failure";
  /** Open vocabulary — persisted but inert in v1. */
  tags: string[] = [];
  /**
   * ⭐⭐ **Which archetype minted this row** — `""` for anything a
   * character actually did.
   *
   * `kind` separates *authored* from *earned*. It does **not** separate
   * an **archetype claim** from a **deviation claim**, and those are
   * different things: an author who writes "a bartender, but unusually
   * blunt" is stating a departure from a baseline, and
   * `deviation = current derived − archetype baseline` is uncomputable
   * without knowing which baseline.
   *
   * ⚠ It costs one field now and is **unrecoverable later**: provenance
   * separability cannot be retrofitted, because unwinding a sum with no
   * seams is not possible afterwards at any price.
   */
  archetype = "";
}
