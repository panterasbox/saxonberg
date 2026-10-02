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
 * On top of the Thing baseline it adds `Container` — it holds things.
 *
 * ⭐⭐ **And ONLY `Container`. A bag is not a place.** `AtmosphericMixin`
 * composed here until the base-class narrowing build, on the framing
 * *matter from the outside, a place from the inside* — but *inside* is
 * something you can only BE for a vessel you can go into, and going in
 * is `ExitableVessel`'s. Nobody's `context.location` is ever a plain
 * `Vessel`: a driver or a rider occupies a SLOT and stands in the room
 * (`Mobile` ripples only an occupant standing OUTSIDE the mover), so the
 * only way to be inside one is `go <vessel>` through
 * `ExitableVessel.getEntryExit()`.
 *
 * What the mixin bought every bag, till, jar, rack, footlocker, handcart
 * and counter was a temperature, a pressure, a humidity, a wind and a
 * biome — a claim to have its own weather. **Thirty-seven rows named one
 * of the fifteen composers and not one authored a single atmospheric
 * field**, which is the measurement that moved it. It lives on
 * `ExitableVessel` now: *a thing you can go inside is a place with air.*
 * It is not
 * a separate top-level branch — it traces through `Thing` — because a
 * container-object *is* a physical thing that additionally holds an
 * interior; the earlier "mobile place, sibling of Location" framing was
 * dropped in review (nothing consumed `instanceof Thing`, and pocketing is
 * mass-gated). Distinct from a plain `Thing` (holds nothing), `Location`
 * (a stationary place — pure space, *not* matter), and `Agent` (actor).
 *
 * Composition: `Holder`. `Thing` already
 * brings the describable-physical baseline — `Visible` + `Perceptible` +
 * `Tangible` (`getMass()`) + `Containable` + `Wet` — so a describable
 * container (a footlocker, a backpack, a bank counter) is a plain `Vessel`
 * (details come from the root's `Detailed`) with no need to re-add any of
 * it. Code that needs "is this a place?" should use
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

import Holder from './Holder';
import { ChattelMixin } from '../chattel/Chattel';
import { ConcealableMixin } from '../concealment/Concealable';
import type { FieldMeta } from '../mixin';

// A Vessel is a Thing (matter — describable / Tangible / Wet / Containable)
// that additionally holds things (Container). It traces the `Thing`
// top-level branch, not its own.
// ⭐⭐ `Chattel(Concealable(Holder))`, not `Container(Good)` — the SAME
// mixin set, reordered, and the reorder is the point: it makes `Vessel`
// a SUBCLASS of the general holder rather than its sibling.
//
// `Holder` is matter that holds discrete things (a counter, a shelf, a
// warehouse); a `Vessel` is a `Holder` that is also a `Good`, so it can
// change hands and be put out of sight. A chest genuinely IS a
// thing-that-holds-things, plus ownable — and the seven fixtures that
// could not be `Vessel`s once it moved onto `Good` now have a parent to
// extend instead of seven copies of `Holder`.
//
// ⚠ Both `Chattel` and `Concealable` are additive attribute mixins and
// order among them is moot, which is what makes this a free move: the
// composed set is identical to what `ContainerMixin(Good)` produced.
const VesselBase = ChattelMixin(ConcealableMixin(Holder));

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
   * `setTransmissionFactor` delegates here so the applier's Phase-1
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
