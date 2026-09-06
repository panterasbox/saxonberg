/**
 * DispositionEntry — one row of a character's disposition ledger: the
 * append-only evidence the trait layer derives a trait-position from. One
 * document per disposition sub-check in the dedicated `disposition_events`
 * collection.
 *
 * A plain `Document` (not Stuff) — the row IS the entry (the chronicle /
 * Transcript spine: one row per entry, owner-indexed, no growing array).
 * It is the **sibling** of advancement's `TranscriptEntry`, not a realm
 * inside it: the `deed` / `claim` provenance *concept* is reused, but the
 * schema is `{disposition, valence}` (an opposed-pair axis + a signed
 * magnitude) rather than the skill sub-check `{discipline, difficulty,
 * outcome}` — the renown↔regard "sibling, not child" relationship. Both
 * ledgers are fed by one authored {@link ActSignature} ("instrument
 * once"), but they stay separate stores.
 *
 * **What happened, never the score.** The ledger stores raw evidence; the
 * trait-position is *derived on read* over it (see `TraitPosition`) and
 * never stored. Re-tuning the estimator re-derives character without
 * rewriting a row.
 *
 * Two provenances, by `kind`:
 *   - **deed** — a world demonstration (you *acted* a certain way); minted
 *     by a consumer loop at the moment an act resolves.
 *   - **claim** — a seeded / attested disposition (an authored NPC's
 *     established character, or a char-gen seed). The form-then-entrench
 *     model's starting evidence.
 *
 * `owner` is the durable per-character key (`templatePath`); `disposition`
 * is the durable axis `key` (not its templatePath) so a roster re-path
 * leaves evidence valid. The `disposition_events` collection is indexed
 * on `owner` (see `PersistenceManager.createIndexes`) so the owner-scoped
 * read and the future per-player cleanup cascade stay
 * O(rows-for-this-owner).
 */

import { Document } from "../persistence/Document";
import { Collections } from "../persistence/Collections";
import type { FieldMeta } from "../mixin";

/**
 * The fields that compose one disposition row. `disposition` / `valence`
 * are the sub-check; `kind` / `when` / `tags` are act-level context the
 * build seam defaults (`kind` → `deed`, `when` → the game-time witness).
 */
export interface DispositionEntryFields {
  kind?: "deed" | "claim";
  /** The minting archetype (claims only) — see the field doc. */
  archetype?: string;
  /** The opposed-pair axis's durable `key` (e.g. `'sociability'`). */
  disposition: string;
  /** Signed magnitude toward the axis's positive pole. */
  valence: number;
  /** Game-time seconds; defaults to "now" when omitted. */
  when?: number | null;
  tags?: string[];
}

export default class DispositionEntry extends Document {
  static collectionName = Collections.DispositionEvents;
  static fieldMeta: FieldMeta = {
    owner: { persistent: true },
    kind: { persistent: true },
    when: { persistent: true },
    disposition: { persistent: true },
    valence: { persistent: true },
    tags: { persistent: true },
    archetype: { persistent: true },
  };

  /** Durable owner key (the character's `templatePath`) — indexed. */
  owner = "";
  /** Provenance: a world `deed` or a seeded/attested `claim`. */
  kind: "deed" | "claim" = "deed";
  /** Game-time SECONDS magnitude — the estimator folds entries in order. */
  when: number | null = null;
  /** The exercised disposition axis's durable `key`. */
  disposition = "";
  /** Signed magnitude toward the positive pole. */
  valence = 0;
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
