/**
 * ShipWarren — ⭐ **a ship's rooms, as a warren one level down** (harbors
 * P1, P2, P3).
 *
 * A `Warren` is a class and a `Ship` is a `Structure`, so a ship cannot BE
 * one; she OWNS one, minted keyed `(this row, her key)` the first time she
 * stands (`Ship.standWarren`). Everything a house's warren does, hers
 * does — her kind's PLAN (her kind row's own `extent` over its room rows
 * and its `entrance`, harbors review 3 and 2026-11-03) is copied keyed
 * `(room row, <serial>/<leaf>)`, its ways wired, she sleeps whole (`FloorplanWarren`) — and what differs is said
 * here. (Her hull is HERS, not her rooms': a `Durable` fabric under a
 * coat, as a house's is — `Ship`.)
 *
 * - **which ship** — the warren names its ship (`ship()`), and so answers
 *   *which structure is this room?* for every member
 *   ({@link structureOf}): a smack's deck row is every smack's, so no
 *   `extent` prefix can tell two of them apart;
 * - **where the rooms stand** — a ship's key is a serial, not a path, so
 *   a room's zone is resolved under its own row's folder (the kind's
 *   zone, authored once) rather than from the key ({@link zoneFromFor});
 * - **the sea over the side** — a deck that cites a `sea` feature
 *   stamps itself a shore of whatever sea she lies on as it wakes
 *   (`Compartment.onWarrenWake`, the one wake hook);
 * - **when she sleeps** — the population witness of her rooms asks her
 *   (`Ship.sleepIfEmpty`): nobody interactive aboard, not under way;
 * - ⭐ **only her hold keeps a record** (review 2, *persistence is the
 *   exception*): her deck and cabin come up from their rows each wake, so
 *   when she sleeps whatever is loose in them is stowed in her hold, and
 *   the row gear she was short of then is kept short ({@link stow},
 *   {@link fitOut}).
 *
 * ⭐ **An authored ship adopts.** The Hesper names no `warren:`; her warren
 * is the platform's `/platform/idea/ShipWarren/authored` row; it copies
 * NO plan — an authored ship's own rows already ARE the place, and they
 * are served — and it takes her resident rooms under her `extent` as
 * members instead of minting any ({@link adoptResident}).
 *
 * ⭐ **The plan is the ship's** (harbors review, 2026-11-03): a warren row
 * names nothing; a ship of a kind hands her warren her own row's
 * `extent` and `entrance` ({@link planOf}). The ship owns the plan, as a
 * holding's programme row owns its own. One kind of
 * ship room (`Compartment`), two ways of instancing it: keyed for a kind,
 * by its own row for an authored ship.
 */

import { FloorplanWarren } from '../../lib/location/FloorplanWarren';
import type { FloorplanRoom } from '../../lib/location/Floorplan';
import { ContainmentApi } from '../../api/containment';
import { Template } from '../../lib/stuff/Template';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import type { Stuff, EvictionContext } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { VetoResult } from '../../lib/errors';
import type { Containable } from '../../lib/spatial/Containable';
import type { FieldMeta } from '../../lib/mixin';
import type Ship from './Ship';

type MemberStuff = Stuff & Container;

/** The row an authored ship's warren is cloned from (no plan: it adopts). */
export const AUTHORED_SHIP_WARREN = '/platform/idea/ShipWarren/authored';

export default class ShipWarren extends FloorplanWarren {
  static fieldMeta: FieldMeta = {
    shortOf: { persistent: true },
  };

  /**
   * ⭐ The row gear each plain room was SHORT of when she slept, by room
   * leaf then by row (review 2): a line taken ashore, a flag carried off.
   * A plain room lays its row's gear down afresh every wake, so without
   * this a rope taken off her came back each time she woke — a faucet.
   * Applied and cleared at the next wake ({@link fitOut}).
   */
  public shortOf: Record<string, Record<string, number>> = {};

  /** Runtime: what each plain room's row laid down at this wake, by leaf. */
  private laid: Map<string, Set<Stuff>> = new Map();

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
  public override structureOf(_member: Stuff): Ship | null {
    return this.ship();
  }

  /** Her rooms standing now — the places among the members. */
  public liveRooms(): MemberStuff[] {
    return this.getMembers().filter((m) => m.isPlace());
  }

  /**
   * ⭐ Her plan is HERS: a ship of a kind hands over her own row's
   * `extent` and `entrance` (her kind row, named in every error); an
   * authored ship copies none — her rows are the place, adopted.
   *
   * @hook
   */
  protected override planOf(): { owner: string; data: Record<string, unknown> } | null {
    const ship = this.ship();
    if (ship === null || !ship.isOfKind()) return null;
    return {
      owner: ship.getTemplatePath() ?? 'a ship of a kind',
      data: { extent: ship.getExtent(), entrance: ship.getEntrance() ?? '' },
    };
  }

  /**
   * Stand her rooms up: a kind's plan is copied keyed; an authored ship's
   * resident rooms are adopted.
   */
  public override async wake(): Promise<void> {
    await super.wake();
    if (this.ship()?.isOfKind() !== true) await this.adoptResident();
    else this.fitOut(this.shortOf);
  }

  /** Her minted rooms that keep no record of their own, with their leaf. */
  private plainRooms(): Array<{ leaf: string; room: MemberStuff }> {
    const out: Array<{ leaf: string; room: MemberStuff }> = [];
    for (const spec of this.planRooms()) {
      const room = this.roomForLeaf(spec.leaf);
      if (room !== null && !MixinApi.isPersistable(room)) out.push({ leaf: spec.leaf ?? '', room });
    }
    return out;
  }

  /** Her hold: the first of her minted rooms that keeps a record, or `null`. */
  public holdRoom(): MemberStuff | null {
    for (const spec of this.planRooms()) {
      const room = this.roomForLeaf(spec.leaf);
      if (room !== null && MixinApi.isPersistable(room)) return room;
    }
    return null;
  }

  /**
   * ⭐ Her plain rooms are stood up from their rows (review 2): note what
   * each row laid down — her gear — and take back off what she was short
   * of when she slept, so gear carried off her stays gone.
   */
  private fitOut(shortOf: Record<string, Record<string, number>>): void {
    for (const { leaf, room } of this.plainRooms()) {
      if (this.laid.has(leaf)) continue;
      // ⭐ What her gear holds is gear too (harbors drive, 2026-11-04): the
      // dinghy's oars, bow line and pump came up with the dinghy, and
      // counting only the room's own contents stowed them in her hold at
      // every sleep — two sleeps, two sets of oars below.
      const gear = new Set<Stuff>();
      const lay = (xs: readonly Stuff[]): void => {
        for (const x of xs) {
          gear.add(x);
          if (MixinApi.isContainer(x)) lay(x.getContents());
        }
      };
      lay(room.getContents());
      const short = shortOf[leaf] ?? {};
      for (const [row, n] of Object.entries(short)) {
        let left = n;
        for (const g of [...gear]) {
          if (left <= 0) break;
          if (g.isDestroyed() || g.getTemplatePath() !== row) continue;
          // Kept in the set, destroyed: still short at her next sleep.
          StuffApi.destruct(g);
          left -= 1;
        }
      }
      this.laid.set(leaf, gear);
    }
    this.shortOf = {};
  }

  /**
   * ⭐ She is going to sleep (review 2): her plain rooms will come up from
   * their rows, so what is loose in them that is not their row's gear —
   * a crate left on deck, a flag of yours, a line you bought — is stowed in
   * her hold, along with what lies in her gear (stones in the dinghy). The
   * row gear she is short of is recorded ({@link shortOf}). With no hold,
   * what is loose goes with the rooms, and says so in the log.
   */
  public stow(): void {
    const hold = this.holdRoom();
    const shortOf: Record<string, Record<string, number>> = {};
    for (const { leaf, room } of this.plainRooms()) {
      const gear = this.laid.get(leaf) ?? new Set<Stuff>();
      const here = new Set<Stuff>(room.getContents());
      // Gear still aboard anywhere in this room — in the dinghy counts.
      const aboard = new Set<Stuff>();
      const walk = (xs: readonly Stuff[]): void => {
        for (const x of xs) {
          aboard.add(x);
          if (MixinApi.isContainer(x)) walk(x.getContents());
        }
      };
      walk(room.getContents());
      for (const g of gear) {
        if (!g.isDestroyed() && aboard.has(g)) continue;
        const row = g.getTemplatePath() ?? '';
        if (!row) continue;
        const byRow = (shortOf[leaf] ??= {});
        byRow[row] = (byRow[row] ?? 0) + 1;
      }
      const loose: Stuff[] = [];
      for (const x of here) {
        if (gear.has(x)) {
          const within = (c: Stuff): void => {
            if (!gear.has(c)) loose.push(c);
            else if (MixinApi.isContainer(c)) c.getContents().forEach(within);
          };
          if (MixinApi.isContainer(x)) x.getContents().forEach(within);
          continue;
        }
        loose.push(x);
      }
      for (const x of loose) {
        if (MixinApi.isHasInteractive(x) || !MixinApi.isContainable(x) || x.isFixedInPlace()) continue;
        if (hold === null) {
          console.warn(`ShipWarren: ${this.getDurableHandle()} has no hold; ${x.getTemplatePath()} goes with her ${leaf}`);
          continue;
        }
        ContainmentApi.move(x as Stuff & Containable, hold);
      }
    }
    this.shortOf = shortOf;
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
      // An authored room is a row of its own: its one instance, by its path.
      const room = StuffApi.findByIdentityPath<Stuff>(path).find((r) => !r.isDestroyed()) ?? null;
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
    const folder = spec.row.replace(/\/[^/]+$/, '');
    return `${folder}/${key}`;
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
}
