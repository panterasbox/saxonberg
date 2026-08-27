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
import type { ParcelSpace } from "../lib/parcel/ParcelRecord";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { SecurityApi } from '../api/security';
import { CallSecurity } from "../lib/security/decorators";
import { SecurityPolicies } from "../lib/security/SecurityPolicies";
import { PathTrie } from "../lib/collections/PathTrie";
import { GroupApi } from "../api/group";
import { ExecutionContextApi } from "../api/execution-context";
import { Group } from "../lib/social/Group";
import type { GroupRef } from "../lib/social/GroupProvider";
import {
  ParcelRecord,
  type ParcelOwner,
  type TitleClaim,
  type TitleGrantOutcome,
} from "../lib/parcel/ParcelRecord";
import { ParcelEvent } from "../lib/parcel/ParcelEvent";
import { LandUses, type LandUse } from "../lib/parcel/LandUse";
import type { Quantity } from "../lib/quantity";
import type { VetoResult } from "../lib/errors";
import type { Stuff } from "../lib/stuff/Stuff";

const ParcelRegistryBase = PostRegistrationMixin(Idea);

// Admit both the Api face module and the logic singleton's template path,
// mirroring `AccessRegistry`'s two-caller policy.
const ParcelApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule("/api/parcel#ParcelApi"),
  SecurityPolicies.FromTemplate("/obj/api/parcel"),
);

/**
 * migration-note: the wave-2 corpo board groups, retired by content-packs
 * wave 3 (each corpo organization holds its own branch). `grant` treats a
 * title one of them holds exactly like a `core`-held one. Delete in wave 4.
 */
const RETIRED_BOARDS: ReadonlySet<string> = new Set([
  "aevex", "goodkin", "hollis", "veshko", "vionne",
]);

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
   * What may be done on the ground at `path` — the longest-prefix land-use
   * read. Resolve the covering parcel, then walk `parentParcel` upward for
   * the first row that declares a use; ground nothing claims answers
   * `wild`.
   *
   * `wild` admits nothing, which makes the default **fail-closed**: most
   * parcel rows are path-branch titles over the template tree (`/studio`,
   * `/obj/lounge`), not ground, and none of them should read as cultivable
   * merely because nobody thought to zone them.
   *
   * A read — no `assertFieldMutation`. The five mutators below carry it.
   */
  @CallSecurity(ParcelApiCallers)
  public landUseOf(path: string): LandUse {
    return this.landUseOfImpl(path);
  }

  /** Ungated internal — `subdivide` resolves the parent's use with it. */
  private landUseOfImpl(path: string): LandUse {
    let record = this.coveringImpl(path);
    // Bounded by construction: `parentParcel` edges point strictly upward
    // through the sparse hierarchy. The seen-set is belt-and-braces
    // against a hand-edited cycle in the collection.
    const seen = new Set<string>();
    while (record) {
      const use = record.getLandUse();
      if (use !== null) return use;
      const parent = record.getParentParcel();
      if (parent === null || seen.has(parent)) break;
      seen.add(parent);
      record = this.coverage.exact(parent)[0] ?? null;
    }
    return "wild";
  }

  /**
   * The two-rung title chain (content-packs wave 3: there is no state
   * default any more — an untitled path is UNTITLED, and every `can`
   * there fails closed):
   *   1. explicit parcel title (longest-prefix over extents),
   *   2. self-home identity (`/home/<key>/…`, no row),
   *   — else `null`.
   */
  @CallSecurity(ParcelApiCallers)
  public async ownerOf(path: string): Promise<ParcelOwner | null> {
    const covering = this.coveringImpl(path);
    const owner = covering?.getOwner() ?? null;
    if (owner) return owner;
    return ParcelRecord.selfHomeOwnerOf(path);
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
   * former input to the retired author scope (which folded in
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

  /** Every parcel row, as stored (the held-extents walk's input). */
  @CallSecurity(ParcelApiCallers)
  public async allRecords(): Promise<ParcelRecord[]> {
    return ParcelRecord.findAll();
  }

  // ── Title mutations (gated) ──

  /**
   * Genesis: write the child parcel row (owner inherited from the parent,
   * `parentParcel` set, `extent == zonePath == childPath`), append a
   * `subdivide` event to the chain-of-title log, and warm the trie. The
   * child zone itself is minted by the caller (the controller) before this
   * — storage-only here. Idempotent-ish: a duplicate extent overwrites the
   * row but still logs the event (genesis is expected once).
   *
   * `area`/`storeys` declare the child's extent (0 = unmeasured, the
   * pre-field default) and `landUse` its zoning (null = inherit). **This
   * is where zoning constrains a lot** — an area outside the effective
   * use's permissible band is refused, naming both. One check at mint
   * time, not a simulation.
   */
  @CallSecurity(ParcelApiCallers)
  public async subdivide(
    childPath: string,
    parentExtent: string,
    owner: ParcelOwner,
    area = 0,
    storeys = 1,
    landUse: LandUse | null = null,
  ): Promise<ParcelRecord> {
    // Sandbox needs-a-guard (docs/subsystems/sandbox.md): field-visible
    // shared state; denied under circle scope with a receipt.
    SecurityApi.assertFieldMutation(this, 'subdivide');
    // ── the ground/floor ledger (D17) ────────────────────────────────
    // A child conserves against its parent's FLOOR area (`area × storeys`),
    // not its ground area. Every ground parcel is `storeys: 1`, so this is
    // the plain conservation rule there and unchanged for them; a building
    // at four storeys may let four times its footprint, which is the case a
    // rule written against `area` alone would refuse on the second floor.
    //
    // Unmeasured land (`area: 0`) is not policed — every parcel that
    // predates the field keeps behaving exactly as it did.
    if (area > 0 && parentExtent.length > 0) {
      const parent = await ParcelRecord.findByExtent(parentExtent);
      const ceiling = parent?.getGrossFloorArea() ?? 0;
      if (ceiling > 0) {
        const taken = (await this.childAreaTotal(parentExtent, childPath)) + area;
        if (taken > ceiling) {
          throw new Error(
            `ParcelRegistry.subdivide: ${childPath} would take ${taken} m² of ` +
              `${parentExtent}'s ${ceiling} m² (area ${parent?.getArea() ?? 0} × ` +
              `${parent?.getStoreys() ?? 1} storeys)`,
          );
        }
      }
    }
    // ── zoning: the USE half of the same act (living-world phase 2) ──
    // The conservation check above asks "does it fit"; this asks "is a
    // lot this size sane for what it is FOR". The effective use is the
    // declared one, else whatever the parent's chain already says, and
    // it is checked BEFORE anything is touched so a refusal leaves
    // neither a row nor a mutated live record behind.
    //
    // ⚠ Measured against `area`, NOT `area × storeys`: the band is a
    // GROUND-area band, and a four-storey building stands on the same
    // dirt as a one-storey one. Multiplying would refuse a modest tower
    // for being a large lot.
    const effectiveUse =
      landUse ??
      (parentExtent.length > 0 ? this.landUseOfImpl(parentExtent) : "wild");
    if (!LandUses.admitsArea(effectiveUse, area)) {
      const band = LandUses.areaBandOf(effectiveUse);
      throw new RangeError(
        `ParcelRegistry.subdivide: ${area} m² is outside the permissible ` +
          `area for ${effectiveUse} ground (${band.min}–${band.max} m²)`,
      );
    }

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
    record.area = area;
    record.storeys = storeys;
    record.setLandUse(landUse);
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
    // Sandbox needs-a-guard (docs/subsystems/sandbox.md): field-visible
    // shared state; denied under circle scope with a receipt.
    SecurityApi.assertFieldMutation(this, 'transfer');
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

  /**
   * ⭐ The installer's title seam (content-packs wave 3): apply a pack's
   * declared claim. Absent → write the row + a `grant` event → `granted`.
   * Present under the **same holder** → `kept` (no write, no event).
   * Present under a **different holder** → `conflict` (no write; the
   * caller records it). Present under the retired state default (the
   * `core` group) → transferred to the claim's holder with a `transfer`
   * event and one log line → `migrated`.
   *
   * migration-note: the `core`-held branch is the ONE data touch wave 3
   * makes to existing title — the dev DB's `/studio` and `/compact` rows
   * were seeded `core`-held, and "no new title over an existing one" is
   * read as *over one held by someone real*. Delete the branch in wave 4.
   */
  @CallSecurity(ParcelApiCallers)
  public async grant(
    claim: TitleClaim,
  ): Promise<{ outcome: TitleGrantOutcome; holder: ParcelOwner }> {
    SecurityApi.assertFieldMutation(this, "grant");
    ParcelRegistry.validateClaim(claim);
    const existing = await this.recordFor(claim.extent);
    if (existing) {
      this.reindex(claim.extent, existing);
      const current = existing.getOwner();
      if (current && (await this.sameHolder(current, claim.holder))) {
        return { outcome: "kept", holder: current };
      }
      // migration-note: the retired state default hands the row over —
      // and so do the five retired wave-2 corpo BOARD groups, whose
      // /corpo/<key> title passes to the corpo organization that now
      // claims it. Both branches are deleted in wave 4.
      if (
        current?.kind === "group" &&
        (current.name === "core" || // migration-note: the retired state default
          (current.name !== undefined && RETIRED_BOARDS.has(current.name)))
      ) {
        await this.appendEvent("transfer", claim.extent, current, claim.holder);
        existing.owner = claim.holder;
        await existing.save();
        console.info(
          `ParcelRegistry: migrated '${claim.extent}' from the retired ` +
            `state default to ${ParcelRegistry.describeHolder(claim.holder)}`,
        );
        return { outcome: "migrated", holder: claim.holder };
      }
      return { outcome: "conflict", holder: current ?? claim.holder };
    }
    const record = new ParcelRecord();
    record.extent = claim.extent;
    record.zonePath = claim.extent;
    record.owner = claim.holder;
    record.parentParcel = claim.parentParcel ?? null;
    record.setLandUse(claim.landUse ?? null);
    record.area = typeof claim.areaM2 === "number" ? claim.areaM2 : 0;
    await record.save();
    await this.appendEvent("grant", claim.extent, null, claim.holder);
    this.reindex(claim.extent, record);
    return { outcome: "granted", holder: claim.holder };
  }

  /** The shape checks `ParcelSeeder` used to run, now at the seam. */
  private static validateClaim(claim: TitleClaim): void {
    if (typeof claim.extent !== "string" || !claim.extent.startsWith("/")) {
      throw new Error(`ParcelRegistry.grant: malformed extent '${claim.extent}'`);
    }
    const holder = claim.holder;
    if (!holder || typeof holder.kind !== "string") {
      throw new Error(`ParcelRegistry.grant: '${claim.extent}' needs a typed holder`);
    }
    if (holder.kind === "group" && !holder.name && !holder.ref) {
      throw new Error(
        `ParcelRegistry.grant: group holder of '${claim.extent}' needs a name or ref`,
      );
    }
    if (holder.kind !== "group" && !holder.templatePath) {
      throw new Error(
        `ParcelRegistry.grant: ${holder.kind} holder of '${claim.extent}' needs a templatePath`,
      );
    }
    // Fail rather than silently seeding an unknown use: a typo reads as
    // `wild` through the inheritance walk, indistinguishable from
    // "deliberately unzoned".
    if (claim.landUse !== undefined && !LandUses.isLandUse(claim.landUse)) {
      throw new Error(
        `ParcelRegistry.grant: '${claim.extent}' declares unknown landUse ` +
          `'${String(claim.landUse)}' (expected one of ${LandUses.ALL.join(", ")})`,
      );
    }
    if (claim.areaM2 !== undefined && !(claim.areaM2 > 0)) {
      throw new Error(
        `ParcelRegistry.grant: '${claim.extent}' declares a non-positive areaM2 (${claim.areaM2})`,
      );
    }
  }

  /** Same principal? Kind + key; a ref-only group compares by resolved ref. */
  private async sameHolder(a: ParcelOwner, b: ParcelOwner): Promise<boolean> {
    if (a.kind !== b.kind) return false;
    if (a.kind !== "group" || b.kind !== "group") {
      return (a as { templatePath: string }).templatePath ===
        (b as { templatePath: string }).templatePath;
    }
    if (a.name && b.name) return a.name === b.name;
    const refA = await this.resolveRefImpl(a);
    const refB = await this.resolveRefImpl(b);
    return refA !== null && refA === refB;
  }

  private static describeHolder(owner: ParcelOwner): string {
    if (owner.kind === "group") return `group '${owner.name ?? owner.ref ?? "?"}'`;
    return `${owner.kind} '${owner.templatePath}'`;
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
    // Sandbox needs-a-guard (docs/subsystems/sandbox.md): field-visible
    // shared state; denied under circle scope with a receipt.
    SecurityApi.assertFieldMutation(this, 'grantUse');
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
    // Sandbox needs-a-guard (docs/subsystems/sandbox.md): field-visible
    // shared state; denied under circle scope with a receipt.
    SecurityApi.assertFieldMutation(this, 'revokeUse');
    const record = await this.recordFor(extent);
    if (!record) return false;
    const before = record.grants.length;
    record.grants = record.grants.filter((g) => g.holder !== holder);
    if (record.grants.length === before) return false;
    await record.save();
    // Sandbox witness (a direct call, no new global event): a guest
    // revoked while INSIDE the extent's circle is reaped — their wire
    // body exits, re-attaching at their parked avatar (the non-event
    // eviction the wire-body model makes free). Dynamic import: the
    // sandbox facade sits above this registry in the module graph.
    try {
      const { SandboxApi } = await import('../api/sandbox');
      const session = SandboxApi.sessionForScope(extent);
      if (session) {
        const key = holder.split('/').filter(Boolean).pop() ?? holder;
        const wireBody = SandboxApi.activeBodyFor(key);
        if (
          wireBody &&
          SandboxApi.liveSessionForPlayer(key)?.scope === extent
        ) {
          await SandboxApi.exit(wireBody);
        }
      }
    } catch (err) {
      console.warn('[sandbox] revoke-while-inside reap failed:', err);
    }
    return true;
  }

  /**
   * Set (re-key) the lock keyway on `extent` — the door's lock identity, minted
   * fresh at each provision so old keys stop matching. Mutates the live trie
   * handle in place (so a sync door read via the DormWarren cache stays
   * consistent) and persists. False when no parcel claims `extent`.
   */
  @CallSecurity(ParcelApiCallers)
  public async setKeyway(extent: string, keyway: string): Promise<boolean> {
    const record = await this.recordFor(extent);
    if (!record) return false;
    record.keyway = keyway;
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
    // Sandbox needs-a-guard (docs/subsystems/sandbox.md): field-visible
    // shared state; denied under circle scope with a receipt.
    SecurityApi.assertFieldMutation(this, 'retire');
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

  /**
   * The area already taken by `parentExtent`'s children, excluding
   * `exceptExtent` (so re-subdividing an existing child is not counted
   * twice).
   */
  private async childAreaTotal(
    parentExtent: string,
    exceptExtent: string,
  ): Promise<number> {
    const kids = await ParcelRecord.find<ParcelRecord>({
      parentParcel: parentExtent,
    });
    return kids
      .filter((k) => k.getExtent() !== exceptExtent)
      .reduce((sum, k) => sum + k.getArea(), 0);
  }

  /**
   * **Workable area** — `area − Σ children.area`, derived on read and never
   * stored (D17). A stored copy would need reconciling every time a
   * structure was added, which is the duplication argument the chattel
   * index already had.
   *
   * Any child consumes ground whether it is a building or a sub-lot, so
   * there is no structure/non-structure distinction to maintain — and a
   * building's **footprint** needs no field of its own, because it simply
   * IS that building parcel's `area`.
   */
  @CallSecurity(ParcelApiCallers)
  public async workableAreaOf(extent: string): Promise<number> {
    return (await this.spaceOf(extent)).unallocated;
  }

  /**
   * The parcel's **space account** — the numbers anybody actually cares
   * about, all derived on read and none of them stored.
   *
   * `capacity` is a ceiling (`area × storeys`) and a ceiling on its own is
   * useless — nobody plans against a maximum. What matters is how much of
   * it is **spoken for** and how much is **left**, which is measurable the
   * moment children exist, because every child declares its area at
   * `subdivide`.
   *
   * The same three numbers read differently by tier, because `area` means
   * ground for a child of a lot and floor for a child of a building:
   *
   * | tier | `allocated` | `unallocated` | `utilisation` |
   * |---|---|---|---|
   * | a **lot** | its buildings' footprints | the yard | **site coverage** |
   * | a **building** | its units' floor area | **common area** — corridors, cores, stairs | **efficiency** |
   *
   * So a building that has let 100% of its gross floor reports
   * `utilisation: 1` and zero common area, which is visibly absurd — the
   * number does not forbid it, it *shows* it. Real buildings land around
   * 0.75–0.85; the gap is the circulation you had to build to reach the
   * units.
   *
   * `utilisation` is 0 for unmeasured land rather than a divide-by-zero:
   * a parcel that declares no area makes no claim about how full it is.
   */
  @CallSecurity(ParcelApiCallers)
  public async spaceOf(extent: string): Promise<ParcelSpace> {
    const parcel = await ParcelRecord.findByExtent(extent);
    if (!parcel) {
      return { capacity: 0, allocated: 0, unallocated: 0, utilisation: 0 };
    }
    const capacity = parcel.getGrossFloorArea();
    const allocated = await this.childAreaTotal(extent, "");
    return {
      capacity,
      allocated,
      unallocated: Math.max(0, capacity - allocated),
      utilisation: capacity > 0 ? allocated / capacity : 0,
    };
  }

  private async appendEvent(
    kind: "subdivide" | "transfer" | "grant",
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
      group.owner = Group.systemOwner();
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
