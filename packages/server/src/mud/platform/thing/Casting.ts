/**
 * Casting — the solid a molten `Bulkable` pool leaves behind when it cools
 * below its material's melting point (the host's `reconcilePhase`): a cast lump
 * of whatever froze (metal run into a mould, wax, ice). Composes `Meltable +
 * Thermal` over a `Thing`, so a casting is **re-meltable** — heat it again and
 * it flows back to a pool (the bidirectional phase change, honestly). Its
 * material / mass / prose are stamped per freeze onto a fresh clone of this
 * template. The generic, material-agnostic sibling of `Ingot` (authored stock).
 *
 * ⭐ It composes {@link AlloyedMixin} for the same reason `Ingot` does,
 * and it is the reason the off-spec mint does not silently lose work: a
 * carburized bar quenched at the wrong heat mints one of these, and the
 * carbon somebody spent three smelts putting into it comes with it.
 */

import Thing from '../../lib/stuff/Thing';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { MeltableMixin } from '../../lib/thermal/Meltable';
import { AlloyedMixin } from '../../lib/material/Alloyed';

const CastingBase = AlloyedMixin(MeltableMixin(ThermalMixin(Thing)));

export default class Casting extends CastingBase {}
