/**
 * Chamber — a space inside a thing with its own air: a freezer
 * compartment, a drying loft, a smoke chamber, a boat's bow.
 *
 * `AtmosphericMixin(PlacingMixin(Thing))`. A chamber is matter that
 * carries an atmosphere (an authored `temperature:`, `humidity:`, a biome
 * ref) and offers one placement, `in`, whose `Placement` row ENCLOSES. A
 * thing put `in` it keeps `container = the chamber's container` (the room
 * it stands in, or its host's interior) and gains the placement pair, so
 * `Containable.getEnclosingScope()` answers **the chamber** — and every
 * reader that asks *what air reaches me* (`Thermal`'s ambient on both
 * sides, the seasoning clock, the biome chain walk's first step) lands
 * on the chamber's own air and walks outward from there.
 *
 * ⭐ **Occupancy by PLACEMENT, not containment** (assembly plan D15,
 * reconciling the fridge-design-pack with the chambered-vessels slate). A
 * compartment's occupants are placed `in` it, not held by it: no
 * contents list, no new depth for the scope walk or `canReach`, and the
 * same `put X in loft` every Placing host already answers.
 *
 * ⭐ **The one override that makes it work** is {@link occupants}: the
 * Atmospheric mixin's three occupant walks (the re-stamp fan-out on a
 * temperature change, and the envelope's heat sum and its provenance)
 * read `occupants()`, whose default is a Container's contents. The class
 * whose air is a placement is the class that says so — never an
 * `isPlacing` branch inside the mixin.
 *
 * ⚠ `DetailedMixin` is NOT re-composed here although the design doc's
 * formula names it: the `Thing` root has carried `Detailed` since the
 * base-class narrowing, so wrapping it again would compose it twice.
 *
 * ⚠ No envelope: a chamber has no derived volume (`getVolume()` is the
 * mixin's `null`), so `envelopeApplies()` is false and the chamber's
 * temperature is whatever its row authors, else the chain outward — a
 * loft with nothing authored reads its room.
 *
 * Fixed in place: a compartment is built into whatever it is part of.
 */

import ThingBase from '../../lib/stuff/Thing';
import { PlacingMixin } from '../../lib/spatial/Placing';
import { AtmosphericMixin } from '../../lib/biome/Atmospheric';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { FieldMeta } from '../../lib/mixin';

const ChamberBase = AtmosphericMixin(PlacingMixin(ThingBase));

export default class Chamber extends ChamberBase {
  static fieldMeta: FieldMeta = {};

  /** A chamber's one way of holding a thing is having it inside. */
  public placements: string[] = ['in'];

  constructor() {
    super();
    this.fixedInPlace = true;
  }

  /**
   * What is in this chamber's air: what is placed `in` it. See the class
   * docstring — this is the whole of the Atmospheric seam's override.
   */
  protected override occupants(): readonly Stuff[] {
    return this.getPlaced('in');
  }
}
