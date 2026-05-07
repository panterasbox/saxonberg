/**
 * mustBeContainable — the bound value must be Containable.
 *
 * MQL only resolves objects that currently live in a container, but
 * structurally some Stuff lacks `ContainableMixin` (e.g. a
 * Location). Picking up / dropping such an object is a category
 * error. This validator surfaces that as a friendly command-path
 * error before controllers run.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';

const validator: FieldValidator = (obj, field, _context) => {
  if (!(obj && typeof obj === 'object' && 'stuffId' in obj)) {
    return `${field} must be an object`;
  }
  if (!MixinApi.isContainable(obj as Stuff)) {
    return `You cannot pick that up.`;
  }
  return undefined;
};

export default validator;
