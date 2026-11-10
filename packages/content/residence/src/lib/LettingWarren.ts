/**
 * LettingWarren — ⭐ **a circulation warren whose units are LET** (residences
 * D9/D16; controller-liquidity W13): Duncan Hall's dorms and Seznick House's
 * flats are the same act on two buildings — mint a unit parcel at the lowest
 * free slot, grant it to the tenant, key it fresh and hand over the key; and
 * at the end of the let, the tenant's goods to STORAGE (intact, titled,
 * recoverable), the shell reverted whole, the slot freed.
 *
 * It used to be four controllers in two packs — `provision`/`unprovision`,
 * `lease`/`unlease` — near-twins, each with the whole sequence and its own
 * copy of who may let. The dorm's end-let had lost the storage eviction on
 * the way (controller-liquidity C4: a student's goods were destructed with
 * the room). One sequence here, and both buildings are the policy hooks:
 *
 *  - **who may let** ({@link mayLetFor}) — staff of the letting organization
 *    (Walter, Katie: a position, read off its roster), or a member of the
 *    committee over the building's extent. ⭐ Staff or owner, never "a member
 *    of the landlord group": an NPC is never on a committee (economic
 *    bootstrap D8). Asked by {@link let} and {@link endLet} themselves, so a
 *    replaced controller cannot skip it (D9).
 *  - where a unit's extent hangs, whether the ascent gate applies, the
 *    domicile it stamps, and what to do once it is let.
 *
 * Pack `lib/`: substrate only ever inherited (a dorm warren and a building
 * warren are what instance it). The answers carry facts; the words are the
 * verbs'.
 */

import { CirculationWarren } from "@saxonberg/server/mud/lib/location/CirculationWarren";
import { Warren } from "@saxonberg/server/mud/lib/location/Warren";
import { Floorplan } from "@saxonberg/server/mud/lib/location/Floorplan";
import { Template } from "@saxonberg/server/mud/lib/stuff/Template";
import { Character } from "@saxonberg/server/mud/lib/character/Character";
import { Lock, type LockType } from "@saxonberg/server/mud/lib/lock/Lock";
import { BoundaryApi } from "@saxonberg/server/mud/api/boundary";
import { ChattelApi } from "@saxonberg/server/mud/api/chattel";
import { CompactApi } from "@saxonberg/server/mud/api/compact";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { ParcelApi } from "@saxonberg/server/mud/api/parcel";
import { PersistableApi } from "@saxonberg/server/mud/api/persistable";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";
import { Ascent, type AscentRefusal } from "./Ascent";

/** Why a let refused. */
export type LetRefusal =
  | "not-authorized"
  | "no-owner"
  | "no-player"
  | "already-housed"
  | "ascent-condition"
  | "at-capacity";

/** What {@link LettingWarren.let} answers. */
export type LetAnswer =
  | { ok: true; unitExtent: string }
  | {
      ok: false;
      reason: LetRefusal;
      detail: string;
      /** The units already let and the cap (`at-capacity`). */
      taken?: number;
      capacity?: number;
      /** The holding that failed the ascent gate (`ascent-condition`). */
      ascent?: AscentRefusal;
    };

/** Why an end-let refused. */
export type EndLetRefusal = "not-authorized" | "no-player" | "not-housed";

/** What {@link LettingWarren.endLet} answers. */
export type EndLetAnswer =
  | { ok: true; unitExtent: string }
  | { ok: false; reason: EndLetRefusal; detail: string };

type MemberStuff = Stuff & Container;

export abstract class LettingWarren extends CirculationWarren {
  // ─────────────── policy hooks (each building's) ──────────────────

  /** The Organization whose staff let units here (a position on its roster). */
  protected abstract lettingOrganizationPath(): string;

  /** The extent whose committee owns the building — the owner acting for itself. */
  protected committeeExtent(): string {
    return this.getParentExtent();
  }

  /** The branch a unit's leaf hangs off under the parent extent (`units`, or none). */
  protected unitBranch(): string {
    return "";
  }

  /** The domicile a let stamps on the tenant (the civics residency address). */
  protected abstract domicileAddress(): string;

  /** The programme row every let unit is a keyed instance of (its floorplan names the rooms). */
  protected abstract programmeRowPath(): string;

  /** Does the residence ladder's ascent gate apply to a let here? (A dorm is the bottom rung.) */
  protected ascentGated(): boolean {
    return true;
  }

  /**
   * Where "already housed" looks: this building's units only (the ladder
   * means a home elsewhere is fine), or `undefined` — anywhere.
   */
  protected tenancyScope(): string | undefined {
    return this.getParentExtent();
  }

  /** The lock fitted to a let unit's door. */
  protected lockTech(): LockType {
    return "pin-tumbler";
  }

  /** Reflect a newly let unit into the (possibly live) building: its door, its reach. */
  protected async afterLet(unitExtent: string, _opts: { theme?: string }): Promise<void> {
    await this.refreshProvisioned();
    await this.ensureEntry(unitExtent);
  }

  // ─────────────── the acts ─────────────────────────────────────────

  /**
   * May `actor` let or end a let here? Staff of the letting organization,
   * or a member of the committee over the building. Fails closed when the
   * organization's row does not stand up and the actor sits on no committee.
   */
  public async mayLetFor(actor: Stuff): Promise<boolean> {
    // ⭐ A relation resolved at the act: asking stands the organization up.
    const org = await StuffApi.singleton(this.lettingOrganizationPath()).catch(() => null);
    if (org && MixinApi.isOrganization(org) && org.employs(actor)) return true;
    return CompactApi.isCommitteeMember(actor, this.committeeExtent());
  }

  /**
   * ⭐ **Let a unit to `tenant`, as `by`** — every refusal first (who may
   * let, an owner of record, one home per tenant here, the ascent gate, the
   * cap), then the writes: subdivide at the lowest free slot, grant, the
   * domicile stamp, a fresh keyway and the tenant's key, and the building
   * reflects it.
   */
  public async let(by: Stuff, tenant: Stuff, opts: { theme?: string } = {}): Promise<LetAnswer> {
    const parent = this.getParentExtent();
    const owner = (await ParcelApi.coveringParcelOf(parent))?.getOwner() ?? null;
    if (!owner) return { ok: false, reason: "no-owner", detail: `${parent} has no owner of record` };
    if (!(await this.mayLetFor(by))) {
      return { ok: false, reason: "not-authorized", detail: "neither staff nor the owner" };
    }
    const tenantPath = tenant.getIdentityPath() ?? "";
    if (!tenantPath) return { ok: false, reason: "no-player", detail: "the tenant has no identity" };

    if (await ParcelApi.heldUnitOf(tenantPath, this.tenancyScope())) {
      return { ok: false, reason: "already-housed", detail: `${tenantPath} already holds a unit` };
    }
    if (this.ascentGated()) {
      const ascent = await new Ascent().refusalFor(tenantPath);
      if (ascent) {
        return { ok: false, reason: "ascent-condition", detail: `${ascent.extent} is ${ascent.band}`, ascent };
      }
    }

    // Lowest free slot from the plan, under the operator's cap (D10).
    const children = await ParcelApi.childParcelsOf(parent);
    const capacity = this.capacity();
    if (children.length >= capacity) {
      return {
        ok: false,
        reason: "at-capacity",
        detail: `${children.length} of ${capacity} units are taken`,
        taken: children.length,
        capacity,
      };
    }
    const taken = new Set(children.map((c) => LettingWarren.leafOf(c.getExtent())));
    const leaf = this.getPlatPlan().nextFreeSlot(taken, capacity);
    if (!leaf) {
      return { ok: false, reason: "at-capacity", detail: "no free unit slot", taken: children.length, capacity };
    }
    const branch = this.unitBranch();
    const unitExtent = branch ? `${parent}/${branch}/${leaf}` : `${parent}/${leaf}`;

    await ParcelApi.subdivide(unitExtent, parent, owner);
    await ParcelApi.grantUse(unitExtent, tenantPath, null);

    // The domicile stamp: persists until replaced, so a later end-let leaves
    // it standing until a new home overwrites it.
    if (tenant instanceof Character) tenant.setDomicileAddress(this.domicileAddress());

    // A fresh keyway re-keys any prior tenant's key to dead metal; the
    // tenant gets a brass key in hand plus an implant-keychain entry. The
    // door checks the KEY, never identity.
    const keyway = BoundaryApi.mintKeyway();
    await ParcelApi.setKeyway(unitExtent, keyway);
    await new Lock(keyway, this.lockTech()).issueKeyTo(tenant);

    await this.afterLet(unitExtent, opts);
    return { ok: true, unitExtent };
  }

  /**
   * ⭐ **End `tenant`'s let here, as `by`** (D9/D16) — revoke the grants;
   * the tenant's owned goods go to STORAGE per room place, intact and
   * titled (never destructed — C4); any live occupant steps out to the
   * landing; the shell reverts whole; every record under the unit clears;
   * the slot frees and the keyway dies with the row.
   */
  public async endLet(by: Stuff, tenant: Stuff): Promise<EndLetAnswer> {
    if (!(await this.mayLetFor(by))) {
      return { ok: false, reason: "not-authorized", detail: "neither staff nor the owner" };
    }
    const tenantPath = tenant.getIdentityPath() ?? "";
    if (!tenantPath) return { ok: false, reason: "no-player", detail: "the tenant has no identity" };
    // ⚠ Scoped to THIS building: a home held elsewhere is not this let.
    const held = await ParcelApi.heldUnitOf(tenantPath, this.getParentExtent());
    if (!held) return { ok: false, reason: "not-housed", detail: `${tenantPath} holds no unit here` };
    const unit = held.getExtent();

    for (const grant of held.getGrants()) {
      await ParcelApi.revokeUse(unit, grant.holder);
    }

    // The unit's rooms, off the programme ROW — so a dormant unit reverts
    // without being woken.
    const rooms = await this.roomsOf(unit);
    for (const room of rooms) {
      if (room.row) await ChattelApi.evictToStorage(`${room.row}#${room.key}`);
    }

    this.evacuate(unit);
    await this.dropHolding(unit, { revert: true });

    for (const room of rooms) await PersistableApi.deleteAllFor(room.key);
    await PersistableApi.deleteAllFor(unit);

    await ParcelApi.retire(unit);
    await this.refreshProvisioned();
    return { ok: true, unitExtent: unit };
  }

  // ─────────────── internals ────────────────────────────────────────

  /** A unit's rooms: each room row and the key its copy is held under. */
  private async roomsOf(unit: string): Promise<Array<{ row: string | null; key: string }>> {
    const path = this.programmeRowPath();
    const row = path ? await Template.findByPath(path) : null;
    const data = (row?.data ?? {}) as Record<string, unknown>;
    if (typeof data.extent !== "string" || data.extent === "") return [];
    const plan = await new Floorplan(path, data).load();
    return plan.rooms.map((r) => ({ row: r.row, key: r.leaf ? `${unit}/${r.leaf}` : unit }));
  }

  /** Move any live occupant of the unit out to its landing (best-effort). */
  private evacuate(unit: string): void {
    const holding = this.holdingFor(unit);
    if (!holding) return;
    const node = this.getPlatPlan().nodeOfSlot(LettingWarren.leafOf(unit));
    const landing = node ? this.circulationForNode(node) : null;
    if (!landing) return;
    const rooms: MemberStuff[] =
      holding instanceof Warren ? (holding.getMembers() as MemberStuff[]) : [holding];
    for (const room of rooms.length > 0 ? rooms : [holding]) {
      for (const occ of room.getContents()) {
        if (!MixinApi.isHasInteractive(occ)) continue;
        try {
          ContainmentApi.move(occ as Stuff & Containable, landing);
        } catch {
          /* best-effort */
        }
      }
    }
  }

  /** The last segment of an extent. */
  private static leafOf(extent: string): string {
    return extent.slice(extent.lastIndexOf("/") + 1);
  }
}
