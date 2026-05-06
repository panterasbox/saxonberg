/**
 * Game configuration constants
 *
 * This file contains game-wide constants used throughout the system.
 */

/**
 * Default starting location path in the domain collection.
 * Used as the spawn target for newly-connected avatars.
 *
 * Template structure in domain collection:
 * {
 *   path: "/domain/void",
 *   class: "/lib/stuff/Location",
 *   data: {
 *     name: "The Void",
 *     description: "You find yourself in a featureless void..."
 *   }
 * }
 */
export const DEFAULT_STARTING_LOCATION_PATH = '/domain/void';
