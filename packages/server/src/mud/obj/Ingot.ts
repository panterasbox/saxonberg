/**
 * Ingot — a solid metal bar: the concrete {@link MeltableMixin} content object
 * the smithy demonstrator melts. Composes `Meltable + Thermal` over a `Thing`.
 * Its melting point + latent heat come from its authored `Material` (iron);
 * heated in a forge past that point it holds a latent-heat plateau, then flows
 * to a molten pool in the scope's Floor — the crafting substrate, no recipe.
 */

import Thing from '../lib/stuff/Thing';
import { ThermalMixin } from '../lib/thermal/Thermal';
import { MeltableMixin } from '../lib/thermal/Meltable';

const IngotBase = MeltableMixin(ThermalMixin(Thing));

export default class Ingot extends IngotBase {}
