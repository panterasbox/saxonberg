/**
 * mustBeBehaved — every bound Stuff must compose `isBehaved`.
 *
 * The `talk` gate. ⭐ This is what stops `talk` being offered on a room.
 *
 * ⚠ Extracted from the controller's own refusal, and the controller
 * uses this same predicate. A validator that re-states a guard in
 * different words is a second source of truth, and drift here is
 * invisible: the menu says yes and the verb says no.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    if (!MixinApi.isBehaved(stuff as Stuff)) {
      return `${stuff.getPresentation()} has nothing to say`;
    }
  }
  return undefined;
};

export default validator;
