/**
 * notEmpty — the bound value must be non-null, non-empty (for
 * strings / arrays).
 */

import type { FieldValidator } from '../../../api/command';

const validator: FieldValidator = (value, field) => {
  if (value === undefined || value === null) {
    return `${field} is required`;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${field} cannot be empty`;
  }
  if (Array.isArray(value) && value.length === 0) {
    return `${field} cannot be empty`;
  }
  return undefined;
};

export default validator;
