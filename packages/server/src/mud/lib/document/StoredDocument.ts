/**
 * StoredDocument — one record in the **path-addressed document store**:
 * the generic, owner-claimed tree of arbitrary JSON the runtime hands a
 * user to fill.
 *
 * This is the third path-addressed tree (the slate's source / template /
 * **document** triad). Unlike a `Template` (a reusable clone-source that
 * hydrates a Stuff) or git-deployed source (platform code), a stored
 * document is **per-owner runtime state** — created and edited live, owned
 * by whoever claims its `/home/<self>/` (or other granted) branch:
 *
 *   /home/<player>/scripts/<name>     a player's saved script (msh)
 *   /home/<player>/dorm/<room>        (future) dorm customization data
 *   /world/<world>/msh/<name>        managed world content (a pack's msh/)
 *
 * The record carries a **`kind`** discriminator — what kind of object
 * lives here (`'msh'`, `'emote'`, `'recipe'`, … — the pack-installable
 * ones are the closed `DocumentKinds` vocabulary) — and an arbitrary JSON
 * **`data`** payload. The store itself is kind-agnostic (it never inspects
 * `data`); each kind's consumer owns the meaning + any go-live behavior.
 * Scripts are `kind: 'msh'` with `data: { source }` (re-parsed on
 * resolution; never compiled — why scripts reach the runtime-writable tree
 * first). Path-addressing reuses the whole ownership stack
 * (`Zone.ownerGroup`/`AccessApi`, `provenance` keyed on `path`).
 *
 * It `extends Document` only for persistence — distinct from the
 * persistence base class it shares a word with: a `Document` is *how* a
 * row is saved; a `StoredDocument` is the *owned-JSON-in-the-tree* concept.
 */

import { Document } from "../persistence/Document";
import type { FieldMeta } from "../mixin";
import { Collections } from '../persistence/Collections';
import {
  DOCUMENT_KINDS,
  type DocumentKeyValue,
  type DocumentKindSpec,
} from './DocumentKinds';

/**
 * A query over one key of a kind's catalogue card (`DocumentApi.findByKey`).
 * `eq` is equality; `min`/`max` an inclusive range; `order` sorts by the key
 * (the index serves it); `prefix` narrows to a path subtree; `limit` caps.
 */
export interface DocumentKeyQuery {
  eq?: DocumentKeyValue;
  min?: string | number;
  max?: string | number;
  prefix?: string;
  order?: 'asc' | 'desc';
  limit?: number;
}


/**
 * A document write the store refused for TITLE — the acting principal holds
 * no title over the path (controller-liquidity W8). A reason-carrying
 * error, like `BoardRefusal`, so a verb words the refusal by its type and
 * never by matching the message; the message is unchanged for every caller
 * that only reads it.
 */
export class DocumentRefusal extends Error {
  constructor(
    public readonly reason: 'access-denied',
    message: string,
  ) {
    super(message);
    this.name = 'DocumentRefusal';
  }
}

export class StoredDocument extends Document {
  static collectionName = Collections.Documents;
  static fieldMeta: FieldMeta = {
    path: { persistent: true },
    owner: { persistent: true },
    kind: { persistent: true },
    data: { persistent: true },
    keys: { persistent: true },
  };

  /** Canonical path key (owner/scope encoded; e.g. `/home/iris/scripts/wave`). */
  path: string = "";

  /** The owner's durable `templatePath` (who the branch belongs to). */
  owner: string = "";

  /** What kind of object lives here (`'msh'`, `'emote'`, …) — opaque to the store. */
  kind: string = "";

  /** The arbitrary JSON payload (a script's `{ source }`, dorm fields, …). */
  data: Record<string, unknown> = {};

  /**
   * ⭐ The **catalogue card** — the keys this document can be found by
   * besides its path, DERIVED from `data` by its kind's declaration
   * (`DocumentKinds` `keys` + `words`) on every write and never authored.
   * Empty for most documents. Served by one wildcard index
   * (`{kind, 'keys.$**'}`); read with `DocumentApi.findByKey`.
   */
  keys: Record<string, DocumentKeyValue> = {};

  getPath(): string {
    return this.path;
  }

  getOwner(): string {
    return this.owner;
  }

  getKind(): string {
    return this.kind;
  }

  getData(): Record<string, unknown> {
    return this.data;
  }

  getKeys(): Record<string, DocumentKeyValue> {
    return this.keys;
  }

  /**
   * The card a document of `kind` at `path` with `data` carries — every
   * key its kind declares that has a value, plus `word` for a typed-word
   * kind. Both writers call it: {@link save} and the pack installer's row
   * builder (which writes before any hook is loaded). A kind the
   * vocabulary does not declare (a runtime kind the CMS or a brain files)
   * has an empty card — the store is kind-agnostic; only a pack-installable
   * kind is closed. ⚠ Throws on an empty path: the path is the identity.
   */
  static cardOf(
    kind: string,
    path: string,
    data: Record<string, unknown>,
  ): Record<string, DocumentKeyValue> {
    if (!path) {
      throw new Error(
        `StoredDocument: a ${kind || 'kindless'} document has no path — the path is its identity`,
      );
    }
    const spec = (DOCUMENT_KINDS as Record<string, DocumentKindSpec>)[kind];
    const card: Record<string, DocumentKeyValue> = {};
    if (!spec) return card;
    const source = { path, data };
    for (const [key, derive] of Object.entries(spec.keys ?? {})) {
      const value = derive(source);
      if (value !== undefined) card[key] = value;
    }
    if (spec.words) {
      const words = spec.words(source);
      if (words.length === 1) card.word = words[0]!;
      else if (words.length > 1) card.word = words;
    }
    return card;
  }

  /** Writes the derived card with the row — the card is never a second copy to drift. */
  override async save(): Promise<void> {
    this.keys = StoredDocument.cardOf(this.kind, this.path, this.data);
    await super.save();
  }

  /** The one document stored at `path`, or null. */
  static async findByPath(path: string): Promise<StoredDocument | null> {
    const docs = await StoredDocument.find<StoredDocument>({ path });
    return docs[0] ?? null;
  }


  /** Every document of `kind` — the warm-window rebuild's input. */
  static async findByKind(kind: string): Promise<StoredDocument[]> {
    return StoredDocument.find<StoredDocument>({ kind });
  }
}
