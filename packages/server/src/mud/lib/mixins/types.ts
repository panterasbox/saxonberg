/**
 * Mixin type definitions and utilities
 */

import type { Pronouns } from '@saxonberg/types';

// Re-export Pronouns from shared types
export { Pronouns } from '@saxonberg/types';

/**
 * Mixin constructor type.
 * A mixin is a function that takes a base class and returns an extended class.
 */
export type MixinConstructor<T = object> = new (...args: any[]) => T;

/**
 * Mixin function type.
 * Takes a base class and returns an extended class with additional functionality.
 */
export type Mixin<TBase extends MixinConstructor, TExtension extends object> = (
  Base: TBase
) => MixinConstructor<TExtension> & TBase;

/**
 * Named interface - provides firstName and lastName.
 */
export interface Named {
  firstName: string;
  lastName: string;
  fullName: string;
}

/**
 * Gendered interface - provides pronouns.
 */
export interface Gendered {
  pronouns: Pronouns;
}

/**
 * Mixin name constants.
 * Use these constants instead of string literals when checking for mixins.
 */
export const Mixins = {
  Named: 'NamedMixin',
  Gendered: 'GenderedMixin',
} as const;

/**
 * Type for mixin names.
 */
export type MixinName = typeof Mixins[keyof typeof Mixins];
