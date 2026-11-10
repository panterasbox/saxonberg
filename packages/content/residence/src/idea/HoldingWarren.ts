/**
 * HoldingWarren — **what ONE person holds**, and the holding as a warren
 * one level down
 * (residences D16): a keyed instance of ONE programme row per holding,
 * whose members are the holding's rooms and which owns every
 * holding-level concern — the copy of its plan, intra-holding
 * wiring + the keyed doors, dormancy AS A UNIT (the holding sleeps
 * and wakes whole, never room-by-room), the shell condition +
 * weathering clock (D4/P10), the tenure term (D5), the archetype
 * aggregation point (D15), and lease revert.
 *
 * Identity is the keyed model: the programme row is authored content
 * (`class: /system/residence/idea/HoldingWarren`), each holding gets a
 * keyed instance `(scope = the row, key = the holding's parcel
 * extent)`; each room is a keyed instance of a REAL room row
 * `(scope = the room row, key = <extent>/<leaf>)` — `templatePath`
 * always resolves to a row (D17), per-holding uniqueness carried by
 * the persistence spine's unique-key guard.
 *
 * ⭐ **The lift.** The floorplan mint, keyed rooms,
 * whole-warren dormancy and `layOut` are the kernel's `FloorplanWarren`
 * now. What stays here is only what is residential: the address stem,
 * the parcel keyway handed to the copy's keyed doors (`fitExit`), the
 * parcel's open ground (`openGroundM2`), the relay to the institution,
 * the tenure term (who OWES the upkeep), and the holding's BUILDINGS.
 * (`admitPlot`, the break-ground seam, retired with `plot` in the farming
 * build — a farm's ground is a plan's tract.)
 *
 * ⭐⭐ **The fabric is the building's** (paint D6/D13). A holding stands
 * its buildings up at its wake — a {@link HoldingBuilding} per building
 * its plan NAMES (`buildings:`, each a Building row with its own extent
 * and entrance), else none, and its rooms read the Building row
 * that covers its extent (Seznick House) — and each carries its own coat
 * and its `Durable` condition, which the weather wears once the coat is
 * gone. ⭐ A building is AUTHORED (deriving it from how rooms connect is magic): a farmstead's
 * house and barn are the two its plan names, and the yard, which no
 * building's extent covers, is open ground and no building's.
 *
 * ⭐ **The plan is the programme row's own**. The programme row authors its plan itself — `extent` (the
 * kind's rooms, authored as ordinary rows: `exits:`, a tract's `share`),
 * `entrance`, `footprintM2` (the ground the buildings cover) and
 * `buildings:` — on the kernel `FloorplanWarren`'s fields. ⛔ No blueprint
 * row: a `Structure` is only ever a thing standing in the world. A keyed
 * door is the way's own `kind:`.
 *
 * The member contract stays **open to runtime-added members** (the
 * cross-build interface with farming's break-ground act): the
 * plan is the *initial* mint, never the closed set.
 */

import { FloorplanWarren } from '@saxonberg/server/mud/lib/location/FloorplanWarren';
import {
  Floorplan,
  type FloorplanRoom,
} from '@saxonberg/server/mud/lib/location/Floorplan';
import KeyedDoorExit from './KeyedDoorExit';
import type Exit from '@saxonberg/server/mud/lib/boundary/Exit';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Persistable } from '@saxonberg/server/mud/lib/persistence/Persistable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import HoldingBuilding from './HoldingBuilding';
import type StructureBase from '@saxonberg/server/mud/lib/structure/Structure';
import BuildingBase from '@saxonberg/server/mud/lib/structure/Building';

type MemberStuff = Stuff & Container;

/** The closed-today, open-by-construction upkeep-term vocabulary (D5). */
export const UPKEEP_TERMS = [
  'institution-all',
  'landlord-shell',
  'owner-all',
] as const;

export default class HoldingWarren extends FloorplanWarren {
  static fieldMeta: FieldMeta = {
    addressBase: { persistent: true, authorable: true },
    upkeepTerm: { persistent: true, authorable: true },
  };

  /** Who owes the upkeep (D5): a validated kebab-case term, open to
   *  future values (`hoa-shell`) without mechanism. */
  public upkeepTerm: string = 'owner-all';

  /** The holding's buildings by name (`''` the main one) — minted at its wake. */
  private _houses: Map<string, HoldingBuilding> = new Map();

  /** The address stem rooms stamp (`<addressBase>/<leaf>`); empty
   *  derives from the holding key's tail. */
  public addressBase: string = '';

  /** The holding's keyway (sync lock identity), refreshed at wake. */
  private _keyway: string = '';

  // ── authored-field surface ──────────────────────────────────────

  public getAddressBase(): string {
    return this.addressBase;
  }

  public setAddressBase(value: string): void {
    this.addressBase = value;
  }

  /** ⭐ Who owes the upkeep — the term `analyze rooms` reads (D5). */
  public override getUpkeepTerm(): string {
    return this.upkeepTerm;
  }

  public setUpkeepTerm(value: string): void {
    if (typeof value !== 'string' || !/^[a-z][a-z-]*$/.test(value)) {
      throw new Error(
        `HoldingWarren: upkeepTerm '${String(value)}' is not a ` +
          `kebab-case term (shipped: ${UPKEEP_TERMS.join(', ')})`,
      );
    }
    this.upkeepTerm = value;
  }

  /**
   * The entry room's ROW for a programme row — the eager face a
   * FrontDoorExit / LotGateExit carries (D17: a real row): its PLAN's
   * entrance (the programme row's own),
   * read off the rows without waking a holding. Shared by every
   * institution that hangs doors on this programme. Throws on a programme
   * that authors no plan.
   */
  public static async entryRowOf(programmePath: string): Promise<string> {
    const { Template } = await import(
      '@saxonberg/server/mud/lib/stuff/Template'
    );
    const row = await Template.findByPath(programmePath);
    const data = (row?.data ?? {}) as Record<string, unknown>;
    if (typeof data.extent !== 'string' || data.extent === '') {
      throw new Error(`HoldingWarren: programme '${programmePath}' authors no plan (extent)`);
    }
    return (await new Floorplan(programmePath, data).load()).entrance;
  }

  // ── identity ────────────────────────────────────────────────────

  /** The holding's parcel extent — the programme's persistence key. */
  public holdingKey(): string | null {
    return this.warrenKey();
  }

  /**
   * ⭐ **The holding's open ground**, m² (tracts build D27): the parcel's
   * workable area less the ground its plan's buildings cover (its own
   * `footprintM2`) — what the tracts' shares (each
   * tract's own `share`) divide. `0` on an unmeasured parcel (nobody can say
   * what a third of it is). Residential because the area is the PARCEL's.
   */
  public async openGroundM2(): Promise<number> {
    const extent = this.holdingKey();
    if (!extent) return 0;
    const workable = await ParcelApi.workableAreaOf(extent);
    if (!(workable > 0)) return 0;
    return Math.max(0, workable - this.getFootprintM2());
  }

  // ── wake / membership ───────────────────────────────────────────

  /**
   * Stand the whole holding up (the kernel's floorplan wake), with the
   * keyway cache refreshed first so the locked edges it wires gate on
   * the parcel's current keyway.
   */
  public override async wake(): Promise<void> {
    await this.refreshKeyway();
    await super.wake();
    await this.wakeHouses();
  }

  /**
   * The room's address: `<addressBase or derived>/<leaf>` — the
   * Locality address is the human per-place identity (D16).
   *
   * @hook
   */
  protected override addressFor(spec: FloorplanRoom): string | null {
    const base = this.addressBase || this.derivedAddressBase();
    if (!base) return null;
    return spec.leaf ? `${base}/${spec.leaf}` : base;
  }

  private derivedAddressBase(): string {
    const extent = this.holdingKey();
    if (!extent) return '';
    // `/world/terminus/hinkley-hills/lots/lot-7` → `terminus/hinkley-hills/lot-7`
    const parts = extent.split('/').filter(Boolean);
    if (parts[0] === 'world') parts.shift();
    return parts.filter((p) => p !== 'lots' && p !== 'units').join('/');
  }

  /**
   * ⭐ A keyed door of the copy (`kind: /system/residence/idea/exits/keyed-door`
   * on its plan room's way) is locked to THIS holding's keyway; the
   * plan authors the way back out as a plain passage, so a guest let
   * in is never trapped and leaving your own house needs no key.
   *
   * @hook
   */
  protected override fitExit(exit: Exit): void {
    if (exit instanceof KeyedDoorExit) exit.configureKeyedDoor(this);
  }

  // ── the keyway (the front door's sync lock identity) ────────────

  public async refreshKeyway(): Promise<void> {
    const extent = this.holdingKey();
    if (!extent) return;
    const record = await ParcelApi.coveringParcelOf(extent);
    this._keyway =
      record && record.getExtent() === extent ? record.getKeyway() : '';
  }

  /** The holding's keyway ('' = no key opens; the institution's own
   *  cache is the other reader). */
  public keyway(): string {
    return this._keyway;
  }

  // ── dormancy as a unit (D16) ────────────────────────────────────

  /**
   * Population-reactive reconcile: the holding NEVER reaps a room on its
   * own — it sleeps whole or not at all. All it does is relay the
   * aggregate population change to the owning institution, whose
   * reconcile captures-whole + tears the holding down.
   */
  protected async reconcile(): Promise<void> {
    const institution = this.getWarren() as unknown as {
      notifyPopulationChange(room: MemberStuff): void;
    } | null;
    if (institution) {
      institution.notifyPopulationChange(this as unknown as MemberStuff);
    }
  }

  // ── the buildings: the fabric is the building's (paint D6/D13) ──

  /**
   * ⭐⭐ This holding's MAIN building — the one "the home you hold" reads
   * (the ascent gate's condition): its own, or the Building row that
   * covers its extent.
   */
  public house(): BuildingBase | null {
    const own = this._houses.get('') ?? [...this._houses.values()][0];
    if (own !== undefined && !own.isDestroyed()) return own;
    const extent = this.holdingKey();
    if (!extent) return null;
    const s = NavigationApi.structureAtNow(extent);
    return s instanceof BuildingBase ? s : null;
  }

  /** Every building this holding minted, the main one first. */
  public standingBuildings(): BuildingBase[] {
    const out = [...this._houses.values()].filter((h) => !h.isDestroyed());
    if (out.length > 0) return out;
    const covering = this.house();
    return covering === null ? [] : [covering];
  }

  /**
   * The building `room` is part of — one of this holding's own, or the
   * covering row's — `null` for open ground.
   */
  public buildingOf(room: Stuff): BuildingBase | null {
    for (const h of this._houses.values()) {
      if (!h.isDestroyed() && h.hasRoom(room)) return h;
    }
    if (this._houses.size > 0) return null;
    const covering = this.house();
    return covering !== null && this.getMembers().includes(room as MemberStuff) ? covering : null;
  }

  /**
   * ⭐ Which building a room of this holding is part of (paint review):
   * its rooms are keyed clones of shared rows, so no path names them —
   * the holding that minted them answers (holding.md § Identity).
   */
  public override structureOf(member: Stuff): StructureBase | null {
    return this.buildingOf(member);
  }

  /**
   * ⭐ The records this holding owns: its rooms' (the floorplan's) and
   * its buildings' — each persists under its own key, so one capture of
   * the holding writes them all and a revert marks them all.
   *
   * @hook
   */
  public override dependentPersistables(): (Stuff & Persistable)[] {
    const out = super.dependentPersistables();
    for (const house of this._houses.values()) {
      if (!house.isDestroyed()) out.push(house as unknown as Stuff & Persistable);
    }
    return out;
  }

  /** The buildings come down with the rooms. */
  public override teardown(): void {
    super.teardown();
    const houses = [...this._houses.values()];
    this._houses.clear();
    for (const house of houses) {
      if (house.isDestroyed()) continue;
      for (const at of this.attachPointsOf(house)) NavigationApi.detachStructure(at, house);
      house.setHolding(null);
      StuffApi.destruct(house);
    }
  }

  /** End-lease revert: the buildings' records go with the rooms'. */
  public override async revert(): Promise<void> {
    const extent = this.holdingKey();
    if (extent) {
      for (const name of this._houses.keys()) {
        if (name !== '') await PersistableApi.deleteAllFor(this.houseKeyOf(extent, name));
      }
    }
    await super.revert();
  }

  /** The record key a building persists under: the main one the holding's own extent. */
  private houseKeyOf(extent: string, name: string): string {
    return name === '' ? extent : `${extent}@${name}`;
  }

  /** Where a building is registered with the location graph: the main one at the holding's extent. */
  private attachPointsOf(house: HoldingBuilding): string[] {
    return house.isMain() ? [house.getExtent()] : [];
  }

  /**
   * Stand this holding's buildings up: one per building its plan
   * NAMES (`buildings:`, the main one first), each a clone of that
   * building's own row holding the copy's rooms that lie under its
   * extent. ⭐ Authored, never derived — no read of how the rooms connect
   * or which hold their air, so a reordered `exits:` map changes nothing.
   * A plan that names none (a Seznick flat) mints none: its rooms
   * read the Building row its extent lies in.
   */
  private async wakeHouses(): Promise<void> {
    const extent = this.holdingKey();
    if (!extent) return;
    for (const [i, spec] of this.planBuildings().entries()) {
      const name = i === 0 ? '' : spec.leaf;
      const rooms = this.roomsOfRows(spec.rooms);
      const live = this._houses.get(name);
      if (live !== undefined && !live.isDestroyed()) {
        live.setRooms(rooms, i === 0);
        continue;
      }
      const house = await StuffApi.clone<HoldingBuilding>(spec.row);
      if (!(house instanceof HoldingBuilding)) {
        StuffApi.destruct(house);
        throw new Error(`HoldingWarren: building '${spec.row}' is not a holding's building (class HoldingBuilding)`);
      }
      house.setExtent(extent);
      // Its rooms are keyed clones no path names, so it lands by them.
      house.setEntrance(null);
      house.setRooms(rooms, i === 0);
      house.setHolding(this);
      await PersistableApi.restoreOrSeed(house, this.houseKeyOf(extent, name));
      for (const at of this.attachPointsOf(house)) NavigationApi.attachStructure(at, house);
      this._houses.set(name, house);
    }
  }

  /** This copy's live rooms for plan room rows. */
  private roomsOfRows(rows: readonly string[]): MemberStuff[] {
    const out: MemberStuff[] = [];
    for (const spec of this.planRooms()) {
      if (!rows.includes(spec.row)) continue;
      const room = this.roomForLeaf(spec.leaf);
      if (room !== null) out.push(room);
    }
    return out;
  }
}
