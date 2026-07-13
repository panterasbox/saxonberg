/**
 * ParcelRegistry — singleton Idea holding the **real-property title**
 * substrate: the `PathTrie<ParcelRecord>` coverage index over parcel
 * `extents`, the mint-or-find group-ref resolution, and the title
 * mutations (subdivide / transfer). Lives at `/obj/ParcelRegistry`,
 * sibling to `AccessRegistry` / `AddressRegistry` / `OfficeRegistry`.
 *
 * The thin `ParcelApi` facade (and its `ParcelLogic` singleton at
 * `/obj/api/parcel`) are the only legitimate callers — every public
 * method carries `@CallSecurity(ParcelApiCallers)` so the gate denies any
 * other module. External code that grabs the Registry via
 * `StuffApi.findByTemplatePath` gets a reference but `SecurityError` on
 * any method call. The narrow-entry pattern: one state home (this Stuff),
 * one calling surface (`ParcelApi`), one structurally-enforced path.
 *
 * **The governing security invariant.** Ownership data lives only in the
 * gated `parcels` collection (and its `parcel_events` chain-of-title
 * log), never on the editable `domain` zone template — so a content edit
 * (or a future untrusted content pack) can never forge a title. The
 * `AccessRegistry` consults this registry (via `ParcelApi`) for ownership
 * resolution; access-*decision* logic stays in the access layer.
 *
 * Modeled on `AddressRegistry`'s coverage index: the trie lives on this
 * `PostRegistrationMixin` Stuff (not the stateless logic singleton) so it
 * survives a reload of `api/parcel.ts`; `postRegister` rebuilds it
 * idempotently from the `parcels` collection.
 */

import { Idea } from "../lib/stuff/Idea";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { CallSecurity } from "../lib/security/decorators";
import { SecurityPolicies } from "../lib/security/SecurityPolicies";
import { PathTrie } from "../lib/collections/PathTrie";
import { GroupApi } from "../api/group";
import { ExecutionContextApi } from "../api/execution-context";
import { Group } from "../lib/social/Group";
import type { GroupRef } from "../lib/social/GroupProvider";
import { ParcelRecord, type ParcelOwner } from "../lib/parcel/ParcelRecord";
import { ParcelEvent } from "../lib/parcel/ParcelEvent";
import type { VetoResult } from "../lib/errors";
import type { Stuff } from "../lib/stuff/Stuff";

const ParcelRegistryBase = PostRegistrationMixin(Idea);

// Admit both the Api face module and the logic singleton's template path,
// mirroring `AccessRegistry`'s two-caller policy.
const ParcelApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule("/api/parcel#ParcelApi"),
  SecurityPolicies.FromTemplate("/obj/api/parcel"),
);

/** The state's default-owner group name (the public-held default). */
const STATE_GROUP_NAME = "core";

export default class ParcelRegistry extends ParcelRegistryBase {
  /**
   * Coverage index: parcel `extent` → its `ParcelRecord`. A PathTrie
   * because extents are path-shaped and longest-prefix is exactly the
   * nearest-parcel-bearing-ancestor query the hierarchy walk needs.
   */
  private coverage = new PathTrie<ParcelRecord>();

  /** name → resolved `managed:<id>` ref (mint-or-find), warmed lazily.
   *  The data-driven group resolution moved here from `AccessRegistry`. */
  private cachedGroupRefs = new Map<string, GroupRef>();

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.rebuildIndex();
  }

  /** A load-bearing process-lifetime singleton is never culled. */
  public canEvict(): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  // ── Reads (gated) ──

  /**
   * The most-specific parcel whose `extent` is an ancestor (or equal) of
   * `path`, or null when none covers — the nearest-parcel-bearing-ancestor
   * lookup (the sparse-hierarchy resolution). Sync trie walk.
   */
  @CallSecurity(ParcelApiCallers)
  public coveringParcelOf(path: string): ParcelRecord | null {
    return this.coveringImpl(path);
  }

  /**
   * The total three-rung title chain (governance decision — default title
   * is publicly held; there is no author rung):
   *   1. explicit parcel title (longest-prefix over extents),
   *   2. self-home identity (`/home/<key>/…`, no row),
   *   3. the state (public default) — `{kind:'group', name:'core'}`.
   * Byte-identical to today's core walk for untitled content.
   */
  @CallSecurity(ParcelApiCallers)
  public async ownerOf(path: string): Promise<ParcelOwner> {
    const covering = this.coveringImpl(path);
    const owner = covering?.getOwner() ?? null;
    if (owner) return owner;
    const selfHome = ParcelRecord.selfHomeOwnerOf(path);
    if (selfHome) return selfHome;
    return { kind: "group", name: STATE_GROUP_NAME };
  }

  /**
   * Resolve a `group`-kind owner to a real `managed:<id>` ref — an
   * explicit `ref` wins; else mint-or-find the managed group by `name`
   * (the resolution moved out of `AccessRegistry.resolveOwnerGroupName`).
   * Returns null for a `player`-kind owner or an unresolvable group.
   */
  @CallSecurity(ParcelApiCallers)
  public async resolveOwnerRef(owner: ParcelOwner): Promise<GroupRef | null> {
    return this.resolveRefImpl(owner);
  }

  /**
   * Every managed-group ref named by a `group`-kind parcel owner — the
   * repointed input to `AccessRegistry.ensureAuthorGroups` (which folds in
   * `core` itself). Player-owned parcels contribute nothing.
   */
  @CallSecurity(ParcelApiCallers)
  public async groupOwnerRefs(): Promise<GroupRef[]> {
    const refs = new Set<GroupRef>();
    for (const record of await ParcelRecord.findAll()) {
      const owner = record.getOwner();
      if (!owner || owner.kind !== "group") continue;
      const ref = await this.resolveRefImpl(owner);
      if (ref) refs.add(ref);
    }
    return [...refs];
  }

  // ── Title mutations (gated) ──

  /**
   * Genesis: write the child parcel row (owner inherited from the parent,
   * `parentParcel` set, `extent == zonePath == childPath`), append a
   * `subdivide` event to the chain-of-title log, and warm the trie. The
   * child zone itself is minted by the caller (the controller) before this
   * — storage-only here. Idempotent-ish: a duplicate extent overwrites the
   * row but still logs the event (genesis is expected once).
   */
  @CallSecurity(ParcelApiCallers)
  public async subdivide(
    childPath: string,
    parentExtent: string,
    owner: ParcelOwner,
  ): Promise<ParcelRecord> {
    // Reuse the live trie handle if one already claims this extent (the
    // trie keys on object identity — a fresh DB load would leave a stale
    // duplicate); else a fresh row.
    const record =
      this.coverage.exact(childPath)[0] ??
      (await ParcelRecord.findByExtent(childPath)) ??
      new ParcelRecord();
    record.extent = childPath;
    record.zonePath = childPath;
    record.owner = owner;
    record.parentParcel = parentExtent.length > 0 ? parentExtent : null;
    await record.save();
    await this.appendEvent("subdivide", childPath, null, owner);
    this.reindex(childPath, record);
    return record;
  }

  /**
   * Handoff: append a `transfer` event (from = current owner, to =
   * newOwner) to the append-only log, then update the current-state row's
   * `owner` and re-warm the trie — **never a destructive overwrite**
   * (the prior owner stays recoverable from `parcel_events`). Returns the
   * updated record, or null when no parcel claims `extent`.
   */
  @CallSecurity(ParcelApiCallers)
  public async transfer(
    extent: string,
    newOwner: ParcelOwner,
  ): Promise<ParcelRecord | null> {
    // Mutate the live trie handle in place (identity-keyed). Fall back to a
    // DB load only when the extent isn't indexed yet.
    let record = this.coverage.exact(extent)[0] ?? null;
    if (!record) {
      record = await ParcelRecord.findByExtent(extent);
      if (!record) return null;
      this.reindex(extent, record);
    }
    const prior = record.getOwner();
    await this.appendEvent("transfer", extent, prior, newOwner);
    record.owner = newOwner;
    await record.save();
    return record;
  }

  // ── Lease (use-grant) + unit enumeration (gated) ──

  /**
   * Grant a lease on `extent` to `holder` (the tenant's durable player
   * path), replacing any prior grant for that holder. `expiresAt` is
   * epoch-ms or null (indefinite). Mutates the live trie handle in place
   * (identity-keyed, so `hasUseGrant` reads the same object) and persists.
   * Returns false when no parcel claims `extent`.
   */
  @CallSecurity(ParcelApiCallers)
  public async grantUse(
    extent: string,
    holder: string,
    expiresAt: number | null,
  ): Promise<boolean> {
    const record = await this.recordFor(extent);
    if (!record) return false;
    record.grants = record.grants.filter((g) => g.holder !== holder);
    record.grants.push({
      kind: "lease",
      holder,
      grantedAt: Date.now(),
      expiresAt,
    });
    await record.save();
    return true;
  }

  /** Revoke `holder`'s lease on `extent`; true when a grant was removed. */
  @CallSecurity(ParcelApiCallers)
  public async revokeUse(extent: string, holder: string): Promise<boolean> {
    const record = await this.recordFor(extent);
    if (!record) return false;
    const before = record.grants.length;
    record.grants = record.grants.filter((g) => g.holder !== holder);
    if (record.grants.length === before) return false;
    await record.save();
    return true;
  }

  /** Whether `holder` holds an active (unexpired) lease on `extent`. */
  @CallSecurity(ParcelApiCallers)
  public async hasUseGrant(extent: string, holder: string): Promise<boolean> {
    const record = await this.recordFor(extent);
    return record
      ? ParcelRecord.hasActiveGrant(record, holder, Date.now())
      : false;
  }

  /**
   * The unit parcel `holder` currently leases, or null — a linear scan over
   * the parcel rows (the deferred `heldUnitOf` index is a later seam; a
   * player leases at most one dorm in v1).
   */
  @CallSecurity(ParcelApiCallers)
  public async heldUnitOf(holder: string): Promise<ParcelRecord | null> {
    const now = Date.now();
    for (const record of await ParcelRecord.findAll()) {
      if (ParcelRecord.hasActiveGrant(record, holder, now)) return record;
    }
    return null;
  }

  /**
   * Every child parcel of `parentExtent` (the provisioned units under a
   * dorms parcel) — the reconstitution + lowest-free-slot input.
   */
  @CallSecurity(ParcelApiCallers)
  public async childParcelsOf(parentExtent: string): Promise<ParcelRecord[]> {
    return ParcelRecord.findChildren(parentExtent);
  }

  /**
   * Retire the unit row claiming `extent` (frees its slot for gap reuse) and
   * drop it from the coverage trie. Grants + the row vanish; the D1
   * persistence record is cleared separately by the caller.
   */
  @CallSecurity(ParcelApiCallers)
  public async retire(extent: string): Promise<void> {
    await ParcelRecord.deleteByExtent(extent);
    for (const stale of this.coverage.exact(extent)) {
      this.coverage.remove(extent, stale);
    }
  }

  /** Drop + rebuild the coverage index from the `parcels` collection. */
  @CallSecurity(ParcelApiCallers)
  public async rebuildCoverageIndex(): Promise<void> {
    await this.rebuildIndex();
  }

  // ── Private helpers (ungated — internal callers route here, never the
  // gated public methods, since an intra-singleton self-call resolves the
  // caller to this Registry, outside the ParcelApi allowlist) ──

  private coveringImpl(path: string): ParcelRecord | null {
    return this.coverage.longestPrefix(path)[0] ?? null;
  }

  /** The record claiming exactly `extent` — the live trie handle first (so
   *  in-memory grant mutations stay consistent with reads), else a DB load. */
  private async recordFor(extent: string): Promise<ParcelRecord | null> {
    return this.coverage.exact(extent)[0] ?? ParcelRecord.findByExtent(extent);
  }

  /** Ensure `extent` maps to exactly `record` in the trie (identity-keyed:
   *  drop any stale handle at that extent first). */
  private reindex(extent: string, record: ParcelRecord): void {
    for (const stale of this.coverage.exact(extent)) {
      this.coverage.remove(extent, stale);
    }
    this.coverage.insert(extent, record);
  }

  private async resolveRefImpl(owner: ParcelOwner): Promise<GroupRef | null> {
    if (owner.kind !== "group") return null;
    if (owner.ref) return owner.ref;
    if (owner.name) return this.resolveGroupByName(owner.name);
    return null;
  }

  private async appendEvent(
    kind: "subdivide" | "transfer",
    extent: string,
    from: ParcelOwner | null,
    to: ParcelOwner,
  ): Promise<void> {
    const event = new ParcelEvent();
    event.extent = extent;
    event.event = kind;
    event.from = from;
    event.to = to;
    event.actor = this.actingAuthorPath();
    event.at = Date.now();
    await event.save();
  }

  /** The acting principal's durable path (from context, never a param). */
  private actingAuthorPath(): string {
    const actor = ExecutionContextApi.getActingAuthor() as Stuff | null;
    return actor?.getTemplatePath() ?? "";
  }

  private async resolveGroupByName(name: string): Promise<GroupRef | null> {
    const cached = this.cachedGroupRefs.get(name);
    if (cached) return cached;
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    let group = await provider.findByName(name);
    if (!group) {
      group = new Group();
      group.name = name;
      group.owner = "system";
      await group.save();
    }
    if (!group._id) return null;
    const ref: GroupRef = `managed:${group._id}`;
    this.cachedGroupRefs.set(name, ref);
    return ref;
  }

  private async rebuildIndex(): Promise<void> {
    this.coverage.clear();
    for (const record of await ParcelRecord.findAll()) {
      const extent = record.getExtent();
      if (extent.length > 0) this.coverage.insert(extent, record);
    }
  }
}
