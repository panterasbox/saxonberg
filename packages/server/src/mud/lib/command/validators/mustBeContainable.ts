/**
 * mustBeContainable — every bound Stuff must compose
 * `ContainableMixin`.
 *
 * MQL only resolves objects that exist in the world, but
 * structurally some Stuff lacks `ContainableMixin` (e.g. a
 * `Location` is a Container but not a Containable). Picking up /
 * dropping such a Stuff is a category error. This validator surfaces
 * that as a friendly command-path error before controllers run.
 *
 * Empty MQL results pass through — the controller decides what
 * no-match means.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    if (!MixinApi.isContainable(stuff as Stuff)) {
      // Shape-descriptive — the validator doesn't know which verb
      // is invoking it (drop / get / give / future). Controllers
      // can synthesize verb-specific copy if they want; the field-
      // level error stays neutral.
      return `${stuff.getPresentation()} can't be carried`;
    }
  }
  return undefined;
};

export default validator;
