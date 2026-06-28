/**
 * ScriptDocument — a saved script in the **path-addressed script store**.
 *
 * Scripts are authored **source code**, not Stuff templates (so NOT the
 * `domain` collection — a template hydrates a Stuff; a script hydrates
 * nothing, the never-cloned-template wart) and not git-deployed platform
 * code (player- and world-authored scripts are created at runtime). They
 * live in a dedicated `scripts` collection (the `Recipe` precedent — a
 * `Document`, reference data), keyed on **path + owner** with owner/scope
 * encoded in the path:
 *
 *   /home/<player>/scripts/<name>     personal (recorded or written)
 *   /domain/<world>/scripts/<name>    managed world content
 *   /obj/lounge/recipes/<name>        the bar's authored recipe-scripts
 *
 * The stored value is the **source text** (canonical, human-editable —
 * what the CMS Monaco surface shows as plain text), re-parsed on
 * resolution. The interpreter reads source directly (no compilation —
 * why scripts reach the runtime-writable tree first); `path`-addressing
 * reuses the whole ownership stack (`Zone.ownerGroup`/`AccessApi`,
 * `provenance` keyed on `path`).
 */

import { Document } from "../persistence/Document";

export class ScriptDocument extends Document {
  static collectionName = "scripts";
  static persistentFields = ["path", "owner", "source"];

  /** Canonical path key (owner/scope encoded; e.g. `/home/iris/scripts/wave`). */
  path: string = "";

  /** The owner's durable `templatePath` (who the path belongs to). */
  owner: string = "";

  /** The script source text — re-parsed on resolution; never compiled. */
  source: string = "";

  getPath(): string {
    return this.path;
  }

  getOwner(): string {
    return this.owner;
  }

  getSource(): string {
    return this.source;
  }

  /** The one script stored at `path`, or null. */
  static async findByPath(path: string): Promise<ScriptDocument | null> {
    const docs = await ScriptDocument.find<ScriptDocument>({ path });
    return docs[0] ?? null;
  }

  /**
   * Every script whose path is `prefix` or lies under `prefix/` — the
   * CMS tree's listing input. Filters in JS (over `find({})`) so the
   * store needs no `$regex` index for v1; a prefix index can land later.
   */
  static async findByPrefix(prefix: string): Promise<ScriptDocument[]> {
    const all = await ScriptDocument.find<ScriptDocument>({});
    const under = prefix.endsWith("/") ? prefix : `${prefix}/`;
    return all.filter((s) => s.path === prefix || s.path.startsWith(under));
  }
}
