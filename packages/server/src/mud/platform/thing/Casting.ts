/**
 * Casting — the solid a molten `Bulkable` pool leaves behind when it cools
 * below its material's melting point (the host's `reconcilePhase`): a cast
 * lump of whatever froze (wax, glass, tallow). Composes `Meltable +
 * Thermal` over a `Good`, so a casting is **re-meltable** — heat it again
 * and it flows back to a pool (the bidirectional phase change, honestly).
 * Its material / mass / prose are stamped per freeze onto a fresh clone of
 * this template.
 *
 * ⭐ It composes {@link CompositionMixin} — what is dissolved in the
 * piece — and NOT a temper (2026-10-17, storage-and-ice D17). A lump of
 * cullet keeps its iron so a re-melt cannot launder it clear; nothing
 * about glass, wax or ice can be hardened by a quench. Metal comes back as
 * {@link MetalCasting}, which composes both halves.
 */

import Good from '../../lib/stuff/Good';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { MeltableMixin } from '../../lib/thermal/Meltable';
import { CompositionMixin } from '../../lib/material/Composition';
// ⭐ A casting is MADE (B95): a maker, a grade, and what it was cast from.
import { CraftedMixin } from '../../lib/craft/Crafted';

const CastingBase = CraftedMixin(CompositionMixin(MeltableMixin(ThermalMixin(Good))));

export default class Casting extends CastingBase {}
