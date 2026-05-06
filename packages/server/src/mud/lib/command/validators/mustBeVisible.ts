/**
 * mustBeVisible — the bound value must be a Stuff. Visibility-system
 * integration is a future hook; today this just gates on "is it an
 * object with a stuffId at all".
 */

import type { FieldValidator } from '../../../api/command';

const validator: FieldValidator = (obj, field, _context) => {
  if (!(obj && typeof obj === 'object' && 'stuffId' in obj)) {
    return `${field} must be an object`;
  }
  return undefined;
};

export default validator;
