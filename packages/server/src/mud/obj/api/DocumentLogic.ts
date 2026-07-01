// DocumentLogic — the hot-reloadable logic singleton behind DocumentApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from "../../lib/stuff/Idea";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { ZoneApi } from "../../api/zone";
import { AccessApi } from "../../api/access";
import { ProvenanceApi } from "../../api/provenance";
import { ExecutionContextApi } from "../../api/execution-context";
import { StoredDocument } from "../../lib/document/StoredDocument";
import type { Stuff } from "../../lib/stuff/Stuff";

const DocumentApiCallers = SecurityPolicies.FromModule(
  "api/document#DocumentApi",
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
 * future dorm's customization). The self-owner base case the broader
 * per-`/home/` access model will build on.
 */
function isOwnHomePath(actor: Stuff, path: string): boolean {
  const key = actor.getTemplatePath()?.split("/").filter(Boolean).pop();
  return key !== undefined && path.startsWith(`/home/${key}/`);
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
export class DocumentLogic extends Idea {
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

  /** See {@link DocumentApi.save}. */
  @CallSecurity(DocumentApiCallers)
  public async save(
    path: string,
    kind: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return saveImpl(path, kind, data);
  }
}
