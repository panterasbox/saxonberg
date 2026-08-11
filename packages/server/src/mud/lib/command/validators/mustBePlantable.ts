/**
 * mustBePlantable — every bound Stuff must compose `PlantableMixin`.
 *
 * The `plant` verb's seed gate. Without it the menu offered **`plant` on
 * a rock**: `seed` is the verb's first object-shaped slot, so any target
 * bound to it and the arg was declared `targetKind: any`. The controller
 * refused, politely, after the player had already been told they could.
 *
 * ⚠ Extracted from the controller's own refusal, and the controller uses
 * this same predicate — `MixinApi.isPlantable`. It previously refused
 * with `seed instanceof Seed`; both moved together, because a validator
 * checking a mixin against a controller checking a class would be two
 * sources of truth, and drift there is invisible: the menu says yes and
 * the verb says no.
 *
 * ⚠ This asks whether the thing is *the kind of thing you can plant*,
 * not whether it is ready to be planted. A plantable naming a template
 * that does not resolve is misconfigured content — a **state** refusal,
 * which stays in the controller where it can change between one moment
 * and the next.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    if (!MixinApi.isPlantable(stuff as Stuff)) {
      return `${stuff.getPresentation()} isn't something you can plant`;
    }
  }
  return undefined;
};

export default validator;
