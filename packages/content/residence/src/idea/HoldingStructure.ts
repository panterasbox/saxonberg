/**
 * HoldingStructure — ⭐⭐ a holding's HOUSE: the building a lot or a unit
 * is, minted one per holding (paint build D6, 2026-10-31).
 *
 * A holding is a warren one level down — rooms keyed `(row, <extent>/…)`
 * — and until now it carried its shell's condition itself. The shell is
 * every building's now (`ShellMixin`, the kernel's), so a holding needs a
 * building to carry it: one `Structure` per holding, keyed by the holding's
 * own extent, with the outside's three capabilities. Walk around a Hinkley
 * lot's house from the lane and it is a building like any other: you can
 * `look` at it, `survey` it, `paint` it.
 *
 * Not a `Singleton` (every lot's house shares this row), so it is the
 * structure BASE composed here, not the platform twin. Not found by its
 * template path for the same reason: the holding registers it with the
 * location graph by instance (`NavigationApi.attachStructure`) so
 * `structureAt(<a room of the lot>)` answers it.
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
import { WeatheringMixin } from '@saxonberg/server/mud/lib/material/Weathering';
import { ShellMixin } from '@saxonberg/server/mud/lib/structure/Shell';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff, EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

/** What the house reads of its holding — its rooms. */
interface HoldingRooms {
  getMembers(): Stuff[];
  isDestroyed(): boolean;
}

export const HOLDING_STRUCTURE_ROW = '/system/residence/idea/holding-structure';

export default class HoldingStructure extends PersistableMixin(
  ShellMixin(WeatheringMixin(FacedMixin(StructureBase))),
) {
  /** The holding whose house this is — a weak, runtime ref set at its wake. */
  private holding: HoldingRooms | null = null;

  public setHolding(holding: HoldingRooms | null): void {
    this.holding = holding;
  }

  /** The holding's own rooms — keyed clones, never found under the extent by path. */
  public override residentMembers(): Stuff[] {
    const h = this.holding;
    if (h === null || h.isDestroyed()) return [];
    return h.getMembers().filter((m) => !m.isDestroyed() && MixinApi.isAtmospheric(m));
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

  public override coatAreaM2(): number {
    return this.exteriorAreaM2();
  }

  /** It goes when its holding does — the holding tears it down. */
  public override canEvict(_context: EvictionContext): VetoResult {
    const h = this.holding;
    return h === null || h.isDestroyed()
      ? { ok: true }
      : { ok: false, reason: 'a holding’s house stands while the holding does' };
  }
}
