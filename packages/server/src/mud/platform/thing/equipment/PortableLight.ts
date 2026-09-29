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
 * A discrete good (chattel-stampable, never Stackable).
 *
 * ⭐⭐ **This is the light that burns NOTHING**, and since the envelope
 * build that is the whole of what it is for. The lantern and the torch
 * moved to {@link Lamp}, which composes `FurnaceMixin` and therefore has
 * a real fuel reserve, a burn rate, a burnout edge and `ignite`/`douse`;
 * what is left here is the **glowcap jar and its fixture**, which are a
 * fungus, and anything else whose fiction is a switch rather than a
 * flame. The old header said fuel was *"the combustion build's
 * concern"* — the combustion build shipped, and nobody came back until
 * a dark realm made it matter.
 */

import Thing from "../../../lib/stuff/Thing";
import { LightSourceMixin } from "../../../lib/perception/LightSource";
import { SwitchableMixin } from "../../../lib/boundary/Switchable";
import { DetailedMixin } from "../../../lib/description/Detailed";
import { Quantity } from "../../../lib/quantity";

const PortableLightBase = LightSourceMixin(
  SwitchableMixin(DetailedMixin(Thing)),
);

export default class PortableLight extends PortableLightBase {
  /** Emits the authored flux only while lit; dark (0 lumens) while off. */
  override getEmittedFlux(): Quantity<"lumen"> {
    return this.isOn() ? super.getEmittedFlux() : Quantity.of(0, "lumen");
  }
}
