/**
 * mustBeHauler — every bound Stuff must compose `HaulerMixin` (a creature
 * that can pull a cart — e.g. a `HaulingCreature`). The `to <mount>`
 * operand of `hitch`. Mirrors `mustBeMountable`.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  void _context;
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;
  for (const stuff of stuffs) {
    if (!MixinApi.isHauling(stuff as Stuff)) {
      return `${stuff.getPresentation()} can't pull a cart`;
    }
  }
  return undefined;
};

export default validator;
