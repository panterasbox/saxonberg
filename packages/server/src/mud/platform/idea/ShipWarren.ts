/**
 * ShipWarren — ⭐ **a ship's rooms, as a warren one level down** (harbors
 * P1, P2, P3).
 *
 * A `Warren` is a class and a `Ship` is a `Structure`, so a ship cannot BE
 * one; she OWNS one, minted keyed `(this row, her key)` the first time she
 * stands (`Ship.standWarren`). Everything a house's warren does, hers
 * does — her kind's BLUEPRINT (a Structure row over her kind's room rows,
 * harbors review 3) is copied keyed `(room row, <serial>/<leaf>)`, its ways
 * wired, she sleeps whole (`FloorplanWarren`), and
 * her hull weathers on the house's clock (`WeatheringMixin`, which she
 * composes as a house does) — and what differs is said here:
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
 * - **her words** — seams, oakum and pitch ({@link upkeepWords});
 * - ⭐ **only her hold keeps a record** (review 2, *persistence is the
 *   exception*): her deck and cabin come up from their rows each wake, so
 *   when she sleeps whatever is loose in them is stowed in her hold, and
 *   the row gear she was short of then is kept short ({@link stow},
 *   {@link fitOut}).
 *
 * ⭐ **An authored ship adopts.** The Hesper names no `warren:`; her warren
 * is the platform's `/platform/idea/ShipWarren/authored` row, which names
 * NO blueprint — an authored ship's own Structure is already the
 * blueprint-shaped place, and it is served — and it takes her resident rooms under her `extent`
 * as members instead of minting any ({@link adoptResident}). One kind of
 * ship room (`Compartment`), two ways of instancing it: keyed for a kind,
 * by its own row for an authored ship.
 */

import { FloorplanWarren } from '../../lib/location/FloorplanWarren';
import type { BlueprintRoom } from '../../lib/location/Blueprint';
import { WeatheringMixin, type UpkeepWords } from '../../lib/location/Weathering';
import { ContainmentApi } from '../../api/containment';
import { Template } from '../../lib/stuff/Template';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { PersistableApi } from '../../api/persistable';
import { WorldClockApi } from '../../api/worldclock';
import type { Stuff, EvictionContext } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { VetoResult } from '../../lib/errors';
import type { Containable } from '../../lib/spatial/Containable';
import type { FieldMeta } from '../../lib/mixin';
import type Ship from './Ship';

type MemberStuff = Stuff & Container;

/** The row an authored ship's warren is cloned from (no blueprint: it adopts). */
export const AUTHORED_SHIP_WARREN = '/platform/idea/ShipWarren/authored';

export default class ShipWarren extends WeatheringMixin(FloorplanWarren) {
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
  public override structureOf(): Stuff | null {
    return this.ship();
  }

  /** Her rooms standing now — the places among the members. */
  public liveRooms(): MemberStuff[] {
    return this.getMembers().filter((m) => m.isPlace());
  }

  /**
   * Stand her rooms up: a kind's blueprint is copied keyed; an authored
   * ship's resident rooms are adopted.
   */
  public override async wake(): Promise<void> {
    await super.wake();
    if (this.getBlueprint() === '') await this.adoptResident();
    else this.fitOut(this.shortOf);
  }

  /** Her minted rooms that keep no record of their own, with their leaf. */
  private plainRooms(): Array<{ leaf: string; room: MemberStuff }> {
    const out: Array<{ leaf: string; room: MemberStuff }> = [];
    for (const spec of this.blueprintRooms()) {
      const room = this.roomForLeaf(spec.leaf);
      if (room !== null && !MixinApi.isPersistable(room)) out.push({ leaf: spec.leaf ?? '', room });
    }
    return out;
  }

  /** Her hold: the first of her minted rooms that keeps a record, or `null`. */
  public holdRoom(): MemberStuff | null {
    for (const spec of this.blueprintRooms()) {
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
      const gear = new Set<Stuff>(room.getContents());
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
      for (const g of gear) {
        if (!g.isDestroyed() && here.has(g)) continue;
        const row = g.getTemplatePath() ?? '';
        if (!row) continue;
        const byRow = (shortOf[leaf] ??= {});
        byRow[row] = (byRow[row] ?? 0) + 1;
      }
      const loose: Stuff[] = [];
      for (const x of here) {
        if (gear.has(x)) {
          if (MixinApi.isContainer(x)) loose.push(...x.getContents().filter((c) => !gear.has(c)));
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
  protected override zoneFromFor(spec: BlueprintRoom, key: string): string {
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

  /**
   * ⭐ Her hull is her shell (harbors B4): the house's clock, the house's
   * rate. Before the shell moves, her bilge is brought up to now over the
   * line as it stood — so the leak is integrated band by band, and the
   * bilge's stamp never falls behind the shell's. The first read of a
   * fresh shell is kept at once: an authored ship never sleeps, and a
   * stamp that was never captured would restart her clock on every boot.
   */
  public override reconcileShell(): number {
    this.ship()?.integrateBilge(WorldClockApi.getNow().rawValue());
    const fresh = this.shellStamp <= 0;
    const c = super.reconcileShell();
    if (fresh) this.keep();
    return c;
  }

  /**
   * ⭐ Caulked (`maintain` aboard): the water that came in came in at the
   * old band, then the shell is sound and the leak stops — read live.
   * Kept at once (an authored ship's warren is captured by nothing else).
   */
  public override restoreShell(): void {
    this.ship()?.integrateBilge(WorldClockApi.getNow().rawValue());
    super.restoreShell();
    this.keep();
  }

  private keep(): void {
    try {
      void PersistableApi.capture(this as unknown as Stuff).catch((err) =>
        console.warn('ShipWarren: capture failed:', err),
      );
    } catch (err) {
      console.warn('ShipWarren: capture failed:', err);
    }
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
      discipline: 'seamanship',
    };
  }
}
