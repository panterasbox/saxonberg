/**
 * mustBeWearable — every bound Stuff must compose `WearableMixin`.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { DescribeApi } from '../../../api/describe';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  void _context;
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;
  for (const stuff of stuffs) {
    if (!MixinApi.isWearable(stuff as Stuff)) {
      return `${DescribeApi.getDisplayName(stuff, 'that')} can't be worn`;
    }
  }
  return undefined;
};

export default validator;
