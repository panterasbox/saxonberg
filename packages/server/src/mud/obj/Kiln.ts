/**
 * Kiln — a ceramics / lime furnace: a {@link FurnaceMixin} appliance holding a
 * steady firing heat for pottery and glass work. Same composition as
 * {@link Forge}, different fuel + temperature dials (authored per seed). Lit
 * with `ignite`; a modest bellows boost sharpens the heat.
 */

import Thing from '../lib/stuff/Thing';
import { ReservedMixin } from '../lib/reserve';
import { LightSourceMixin } from '../lib/perception/LightSource';
import { ThermalMixin } from '../lib/thermal/Thermal';
import { FurnaceMixin } from '../lib/fire/Furnace';

const KilnBase = FurnaceMixin(
  LightSourceMixin(ReservedMixin(ThermalMixin(Thing))),
);

export default class Kiln extends KilnBase {}
