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

import type { FieldValidator, CommandContext } from './models';
import type { Stuff } from '../stuff/Stuff';
import { ContainmentApi } from '../../api/containment';

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
export const mustBeVisible: FieldValidator = (obj: any, field: string, context: CommandContext) => {
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
export const canReach: FieldValidator = (obj: any, field: string, context: CommandContext) => {
  if (!(obj && typeof obj === 'object' && 'stuffId' in obj)) {
    return `${field} must be an object`;
  }

  const stuff = obj as Stuff;

  // Check if object is in avatar's inventory
  const inventory = ContainmentApi.getContents(context.avatar);
  if (inventory.some((item) => item.stuffId === stuff.stuffId)) {
    return undefined; // In inventory = reachable
  }

  // Check if object is in avatar's location
  const contents = ContainmentApi.getContents(context.location);
  if (contents.some((item) => item.stuffId === stuff.stuffId)) {
    return undefined; // In same location = reachable
  }

  // Not reachable
  return `You cannot reach the ${getObjectName(stuff)}`;
};

/**
 * Validator: Value must be a number
 *
 * @param value - Value to validate
 * @param field - Field name
 * @returns Error message or undefined
 */
export const mustBeNumber: FieldValidator = (value: any, field: string) => {
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
export const notEmpty: FieldValidator = (value: any, field: string) => {
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
  return (value: any, field: string) => {
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
  return (value: any, field: string) => {
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
  return (value: any, field: string) => {
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

/**
 * Helper: Get object name for error messages
 */
function getObjectName(obj: any): string {
  if (typeof obj.fullName === 'string') return obj.fullName;
  if (typeof obj.name === 'string') return obj.name;
  if (typeof obj.shortDescription === 'string') return obj.shortDescription;
  return 'object';
}
