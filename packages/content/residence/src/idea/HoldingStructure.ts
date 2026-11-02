/**
 * HoldingStructure — ⭐⭐ a holding's HOUSE: the building a lot or a unit
 * is, minted one per holding (paint build D6, 2026-10-31).
 *
 * A holding is a warren one level down — rooms keyed `(row, <extent>/…)`
 * — and until now it carried its shell's condition itself. A building's
 * condition is the building's now (a `Durable` condition the weather wears
 * once the coat is gone), so a holding needs a building to carry it: one
 * `Structure` per holding, keyed by the holding's own extent, with a face
 * and a condition. Walk around a Hinkley
 * lot's house from the lane and it is a building like any other: you can
 * `look` at it, `survey` it, `paint` it.
 *
 * Not a `Singleton` (every lot's house shares this row), so it is the
 * structure BASE composed here, not the platform twin. Not found by its
 * template path for the same reason: the holding registers it with the
 * location graph by instance (`NavigationApi.attachStructure`) so
 * `structureAt(<a room of the lot>)` answers it.
 *
 * ⭐ A holding may have MORE THAN ONE (paint review): a building is the
 * holding's ENCLOSED rooms grouped by the floorplan's `building:` key — a
 * farmstead's house and its barn are two, each with its own coat and
 * condition. Open ground (a yard, a tract, a garden) belongs to none; it
 * is where they are painted from. A house claims exactly its own rooms
 * ({@link hasMember}); the MAIN one (rooms with no `building:` key) also
 * answers at the holding's own extent, so "the home you hold" reads it.
 *
 * ⭐ It persists unconditionally — a holding exists only because somebody
 * holds it — under the holding's own `(scope, key)`.
 *
 * Where a Structure ROW already covers the holding's extent (Seznick
 * House is one building of many units; Duncan Hall one of many rooms),
 * no house is minted: the units read the building they are in.
 */

import StructureBase from '@saxonberg/server/mud/lib/structure/Structure';
import { FacedMixin } from '@saxonberg/server/mud/lib/material/Faced';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff, EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';

/** What the house reads of its holding — its rooms. */
interface HoldingRooms {
  getMembers(): Stuff[];
  isDestroyed(): boolean;
}

export const HOLDING_STRUCTURE_ROW = '/system/residence/idea/holding-structure';

export default class HoldingStructure extends PersistableMixin(
  DurableMixin(FacedMixin(StructureBase)),
) {
  /** The holding whose house this is — a weak, runtime ref set at its wake. */
  private holding: HoldingRooms | null = null;

  /** The room keys this building is — set by the holding at its wake. */
  private roomKeys: ReadonlySet<string> = new Set();

  /** Is this the holding's main building (it answers at the holding's extent)? */
  private main = true;

  public setHolding(holding: HoldingRooms | null): void {
    this.holding = holding;
  }

  /** Which of the holding's rooms this building is, and whether it is the main one. */
  public setRooms(keys: readonly string[], main: boolean): void {
    this.roomKeys = new Set(keys);
    this.main = main;
  }

  public getRoomKeys(): string[] {
    return [...this.roomKeys];
  }

  public isMain(): boolean {
    return this.main;
  }

  /** ⭐ Its own rooms — never the open ground or another building under the same extent. */
  public override hasMember(locationPath: string): boolean {
    if (this.roomKeys.has(locationPath)) return true;
    return this.main && locationPath === this.getExtent();
  }

  /** The holding's rooms that are this building — keyed clones, never found under the extent by path. */
  public override residentMembers(): Stuff[] {
    const h = this.holding;
    if (h === null || h.isDestroyed()) return [];
    return h
      .getMembers()
      .filter((m) => !m.isDestroyed() && MixinApi.isAtmospheric(m) && this.roomKeys.has(m.getPlacePath() ?? ''));
  }

  public override weatherScope(): Stuff | null {
    return this.outsideScope();
  }

  public override weatherExposureAt(_scope: Stuff): number {
    return 1;
  }

  public override skyLightAt(_scope: Stuff): number {
    return 1;
  }

  public override airChangeAt(_scope: Stuff): number {
    return 1;
  }

  public override bareWearPerDay(): number {
    return this.bareWearDial();
  }

  public override getCondition(): number {
    this.reconcileWeather();
    return super.getCondition();
  }

  public override coatAreaM2(): number {
    return this.exteriorAreaM2();
  }

  /** ⭐ A building is painted from where it meets the weather (paint D9). */
  public override coatReachRefusal(actor: Stuff): ActRefusal | null {
    return this.landingRefusal(actor);
  }

  /** It goes when its holding does — the holding tears it down. */
  public override canEvict(_context: EvictionContext): VetoResult {
    const h = this.holding;
    return h === null || h.isDestroyed()
      ? { ok: true }
      : { ok: false, reason: 'a holding’s house stands while the holding does' };
  }
}
