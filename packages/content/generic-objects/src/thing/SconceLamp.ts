/**
 * SconceLamp — a light you hang on the wall.
 *
 * `AdornmentMixin(LightSourceMixin(SwitchableMixin(DetailedMixin(Thing))))`
 * — the {@link NeonSign} shape with the brand taken off and a switch put
 * on, or equivalently `PortableLight` with `Adornment` composed over it.
 * Both readings are the point: a sconce is a light that happens to live
 * in the room's `getFixtures()` rather than its `getContents()`.
 *
 * The flux coupling is `PortableLight`'s and is copied rather than
 * inherited (the two compositions diverge at `Adornment`, and the
 * kernel class is not a pack's to re-parent): the lamp emits its
 * authored flux only while switched on.
 *
 * Portable **until hung**: `AdornmentMixin`'s not-portable invariant is
 * keyed on `adornedTo`, so an unhung sconce is ordinary carried
 * inventory — bought at a counter, walked home, and hung with `hang`,
 * which is exactly the residences D11 loop. Taking it down (`get`)
 * detaches it and hands it back.
 */

import Thing from "@saxonberg/server/mud/lib/stuff/Thing";
import { AdornmentMixin } from "@saxonberg/server/mud/lib/boundary/Adornment";
import { LightSourceMixin } from "@saxonberg/server/mud/lib/perception/LightSource";
import { SwitchableMixin } from "@saxonberg/server/mud/lib/boundary/Switchable";
import { DetailedMixin } from "@saxonberg/server/mud/lib/description/Detailed";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";

const SconceLampBase = AdornmentMixin(
  LightSourceMixin(SwitchableMixin(DetailedMixin(Thing))),
);

export default class SconceLamp extends SconceLampBase {
  /** Emits the authored flux only while lit; dark (0 lumens) while off. */
  override getEmittedFlux(): Quantity<"lumen"> {
    return this.isOn() ? super.getEmittedFlux() : Quantity.of(0, "lumen");
  }
}
