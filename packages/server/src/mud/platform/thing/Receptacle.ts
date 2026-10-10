/**
 * Receptacle — a fluid-only liquid holder: `BulkableMixin(Good)`.
 *
 * `Thing` already contributes Visible (description), Perceptible
 * (keywords, so `fill thermos` resolves it by name), Tangible (wall
 * material), and Containable (it can be carried and set down).
 * `BulkableMixin` adds the interior bulk slot — the liquid it holds.
 *
 * ⚠⚠ **Named `Receptacle`, not `Vessel`, DEFENSIVELY** — *"to stay
 * clear of the existing `lib/stuff/Vessel`"* — which is a name chosen
 * to dodge a collision rather than chosen. ⭐ Classically a *vessel* is
 * a liquid container and a *receptacle* is the general one, so the two
 * are arguably swapped; re-seating them is a three-way rename across
 * the bulk subsystem and is filed, not done.
 *
 * ⚠ The sentence that used to be here described `Vessel` as *"an
 * enterable, portable-by-shape container — a boat / wagon"*. That is
 * `ExitableVessel`, and has been since the coach got its own class.
 *
 * **Where this sits in the container taxonomy: outside it.** The chain
 * is `Location` → `Holder` → `Vessel` → `ExitableVessel`, and every
 * rung of it holds DISCRETE things. A `Receptacle` holds **bulk** —
 * what it holds is poured, not put — which is why it composes
 * `Bulkable` and no `Container` at all.
 *
 * Deliberately NOT a discrete `Container`: the demo receptacles hold
 * only liquid (no pen-in-the-thermos). The combined Container +
 * Bulkable case (an ice cube floating in water) is a documented future
 * content choice, not built here. Per-receptacle construction —
 * capacity, the `closure` retention level, and the unbounded-source
 * dial — is authored in each seed's `data:` block, not subclassed.
 *
 * This one class backs every demo holder (coffee urn, thermos, mug,
 * open colander); they differ only in authored data.
 */

import Good from '../../lib/stuff/Good';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { DurableMixin } from '../../lib/material/Durable';
import { AssembledMixin } from '../../lib/craft/Assembled';
import type { ClosureLevel } from '../../lib/bulk/Bulkable';

// ThermalMixin outer of Bulkable: a fluid holder's Thermal capacity
// derives from its contents (more liquid → larger C → slower cooling),
// so the coffee in any receptacle has a real, drifting temperature. An
// open holder (a mug) has no sealing barrier → it cools in minutes; the
// sealable Flask switches to a vacuum barrier when closed (τ in hours).
// ⭐ Durable + Assembled (assembly D8): a pail, a pot, a bowl wears, and may
// be hooped staves. The widest claim of the four — true of every pot.
const ReceptacleBase = AssembledMixin(
  DurableMixin(ThermalMixin(BulkableMixin(Good))),
);

export default class Receptacle extends ReceptacleBase {
  /**
   * ⭐ The authored closure is the CEILING; the joints are the floor
   * (assembly D10). A hooped pail holds only while its staves are sound
   * and its hoops tight; a found mug with no parts reads its row exactly.
   */
  public override getClosure(): ClosureLevel {
    return this.leaks() ? 'open' : super.getClosure();
  }
}
