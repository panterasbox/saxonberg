/**
 * PlayerApi - Static utility class for Player/Avatar operations
 *
 * Responsibilities:
 * - Track avatars by playerId for quick lookup
 * - Player-specific queries and statistics
 *
 * This is separate from StuffApi because it's domain-specific functionality.
 */

import type { Avatar } from '../obj/Avatar';
import { decorateApiClass } from '../lib/security/decorators';

/**
 * Static API for Player/Avatar management.
 */
export class PlayerApi {
  /**
   * Registry of avatars by player ID.
   * This is a specialized index for quick avatar lookup.
   */
  static #avatarsByPlayerId: Map<string, Avatar> = new Map();

  /**
   * Register an avatar by playerId.
   * Called automatically when Avatar is registered with StuffApi.
   *
   * @param avatar - The Avatar object to register
   */
  public static registerAvatar(avatar: Avatar): void {
    if (!avatar.playerId) {
      console.warn('PlayerApi.registerAvatar(): Avatar has no playerId');
      return;
    }

    if (this.#avatarsByPlayerId.has(avatar.playerId)) {
      console.warn(
        `PlayerApi.registerAvatar(): Avatar already registered for playerId ${avatar.playerId}`
      );
      return;
    }

    this.#avatarsByPlayerId.set(avatar.playerId, avatar);
  }

  /**
   * Unregister an avatar by playerId.
   * Called automatically when Avatar is destroyed.
   *
   * @param avatar - The Avatar object to unregister
   */
  public static unregisterAvatar(avatar: Avatar): void {
    if (!avatar.playerId) {
      return;
    }

    this.#avatarsByPlayerId.delete(avatar.playerId);
  }

  /**
   * Find an avatar by its player ID.
   *
   * @param playerId - The MongoDB _id of the player
   * @returns The avatar, or undefined if not found
   */
  public static findAvatarByPlayerId(playerId: string): Avatar | undefined {
    return this.#avatarsByPlayerId.get(playerId);
  }

  /**
   * Get all active avatars.
   *
   * @returns Array of all active avatars
   */
  public static getAllAvatars(): Avatar[] {
    return Array.from(this.#avatarsByPlayerId.values());
  }

  /**
   * Get count of active avatars.
   */
  public static getAvatarCount(): number {
    return this.#avatarsByPlayerId.size;
  }

  /**
   * Clear all avatars (for testing).
   * WARNING: This will not properly clean up objects.
   * Only use for testing or shutdown.
   */
  public static clearAll(): void {
    this.#avatarsByPlayerId.clear();
  }
}

decorateApiClass(PlayerApi);
