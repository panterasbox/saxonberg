/**
 * mustBeTangible — every bound Stuff must compose `TangibleMixin`.
 *
 * Used by Balance (`weigh <target>`) and the chemistry analyzer so
 * the controller can rely on `getMass` / `getMaterial`.
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
    if (!MixinApi.isTangible(stuff as Stuff)) {
      return `you can only weigh tangible things — ${DescribeApi.getDisplayName(stuff, 'that')} isn't`;
    }
  }
  return undefined;
};

export default validator;
