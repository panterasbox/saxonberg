/**
 * Oven — a baking / roasting furnace: a {@link FurnaceMixin} appliance holding
 * a gentle cooking heat (far below smelting). Same composition as
 * {@link Forge}, a low held temperature + no bellows (authored per seed). Lit
 * with `ignite`.
 */

import Thing from '../../lib/stuff/Thing';
import { ReservedMixin } from '../../lib/reserve';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { FurnaceMixin } from '../../lib/fire/Furnace';

const OvenBase = FurnaceMixin(
  LightSourceMixin(ReservedMixin(ThermalMixin(Thing))),
);

export default class Oven extends OvenBase {}
