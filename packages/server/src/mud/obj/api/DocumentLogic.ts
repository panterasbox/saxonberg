// DocumentLogic — the hot-reloadable logic singleton behind DocumentApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { ZoneApi } from "../../api/zone";
import { AccessApi } from "../../api/access";
import { ParcelApi } from "../../api/parcel";
import { ProvenanceApi } from "../../api/provenance";
import { ExecutionContextApi } from "../../api/execution-context";
import { StoredDocument } from "../../lib/document/StoredDocument";
import { MixinApi } from "../../api/mixin";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Publisher } from "../../lib/press/Publisher";
import { RELEASE_DOCUMENT_KIND } from "../../lib/press/Release";

const DocumentApiCallers = SecurityPolicies.FromModule("/api/document#DocumentApi",
);

/* ─────────────────────────── impl ─────────────────────────── */
//
// All logic lives in module-private functions (the `ScriptLogic` /
// `CraftingLogic` precedent), so there are no intra-singleton `this.x()`
// calls to trip the gate.

/**
 * The acting author — transport-agnostic (in-world command-frame giver OR
 * a REST `tagActingAuthor` stamp), the anti-spoof source for the owner of
 * a write (memory: gated-api-actor-from-context). Never a parameter.
 */
function actingAuthor(): Stuff | null {
  return (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
}

/**
 * True when `path` lies in `actor`'s own `/home/<self>/` branch — keyed on
 * the durable-path basename, so an owner owns exactly the subtree the
 * runtime banks under their name (a player's recorded recipe-scripts, a
 * future dorm's customization).
 *
 * Consumes the shared self-home rule via `ParcelApi.selfHomeOwnerOf` (the
 * property build generalized this base case into the `ownerOf` chain's
 * rung 2 — one `/home/<key>/` rule, kept in one place, not forked). The
 * ownership self-home yields a `player` owner at `/home/<key>`; this
 * actor owns it iff that key is the actor's own. Byte-identical to the
 * former `path.startsWith('/home/${key}/')` check.
 */
function isOwnHomePath(actor: Stuff, path: string): boolean {
  const owner = ParcelApi.selfHomeOwnerOf(path);
  if (!owner || owner.kind !== "player") return false;
  const key = actor.getTemplatePath()?.split("/").filter(Boolean).pop();
  return key !== undefined && owner.templatePath === `/home/${key}`;
}

/**
 * Access-gate a document mutation by path, reusing the existing
 * zone/access stack: an owner always owns their own `/home/<self>/`
 * branch (no broader grant needed); else the covering spatial zone gates
 * via `canMutateZone`; absent one, the slice-walk `can(write)` applies.
 * Returns a denial message, or null when permitted.
 */
async function gateMutation(
  actor: Stuff | null,
  path: string,
): Promise<string | null> {
  if (actor !== null && isOwnHomePath(actor, path)) return null;
  const zone = await ZoneApi.resolveZoneForPath(path);
  if (zone) {
    if (!(await AccessApi.canMutateZone(actor, zone))) {
      return "you don't have permission to mutate that document's zone";
    }
    return null;
  }
  if (!(await AccessApi.can(actor, "write", null))) {
    return "you don't have permission to write that document";
  }
  return null;
}

async function readImpl(path: string): Promise<StoredDocument | null> {
  return StoredDocument.findByPath(path);
}

async function listImpl(prefix: string): Promise<StoredDocument[]> {
  return StoredDocument.findByPrefix(prefix);
}

async function listOfKindImpl(kind: string): Promise<StoredDocument[]> {
  return StoredDocument.findByKind(kind);
}

/**
 * Write a release document **owned by its publisher organization**.
 *
 * ⚠⚠ **This is an ownership bypass by construction, and the only thing
 * keeping it narrow is the shape of its signature plus its gate.**
 * `save` gates on self-home / covering zone / slice-walk, which admits the
 * *parcel owner* — not the comms director. Making every comms director a
 * landowner is obviously wrong, so the press path writes through here
 * instead, the way `PersistableApi` routes capture as the owning
 * principal.
 *
 * Three things keep it honest, and all three are load-bearing:
 *
 *   1. **It takes no caller-supplied owner.** It takes the publisher
 *      organization and derives the owner from it, so there is no
 *      parameter to lie in.
 *   2. **It refuses a path outside that publisher's own feed branch.**
 *      Otherwise a publisher could stamp its ownership anywhere in the
 *      tree.
 *   3. **The `kind` is fixed here, not passed.** It cannot be used to
 *      write anything but a release.
 *
 * The authorization that the caller may publish as this publisher is
 * `mayPublishAs`, in front of this — see `PressLogic`.
 */
async function saveReleaseImpl(
  publisher: Stuff & Publisher,
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!MixinApi.isPublisher(publisher)) {
    throw new Error(
      "DocumentApi.saveRelease: the owner must be a publisher organization",
    );
  }
  const owner = publisher.getTemplatePath() ?? "";
  if (owner.length === 0) {
    throw new Error(
      "DocumentApi.saveRelease: the publisher has no durable path to own by",
    );
  }
  const feed = publisher.getFeedPath();
  if (feed.length === 0 || !path.startsWith(`${feed}/`)) {
    throw new Error(
      `DocumentApi.saveRelease: ${path} is not under ${owner}'s feed ` +
        `(${feed || "unauthored"})`,
    );
  }

  const doc = (await StoredDocument.findByPath(path)) ?? new StoredDocument();
  doc.path = path;
  doc.owner = owner;
  doc.kind = RELEASE_DOCUMENT_KIND;
  doc.data = data;
  await doc.save();

  // Authorship is still the acting author's, keyed on the path — the
  // publisher owns the document, a person wrote it. DocumentLogic is an
  // admitted authoring transport (the `recordAuthoring` gate names
  // `/obj/api/document`).
  await ProvenanceApi.recordAuthoring({ path });
}

async function saveImpl(
  path: string,
  kind: string,
  data: Record<string, unknown>,
): Promise<void> {
  const actor = actingAuthor();
  const denial = await gateMutation(actor, path);
  if (denial !== null) throw new Error(denial);

  // Persist (find-or-create). Owner = the acting author's durable path.
  const doc = (await StoredDocument.findByPath(path)) ?? new StoredDocument();
  doc.path = path;
  doc.owner = actor?.getTemplatePath() ?? "";
  doc.kind = kind;
  doc.data = data;
  await doc.save();

  // Authorship — append a provenance row keyed on the path (author from
  // context, never a param). DocumentLogic is an admitted authoring
  // transport (the `recordAuthoring` gate names `/obj/api/document`).
  await ProvenanceApi.recordAuthoring({ path });
}

async function deleteImpl(path: string): Promise<boolean> {
  const actor = actingAuthor();
  const denial = await gateMutation(actor, path);
  if (denial !== null) throw new Error(denial);
  const doc = await StoredDocument.findByPath(path);
  if (!doc) return false;
  await doc.delete();
  return true;
}

/**
 * DocumentLogic — the hot-reloadable logic singleton behind
 * {@link DocumentApi}.
 *
 * Lives at `/obj/api/document` (a stateless `Stuff` singleton, no backing
 * `Template`); `DocumentApi`'s statics forward here via
 * `StuffApi.singletonSync`. All store logic lives in module-private
 * functions, so there are no intra-singleton `this.x()` calls to trip the
 * gate. Each public method carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class DocumentLogic extends ApiLogic {
  /** See {@link DocumentApi.read}. */
  @CallSecurity(DocumentApiCallers)
  public async read(path: string): Promise<StoredDocument | null> {
    return readImpl(path);
  }

  /** See {@link DocumentApi.list}. */
  @CallSecurity(DocumentApiCallers)
  public async list(prefix: string): Promise<StoredDocument[]> {
    return listImpl(prefix);
  }

  /** See {@link DocumentApi.listOfKind}. */
  @CallSecurity(DocumentApiCallers)
  public async listOfKind(kind: string): Promise<StoredDocument[]> {
    return listOfKindImpl(kind);
  }

  /**
   * See {@link DocumentApi.saveRelease}. ⚠⚠ This is the ownership bypass.
   * The narrowing that matters lives on the **Api static** — every logic
   * method's caller is its own face, so a policy here would name
   * `DocumentApi` and narrow nothing.
   */
  @CallSecurity(DocumentApiCallers)
  public async saveRelease(
    publisher: Stuff & Publisher,
    path: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return saveReleaseImpl(publisher, path, data);
  }

  /** See {@link DocumentApi.save}. */
  @CallSecurity(DocumentApiCallers)
  public async save(
    path: string,
    kind: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return saveImpl(path, kind, data);
  }

  /** See {@link DocumentApi.delete}. */
  @CallSecurity(DocumentApiCallers)
  public async delete(path: string): Promise<boolean> {
    return deleteImpl(path);
  }
}
