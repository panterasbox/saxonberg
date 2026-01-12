/**
 * Game configuration constants
 *
 * This file contains game-wide constants used throughout the system.
 */

/**
 * Default starting room path in the domain collection.
 * Used when Player.startingRoomPath is not set.
 *
 * Template structure in domain collection:
 * {
 *   path: "/domain/void",
 *   class: "/lib/location/Location",
 *   data: {
 *     name: "The Void",
 *     description: "You find yourself in a featureless void..."
 *   }
 * }
 */
export const DEFAULT_STARTING_ROOM_PATH = '/domain/void';
