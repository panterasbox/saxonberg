/**
 * ShipWarren — ⭐ **a ship's rooms, as a warren one level down**.
 *
 * A `Warren` is a class and a `Ship` is a `Structure`, so a ship cannot BE
 * one; she OWNS one, minted keyed `(this row, her key)` the first time she
 * stands (`Ship.standWarren`). Everything a house's warren does, hers
 * does — her kind's PLAN (her kind row's own `extent` over its room rows
 * and its `entrance`) is copied keyed
 * `(room row, <serial>/<leaf>)`, its ways wired, she sleeps whole (`FloorplanWarren`) — and what differs is said
 * here. (Her hull is HERS, not her rooms': a `Durable` fabric under a
 * coat, as a house's is — `Ship`.)
 *
 * - **which ship** — the warren names its ship (`ship()`), and so answers
 *   *which structure is this room?* for every member
 *   ({@link structureOf}): a smack's deck row is every smack's, so no
 *   `extent` prefix can tell two of them apart;
 * - **where the rooms stand** — a ship's key is a serial, not a path, so
 *   her rooms stand in HER copy of her kind's zone, `<kind zone>/<serial>`
 *   (zone-instancing D11), named by the one rule the capability owns
 *   ({@link zoneFromFor});
 * - **the sea over the side** — a deck that cites a `sea` feature
 *   stamps itself a shore of whatever sea she lies on as it wakes
 *   (`Compartment.onWarrenWake`, the one wake hook);
 * - **when she sleeps** — the population witness of her rooms asks her
 *   (`Ship.sleepIfEmpty`): nobody interactive aboard, not under way;
 * - ⭐ **only her hold keeps a record** (*persistence is the
 *   exception*): her deck and cabin come up from their rows each wake, so
 *   when she sleeps whatever is loose in them is stowed in her hold, and
 *   the row gear she was short of then is kept short ({@link stow},
 *   {@link fitOut}).
 *
 * ⭐ **The plan is the ship's**: a warren row names how its copies are
 * named and joined and nothing else; a ship hands her warren her own row's
 * `extent` and `entrance` ({@link planOf}). The ship owns the plan, as a
 * holding's programme row owns its own. ⭐ **Every ship is a copy**
 * (zone-instancing D12): a ship of a kind is keyed by her minted serial, an
 * authored ship (the Hesper, `warren: /platform/idea/ShipWarren/authored`)
 * by her authored `serial` — one way of instancing her rooms, whichever
 * way she came to be.
 */

import { FloorplanWarren } from '../../lib/place/FloorplanWarren';
import { ZoneMintingMixin } from '../../lib/place/ZoneMinting';
import type { FloorplanRoom } from '../../lib/place/Floorplan';
import { ContainmentApi } from '../../api/containment';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import type { Stuff, EvictionContext } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { VetoResult } from '../../lib/errors';
import type { Containable } from '../../lib/spatial/Containable';
import type { FieldMeta } from '../../lib/mixin';
import type Ship from './Ship';

type MemberStuff = Stuff & Container;

export default class ShipWarren extends ZoneMintingMixin(FloorplanWarren) {
  static fieldMeta: FieldMeta = {
    shortOf: { persistent: true },
  };

  /**
   * ⭐ The row gear each plain room was SHORT of when she slept, by room
   * leaf then by row: a line taken ashore, a flag carried off.
   * A plain room lays its row's gear down afresh every wake, so without
   * this a rope taken off her came back each time she woke — a faucet.
   * Applied and cleared at the next wake ({@link fitOut}).
   */
  public shortOf: Record<string, Record<string, number>> = {};

  /** Runtime: what each plain room's row laid down at this wake, by leaf. */
  private laid: Map<string, Set<Stuff>> = new Map();

  /** Her rooms are hers, not a holding's: a ship's warren is no address's. */
  private _ship: Ship | null = null;

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
    if (ship === null) return null;
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
    // ⭐ A ship of a kind is a copy: her zone — a copy of her kind's zone
    // row named by her serial — stands BEFORE her rooms, which the resolver
    // stamps into it, and is checked after (zone-instancing D11).
    const plan = await this.loadPlan();
    const key = this.warrenKey();
    const zone = plan !== null && key !== null ? await this.wakeCopyZone(plan.extent, key) : null;
    await super.wake();
    if (zone !== null) {
      this.checkCopyRooms(zone, this.liveRooms());
      await this.recordCopy(zone, this.copyRooms());
    }
    this.fitOut(this.shortOf);
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
   * ⭐ Her plain rooms are stood up from their rows: note what
   * each row laid down — her gear — and take back off what she was short
   * of when she slept, so gear carried off her stays gone.
   */
  private fitOut(shortOf: Record<string, Record<string, number>>): void {
    for (const { leaf, room } of this.plainRooms()) {
      if (this.laid.has(leaf)) continue;
      // ⭐ What her gear holds is gear too: the
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
   * ⭐ She is going to sleep: her plain rooms will come up from
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
   * ⭐ A ship's serial names no place: her rooms stand in HER copy of her
   * kind's zone, `<kind zone>/<serial>` (zone-instancing D5, D11) — named
   * by the one rule the capability owns.
   */
  protected override zoneFromFor(spec: FloorplanRoom, _key: string): string {
    const plan = this.planExtent();
    const serial = this.warrenKey();
    if (plan === null || serial === null) return _key;
    return `${this.copyIdentity(plan, serial)}/${spec.leaf}`;
  }

  /** Her plan's extent — her kind's zone row — or null with no plan. */
  private planExtent(): string | null {
    const of = this.planOf();
    const extent = of?.data.extent;
    return typeof extent === 'string' && extent !== '' ? extent.replace(/\/+$/, '') : null;
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
