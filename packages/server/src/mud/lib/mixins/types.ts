/**
 * Mixin type definitions and utilities
 */

import type { Pronouns } from '@saxonberg/types';

// Re-export Pronouns from shared types
export { Pronouns } from '@saxonberg/types';

/**
 * Mixin constructor type.
 * A mixin is a function that takes a base class and returns an extended class.
 * Supports both concrete and abstract constructors.
 */
export type MixinConstructor<T = object> = (new (...args: any[]) => T) | (abstract new (...args: any[]) => T);

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
 * Mortal interface - provides health/hitpoints.
 */
export interface Mortal {
  hp: number;
  maxHp: number;
  isDead(): boolean;
  takeDamage(amount: number): void;
  heal(amount: number): void;
}

/**
 * Container interface - provides inventory management.
 */
export interface Container {
  inventory: Set<any>;
  addToInventory(item: any): void;
  removeFromInventory(item: any): boolean;
  hasInInventory(item: any): boolean;
  getInventoryContents(): any[];
}

/**
 * Containable interface - provides environment reference.
 */
export interface Containable {
  environment: any | null;
  setEnvironment(container: any | null): void;
  getEnvironment(): any | null;
}

/**
 * Visible interface - provides descriptions.
 */
export interface Visible {
  shortDescription: string;
  longDescription: string;
  getShort(): string;
  getLong(): string;
}

/**
 * Sensor interface - message receiving (stub for Phase 2).
 */
export interface Sensor {
  onMessage(message: any): void;
}

/**
 * Vocal interface - message sending (stub for Phase 2).
 */
export interface Vocal {
  say(text: string): void;
}

/**
 * Perceptible interface - provides keywords for MQL identification.
 */
export interface Perceptible {
  getKeywords(): string[];
  addKeyword(keyword: string): void;
  removeKeyword(keyword: string): boolean;
  hasKeyword(keyword: string): boolean;
  setKeywords(keywords: string[]): void;
}

/**
 * Detailed interface - provides hierarchical detail system.
 * Re-exported from Detailed for type checking.
 */
export type { Detailed } from './Detailed';

/**
 * Propertied interface - provides controlled dynamic properties.
 * Re-exported from Propertied for type checking.
 */
export type { Propertied } from './Propertied';

/**
 * CartesianCoordinates interface - provides 3D grid positioning.
 * TODO: Re-export from CartesianCoordinates.ts when implemented
 */
// export type { CartesianCoordinates } from './CartesianCoordinates';

/**
 * Mixin name constants.
 * Use these constants instead of string literals when checking for mixins.
 */
export const Mixins = {
  Named: 'NamedMixin',
  Gendered: 'GenderedMixin',
  Mortal: 'MortalMixin',
  Container: 'ContainerMixin',
  Containable: 'ContainableMixin',
  Visible: 'VisibleMixin',
  Sensor: 'SensorMixin',
  Vocal: 'VocalMixin',
  Perceptible: 'PerceptibleMixin',
  Detailed: 'DetailedMixin',
  Propertied: 'PropertiedMixin',
  CartesianCoordinates: 'CartesianCoordinatesMixin',
} as const;

/**
 * Type for mixin names.
 */
export type MixinName = typeof Mixins[keyof typeof Mixins];
