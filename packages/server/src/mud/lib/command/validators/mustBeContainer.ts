/**
 * mustBeContainer — every bound Stuff must compose `ContainerMixin`.
 *
 * Used by location-shaped fields (`measure light here`, `analyze
 * light here`) so the controller can rely on `getContents` /
 * `getFixtures`. Empty MQL results pass through — the controller
 * decides what no-match means.
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
    if (!MixinApi.isContainer(stuff as Stuff)) {
      return `${DescribeApi.getDisplayName(stuff)} isn't a place`;
    }
  }
  return undefined;
};

export default validator;
