/**
 * Firewood — a plain burnable log: the concrete {@link CombustibleMixin}
 * content object the fire demonstrators (and any authored scene) stock.
 * Composes `Combustible + Thermal + Reserved(fuel)` over a `Thing` (which
 * already carries `Wet` — so a rained-on / doused log resists ignition). Its
 * ignition point and fuel value come from its authored `Material` (oak, pine);
 * `charMaterialPath` (if authored) is what it becomes when it burns out.
 */

import Thing from '../lib/stuff/Thing';
import { ReservedMixin } from '../lib/reserve';
import { ThermalMixin } from '../lib/thermal/Thermal';
import { CombustibleMixin } from '../lib/fire/Combustible';

const FirewoodBase = CombustibleMixin(ThermalMixin(ReservedMixin(Thing)));

export default class Firewood extends FirewoodBase {}
