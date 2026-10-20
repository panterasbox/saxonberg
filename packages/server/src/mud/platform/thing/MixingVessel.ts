/**
 * MixingVessel — ⭐ the kernel's plain mixing vessel (ceramics R1, D34): a
 * tub, a pot, a bucket that turns what is put in it into ONE blend whose
 * fractions are the inputs' by mass. A rubber works' mixing tub and a
 * glasshouse's batch pot are rows on this class; a trade whose vessel
 * needs more (a temper pit's water to the window) subclasses it.
 *
 * `MixingVesselMixin(ContainerMixin(BulkableMixin(ThermalMixin(Good))))` —
 * it holds pieces, it may hold a slurry, and it has a temperature.
 */

import Good from '../../lib/stuff/Good';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { MixingVesselMixin } from '../../lib/material/Mixing';

const MixingVesselBase = MixingVesselMixin(
  ContainerMixin(BulkableMixin(ThermalMixin(Good))),
);

export default class MixingVessel extends MixingVesselBase {}
