/**
 * CompoundingVessel — ⭐ the kernel's plain compounding vessel (ceramics R1,
 * D34): a tub, a pot, a bucket that turns what is put in it into ONE
 * product whose makeup is the inputs' by mass. A rubber works' mixing tub
 * and a glasshouse's batch pot are rows on this class; a trade whose
 * vessel needs more (a temper pit's water to the window) composes the
 * mixin itself.
 *
 * `CompoundingMixin(ContainerMixin(BulkableMixin(ThermalMixin(Good))))` —
 * it holds pieces, it may hold a slurry, and it has a temperature.
 */

import Good from '../../lib/stuff/Good';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { CompoundingMixin } from '../../lib/material/Compounding';

const CompoundingVesselBase = CompoundingMixin(
  ContainerMixin(BulkableMixin(ThermalMixin(Good))),
);

export default class CompoundingVessel extends CompoundingVesselBase {}
