/**
 * Oven — a baking / roasting furnace: a {@link FurnaceMixin} appliance holding
 * a gentle cooking heat (far below smelting). Same composition as
 * {@link Forge}, a low held temperature + no bellows (authored per seed). Lit
 * with `ignite`.
 */

import Thing from '../../lib/stuff/Thing';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SurfacedMixin } from '../../lib/spatial/Surfaced';
import { ReservedMixin } from '../../lib/reserve';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { FurnaceMixin } from '../../lib/fire/Furnace';

// ⭐ `ContainerMixin` INSIDE `ThermalMixin`: an oven is a chamber you put
// bread in. A `Forge` and a `Kiln` are deliberately NOT containers — a
// forge is a fire you bring a workpiece to, and its radiant `heatContents`
// path (the room-sibling walk) is a different mechanism.
//
// ⭐ And `SurfacedMixin` beside it: a range is BOTH — a firebox you put a
// loaf in and a hot plate you stand a pot on. The shipped kitchen-range row
// already says so in its prose ("a flat plate on top worn silver where pots
// have stood"), and prose that promises an affordance the object does not
// have is the crossroads-`south` bug. Both limbs feed the same couple
// (`ThermalMixin.heatSourceK` reads container AND support).
const OvenBase = FurnaceMixin(
  LightSourceMixin(
    ReservedMixin(ThermalMixin(SurfacedMixin(ContainerMixin(Thing)))),
  ),
);

export default class Oven extends OvenBase {}
