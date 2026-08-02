/**
 * Vessel — a container-object: a `Thing` that is *also* a mobile place.
 *
 * A bag, box, chest, cart, ship, and star-system harbor are one
 * category — *a thing that holds things* — differing only in **scale**.
 * Carry / drag / ride / can't-budge is therefore **emergent** from mass
 * vs. a bearer's capacity (see the encumbrance subsystem), never a type
 * flag — "you can't pocket a ship" is a mass gate, not `instanceof`.
 *
 * **A Vessel `extends Thing`.** It is genuine matter — describable, made
 * of a material, with mass, wettable, carryable, haulable, and itself
 * `Containable` (it lives somewhere — a pocket, a harbor, a parking lot).
 * On top of the Thing baseline it adds `Container` (it holds things —
 * cargo, passengers) + `Atmospheric` (an interior climate). So it is the
 * one genuine dual citizen of the space/matter split: **matter from the
 * outside, a place from the inside** (you go *inside* a Vessel). It is not
 * a separate top-level branch — it traces through `Thing` — because a
 * container-object *is* a physical thing that additionally holds an
 * interior; the earlier "mobile place, sibling of Location" framing was
 * dropped in review (nothing consumed `instanceof Thing`, and pocketing is
 * mass-gated). Distinct from a plain `Thing` (holds nothing), `Location`
 * (a stationary place — pure space, *not* matter), and `Agent` (actor).
 *
 * Composition: `AtmosphericMixin(ContainerMixin(Thing))`. `Thing` already
 * brings the describable-physical baseline — `Visible` + `Perceptible` +
 * `Tangible` (`getMass()`) + `Containable` + `Wet` — so a describable
 * container (a footlocker, a backpack, a bank counter) is a plain `Vessel`
 * (`DetailedMixin(Vessel)` for look-at details) with no need to re-add any
 * of it. Code that needs "is this a place?" should use
 * `MixinApi.isContainer(obj)` (which catches `Location ∪ Vessel ∪ Agent ∪
 * container-Thing`) rather than `instanceof`; `instanceof Vessel` is
 * reserved for genuine vessel-role checks (e.g. the encumbrance
 * transmission read) and still identifies a Vessel — it now extends Thing.
 *
 * **`Adornable` lives on `ExitableVessel`, not here.** Fixtures
 * (`getFixtures()`/`addFixture()`) are needed only by the Door →
 * `BoundaryAnchor` retrofit, which is an `ExitableVessel` concern; a bare
 * Vessel composes no fixture machinery (every fixture consumer narrows on
 * `MixinApi.isAdornable` first). See `docs/subsystems/boundary.md`.
 */

import { ContainerMixin } from '../spatial/Container';
import { AtmosphericMixin } from '../biome/Atmospheric';
import Thing from './Thing';
import type { FieldMeta } from '../mixin';

// A Vessel is a Thing (matter — describable / Tangible / Wet / Containable)
// that additionally holds things (Container) with an interior climate
// (Atmospheric). It traces the `Thing` top-level branch, not its own.
const VesselBase = AtmosphericMixin(ContainerMixin(Thing));

export class Vessel extends VesselBase {
  /**
   * Fraction of a contained item's weight this vessel transmits to a
   * bearer carrying it — the encumbrance attenuation factor, default
   * `1.0` (a plain bag transmits the full weight of its contents). A
   * bag of holding sets it low (e.g. `0.05`); the encumbrance burden
   * walk multiplies the running transmission product by this for every
   * nested level (see `lib/encumbrance/LoadBearing`). `0..1`.
   */
  private _transmissionFactor: number = 1.0;

  static fieldMeta: FieldMeta = {
    transmissionFactor: { persistent: true },
  };

  /**
   * Accessor pair owns the per-field invariant (the project rule);
   * `setTransmissionFactor` delegates here so the Hydrator's Phase-1
   * dispatch and in-process callers share one validation point.
   */
  protected get transmissionFactor(): number {
    return this._transmissionFactor;
  }
  protected set transmissionFactor(value: number) {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    ) {
      throw new RangeError(
        `Vessel.transmissionFactor must be a finite number in [0, 1], ` +
          `got ${value}`,
      );
    }
    this._transmissionFactor = value;
  }

  public getTransmissionFactor(): number {
    return this._transmissionFactor;
  }
  public setTransmissionFactor(value: number): void {
    this.transmissionFactor = value;
  }
}
