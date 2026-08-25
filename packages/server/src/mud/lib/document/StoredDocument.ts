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
 *   /home/<player>/scripts/<name>     a player's recorded recipe-script (msh)
 *   /home/<player>/dorm/<room>        (future) dorm customization data
 *   /domain/<world>/msh/<name>        managed world content (a pack's msh/)
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

export class StoredDocument extends Document {
  static collectionName = "documents";
  static fieldMeta: FieldMeta = {
    path: { persistent: true },
    owner: { persistent: true },
    kind: { persistent: true },
    data: { persistent: true },
  };

  /** Canonical path key (owner/scope encoded; e.g. `/home/iris/scripts/wave`). */
  path: string = "";

  /** The owner's durable `templatePath` (who the branch belongs to). */
  owner: string = "";

  /** What kind of object lives here (`'msh'`, `'emote'`, …) — opaque to the store. */
  kind: string = "";

  /** The arbitrary JSON payload (a script's `{ source }`, dorm fields, …). */
  data: Record<string, unknown> = {};

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

  /** The one document stored at `path`, or null. */
  static async findByPath(path: string): Promise<StoredDocument | null> {
    const docs = await StoredDocument.find<StoredDocument>({ path });
    return docs[0] ?? null;
  }

  /** Every document of `kind` — the warm-window rebuild's input. */
  static async findByKind(kind: string): Promise<StoredDocument[]> {
    return StoredDocument.find<StoredDocument>({ kind });
  }

  /**
   * Every document whose path is `prefix` or lies under `prefix/` — the
   * CMS tree's listing input. Filters in JS (over `find({})`) so the
   * store needs no `$regex` index for v1; a prefix index can land later.
   */
  static async findByPrefix(prefix: string): Promise<StoredDocument[]> {
    const all = await StoredDocument.find<StoredDocument>({});
    const under = prefix.endsWith("/") ? prefix : `${prefix}/`;
    return all.filter((s) => s.path === prefix || s.path.startsWith(under));
  }
}
