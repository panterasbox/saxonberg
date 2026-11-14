/**
 * Chamber — a space inside a thing with its own air: a freezer
 * compartment, a drying loft, a smoke chamber, a boat's bow.
 *
 * `AtmosphericMixin(ContainerMixin(Thing))`. A chamber is matter that
 * carries an atmosphere (an authored `temperature:`, `humidity:`, a biome
 * ref) and holds things: a board put `in` the loft is the loft's
 * CONTENTS — region zero, plain containment — so
 * `Containable.getEnclosingScope()` answers **the chamber**, and every
 * reader that asks *what air reaches me* (`Thermal`'s ambient on both
 * sides, the seasoning clock, the biome chain walk's first step) lands
 * on the chamber's own air and walks outward from there.
 *
 * ⭐⭐ **An enclosing relation is containment** (owner, 2026-11-13 — size
 * and carrying W9, D-W9-12). Until W9 a chamber's occupants were PLACED
 * `in` it (assembly plan D15: `container = the room`, the pair naming the
 * chamber) — the second shipped `in`-as-sibling beside the pocket, and
 * leaving it would make `getPlaced(IN)` mean two things. A board in a loft
 * is in the loft's air because it is IN the loft. `Atmospheric.occupants()`
 * defaults to a Container's contents, so the override that made the
 * placement work is gone with it. `move(board, loft, Placements.IN)` still
 * lands — region zero's own word on a plain container.
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
import { ContainerMixin } from '../../lib/spatial/Container';
import { AtmosphericMixin } from '../../lib/biome/Atmospheric';
import type { FieldMeta } from '../../lib/mixin';

const ChamberBase = AtmosphericMixin(ContainerMixin(ThingBase));

export default class Chamber extends ChamberBase {
  static fieldMeta: FieldMeta = {};

  constructor() {
    super();
    this.fixedInPlace = true;
  }
}
