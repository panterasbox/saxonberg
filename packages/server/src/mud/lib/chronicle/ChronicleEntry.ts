/**
 * ChronicleEntry — one row of a character's chronicle: an append-only
 * identity ledger, one document per entry in the dedicated `chronicles`
 * collection.
 *
 * A plain `Document` (not Stuff): the row IS the entry. Unlike the
 * belief store, the chronicle has **no in-memory working set** — there
 * is no hot read path (mint is a rare identity moment; the `chronicle`
 * verb reads on demand), so entries live only as documents, fetched
 * owner-scoped when needed. Keeping each entry its own row (vs.
 * one-big-doc-per-owner) avoids the 16MB cap and per-entry whole-array
 * rewrites — the `ContactsMixin` anti-precedent, the same choice the
 * belief store made.
 *
 * `owner` is the durable per-character key (`templatePath`); the
 * `chronicles` collection is indexed on it (see
 * `PersistenceManager.createIndexes`) so the owner-scoped read
 * (`ChronicleEntry.find({ owner })`) and the future per-player cleanup
 * cascade stay O(rows-for-this-owner).
 *
 * **Dumb store, smart consumers.** The entry stores its fields and is
 * fetched owner-scoped; it carries no per-tag meaning, readout logic, or
 * MQL provider. `tags` / `who` are persisted and owner-fetchable but
 * otherwise inert in v1 — designed in for the deferred reputation /
 * alignment / traits / achievements readouts.
 *
 * Two provenances of entry, distinguished by `kind`:
 *   - **deed** — something that happened; `when` is the game-time
 *     witness (seconds magnitude), `text` is `ProseApi`-rendered.
 *   - **claim** — an authored prologue line seeded at char-gen; `order`
 *     places it, `text` is the author-trusted seed.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';

/**
 * The fields a caller supplies to mint one chronicle entry — the
 * `ChronicleApi` call shape. Everything is optional; the build seam
 * (`ChronicleLogic`) resolves defaults: `kind` defaults to `deed`,
 * `template` (rendered via `ProseApi`) takes precedence over `text`, a
 * deed's `when` defaults to the game-time witness, and a claim's `order`
 * is honored while its `when` is forced `null`.
 */
export interface ChronicleEntryFields {
  kind?: 'claim' | 'deed';
  /** Rendered to `text` via `ProseApi` when present (takes precedence). */
  template?: string;
  /** Liquid vars for `template`. */
  vars?: Record<string, unknown>;
  /** Authored line, used when no `template` is given. */
  text?: string;
  /** Deed game-time seconds; defaults to "now" for deeds when omitted. */
  when?: number | null;
  /** Claim prologue order. */
  order?: number | null;
  where?: string | null;
  who?: string[];
  tags?: string[];
  key?: string | null;
}

/** One authored prologue claim seed (char-gen aspiration). */
export interface ChronicleClaimSeed {
  text: string;
  order: number;
}

export default class ChronicleEntry extends Document {
  static collectionName = Collections.Chronicles;
  static persistentFields = [
    'owner',
    'kind',
    'when',
    'order',
    'where',
    'who',
    'text',
    'tags',
    'key',
  ];

  /** Durable owner key (the character's `templatePath`) — indexed. */
  owner = '';
  /** Provenance: a witnessed `deed` or an authored prologue `claim`. */
  kind: 'claim' | 'deed' = 'deed';
  /** Game-time SECONDS magnitude (deeds only); `null` for claims. */
  when: number | null = null;
  /** Authored prologue order (claims only); `null` for deeds. */
  order: number | null = null;
  /** Place `templatePath` ref, or `null`. */
  where: string | null = null;
  /** Entity `templatePath` refs — persisted but inert in v1. */
  who: string[] = [];
  /** Rendered line (deed: `ProseApi`; claim: authored seed). */
  text = "";
  /** Open vocabulary — persisted but inert in v1. */
  tags: string[] = [];
  /** `recordOnce` category-first dedup key, or `null`. */
  key: string | null = null;
}
