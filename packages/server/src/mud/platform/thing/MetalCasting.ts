/**
 * MetalCasting — a re-meltable lump of METAL: a pool run into a plain
 * crucible, an off-spec worked piece, salvage's metal yield. The generic
 * {@link Casting} plus a temper, because heat treatment is a fact about
 * metal and only metal (storage-and-ice D17).
 *
 * ⭐ It composes {@link AlloyedMixin} for the reason `Ingot` does, and it
 * is why the off-spec mint does not silently lose work: a carburized bar
 * quenched at the wrong heat mints one of these, and the carbon somebody
 * spent three smelts putting into it comes with it.
 */

import Good from '../../lib/stuff/Good';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { MeltableMixin } from '../../lib/thermal/Meltable';
import { AlloyedMixin } from '../../lib/material/Alloyed';
import { MarkedMixin } from '../../lib/description/Marked';

// A casting may bear a founder's stamped device, as an ingot may (`MarkedMixin`).
const MetalCastingBase = MarkedMixin(AlloyedMixin(MeltableMixin(ThermalMixin(Good))));

export default class MetalCasting extends MetalCastingBase {}
