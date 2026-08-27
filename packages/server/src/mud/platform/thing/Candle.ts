/**
 * Candle — the compact convergence fixture where the combustion driver, the
 * light, and the enclosed-fire air model all compose into one honest object.
 *
 * Composition: `LightSource + Combustible + Thermal + Reserved(wax fuel)` over
 * a `Thing` (which already carries `Wet` — the wick). Igniting a **dry** wick
 * lights it (the `Combustible` wet-wick gate refuses a soaked one, keyed on the
 * wick material's water absorption); while lit it **emits light** (the flux is
 * gated on the Burning state) and drains its wax fuel; `douse` / snuff puts it
 * out and darkens it; left burning it wicks down to a spent stub; and under a
 * sealed jar (an air-limited scope) it **self-smothers** as the fire eats the
 * oxygen — the same `FireApi` air model the demonstrators use.
 *
 * The wax phase-change (the melted pool that resolidifies) is a deferred
 * refinement: the flame pins the whole body hot, so the generic wholesale
 * {@link MeltableMixin} melt is unsuitable — a gradual candle-specific drip is
 * the follow-on. See docs/subsystems/fire.md.
 */

import Thing from '../../lib/stuff/Thing';
import { ReservedMixin } from '../../lib/reserve';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { CombustibleMixin } from '../../lib/fire/Combustible';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import { Quantity } from '../../lib/quantity';

const CandleBase = LightSourceMixin(
  CombustibleMixin(ThermalMixin(ReservedMixin(Thing))),
);

export default class Candle extends CandleBase {
  /**
   * Light only while the wick burns — a snuffed candle is dark. The authored
   * `emittedIntensity` is the lit flux; unlit reads zero (the Burning-gated
   * emission the LightSource layer doesn't itself know about).
   */
  override getEmittedFlux(): Quantity<'lumen'> {
    return this.isBurning()
      ? super.getEmittedFlux()
      : Quantity.of(0, 'lumen');
  }
}
