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
import type { User } from '../lib/identity/User';
import { StuffApi } from './stuff';
import { SecurityApi } from './security';

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
    if (!avatar.getPlayerId()) {
      console.warn('PlayerApi.registerAvatar(): Avatar has no playerId');
      return;
    }

    if (this.#avatarsByPlayerId.has(avatar.getPlayerId())) {
      console.warn(
        `PlayerApi.registerAvatar(): Avatar already registered for playerId ${avatar.getPlayerId()}`
      );
      return;
    }

    this.#avatarsByPlayerId.set(avatar.getPlayerId(), avatar);
  }

  /**
   * Unregister an avatar by playerId.
   * Called automatically when Avatar is destroyed.
   *
   * @param avatar - The Avatar object to unregister
   */
  public static unregisterAvatar(avatar: Avatar): void {
    if (!avatar.getPlayerId()) {
      return;
    }

    this.#avatarsByPlayerId.delete(avatar.getPlayerId());
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
   * Load every Avatar this user owns into the runtime, returning the
   * full set. Reuses any Avatars already registered (multiplexing — a
   * second connection for the same user finds the existing Avatars,
   * doesn't re-clone). Otherwise clones from the user's avatar
   * templates and registers via PostRegistration.
   *
   * Threads the user reference and playerId into the clone context so
   * each Avatar's `postRegister` sees its owning user synchronously.
   */
  public static async loadAvatarsForUser(user: User): Promise<Avatar[]> {
    const { Avatar: AvatarClass } = await import('../obj/Avatar');
    const avatars: Avatar[] = [];
    for (const playerId of user.playerIds) {
      let avatar = this.findAvatarByPlayerId(playerId);
      if (!avatar) {
        avatar = await StuffApi.clone<Avatar>(
          AvatarClass.getTemplatePath(playerId),
          { user, playerId }
        );
      }
      avatars.push(avatar);
    }
    return avatars;
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

SecurityApi.decorateApiClass(PlayerApi);
