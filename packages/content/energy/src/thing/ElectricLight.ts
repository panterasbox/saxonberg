/**
 * ElectricLight — a switchable light that draws from the grid.
 *
 * `GridPoweredMixin(LightSourceMixin(SwitchableMixin(PostRegistrationMixin(
 * Thing))))`. The `PortableLight` coupling (flux only while ON) plus the meter:
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
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { GridPoweredMixin } from '../lib/GridPowered';

const ElectricLightBase = GridPoweredMixin(
  LightSourceMixin(SwitchableMixin(PostRegistrationMixin(Thing))),
);

export default class ElectricLight extends ElectricLightBase {
  /**
   * The authored flux only while lit AND powered; dark otherwise. The two
   * failure modes read differently in the detail below, but to the light walk
   * they are one: no lumens.
   */
  public override getEmittedFlux(): Quantity<'lumen'> {
    return this.isOn() && this.isPowered()
      ? super.getEmittedFlux()
      : Quantity.of(0, 'lumen');
  }

  /**
   * The light's state, in prose — three true sentences: lit, switched off, or
   * dark because the premises has no power (a lapsed grid, not a broken lamp).
   * Authored as a `light`/`lamp`/`bulb` detail on the row so `look` binds it.
   */
  public override getDetail(
    id: string,
    senseOrParent?: unknown,
    parent?: unknown,
  ): string | null {
    const base =
      (
        Thing.prototype as {
          getDetail?: (i: string, s?: unknown, p?: unknown) => string | null;
        }
      ).getDetail?.call(this, id, senseOrParent, parent) ?? null;
    if (id !== 'light' && id !== 'lamp' && id !== 'bulb') return base;
    const visual = senseOrParent === undefined || senseOrParent === 'vision';
    if (!visual) return base;
    const live = !this.isOn()
      ? 'It is switched off.'
      : this.isPowered()
        ? 'It is lit.'
        : 'It is dark — the premises has no power.';
    return base ? `${base} ${live}` : live;
  }
}
