/**
 * LettingWarren — ⭐ **a circulation warren whose units are LET** (residences
 * D9/D16; controller-liquidity W13): Duncan Hall's dorms and Seznick House's
 * flats are the same act on two buildings — mint a unit parcel at the lowest
 * free slot, grant it to the tenant, key it fresh and hand over the key; and
 * at the end of the let, the tenant's goods boxed into the house's storeroom
 * locker (intact, titled, `rack reclaim`-able — persistence-model D11), the
 * shell reverted whole, the slot freed.
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
import { FloorplanWarren } from "@saxonberg/server/mud/lib/location/FloorplanWarren";
import { Floorplan } from "@saxonberg/server/mud/lib/location/Floorplan";
import { Template } from "@saxonberg/server/mud/lib/stuff/Template";
import { Character } from "@saxonberg/server/mud/lib/character/Character";
import { Lock, type LockType } from "@saxonberg/server/mud/lib/lock/Lock";
import { BoundaryApi } from "@saxonberg/server/mud/api/boundary";
import { CompactApi } from "@saxonberg/server/mud/api/compact";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { ParcelApi } from "@saxonberg/server/mud/api/parcel";
import { PersistableApi } from "@saxonberg/server/mud/api/persistable";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";
import type { HeldGoodsShelf } from "@saxonberg/server/mud/lib/retail/HeldGoods";
import { DiagnosticApi } from "@saxonberg/server/mud/api/diagnostics";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";
import { Ascent, type AscentRefusal } from "./Ascent";
import { AccessApi } from "@saxonberg/server/mud/api/access";

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
export type EndLetRefusal = "not-authorized" | "no-player" | "not-housed" | "no-storeroom";

/**
 * What {@link LettingWarren.endLet} answers. `boxed` and `lost` name the
 * tenant's goods (persistence-model D11): boxed into the house's store, or
 * too big for it and lost with the unit.
 */
export type EndLetAnswer =
  | { ok: true; unitExtent: string; boxed: Stuff[]; lost: string[] }
  | { ok: false; reason: EndLetRefusal; detail: string };

type MemberStuff = Stuff & Container;

export abstract class LettingWarren extends CirculationWarren {
  static fieldMeta: FieldMeta = {
    ...CirculationWarren.fieldMeta,
    storeroom: { persistent: true, authorable: true, authorPicker: 'Template' },
  };

  /**
   * ⭐ The letting office where a former tenant's goods are boxed
   * (persistence-model D11): a place path, and the house's `Locker`
   * standing in it is its store. Required — an end-let refuses without it.
   */
  public storeroom: string = "";

  public getStoreroom(): string {
    return this.storeroom;
  }

  public setStoreroom(value: string): void {
    this.storeroom = value;
  }

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
  public async let(by: Stuff, tenant: Stuff | null, opts: { theme?: string } = {}): Promise<LetAnswer> {
    // who is acting must be who is named (call-security pass D5)
    AccessApi.requireActor(by);
    const parent = this.getParentExtent();
    const owner = (await ParcelApi.coveringParcelOf(parent))?.getOwner() ?? null;
    if (!owner) return { ok: false, reason: "no-owner", detail: `${parent} has no owner of record` };
    if (!(await this.mayLetFor(by))) {
      return { ok: false, reason: "not-authorized", detail: "neither staff nor the owner" };
    }
    // ⚠ Authority first, then the tenant: a seatless caller is told whose act
    // it is even when the name bound nobody (finalize, the wizard-axis drive).
    const tenantPath = tenant?.getIdentityPath() ?? "";
    if (!tenant || !tenantPath) return { ok: false, reason: "no-player", detail: tenant ? "the tenant has no identity" : "no tenant named" };

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
   * the tenant's owned goods are boxed into the house's storeroom locker,
   * intact and titled (never destructed — C4; a good too big is lost, and
   * said — persistence-model D11); any live occupant steps out to the
   * landing; the shell reverts whole; every record under the unit clears;
   * the slot frees and the keyway dies with the row.
   */
  public async endLet(by: Stuff, tenant: Stuff | null): Promise<EndLetAnswer> {
    // who is acting must be who is named (call-security pass D5)
    AccessApi.requireActor(by);
    // ⭐ Checked first (persistence-model D11): with nowhere to box the
    // goods an end-let would destruct them with the unit.
    const store = await this.storeroomLocker();
    if (!store) {
      return { ok: false, reason: "no-storeroom", detail: `no store stands at '${this.storeroom || "(unset)"}'` };
    }
    if (!(await this.mayLetFor(by))) {
      return { ok: false, reason: "not-authorized", detail: "neither staff nor the owner" };
    }
    // ⚠ Authority first, then the tenant: a seatless caller is told whose act
    // it is even when the name bound nobody (finalize, the wizard-axis drive).
    const tenantPath = tenant?.getIdentityPath() ?? "";
    if (!tenant || !tenantPath) return { ok: false, reason: "no-player", detail: tenant ? "the tenant has no identity" : "no tenant named" };
    // ⚠ Scoped to THIS building: a home held elsewhere is not this let.
    const held = await ParcelApi.heldUnitOf(tenantPath, this.getParentExtent());
    if (!held) return { ok: false, reason: "not-housed", detail: `${tenantPath} holds no unit here` };
    const unit = held.getExtent();

    for (const grant of held.getGrants()) {
      await ParcelApi.revokeUse(unit, grant.holder);
    }

    // ⭐ The tenant's goods go into the house's store before the shell
    // reverts (persistence-model D11).
    this.evacuate(unit);
    const { boxed, lost } = await this.boxGoods(unit, tenant as Stuff & Container, store);
    const rooms = await this.roomsOf(unit);
    await this.dropHolding(unit, { revert: true });

    for (const room of rooms) await PersistableApi.deleteAllFor(room.key);
    await PersistableApi.deleteAllFor(unit);

    await ParcelApi.retire(unit);
    await this.refreshProvisioned();
    return { ok: true, unitExtent: unit, boxed, lost };
  }

  /**
   * ⭐ **Box the tenant's goods into the house's store** (persistence-model
   * D11). The unit is woken; the tenant's goods are what stands in its rooms
   * that the rooms' own `props:` did not lay down (a room row's listed
   * templates, and theirs, are the shell; everything else is the
   * tenant's, including what lies in the shell's containers). Each that
   * fits the store is held there for the tenant, no ticket; one that does
   * not fit stays and is lost with the unit — named in `lost`, and in a
   * diagnostic. The tenant reclaims at the office with `rack reclaim`.
   */
  public async boxGoods(
    unit: string,
    tenant: Stuff & Container,
    store: Stuff & Container & HeldGoodsShelf,
  ): Promise<{ boxed: Stuff[]; lost: string[] }> {
    const boxed: Stuff[] = [];
    const lost: string[] = [];
    // 1. Read every row the walk will need while the unit stands — the
    // reads await, and a vacant unit may go to sleep meanwhile.
    const rows = new Map<string, Map<string, number>>();
    const toRead = new Set<string>();
    for (const room of await this.unitRooms(unit)) LettingWarren.pathsUnder(room, toRead);
    for (const path of toRead) rows.set(path, await LettingWarren.shellOf(path));
    // 2. Wake it again (a no-op if it stands), and with NO await from here
    // until every good is in the store, find the goods and move them: the
    // store is kept, so once a good is in it nothing a sleeping unit does
    // can lose it.
    const rooms = await this.unitRooms(unit);
    const goods: Stuff[] = [];
    for (const room of rooms) LettingWarren.collectGoods(room, rows, goods);
    const held: Array<Stuff & Containable> = [];
    for (const good of goods) {
      const name = good.getPresentation() ?? good.getTemplatePath() ?? good.stuffId;
      if (!MixinApi.isChattel(good) || !MixinApi.isContainable(good) || store.fitRefusal(good) !== null) {
        lost.push(name);
        continue;
      }
      ContainmentApi.move(good, store);
      held.push(good);
    }
    // 3. Record each as held for the tenant (custody, no ticket).
    for (const good of held) {
      if (!MixinApi.isChattel(good)) continue;
      const answer = await store.checkIn(good, tenant, { ticket: false });
      if (answer.ok) boxed.push(good);
      else lost.push(good.getPresentation() ?? good.stuffId);
    }
    if (lost.length > 0) {
      await DiagnosticApi.record({
        path: unit,
        severity: "warning",
        channel: "persistence",
        message: `end of let: ${lost.length} good(s) did not fit the store at ${this.storeroom} and were lost with the unit: ${lost.join(", ")}`,
      });
    }
    return { boxed, lost };
  }

  /** The unit's standing rooms, woken if it sleeps: a programme's plan rooms, or a plain-room holding itself. */
  private async unitRooms(unit: string): Promise<MemberStuff[]> {
    await this.admit(unit);
    const holding = this.holdingFor(unit);
    if (!holding) return [];
    if (holding instanceof FloorplanWarren) {
      return holding
        .planRooms()
        .map((r) => holding.roomForLeaf(r.leaf))
        .filter((r): r is MemberStuff => r !== null);
    }
    return MixinApi.isContainer(holding) ? [holding] : [];
  }

  /** Every template path in `host` and under it (its own included). */
  private static pathsUnder(host: Stuff, out: Set<string>): void {
    const path = host.getTemplatePath();
    if (path) out.add(path);
    if (!MixinApi.isContainer(host)) return;
    for (const c of host.getContents()) LettingWarren.pathsUnder(c, out);
  }

  /** A row's shell: each template its `props:` lays down, and how many. */
  private static async shellOf(path: string): Promise<Map<string, number>> {
    const shell = new Map<string, number>();
    const row = await Template.findByPath(path);
    const props = ((row?.data ?? {}) as { props?: unknown }).props;
    for (const spec of Array.isArray(props) ? props : []) {
      const p = typeof spec === "string" ? spec : (spec as { template?: string } | null)?.template;
      if (typeof p !== "string") continue;
      const n = typeof spec === "object" && spec !== null ? Number((spec as { count?: number }).count ?? 1) : 1;
      shell.set(p, (shell.get(p) ?? 0) + n);
    }
    return shell;
  }

  /** The house's store: the first `Locker` (held goods, not a sale shelf) standing in {@link storeroom}. */
  private async storeroomLocker(): Promise<(Stuff & Container & HeldGoodsShelf) | null> {
    if (!this.storeroom) return null;
    const office = await StuffApi.singleton<Stuff>(this.storeroom).catch(() => null);
    if (!office || !MixinApi.isContainer(office)) return null;
    for (const c of office.getContents()) {
      if (MixinApi.isHeldGoodsShelf(c) && !MixinApi.isConsignmentShelf(c) && MixinApi.isContainer(c)) {
        return c as unknown as Stuff & Container & HeldGoodsShelf;
      }
    }
    return null;
  }

  /**
   * The goods in `host` its row did not lay down: each content that is not
   * an agent and not one of the row's `props:` is the tenant's; a shell
   * container is searched the same way, against its own row. Synchronous —
   * the rows are read beforehand.
   */
  private static collectGoods(host: Stuff & Container, rows: Map<string, Map<string, number>>, out: Stuff[]): void {
    const shell = new Map(rows.get(host.getTemplatePath() ?? "") ?? []);
    for (const c of host.getContents()) {
      if (c.isAgent()) continue;
      const path = c.getTemplatePath() ?? "";
      const left = shell.get(path) ?? 0;
      if (left > 0) {
        shell.set(path, left - 1);
        if (MixinApi.isContainer(c)) LettingWarren.collectGoods(c, rows, out);
        continue;
      }
      out.push(c);
    }
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
