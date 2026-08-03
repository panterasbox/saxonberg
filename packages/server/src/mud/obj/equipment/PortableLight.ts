/**
 * PortableLight — a carried light you actually light: a torch, a lantern.
 *
 * `LightSourceMixin(SwitchableMixin(DetailedMixin(Thing)))`. The shipped
 * `LightSourceMixin` emits its authored flux unconditionally (v1 has no
 * lit/unlit state), and `SwitchableMixin` alone would be a *fake* toggle —
 * so this class **couples** the two: `getEmittedFlux()` returns the authored
 * flux only while switched **on**, and zero lumens while off. The documented
 * "extinguish = flux to 0" made real, so `switch torch on` genuinely lights
 * the way and putting it away goes dark (`VisionModality` reads the flux
 * live each frame).
 *
 * Authored per-item in `data:` — `emittedIntensity` (lumens when lit),
 * `emittedColorTemperature` (warmth), and `on` (starts unlit off the shelf).
 * A discrete good (chattel-stampable, never Globbable). Fuel / burn-time is
 * the combustion build's concern; here a light is simply on or off.
 */

import Thing from "../../lib/stuff/Thing";
import { LightSourceMixin } from "../../lib/perception/LightSource";
import { SwitchableMixin } from "../../lib/boundary/Switchable";
import { DetailedMixin } from "../../lib/description/Detailed";
import { Quantity } from "../../lib/quantity";

const PortableLightBase = LightSourceMixin(
  SwitchableMixin(DetailedMixin(Thing)),
);

export default class PortableLight extends PortableLightBase {
  /** Emits the authored flux only while lit; dark (0 lumens) while off. */
  override getEmittedFlux(): Quantity<"lumen"> {
    return this.isOn() ? super.getEmittedFlux() : Quantity.of(0, "lumen");
  }
}
