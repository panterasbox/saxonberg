/**
 * mustBeNumber — the bound value must be a finite number.
 */

import type { FieldValidator } from '../../../api/command';

const validator: FieldValidator = (value, field) => {
  if (typeof value !== 'number') {
    return `${field} must be a number`;
  }
  if (isNaN(value) || !isFinite(value)) {
    return `${field} must be a valid number`;
  }
  return undefined;
};

export default validator;
