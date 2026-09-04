/**
 * Provision — a graded, MARKED discrete ingredient: a `Thing` (Tangible,
 * so it carries its food Material) composing {@link CraftedMixin} — the
 * discrete sibling of the bar's `GradedReceptacle`, now carrying the full
 * maker's mark a `Crop` always had. A harvested lime says who grew it
 * through the same stamp a knife off a bench gets; the grade is what lets
 * a recipe's `minGrade` spread bite on solid stock — a *fine* cut makes
 * the fine roast; an ungraded scrap derives at `fair`.
 *
 * The mark does NOT make it capital: crafting's gather admits a Crafted
 * discrete whose material is edible (`isEdibleMatter` — matter, not mark),
 * so a marked lime still feeds the press while a marked knife never does.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { FreshnessMixin } from '../../lib/material/Freshness';
import { CuredMixin } from '../../lib/material/Cured';
import { CraftedMixin } from '../../lib/craft/Crafted';
import type { Crafted } from '../../lib/craft/Crafted';

// Thermal AND Freshness, because a Provision IS food by construction —
// the one class in the library of which that is true by name. The gauge
// reads its host's temperature, which is why the two travel together.
// Neither is on `Thing`: see `lib/stuff/Thing.ts` for why, and
// `lint:perishable` for what makes the narrowing safe.
// ⭐ Cured beside Freshness, NOT folded into it. The spoilage gauge
// carries a population living in the matter; the cure carries the
// matter's own water state, and only one of them is true of a hide or a
// plank. They coincide on `Provision` today and the split is what lets a
// tannery dry a skin without claiming it ferments.
const ProvisionBase = CraftedMixin(
  CuredMixin(FreshnessMixin(ThermalMixin(DetailedMixin(Thing)))),
);

/**
 * ⚠ TS drops an inner mixin's surface through a nested generic mixin:
 * `CraftedMixin` composes `GradedMixin` internally, and swapping the base
 * loses `setGradeBand` *statically* (the hearthworks fine-roast spec
 * calls it) though it is present at runtime. The class/interface
 * declaration MERGE restores the full `Crafted extends Graded` surface
 * on the class type — same runtime, honest statics.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- deliberate: the interface half only restates surface the runtime class already has (Crafted ⊃ Graded, present via the inner mixin); nothing is declared that isn't there.
interface Provision extends Crafted {}
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- the class half of the same merge
class Provision extends ProvisionBase {}

export default Provision;
