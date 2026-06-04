/**
 * mustBePostured — every bound Stuff must compose `PosturedMixin`.
 *
 * Used by sit/lie/stand/kneel <X> to fail early when the player
 * targets something that doesn't expose posture-bearing slots.
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
    if (!MixinApi.isPostured(stuff as Stuff)) {
      return (
        `you can't change posture on ` +
        DescribeApi.getDisplayName(stuff)
      );
    }
  }
  return undefined;
};

export default validator;
