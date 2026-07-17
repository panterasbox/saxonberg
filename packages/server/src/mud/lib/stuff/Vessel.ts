/**
 * Vessel — a container-object: a `Thing` that holds things, at any scale.
 *
 * A bag, box, chest, cart, ship, and star-system harbor are one
 * category — *a thing that holds things* — differing only in **scale**.
 * Carry / drag / ride / can't-budge is therefore **emergent** from mass
 * vs. a bearer's capacity (see the encumbrance subsystem), never a type
 * flag. Vessels are both Container (they hold things — cargo, passengers)
 * and Containable (they live somewhere — a pocket, a harbor, a parking
 * lot). Its **own top-level branch**, NOT a `Thing` subtype: a Vessel spans
 * scales (bag → cart → ship), and a ship is place-like, not a pocketable item
 * — so `instanceof Thing` must stay false for it ("you can't pocket a ship";
 * see architecture.md § Top-level branches). Distinct from `Thing` (item,
 * holds nothing), `Location` (stationary place), and `Agent` (sentient actor).
 *
 * Composition: `AtmosphericMixin(ContainerMixin(VisibleMixin(PerceptibleMixin(
 * TangibleMixin(ContainableMixin(Stuff))))))`. It carries the **same
 * describable-physical-object baseline as `Thing`** — `Tangible` (`getMass()`)
 * + `Visible` (describable) + `Perceptible` (keyword-referenceable) — because a
 * bag AND a ship are both describable and referenceable; it composes that
 * baseline **directly** (not by extending `Thing`, so a ship never reads as a
 * pocketable item) and adds `Container` (holds things) + `Atmospheric` (an
 * interior climate). So a describable container — a footlocker, a backpack, a
 * bank counter — is a plain `Vessel` (`DetailedMixin(Vessel)` for look-at
 * details), with **no need to re-add `Visible`/`Perceptible`**. Code that needs
 * "is this a place?" should use `MixinApi.isContainer(obj)` (which catches
 * `Location ∪ Vessel ∪ Agent ∪ container-Thing`) rather than `instanceof`;
 * `instanceof Vessel` is reserved for genuine vessel-role checks (e.g. the
 * encumbrance transmission read).
 *
 * **`Adornable` lives on `ExitableVessel`, not here.** Fixtures
 * (`getFixtures()`/`addFixture()`) are needed only by the Door →
 * `BoundaryAnchor` retrofit, which is an `ExitableVessel` concern; a bare
 * Vessel composes no fixture machinery (every fixture consumer narrows on
 * `MixinApi.isAdornable` first). See `docs/subsystems/boundary.md`.
 *
 * Lives in `lib/stuff/` because it's a top-level branch — see
 * [docs/architecture.md § Top-level branches](../../../../../../docs/architecture.md).
 */

import { Stuff } from './Stuff';
import { ContainerMixin } from '../spatial/Container';
import { ContainableMixin } from '../spatial/Containable';
import { TangibleMixin } from '../material/Tangible';
import { VisibleMixin } from '../description/Visible';
import { PerceptibleMixin } from '../description/Perceptible';
import { AtmosphericMixin } from '../biome/Atmospheric';
import { WetMixin } from '../wetness/Wet';

// The Thing baseline (Visible + Perceptible + Tangible + Containable) composed
// DIRECTLY — not by extending Thing, so a ship-scale Vessel never reads as a
// pocketable item — plus Container (holds things) + Atmospheric (interior
// climate). Mirrors Thing's mixin order for the shared baseline. `WetMixin`
// rides the Tangible seam — a Vessel is matter, so it can get wet (a cart / a
// bag left out in the rain).
const VesselBase = WetMixin(
  AtmosphericMixin(
    ContainerMixin(
      VisibleMixin(PerceptibleMixin(TangibleMixin(ContainableMixin(Stuff))))
    )
  )
);

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

  static persistentFields: string[] = ['transmissionFactor'];

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

Stuff._registerTopLevelBranch(Vessel);
