/**
 * HoldingWarren — **what ONE person holds**, and the holding as a warren
 * one level down
 * (residences D16): a keyed instance of ONE programme row per holding,
 * whose members are the holding's rooms and which owns every
 * holding-level concern — the copy of its blueprint, intra-holding
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
 * ⭐ **The lift (harbors P1).** The floorplan mint, keyed rooms,
 * whole-warren dormancy and `layOut` are the kernel's `FloorplanWarren`
 * now. What stays here is only what is residential: the address stem,
 * the parcel keyway handed to the copy's keyed doors (`fitExit`), the
 * parcel's open ground (`openGroundM2`), the relay to the institution,
 * the tenure term (who OWES the upkeep), and the holding's BUILDINGS.
 * (`admitPlot`, the break-ground seam, retired with `plot` in the farming
 * build — a farm's ground is a blueprint's tract.)
 *
 * ⭐⭐ **The fabric is the building's** (paint D6/D13). A holding stands
 * its buildings up at its wake — the Building row that already covers its
 * extent (Seznick House, Duncan Hall), else a {@link HoldingBuilding} per
 * building of its own — and each carries its own coat and its `Durable`
 * condition, which the weather wears once the coat is gone. A building is
 * the copy's ENCLOSED rooms joined by the ways between them (merge of
 * paint into harbors — derived from the blueprint, nothing authored): a
 * farmstead's house and barn are two, parted by the yard, which is open
 * ground and no building's.
 *
 * ⭐ **The blueprint (harbors review 3).** The programme row names a
 * `Structure` row (`blueprint:`) over the kind's rooms authored as
 * ordinary rows — `exits:`, `coords:`, a tract's `share` — and the
 * Structure's `footprintM2` is the ground the buildings cover. A keyed
 * door is the way's own `kind:`.
 *
 * The member contract stays **open to runtime-added members** (the
 * cross-build interface with farming's break-ground act): the
 * blueprint is the *initial* mint, never the closed set.
 */

import { FloorplanWarren } from '@saxonberg/server/mud/lib/location/FloorplanWarren';
import {
  Blueprint,
  type BlueprintRoom,
} from '@saxonberg/server/mud/lib/location/Blueprint';
import KeyedDoorExit from './KeyedDoorExit';
import type Exit from '@saxonberg/server/mud/lib/boundary/Exit';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Persistable } from '@saxonberg/server/mud/lib/persistence/Persistable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import HoldingBuilding, { HOLDING_BUILDING_ROW } from './HoldingBuilding';
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

  /** ⭐ Who owes the upkeep — the term `survey` reads (D5). */
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
   * FrontDoorExit / LotGateExit carries (D17: a real row): its
   * BLUEPRINT's entrance (harbors review 3), read off the rows without
   * waking a holding. Shared by every institution that hangs doors on
   * this programme. Throws on a programme that names no blueprint.
   */
  public static async entryRowOf(programmePath: string): Promise<string> {
    const { Template } = await import(
      '@saxonberg/server/mud/lib/stuff/Template'
    );
    const row = await Template.findByPath(programmePath);
    const blueprint = (row?.data as { blueprint?: unknown } | undefined)?.blueprint;
    if (typeof blueprint !== 'string' || blueprint === '') {
      throw new Error(`HoldingWarren: programme '${programmePath}' names no blueprint`);
    }
    return (await new Blueprint(blueprint).load()).entrance;
  }

  // ── identity ────────────────────────────────────────────────────

  /** The holding's parcel extent — the programme's persistence key. */
  public holdingKey(): string | null {
    return this.warrenKey();
  }

  /**
   * ⭐ **The holding's open ground**, m² (tracts build D27): the parcel's
   * workable area less the ground its blueprint's buildings cover (the
   * Structure's `footprintM2`, harbors review 3) — what the tracts'
   * shares (each tract's own `share`) divide. `0` on an unmeasured parcel (nobody can say
   * what a third of it is). Residential because the area is the PARCEL's.
   */
  public async openGroundM2(): Promise<number> {
    const extent = this.holdingKey();
    if (!extent) return 0;
    const workable = await ParcelApi.workableAreaOf(extent);
    if (!(workable > 0)) return 0;
    await this.loadBlueprint();
    return Math.max(0, workable - this.footprintM2());
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
  protected override addressFor(spec: BlueprintRoom): string | null {
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
   * on its blueprint room's way) is locked to THIS holding's keyway; the
   * blueprint authors the way back out as a plain passage, so a guest let
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
  public buildings(): BuildingBase[] {
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
   * Stand this holding's buildings up — unless a covering row already is
   * its building.
   *
   * ⭐ A building is DERIVED from the copy (merge of paint into harbors):
   * the enclosed rooms (they hold their own air) joined by the ways
   * between them — two enclosed rooms with a way between them are one
   * building, and open ground (a yard, a tract) parts them. The MAIN
   * building is the first one met from the entrance, in the blueprint's
   * own order; another goes by its first room's leaf (the barn).
   */
  private async wakeHouses(): Promise<void> {
    const extent = this.holdingKey();
    if (!extent) return;
    const covering = await NavigationApi.structureAt(extent);
    if (covering !== null && !(covering instanceof HoldingBuilding)) return;
    const groups = this.enclosedGroups();
    for (const [i, { name, rooms }] of groups.entries()) {
      const live = this._houses.get(name);
      if (live !== undefined && !live.isDestroyed()) {
        live.setRooms(rooms, i === 0);
        continue;
      }
      const house = await StuffApi.clone<HoldingBuilding>(HOLDING_BUILDING_ROW);
      house.setExtent(extent);
      // Every room of it holds its own air, so no entrance is needed to land it.
      house.setEntrance(null);
      house.setRooms(rooms, i === 0);
      house.setHolding(this);
      // A building of its own goes by its name — the barn — and the main
      // one by its row's (the house).
      if (name !== '') {
        house.setShortDescription(name);
        house.setKeywords([name, 'building']);
      }
      await PersistableApi.restoreOrSeed(house, this.houseKeyOf(extent, name));
      for (const at of this.attachPointsOf(house)) NavigationApi.attachStructure(at, house);
      this._houses.set(name, house);
    }
  }

  /**
   * The copy's enclosed rooms in connected groups, in blueprint order (the
   * entrance first): the first group is the main building (name `''`), and
   * each other is named by its first room's leaf.
   */
  private enclosedGroups(): Array<{ name: string; rooms: MemberStuff[] }> {
    const specs = this.blueprintRooms();
    const live = new Map<string, MemberStuff>();
    for (const spec of specs) {
      const room = this.roomForLeaf(spec.leaf);
      if (room === null) continue;
      if (!MixinApi.isAtmospheric(room) || !room.exposure().holdsAir()) continue;
      live.set(spec.row, room);
    }
    const leafOf = new Map(specs.map((s) => [s.row, s.leaf ?? ''] as const));
    const waysOf = new Map(specs.map((s) => [s.row, Object.values(s.exits).map((w) => w.destination)] as const));
    const seen = new Set<string>();
    const out: Array<{ name: string; rooms: MemberStuff[] }> = [];
    for (const spec of specs) {
      if (!live.has(spec.row) || seen.has(spec.row)) continue;
      const rooms: MemberStuff[] = [];
      const queue = [spec.row];
      seen.add(spec.row);
      while (queue.length > 0) {
        const row = queue.shift()!;
        rooms.push(live.get(row)!);
        // A way either side joins two rooms (the blueprint authors both).
        for (const other of specs) {
          if (seen.has(other.row) || !live.has(other.row)) continue;
          if ((waysOf.get(row) ?? []).includes(other.row) || (waysOf.get(other.row) ?? []).includes(row)) {
            seen.add(other.row);
            queue.push(other.row);
          }
        }
      }
      out.push({ name: out.length === 0 ? '' : (leafOf.get(spec.row) ?? '') || `building-${out.length}`, rooms });
    }
    return out;
  }
}
