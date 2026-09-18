/**
 * Sack — a graded, marked, kinded, thermal bulk holder for **dry goods**.
 *
 * `VesselKindMixin(DetailedMixin(GradedReceptacle))`. The four things it
 * needs and where each comes from:
 *
 *   - **bulk** (`GradedReceptacle` → `BulkableMixin`) — a sack holds a
 *     quantity of matter, not a list of objects;
 *   - **a grade and a maker's mark** (`CraftedMixin`) — ⭐ this is why it
 *     is not a `Receptacle`. Grade rides the HOLDER, never the payload:
 *     the miller's mark and the flour's band are facts about *this sack*,
 *     which is the same convention a bottle of graded gin follows;
 *   - **a kind** (`VesselKindMixin`) — so an empty one says "an empty
 *     flour sack" rather than reciting its full description, the defect
 *     the shipped malt sack still has;
 *   - **a temperature** (`ThermalMixin`, new on `GradedReceptacle`) — a
 *     sack in a cold barn keeps better than one over a bakery oven, and
 *     the spoilage gauge needs a real reading to say so.
 *
 * ⚠ **Not a `CraftVessel`**: a sack is not a container of discrete things
 * and not a serviceable tool. Not a `Receptacle`: no grade.
 *
 * ⚠ Bulk here is nominal litres — granular matter (an angle of repose, a
 * closure that is not liquid-tight) does not exist; `requiredClosureFor`
 * answers `liquidTight` for everything. See bulk.md's deferred tail.
 *
 * One class, many rows: flour, bran, grist, the mill's toll bin. Density
 * comes from the matter, capacity and tare from the row.
 */

import GradedReceptacle from './GradedReceptacle';
import { DetailedMixin } from '../../lib/description/Detailed';
import { VesselKindMixin } from '../../lib/bulk/VesselKind';
import { Quantity } from '../../lib/quantity';

const SackBase = VesselKindMixin(DetailedMixin(GradedReceptacle));

export default class Sack extends SackBase {
  constructor() {
    super();
    // A sack IS its interior — there is no sack-shaped outside holding a
    // separate bag. Authored rows override capacity and closure.
    this.interiorBulk = true;
    this.setCategory('sack');
    this.setInteriorCapacity(Quantity.of(25, 'L'));
  }
}
