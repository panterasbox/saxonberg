/**
 * mustBeHaulable — every bound Stuff must compose `HaulableMixin`
 * (the cart side of haulage). Mirrors `mustBeMountable`.
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
    if (!MixinApi.isHaulable(stuff as Stuff)) {
      return `you can't hitch ${stuff.getPresentation()}`;
    }
  }
  return undefined;
};

export default validator;
