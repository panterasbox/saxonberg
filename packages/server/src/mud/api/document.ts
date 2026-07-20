/**
 * DocumentApi — the read / save / list surface for the **path-addressed
 * document store**: the generic, owner-claimed tree of arbitrary JSON the
 * runtime hands a user to fill (the slate's source / template / **document**
 * triad).
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link DocumentLogic} singleton at `/obj/api/document`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /obj/api/document` reloads it.
 *
 * The store is **kind-agnostic** — it persists `{ path, owner, kind, data }`
 * and never inspects `data`; each `kind`'s consumer (e.g. the scripting
 * engine for `kind: 'script'`) owns the meaning + any go-live behavior. The
 * owner is **always derived from `ExecutionContextApi`** (the in-world
 * command-frame giver or a transport's `tagActingAuthor` stamp), never a
 * parameter (memory: gated-api-actor-from-context); an owner owns their own
 * `/home/<self>/` branch.
 *
 * Distinct from the persistence `Document` base class it shares a word
 * with: a `Document` is *how* a row is saved; a `StoredDocument` is the
 * *owned-JSON-in-the-tree* concept this Api stores.
 */

import type { StoredDocument } from "../lib/document/StoredDocument";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { DocumentLogic } from "../obj/api/DocumentLogic";
import { fileURLToPath } from "url";

const LOGIC_PATH = "/obj/api/document";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/DocumentLogic", import.meta.url),
);

/** Resolve the HMR-able DocumentLogic singleton (sync). */
function logic(): DocumentLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "DocumentLogic",
      ) as typeof DocumentLogic | null) ?? DocumentLogic)(),
  );
}

export class DocumentApi {
  /** The stored document at `path`, or null. Callers read its getters. */
  static read(path: string): Promise<StoredDocument | null> {
    return logic().read(path);
  }

  /**
   * Every document at or under `prefix` (the CMS tree's listing input).
   * Filtered in JS over a full scan in v1 — fine for the small store.
   */
  static list(prefix: string): Promise<StoredDocument[]> {
    return logic().list(prefix);
  }

  /**
   * Save a document's `data` (arbitrary JSON) and `kind` at `path`
   * (owner/scope encoded in the path). Find-or-creates. The mutation is
   * access-gated (an owner owns their own `/home/<self>/` branch; else the
   * covering zone / slice-walk `can(write)`), the owner is set from the
   * acting author, and authorship is appended to the provenance ledger
   * keyed on the path. The acting author is derived from context, never a
   * parameter. The store does **not** inspect `data` or run any
   * kind-specific go-live — that belongs to the kind's consumer.
   */
  static save(
    path: string,
    kind: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return logic().save(path, kind, data);
  }
}
