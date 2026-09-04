/**
 * DocumentApi — the read / save / list surface for the **path-addressed
 * document store**: the generic, owner-claimed tree of arbitrary JSON the
 * runtime hands a user to fill (the slate's source / template / **document**
 * triad).
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link DocumentLogic} singleton at `/platform/idea/api/document`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /platform/idea/api/document` reloads it.
 *
 * The store is **kind-agnostic** — it persists `{ path, owner, kind, data }`
 * and never inspects `data`; each `kind`'s consumer (e.g. the scripting
 * engine for `kind: 'msh'`) owns the meaning + any go-live behavior. The
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
import type { Publisher } from "../lib/press/Publisher";
import type { Stuff } from "../lib/stuff/Stuff";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { DocumentLogic } from "../platform/idea/api/DocumentLogic";
import { fileURLToPath } from "url";
import { CallSecurity } from "../lib/security/decorators";
import { SecurityPolicies } from "../lib/security/SecurityPolicies";
import { SecurityApi } from './security';

/**
 * ⚠⚠ **The release write transport's whole blast radius.** The transport
 * stamps an owner the ordinary `save` gate would never admit, so the set
 * of modules that may reach it is the entire safety argument — and it is
 * one module. If this widens, the document-store ownership story is
 * broken, not just for releases.
 *
 * The gate lives on the Api **static** rather than on the logic method:
 * every logic method's caller is its own Api face, so a policy there
 * would name `DocumentApi` and narrow nothing. (The `CompactApi.assignOffice`
 * → `OfficeController` precedent.)
 */
const RELEASE_TRANSPORT_CALLERS = SecurityPolicies.FromModule(
  "/platform/idea/api/PressLogic#PressLogic",
);

/**
 * ⚠⚠ The herd transport's gate — **the registry singleton itself, and
 * nothing else.**
 *
 * The herdbook's security property is that a keeper can FILE against it
 * and cannot REWRITE what it says: *you file; you do not hold the pen.*
 * `save`'s ordinary gate admits the branch owner, which is the trade —
 * so a keeper drafting a head out could not write, and granting them the
 * branch would hand them the pen. A pinned transport is the way out, and
 * it is the same one the press path takes for a comms director who is
 * not a landowner.
 *
 * ⚠ It names a PACK path, which is normally the tell of a mis-cut. It is
 * not one here: a document KIND is a platform act by construction (its
 * consumer is code, and the installer needs a go-live hook), so naming
 * the one consumer alongside the kind it exists for is the same act
 * rather than a second one. `lint:gates` resolves the string, so a
 * rename cannot orphan it silently.
 */
const HERD_TRANSPORT_CALLERS = SecurityPolicies.FromTemplate(
  "/trade/ranching/idea/HerdRegistry",
);

const LOGIC_PATH = "/platform/idea/api/document";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/DocumentLogic", import.meta.url),
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

  /** Every document of `kind` — e.g. every release, for a warm rebuild. */
  static listOfKind(kind: string): Promise<StoredDocument[]> {
    return logic().listOfKind(kind);
  }

  /**
   * ⚠⚠ **The release write transport — an ownership bypass by
   * construction.** Writes a `kind: 'release'` document **owned by its
   * publisher organization** rather than by the acting author.
   *
   * It exists because {@link DocumentApi.save} gates on self-home /
   * covering zone / slice-walk, which admits the *parcel owner* — not the
   * comms director, and making every comms director a landowner is
   * obviously wrong. Same shape as `PersistableApi` routing capture as the
   * owning principal.
   *
   * Its narrowness is the whole safety argument, and every clause of it
   * is load-bearing: it is **gated to one calling module** (`PressLogic`),
   * takes **no caller-supplied owner** (it takes the publisher it was
   * handed and derives the owner), **refuses a path outside that
   * publisher's own feed branch**, and **pins the `kind`** so it cannot
   * write anything else. The authorization that the caller may publish as
   * this publisher (`mayPublishAs`) sits in front of it.
   */
  @CallSecurity(RELEASE_TRANSPORT_CALLERS)
  static saveRelease(
    publisher: Stuff & Publisher,
    path: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return logic().saveRelease(publisher, path, data);
  }

  /**
   * File or update a **herd** in the ranching trade's register — the
   * herdbook (farmstead D20, P4).
   *
   * ⚠⚠ **An ownership bypass, and narrow only by construction.** It
   * takes **no owner** (the register's branch is fixed inside), refuses
   * any path outside the register, **pins the `kind`** so it cannot
   * write anything else, and is **gated to the registry singleton**,
   * which is where the validation of what a legitimate herd looks like
   * lives.
   *
   * ⭐ Why it exists at all: a record about you must live on somebody
   * else's branch, or its subject can rewrite it — and D79 makes the
   * herdbook a **sales document**, which is the lemons fraud with the
   * engine supplying the pen. Real herdbooks have been kept by breed
   * societies rather than by the men selling the bulls since 1822, for
   * exactly this reason.
   */
  @CallSecurity(HERD_TRANSPORT_CALLERS)
  static saveHerd(path: string, data: Record<string, unknown>): Promise<void> {
    return logic().saveHerd(path, data);
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

  /**
   * Delete the document at `path`. The same mutation gate as `save`
   * (self-home, else the ownership stack); no provenance row — a
   * deletion is not authorship. Returns whether a row existed.
   */
  static delete(path: string): Promise<boolean> {
    return logic().delete(path);
  }
}

SecurityApi.decorateApiClass(DocumentApi);
