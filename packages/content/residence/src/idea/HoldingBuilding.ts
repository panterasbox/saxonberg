/**
 * HoldingBuilding — ⭐⭐ a building of a HOLDING: minted one per building
 * of a lot or a unit (paint build D6, 2026-10-31; renamed and split in
 * review).
 *
 * A holding is a warren one level down — rooms keyed `(row, <extent>/…)`
 * — and until the paint build it carried its shell's condition itself. A
 * building's condition is the building's now (`lib/structure/Building`: a
 * face, and a `Durable` condition the weather wears once the coat is gone),
 * so a holding stands its buildings up at its wake. Walk around a Hinkley
 * lot's house from the lane and it is a building like any other: you can
 * `look` at it, `analyze condition` it, `measure paint` it, `paint` it,
 * `maintain` it.
 *
 * ⭐ A building is AUTHORED: the holding's
 * programme row names its buildings (`buildings:`, the main one first,
 * beside the plan's `extent` and `entrance` it authors), each
 * a row of this class with its own `extent` and `entrance` — a
 * farmstead's house and its barn are two, each with its own coat and
 * condition, and the rooms under each one's extent are its rooms. Open
 * ground (a yard, a tract, a garden) lies under none; it is where they
 * are painted from. It holds its rooms as INSTANCES — keyed clones no
 * path names (holding.md § Identity) — and the holding answers which
 * building a room is in (`HoldingWarren.structureOf`). By path, only the
 * MAIN building answers, at the holding's own extent: "the home you hold".
 *
 * Not a `Singleton` (every lot's copy of a building shares that row), so
 * it is the building BASE composed here, not the row twin. Its rows
 * `extends: /system/residence/idea/holding-building`, the plain house's
 * words.
 *
 * ⭐ It persists unconditionally — a holding exists only because somebody
 * holds it — under the holding's own `(scope, key)`.
 *
 * A plan that names no building (a Seznick House flat) mints none:
 * its units read the Building row they are in.
 */

import BuildingBase from '@saxonberg/server/mud/lib/structure/Building';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff, EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

/** What the house reads of its holding — whether it still stands. */
interface HoldingRooms {
  isDestroyed(): boolean;
}

export default class HoldingBuilding extends PersistableMixin(BuildingBase) {
  /** The holding whose house this is — a weak, runtime ref set at its wake. */
  private holding: HoldingRooms | null = null;

  /** The rooms this building is — live instances the holding hands it at its wake. */
  private rooms: Stuff[] = [];

  /** Is this the holding's main building (it answers at the holding's extent)? */
  private main = true;

  public setHolding(holding: HoldingRooms | null): void {
    this.holding = holding;
  }

  /** Which of the holding's rooms this building is, and whether it is the main one. */
  public setRooms(rooms: readonly Stuff[], main: boolean): void {
    this.rooms = [...rooms];
    this.main = main;
  }

  /** Is `room` one of this building's rooms? */
  public hasRoom(room: Stuff): boolean {
    return this.rooms.includes(room);
  }

  public isMain(): boolean {
    return this.main;
  }

  /**
   * ⭐ By path, a holding's building answers only at the holding's own
   * extent, and only the main one ("the home you hold"). Its rooms are
   * keyed clones no path names; the holding answers for them
   * (`HoldingWarren.structureOf`).
   */
  public override hasMember(locationPath: string): boolean {
    return this.main && locationPath === this.getExtent();
  }

  /** The rooms that are this building — never the open ground or another building. */
  public override residentMembers(): Stuff[] {
    return this.rooms.filter((m) => !m.isDestroyed() && MixinApi.isAtmospheric(m));
  }

  /** Its landings: the places one exit from its own rooms that pass {@link isLandedAt}. */
  public override landingsNow(): Stuff[] {
    const seen = new Set<string>();
    const out: Stuff[] = [];
    for (const m of this.residentMembers()) {
      if (!MixinApi.isExitable(m)) continue;
      for (const exit of m.getExits().values()) {
        const far = exit.peekDestination();
        if (far === null || seen.has(far.stuffId)) continue;
        seen.add(far.stuffId);
        if (this.isLandedAt(far)) out.push(far);
      }
    }
    return out;
  }

  /** It goes when its holding does — the holding tears it down. */
  public override canEvict(_context: EvictionContext): VetoResult {
    const h = this.holding;
    return h === null || h.isDestroyed()
      ? { ok: true }
      : { ok: false, reason: 'a holding’s house stands while the holding does' };
  }
}
