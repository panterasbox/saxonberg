/**
 * ShipWarren — ⭐ **a ship's rooms, as a warren one level down** (harbors
 * P1, P2, P3).
 *
 * A `Warren` is a class and a `Ship` is a `Structure`, so a ship cannot BE
 * one; she OWNS one, minted keyed `(this row, her key)` the first time she
 * stands (`Ship.standWarren`). Everything a house's floorplan does, hers
 * does — the floorplan mints her rooms keyed `(room row, <serial>/<leaf>)`,
 * the intra-plan ways are wired, she sleeps whole, and her hull weathers on
 * the house's clock (`FloorplanWarren`) — and what differs is said here:
 *
 * - **which ship** — the warren names its ship (`ship()`), and so answers
 *   *which structure is this room?* for every member
 *   ({@link structureOf}): a smack's deck row is every smack's, so no
 *   `extent` prefix can tell two of them apart;
 * - **where the rooms stand** — a ship's key is a serial, not a path, so
 *   a room's zone is resolved under its own row's folder (the kind's
 *   zone, authored once) rather than from the key ({@link zoneFromFor});
 * - **the sea over the side** — a deck that cites a `sea` feature is
 *   stamped a shore of whatever sea she lies on as it wakes
 *   ({@link onRoomWoken});
 * - **when she sleeps** — the population witness of her rooms asks her
 *   (`Ship.sleepIfEmpty`): nobody interactive aboard, not under way;
 * - **her words** — seams, oakum and pitch ({@link upkeepWords}).
 *
 * ⭐ **An authored ship adopts.** The Hesper names no `warren:`; her warren
 * is the platform's `/platform/idea/ShipWarren/authored` row, whose
 * floorplan is EMPTY, and it takes her resident rooms under her `extent`
 * as members instead of minting any ({@link adoptResident}). One kind of
 * ship room (`Compartment`), two ways of instancing it: keyed for a kind,
 * by its own row for an authored ship.
 */

import { FloorplanWarren, type FloorplanRoom, type UpkeepWords } from '../../lib/location/FloorplanWarren';
import { Template } from '../../lib/stuff/Template';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import type { Stuff, EvictionContext } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { VetoResult } from '../../lib/errors';
import type Ship from './Ship';

type MemberStuff = Stuff & Container;

/** The row an authored ship's warren is cloned from (empty floorplan). */
export const AUTHORED_SHIP_WARREN = '/platform/idea/ShipWarren/authored';

export default class ShipWarren extends FloorplanWarren {
  /** Her rooms are hers, not a holding's: a ship's warren is no address's. */
  private _ship: Ship | null = null;

  /** Runtime cache of her member rows (an authored ship's extent descendants). */
  private extentRows: Promise<string[]> | null = null;

  /** Set once, by the ship that stands this warren up. */
  public attachShip(ship: Ship): void {
    this._ship = ship;
  }

  /** The ship these rooms are, standing — `null` once she is gone. */
  public ship(): Ship | null {
    const s = this._ship;
    return s !== null && !s.isDestroyed() ? s : null;
  }

  /** ⭐ Every member room is HER (P3). */
  public override structureOf(): Stuff | null {
    return this.ship();
  }

  /** Her rooms standing now — the places among the members. */
  public liveRooms(): MemberStuff[] {
    return this.getMembers().filter((m) => m.isPlace());
  }

  /**
   * Stand her rooms up: a kind's floorplan is minted keyed; an authored
   * ship's resident rooms are adopted.
   */
  public override async wake(): Promise<void> {
    await super.wake();
    if (this.getFloorplan().length === 0) await this.adoptResident();
  }

  /**
   * ⭐ An authored ship's rooms are rows of their own, loaded as any room
   * is (walked to, by her berth, by her zone): whichever of them stand now
   * become members. Asked again on every read of her rooms — a room that
   * loaded later joins then.
   */
  public async adoptResident(): Promise<void> {
    const ship = this.ship();
    const ext = ship?.getExtent() ?? '';
    if (ext === '') return;
    if (this.extentRows === null) {
      this.extentRows = Template.findDescendants(ext).then((ts) => ts.map((t) => t.path));
    }
    for (const path of await this.extentRows) {
      const room = StuffApi.findByDurableHandle<Stuff>(path);
      if (room === null || !room.isPlace() || !MixinApi.isContainer(room)) continue;
      if (this.hasMember(room)) continue;
      this.addMember(room);
    }
  }

  /**
   * Let go of every adopted room without destructing it — an authored
   * ship's rooms are rows in their own right, and stand on when her warren
   * goes (an HMR of the ship, a shutdown).
   */
  public releaseRooms(): void {
    for (const m of this.getMembers()) this.removeMember(m);
  }

  /** ⭐ A ship's serial names no place: her rooms stand in their own row's zone (the kind's). */
  protected override zoneFromFor(spec: FloorplanRoom, key: string): string {
    const folder = spec.room.replace(/\/[^/]+$/, '');
    return `${folder}/${key}`;
  }

  /** ⭐ A deck that names the sea over her side is a shore of the sea she lies on. */
  protected override onRoomWoken(room: MemberStuff, _spec: FloorplanRoom): void {
    const sea = this.ship()?.getExpanse() ?? null;
    if (sea === null || !MixinApi.isShore(room) || !MixinApi.isDetailed(room)) return;
    if (!room.hasDetail('sea')) return;
    room.setWaters({ ...room.getWaters(), sea });
  }

  /**
   * ⭐ Her population changed (a Compartment's witness): she sleeps whole
   * when nobody interactive is aboard and she is not under way — the
   * ship decides (`Ship.sleepIfEmpty`); this only says who is aboard.
   */
  protected async reconcile(): Promise<void> {
    const ship = this.ship();
    if (ship === null) return;
    const anybody = this.liveRooms().some((r) => this.occupantsOf(r).length > 0);
    if (!anybody) await ship.sleepIfEmpty();
  }

  /** ⭐ It stands while its ship does: she takes it down with her (`Ship.sleep`). */
  public override canEvict(_context: EvictionContext): VetoResult {
    if (this.ship() !== null) return { ok: false, reason: "a ship's warren stands while she does" };
    return { ok: true };
  }

  /**
   * A ship speaks of seams, oakum and pitch.
   *
   * @hook
   */
  public override upkeepWords(): UpkeepWords {
    return {
      declining: 'Her seams are starting to open; the weather is getting in under the pitch.',
      failed: 'Her seams have gone; she weeps at every one of them.',
      kit: "a caulker's kit",
      work: 'You work along her seams, paying in oakum and hot pitch wherever the weather has been at them.',
      witnessed: "works along her seams with a caulker's kit.",
    };
  }
}
