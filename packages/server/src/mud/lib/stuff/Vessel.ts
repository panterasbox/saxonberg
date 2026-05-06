/**
 * Vessel - Top-level branch: a mobile place.
 *
 * Vessels are both Container (they hold things — passengers, cargo)
 * and Containable (they live somewhere — a harbor, a parking lot, a
 * star system). Distinct from `Thing` (item-scale movable),
 * `Location` (stationary place), and `Agent` (sentient actor):
 * vessels are *places that move*. Examples: ship, cart, train car,
 * spaceship, balloon, magic carpet.
 *
 * Composition: `ContainerMixin(ContainableMixin(Stuff))`. No
 * inheritance edge to `Thing` — vessels aren't items. Code that
 * needs "is this a place?" should use `MixinApi.isContainer(obj)`
 * (which catches `Location ∪ Vessel ∪ Agent ∪ container-Thing`);
 * `instanceof Vessel` is reserved for genuine vessel-role checks.
 *
 * Subclasses (e.g., `ExitableVessel` in `lib/spatial/`) layer
 * navigation, deck-plans, captain semantics, etc. on top.
 *
 * Lives in `lib/stuff/` because it's a top-level branch — see
 * [docs/architecture.md § Top-level branches](../../../../../../docs/architecture.md).
 */

import { Stuff } from './Stuff';
import { ContainerMixin } from '../spatial/Container';
import { ContainableMixin } from '../spatial/Containable';

const VesselBase = ContainerMixin(ContainableMixin(Stuff));

export class Vessel extends VesselBase {
  static persistentFields: string[] = [];
}

Stuff._registerTopLevelBranch(Vessel);
