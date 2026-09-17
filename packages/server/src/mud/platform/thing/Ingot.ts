/**
 * Ingot — a solid metal bar: the concrete {@link MeltableMixin} content object
 * the smithy demonstrator melts. Composes `Meltable + Thermal` over a `Thing`.
 * Its melting point + latent heat come from its authored `Material` (iron);
 * heated in a forge past that point it holds a latent-heat plateau, then flows
 * to a molten pool in the scope's Floor — the crafting substrate, no recipe.
 *
 * Also composes {@link ManualBuildMixin}: the workpiece **is** the buffer
 * of the by-hand smithing path (`heat` latches the reached K, `hammer`
 * banks the forming work, `quench` reverse-matches + mints — consuming
 * the ingot into the formed good).
 *
 * ⭐ And {@link AlloyedMixin}: a bar can say what is dissolved in it.
 * What that claims of every ingot — a copper one included — is *"this
 * piece can say how its minor constituents came out"*, which is true and
 * empty by default. The ferrous ladder is the one consumer that needs
 * it: the same iron at 0.05 %, 0.6 % and 4 % carbon is a bloom, a steel
 * and a pig, and a `Material` is a singleton so it cannot carry the
 * figure for one bar.
 */

import Thing from '../../lib/stuff/Thing';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { MeltableMixin } from '../../lib/thermal/Meltable';
import { ManualBuildMixin } from '../../lib/craft/ManualBuild';
import { AlloyedMixin } from '../../lib/material/Alloyed';

const IngotBase = AlloyedMixin(ManualBuildMixin(MeltableMixin(ThermalMixin(Thing))));

export default class Ingot extends IngotBase {}
