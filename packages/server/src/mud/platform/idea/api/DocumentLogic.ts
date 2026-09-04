// DocumentLogic — the hot-reloadable logic singleton behind DocumentApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import { AccessApi } from "../../../api/access";
import { ParcelApi } from "../../../api/parcel";
import { ProvenanceApi } from "../../../api/provenance";
import { ExecutionContextApi } from "../../../api/execution-context";
import { StoredDocument } from "../../../lib/document/StoredDocument";
import { MixinApi } from "../../../api/mixin";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Publisher } from "../../../lib/press/Publisher";
import { RELEASE_DOCUMENT_KIND } from "../../../lib/press/Release";
import { CommandApi } from "../../../api/command";

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
/** The herd register's branch — see {@link saveHerdImpl}. */
const HERD_REGISTER_PREFIX = '/trade/ranching/herds';

/** What a filed herd is owned BY: the trade, never the keeper. */
const HERD_REGISTER_OWNER = '/trade/ranching';

/** The kind a herd write is pinned to. */
const HERD_DOCUMENT_KIND = 'herd';

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
  const key = actor.getIdentityPath()?.split("/").filter(Boolean).pop();
  return key !== undefined && owner.templatePath === `/home/${key}`;
}

/**
 * Access-gate a document mutation by path on PARCEL TITLE (content-packs
 * wave 2, D11): an owner always owns their own `/home/<self>/` branch
 * (no broader grant needed); otherwise `AccessApi.canAtPath` resolves
 * the covering title through `ParcelApi.ownerOf` — rung 1 a parcel, rung
 * 2 the self-home, rung 3 the state — and asks that owner's `can()`
 * dispatch. No zone walk, no `core` literal. Returns a denial message,
 * or null when permitted.
 */
async function gateMutation(
  actor: Stuff | null,
  path: string,
): Promise<string | null> {
  if (actor !== null && isOwnHomePath(actor, path)) return null;
  if (!(await AccessApi.canAtPath(actor, "write-document", path))) {
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
  // `/platform/idea/api/document`).
  await ProvenanceApi.recordAuthoring({ path });
}

/**
 * The gate strings of a command view — everything that names TypeScript:
 * the verb-level and per-subcommand `controller:` values, and every
 * validator / `requires` reference at any level. Rendered as a sorted
 * list so two views compare as sets.
 */
function codeFieldsOf(view: Record<string, unknown> | undefined): string[] {
  if (!view) return [];
  const out: string[] = [];
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const fieldsOf = (fields: unknown, where: string): void => {
    const arr = Array.isArray(fields)
      ? fields
      : fields && typeof fields === "object"
        ? Object.values(fields as Record<string, unknown>)
        : [];
    for (const f of arr) {
      const r = (f as { requires?: unknown; validators?: unknown }) ?? {};
      for (const v of list(r.validators)) out.push(`${where}.validators:${v}`);
      const req = r.requires;
      if (typeof req === "string") out.push(`${where}.requires:${req}`);
      for (const v of list(req)) out.push(`${where}.requires:${v}`);
    }
  };
  if (typeof view.controller === "string") out.push(`controller:${view.controller}`);
  for (const v of list(view.validators)) out.push(`validators:${v}`);
  fieldsOf(view.args, "args");
  fieldsOf(view.options, "options");
  fieldsOf(view.payload, "payload");
  const subs = (view.subcommands ?? {}) as Record<string, Record<string, unknown>>;
  for (const [name, sub] of Object.entries(subs)) {
    if (!sub || typeof sub !== "object") continue;
    if (typeof sub.controller === "string") out.push(`sub.${name}.controller:${sub.controller}`);
    for (const v of list(sub.validators)) out.push(`sub.${name}.validators:${v}`);
    fieldsOf(sub.args, `sub.${name}.args`);
    fieldsOf(sub.options, `sub.${name}.options`);
  }
  return out.sort();
}

/**
 * Did a command view's CODE-naming fields change? `controller` at any
 * level, or the validator / `requires` SET at any level — any change,
 * not subset-only: a validator is a gate, and removing one widens
 * dispatch just as adding one narrows it (the `TemplateLogic` brain
 * rule's shape). A new view (`prev` undefined) whose fields are set
 * counts as a change from nothing.
 */
function codeFieldsChanged(
  prev: Record<string, unknown> | undefined,
  next: Record<string, unknown>,
): boolean {
  return JSON.stringify(codeFieldsOf(prev)) !== JSON.stringify(codeFieldsOf(next));
}

/**
 * Write a **herd** document, owned by the ranching trade's own branch.
 *
 * ⚠⚠ **An ownership bypass by construction**, and — exactly as
 * `saveRelease` is — narrow only because of the shape of its signature
 * plus its gate. `save` gates on self-home / covering title, which
 * admits the *branch owner*; the herdbook's whole point is that its
 * subject is **not** the branch owner:
 *
 * > **You file; you do not hold the pen.**
 *
 * A keeper must be able to draft a head out and turn it back in — which
 * writes the record — while remaining unable to rewrite what the record
 * SAYS about their animals. Routing those writes through a pinned
 * transport is how that is arranged, and it is the same arrangement the
 * press path makes for a comms director who is not a landowner.
 *
 * Four things keep it honest, and all four are load-bearing:
 *
 *   1. **It takes no owner.** The owner is the registry branch, fixed
 *      here, so there is no parameter to lie in.
 *   2. **It refuses a path outside the register.** A caller cannot stamp
 *      the trade's ownership anywhere else in the tree.
 *   3. **The `kind` is pinned here, not passed.** It cannot write
 *      anything but a herd.
 *   4. **The caller is gated to the registry singleton itself**, which
 *      is where the validation of what a legitimate herd looks like
 *      lives.
 *
 * ⚠ The kernel names a pack path in that gate, which is ordinarily the
 * tell of a mis-cut. It is not one here: a document KIND is a platform
 * act by construction (its consumer is code and the installer needs a
 * go-live hook), and naming the one consumer alongside the kind it was
 * declared for is the same act, not a second one. `lint:gates` resolves
 * the string, so a rename cannot silently orphan it.
 */
async function saveHerdImpl(
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!path.startsWith(`${HERD_REGISTER_PREFIX}/`)) {
    throw new Error(
      `DocumentApi.saveHerd: ${path} is not in the herd register ` +
        `(${HERD_REGISTER_PREFIX})`,
    );
  }
  const doc = (await StoredDocument.findByPath(path)) ?? new StoredDocument();
  doc.path = path;
  doc.owner = HERD_REGISTER_OWNER;
  doc.kind = HERD_DOCUMENT_KIND;
  doc.data = data;
  await doc.save();
}

async function saveImpl(
  path: string,
  kind: string,
  data: Record<string, unknown>,
): Promise<void> {
  const actor = actingAuthor();
  const denial = await gateMutation(actor, path);
  if (denial !== null) throw new Error(denial);

  const existing = await StoredDocument.findByPath(path);

  if (kind === COMMAND_VIEW_KIND) {
    // ⚠ A command view names TypeScript — its `controller:` and every
    // validator are code references, and changing one is WIZARD code
    // trust (access.md), not content authoring. The installer never
    // sees this (it writes through PersistApi, bootstrap-exempt like
    // templates); the CMS and any runtime writer do.
    if (
      codeFieldsChanged(existing?.getData(), data) &&
      !(await AccessApi.isWizard(actor))
    ) {
      throw new Error(
        "changing a command view's controller or validators names TypeScript — " +
          "that is wizard code trust (see access.md)",
      );
    }
    // A malformed view is refused at the chokepoint, never stored.
    const trail = CommandApi.validateCommandView(data);
    if (trail !== null) {
      throw new Error(`command view ${path} does not conform:\n${trail}`);
    }
  }

  // Persist (find-or-create). Owner = the acting author's durable path.
  const doc = existing ?? new StoredDocument();
  doc.path = path;
  doc.owner = actor?.getTemplatePath() ?? "";
  doc.kind = kind;
  doc.data = data;
  await doc.save();

  // Authorship — append a provenance row keyed on the path (author from
  // context, never a param). DocumentLogic is an admitted authoring
  // transport (the `recordAuthoring` gate names `/platform/idea/api/document`).
  await ProvenanceApi.recordAuthoring({ path });

  // Go-live: a command view reaches the dispatcher without a restart.
  if (kind === COMMAND_VIEW_KIND) await CommandApi.reload(path);
}

/** The document kind a command view is stored under. */
const COMMAND_VIEW_KIND = "command-view";

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
 * Lives at `/platform/idea/api/document` (a stateless `Stuff` singleton, no backing
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

  /**
   * See {@link DocumentApi.saveHerd}. ⚠⚠ The second ownership bypass,
   * and the narrowing lives on the **Api static** for `saveRelease`'s
   * reason exactly.
   */
  @CallSecurity(DocumentApiCallers)
  public async saveHerd(
    path: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return saveHerdImpl(path, data);
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
