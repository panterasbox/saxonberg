/**
 * WorkingAnimal — **the beast you keep for what it DOES**, and the third
 * thing a farm animal can be.
 *
 * The collie was a `Livestock`, and it was not one. The tell was already
 * in the code: five of the seven verbs `Livestock` afforded had to
 * re-narrow their target at execute time — *"that is not an animal that
 * gives anything"*, *"that is not an animal you can breed"* — because
 * the class was promising a verb set its own instances did not
 * uniformly satisfy. **A guard that re-narrows the host set is the tell
 * that the affordance is on the wrong host.**
 *
 * ⚠ It was also, concretely, butcherable. The guard on `butcher` was
 * *"does it have a handling score"*, which a sheepdog does.
 *
 * ## ⭐ Three ROLES, not three species of object
 *
 * | | kept for | the axis |
 * |---|---|---|
 * | **livestock** | what it yields or becomes | the **taps**, and the carcass |
 * | **working animal** | what it does | its **skill** |
 * | **pet** | itself | the **bond** ([pets-slate]) |
 *
 * ⚠⚠ **And they overlap, which is why this is not a taxonomy.** The ox
 * is livestock *and* a working animal — it ploughs all its life and is
 * beef at the end, so it stays a `Livestock` and keeps `butcher`. A
 * collie is a working animal and, in most households, also a pet. A
 * prize bull is livestock and breeding stock. If these were exclusive
 * classes the ox would need a fourth one by lunchtime.
 *
 * What makes them separable is that **the verbs live on capabilities
 * rather than on the class**: taps afford the tap verbs
 * (`ProducingMixin`), handling affords `handle` (`HandledMixin`), and
 * `Livestock` keeps only what genuinely needs a herd behind it or a
 * carcass in front of it. So this class adds nothing but a name and an
 * absence — and the absence is the point.
 *
 * ⭐ **The skill axis is not built yet**, and this is where it will
 * attach: a working animal is an animal with a **transcript**
 * (`advancement.md`), which is what distinguishes *training* from
 * *taming*. `pets-slate` already assumes a dog holds competence bands in
 * retrieval or guarding, and `stockmanship` ships as a Discipline. That
 * is a follow-on and it should land beside pets, not inside ranching.
 */

import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import { HandlingMixin } from '@saxonberg/server/mud/lib/husbandry/Handling';
import { PerceptibleMixin } from '@saxonberg/server/mud/lib/description/Perceptible';
import { HandledMixin } from '../lib/Handled';

const WorkingAnimalBase = HandledMixin(
  HandlingMixin(PerceptibleMixin(Creature)),
);

export default class WorkingAnimal extends WorkingAnimalBase {}
