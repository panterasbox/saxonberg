/**
 * Common validators for command fields
 *
 * Validators are pure functions that validate field values and return:
 * - undefined: Field is valid
 * - string: Error message (field is invalid)
 *
 * Usage in YAML:
 * ```yaml
 * fields:
 *   target:
 *     type: object
 *     validators: [mustBeVisible, canReach]
 * ```
 */

import type { FieldValidator } from './models';
import type { Stuff } from '../stuff/Stuff';
import { ContainmentApi } from '../../api/containment';
import { DescribeApi } from '../../api/describe';
import { MixinApi } from '../../api/mixin';

/**
 * Validator: Object must be visible to avatar
 *
 * Checks if avatar can see the object (future: visibility system).
 * For Phase 4, assumes all objects in inventory/location are visible.
 *
 * @param obj - Object to validate
 * @param field - Field name
 * @param context - Command context
 * @returns Error message or undefined
 */
export const mustBeVisible: FieldValidator = (obj, field, _context) => {
  if (!(obj && typeof obj === 'object' && 'stuffId' in obj)) {
    return `${field} must be an object`;
  }

  // Phase 4: All objects in inventory/location are visible
  // Future: Check avatar.canSee(obj) or visibility system
  return undefined;
};

/**
 * Validator: Object must be reachable by avatar
 *
 * Checks if avatar can reach the object (within reach distance).
 * For Phase 4, checks if object is in inventory or same location.
 *
 * @param obj - Object to validate
 * @param field - Field name
 * @param context - Command context
 * @returns Error message or undefined
 */
/**
 * Validator: Object must be Containable (movable between containers).
 *
 * MQL only resolves objects that currently live in a container, but structurally
 * some Stuff may lack ContainableMixin (e.g. a Location). Getting/dropping such
 * an object is a category error. This validator surfaces that as a friendly
 * command-path error before controllers run.
 *
 * @param obj - Object to validate
 * @param field - Field name
 * @param _context - Command context
 * @returns Error message or undefined
 */
export const mustBeContainable: FieldValidator = (obj, field, _context) => {
  if (!(obj && typeof obj === 'object' && 'stuffId' in obj)) {
    return `${field} must be an object`;
  }

  if (!MixinApi.isContainable(obj as Stuff)) {
    return `You cannot pick that up.`;
  }

  return undefined;
};

export const canReach: FieldValidator = (obj, field, context) => {
  if (!(obj && typeof obj === 'object' && 'stuffId' in obj)) {
    return `${field} must be an object`;
  }

  const stuff = obj as Stuff;

  const inventory = ContainmentApi.getContents(context.avatar);
  if (inventory.some((item) => item.stuffId === stuff.stuffId)) {
    return undefined;
  }

  const contents = ContainmentApi.getContents(context.location);
  if (contents.some((item) => item.stuffId === stuff.stuffId)) {
    return undefined;
  }

  return `You cannot reach the ${DescribeApi.getDisplayName(stuff, 'object')}`;
};

/**
 * Validator: Value must be a number
 *
 * @param value - Value to validate
 * @param field - Field name
 * @returns Error message or undefined
 */
export const mustBeNumber: FieldValidator = (value, field) => {
  if (typeof value !== 'number') {
    return `${field} must be a number`;
  }

  if (isNaN(value) || !isFinite(value)) {
    return `${field} must be a valid number`;
  }

  return undefined;
};

/**
 * Validator: Value must not be empty
 *
 * @param value - Value to validate
 * @param field - Field name
 * @returns Error message or undefined
 */
export const notEmpty: FieldValidator = (value, field) => {
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

/**
 * Validator: String must meet minimum length
 *
 * @param minLength - Minimum length
 * @returns Validator function
 */
export function minLength(minLength: number): FieldValidator {
  return (value, field) => {
    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }

    if (value.length < minLength) {
      return `${field} must be at least ${minLength} characters`;
    }

    return undefined;
  };
}

/**
 * Validator: String must not exceed maximum length
 *
 * @param maxLength - Maximum length
 * @returns Validator function
 */
export function maxLength(maxLength: number): FieldValidator {
  return (value, field) => {
    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }

    if (value.length > maxLength) {
      return `${field} must be at most ${maxLength} characters`;
    }

    return undefined;
  };
}

/**
 * Validator: Number must be within range
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Validator function
 */
export function inRange(min: number, max: number): FieldValidator {
  return (value, field) => {
    if (typeof value !== 'number') {
      return `${field} must be a number`;
    }

    if (value < min || value > max) {
      return `${field} must be between ${min} and ${max}`;
    }

    return undefined;
  };
}

/**
 * Validator registry - Maps validator names to functions
 */
export const ValidatorRegistry: Record<string, FieldValidator> = {
  mustBeVisible,
  mustBeContainable,
  canReach,
  mustBeNumber,
  notEmpty,
};

/**
 * Get validator function by name
 *
 * @param name - Validator name
 * @returns Validator function or undefined
 */
export function getValidator(name: string): FieldValidator | undefined {
  return ValidatorRegistry[name];
}

