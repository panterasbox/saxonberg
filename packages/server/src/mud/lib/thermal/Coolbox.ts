/**
 * CoolboxMixin — ⭐ **a holder whose interior is as cold as the coldest
 * thing in it.**
 *
 * The passive rung of the cold ladder, and the whole of what an icebox
 * is: no setpoint, no heat pump, no bill. You carry cold IN — a block
 * of ice — shut the lid, and what is inside keeps until the ice is
 * gone. The cold is a thing somebody has to maintain, which is what
 * makes an icebox an object you KEEP rather than a property of the
 * room.
 *
 * ## The model
 *
 * ⭐ The box's **contents temperature** is the coldest thing in it while
 * the lid is shut. `ThermalMixin.getContentsTemperature()` defaults to
 * *the vessel's own temperature* — the thermos model, where the body IS
 * the held fluid — and this overrides it, which is the extension point
 * that default exists for. It is a READ, computed each time, not a
 * cached ambient: `restamp` rewrites `lastAmbientK` from the chain on
 * every move, so anything stashed there would be undone by the next
 * thing put in the box.
 *
 * The box's own body (the walls) stays near the room. That is not a
 * fudge — it is what a zinc-lined chest full of ice actually is, and it
 * is why `getContentsTemperature` and `getTemperature` are two methods.
 * The `coldStorage` satisfier asks the first one; so does seam 1.
 *
 * Two seams in `ThermalMixin` do the rest, both on the BODY being held
 * rather than here (see `Thermal.holderK` and the lent-insulation
 * clause in `effectiveR`):
 *
 * 1. **A body inside a shut Coolbox reads the box's interior** as its
 *    ambient rather than the chain's. The cold twin of `heatSourceK`,
 *    which is hot-only.
 * 2. **The coldest body warms against the ROOM through the box's
 *    walls** — it borrows `insulationR`. Without this the ice would
 *    read its own temperature as ambient and never melt, which is a
 *    box that keeps its cold forever and a lens-4 answer of nothing.
 *
 * Open the lid and neither applies: the interior is the room, the ice
 * melts at room pace, and the food stops being kept. The seal toggle
 * already restamps.
 *
 * ⚠ **`insulationR` is a CONTENT dial.** A thicker box keeps longer.
 * If a block of ice is gone before the food bands diverge, the answer
 * is a bigger R or a bigger block on the row — authoring, not a
 * defect.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Sealable } from '../spatial/Sealable';
import type { Thermal } from './Thermal';
import { MixinApi } from '../../api/mixin';
import { Quantity } from '../quantity';

/** Public shape provided by CoolboxMixin. */
export interface Coolbox {
  /**
   * ⭐ Extra heat-exchange resistance (K/W) the box's walls lend to the
   * coldest thing inside it. Authorable per row: a five-centimetre
   * softwood chest is the default, a straw-packed one is more, a tin
   * box is less.
   */
  getInsulationR(): number;
  setInsulationR(v: number): void;

  /**
   * The contained `Thermal` body with the lowest temperature, or null
   * when the box is empty. This is what makes the interior cold — and
   * it is the one body that does NOT read the interior as its own
   * ambient, because it is the thing making it.
   */
  coldestMass(): (Stuff & Thermal) | null;

  /** Whether the lid is shut, so the two seams apply. */
  isHoldingCold(): boolean;

  /**
   * The interior: the coldest contained body while shut, else the
   * box's own temperature. Overrides `ThermalMixin`'s default.
   */
  getContentsTemperature(): Quantity<'K'>;

  /** Public so the Hydrator can reflect into it. Not the contract. */
  insulationR: number;
}

/**
 * The wall R of a five-centimetre softwood box — the default, and the
 * shape of every other `effectiveR` term (K/W).
 */
const DEFAULT_INSULATION_R = 4.0;

export function CoolboxMixin<
  TBase extends MixinConstructor<Stuff & Container & Thermal & Sealable>,
>(Base: TBase) {
  return class CoolboxMixin extends Base {
    static _mixinName: string = 'CoolboxMixin';

    static fieldMeta: FieldMeta = {
      insulationR: { persistent: true, authorable: true },
    };

    public insulationR = DEFAULT_INSULATION_R;

    getInsulationR(): number {
      const v = this.insulationR;
      return Number.isFinite(v) && v > 0 ? v : DEFAULT_INSULATION_R;
    }

    setInsulationR(v: number): void {
      if (Number.isFinite(v) && v > 0) this.insulationR = v;
    }

    /** The composed host, narrowed — the `Exitable` cast convention. */
    private get coolboxHost(): Stuff & Container & Thermal & Sealable {
      return this as unknown as Stuff & Container & Thermal & Sealable;
    }

    isHoldingCold(): boolean {
      return !this.coolboxHost.isOpen();
    }

    coldestMass(): (Stuff & Thermal) | null {
      let best: (Stuff & Thermal) | null = null;
      let bestK = Infinity;
      for (const item of this.coolboxHost.getContents()) {
        if (!MixinApi.isThermal(item)) continue;
        const k = item.getTemperature().rawValue();
        if (k < bestK) {
          bestK = k;
          best = item;
        }
      }
      return best;
    }

    /**
     * ⭐ The interior — the coldest thing in it while the lid is shut,
     * else the box's own body. A read, not a cache: it is asked on
     * every thermal reconcile of everything inside, and a stashed value
     * would go stale the moment the ice melted a degree.
     *
     * Open the lid and this collapses to the inherited answer, which is
     * the box's own temperature drifting toward the room — so a box
     * left open is a box, and says so.
     */
    getContentsTemperature(): Quantity<'K'> {
      const own = this.coolboxHost.getTemperature();
      if (!this.isHoldingCold()) return own;
      const coldest = this.coldestMass();
      if (coldest === null) return own;
      const coldK = coldest.getTemperature().rawValue();
      return coldK < own.rawValue() ? Quantity.of(coldK, 'K') : own;
    }
  };
}
