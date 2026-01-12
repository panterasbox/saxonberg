/**
 * ICommandProvider - Interface for providing contextual commands
 *
 * Objects and mixins can implement this to provide commands in various contexts:
 * - self: Commands when the object IS the command giver
 * - environment: Commands when the object is IN the giver's environment
 * - inventory: Commands when the object is IN the giver's inventory
 * - colocated: Commands when the object is IN the same location as the giver
 *
 * Mixins use static registry pattern for declaration with YAML filenames:
 * ```typescript
 * export function VisibleMixin<TBase>(Base: TBase) {
 *   return class VisibleMixin extends Base {
 *     static commandProvider = {
 *       self: ['look.yaml'],  // Just the filename
 *       environment: [],
 *       inventory: [],
 *       colocated: []
 *     };
 *   };
 * }
 * ```
 *
 * CommandApi resolves filenames to CommandDefinition objects at runtime.
 */

/**
 * Command provider registry (static on mixins/classes)
 *
 * Contains YAML filenames (without path) that will be resolved
 * to CommandDefinition objects by CommandApi.
 */
export interface CommandProviderRegistry {
  /** Commands provided when object IS the command giver */
  self: string[];

  /** Commands provided when object is IN giver's environment */
  environment: string[];

  /** Commands provided when object is IN giver's inventory */
  inventory: string[];

  /** Commands provided when object is CO-LOCATED with giver */
  colocated: string[];
}

/**
 * Interface for objects that provide commands
 */
export interface ICommandProvider {
  /** Static registry of commands this provider offers */
  commandProvider: CommandProviderRegistry;
}
