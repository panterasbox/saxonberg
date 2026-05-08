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
import { DescribeApi } from '../../../api/describe';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    if (!MixinApi.isContainable(stuff as Stuff)) {
      return `you can't pick up ${DescribeApi.getDisplayName(stuff, 'that')}`;
    }
  }
  return undefined;
};

export default validator;
