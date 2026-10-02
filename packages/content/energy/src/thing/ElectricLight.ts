/**
 * ElectricLight — a switchable light that draws from the grid.
 *
 * `GridPoweredMixin(LightSourceMixin(SwitchableMixin(Thing)))`. The
 * `PortableLight` coupling (flux only while ON) plus the meter:
 * it emits its authored flux only while **switched on AND its premises' feeder
 * node is energized**, and goes dark the same second a cut upstream, a dead
 * source, or an off-grid premises takes the power away — `VisionModality` reads
 * the flux live each frame.
 *
 * ⚠ Not a subclass of platform `Lamp` (which composes `BurnerMixin` — a lamp
 * BURNS fuel) and not `PortableLight` (a fungus jar that burns nothing but has
 * no meter). This one runs off a wire, which is exactly what `GridPoweredMixin`
 * composed on it says.
 *
 * The name passes `lint:light-sources` (e) — it is an `ElectricLight`, not a
 * `StreetLight`/`Lamppost`/`StreetLamp` (street lighting is a PROPERTY of the
 * street, never an object).
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { LightSourceMixin } from '@saxonberg/server/mud/lib/perception/LightSource';
import { SwitchableMixin } from '@saxonberg/server/mud/lib/boundary/Switchable';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { GridPoweredMixin } from '../lib/GridPowered';

const ElectricLightBase = GridPoweredMixin(
  LightSourceMixin(SwitchableMixin(Thing)),
);

export default class ElectricLight extends ElectricLightBase {
  /**
   * ⭐ The light's live state appended to its `look` description — three true
   * sentences: lit, switched off, or dark because the premises has no power (a
   * lapsed grid, not a broken lamp). A `markupAugmenter` (the Floor/Weapon
   * shape) is the hook that reaches the OBJECT's card; a `getDetail` override
   * does not — it only answers a `look <thing>.<sub-detail>`, which a top-level
   * `look <light>` never takes. (Found by the live browser drive: the state was
   * authored on `getDetail` and never rendered.)
   */
  static markupAugmenters: MarkupAugmenter[] = [electricLightStateAugmenter];

  /**
   * The authored flux only while lit AND powered; dark otherwise. The two
   * failure modes read differently in the line above, but to the light walk
   * they are one: no lumens.
   */
  public override getEmittedFlux(): Quantity<'lumen'> {
    return this.isOn() && this.isPowered()
      ? super.getEmittedFlux()
      : Quantity.of(0, 'lumen');
  }

  /** The live state sentence, read off the host. */
  public stateLine(): string {
    return !this.isOn()
      ? 'It is switched off.'
      : this.isPowered()
        ? 'It is lit.'
        : 'It is dark — the premises has no power.';
  }
}

/** Append the light's live state to its `look` long description. */
function electricLightStateAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  if (!(host instanceof ElectricLight)) return text;
  const line = host.stateLine();
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
