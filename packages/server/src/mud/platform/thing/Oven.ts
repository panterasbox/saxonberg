/**
 * Oven — a baking / roasting furnace: a {@link BurnerMixin} appliance holding
 * a gentle cooking heat (far below smelting). Same composition as
 * {@link Forge}, a low held temperature + no bellows (authored per seed). Lit
 * with `ignite`.
 */

import Firebox from '../../lib/fire/Firebox';
import { ContainerMixin } from '../../lib/spatial/Container';
import { PlacingMixin } from '../../lib/spatial/Placing';

// ⭐ `ContainerMixin` INSIDE `ThermalMixin`: an oven is a chamber you put
// bread in. A `Forge` and a `Kiln` are deliberately NOT containers — a
// forge is a fire you bring a workpiece to, and its radiant `heatContents`
// path (the room-sibling walk) is a different mechanism.
//
// ⭐ And `PlacingMixin` beside it: a range is BOTH — a firebox you put a
// loaf in and a hot plate you stand a pot on. The shipped kitchen-range row
// already says so in its prose ("a flat plate on top worn silver where pots
// have stood"), and prose that promises an affordance the object does not
// have is the crossroads-`south` bug. Both limbs feed the same couple
// (`ThermalMixin.heatSourceK` reads container AND support).
// ⭐ A firebox that ENCLOSES what it heats — that is the whole
// difference between an oven and a forge, and it is two mixins.
const OvenBase = ContainerMixin(PlacingMixin(Firebox));

export default class Oven extends OvenBase {}
