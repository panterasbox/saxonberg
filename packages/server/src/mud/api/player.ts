/**
 * PlayerApi - Static utility class for Player/Avatar operations
 *
 * Responsibilities:
 * - Track avatars by playerId for quick lookup
 * - Player-specific queries and statistics
 * - Identity predicates (`isAvatarStuff`) for the codebase's
 *   "is this stuff an Avatar?" question
 *
 * This is separate from StuffApi because it's domain-specific functionality.
 */

import Avatar from '../obj/Avatar';
import type { User } from '../lib/identity/User';
import { StuffApi } from './stuff';
import { SecurityApi } from './security';
import type { Stuff } from '../lib/stuff/Stuff';

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
   * Per-playerId in-flight avatar clones. Multiplexing means a user
   * can open several connections at once (and a dev React StrictMode
   * remount opens two in the same tick) — the Avatar must be cloned
   * exactly once and shared. An entry exists only while a clone is in
   * progress; concurrent connects await it instead of starting a
   * duplicate clone.
   */
  static #inFlightClones: Map<string, Promise<Avatar>> = new Map();

  /**
   * Type-guard: is this Stuff an Avatar?
   *
   * Identity is read off the template path prefix
   * (`Avatar.TEMPLATE_PATH_PREFIX === '/obj/Avatar/'`) rather than
   * `instanceof Avatar`: a Stuff's template path is its durable
   * identity, in contrast to its backing class (which can change
   * across HMR cycles). The guard narrows to `Avatar` for callers
   * that go on to use the Avatar-specific surface
   * (`getPlayerId()`, `getUser()`, etc.).
   *
   * Note: callers who genuinely want TS compile-time typechecking
   * (e.g., "this method requires an Avatar receiver") may still
   * reach for `instanceof Avatar` — the two have distinct purposes
   * per the inline-comment guidance in the MR review.
   */
  public static isAvatarStuff(stuff: Stuff): stuff is Avatar {
    const path = stuff.getTemplatePath();
    return (
      path !== undefined &&
      path !== null &&
      path.startsWith(Avatar.TEMPLATE_PATH_PREFIX)
    );
  }

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
    // Avatar lives in `obj/` (mudlib gameplay), which the `api/` layer
    // deliberately does not statically depend on — see
    // [architecture.md § Backend → mudlib import discipline] row 4.
    // Lazy-load to honor that discipline.
    const { default: AvatarClass } = await import('../obj/Avatar');
    const avatars: Avatar[] = [];
    for (const playerId of user.playerIds) {
      // Reuse if already in-world (multiplexing).
      let avatar = this.findAvatarByPlayerId(playerId);
      if (!avatar) {
        // Concurrent connections for the same user (multiplexing, or a
        // dev StrictMode double-mount) can reach here before the first
        // clone has registered. Coordinate on a per-playerId in-flight
        // promise so the second connect awaits the first clone instead
        // of starting a duplicate — a duplicate hits StuffApi's "clone
        // already in flight" guard and tears down both connections.
        let pending = this.#inFlightClones.get(playerId);
        if (!pending) {
          pending = StuffApi.clone<Avatar>(
            AvatarClass.getTemplatePath(playerId),
            { user, playerId }
          ).finally(() => this.#inFlightClones.delete(playerId));
          this.#inFlightClones.set(playerId, pending);
        }
        avatar = await pending;
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
