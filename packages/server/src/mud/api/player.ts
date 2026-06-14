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
 *
 * Thin, security-gated forwarding shell: the registry + clone-coordination
 * logic lives in the hot-reloadable {@link PlayerLogic} singleton at
 * `/obj/api/player`, reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/player` reloads it.
 */

import type Avatar from '../obj/Avatar';
import type { User } from '../lib/identity/User';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import type { Stuff } from '../lib/stuff/Stuff';
import { PlayerLogic } from '../obj/api/PlayerLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/player';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/PlayerLogic', import.meta.url)
);

/** Resolve the HMR-able PlayerLogic singleton (sync). */
function logic(): PlayerLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'PlayerLogic'
      ) as typeof PlayerLogic | null) ?? PlayerLogic)()
  );
}

/**
 * Static API for Player/Avatar management.
 */
export class PlayerApi {
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
    return logic().isAvatarStuff(stuff);
  }

  /**
   * Register an avatar by playerId.
   * Called automatically when Avatar is registered with StuffApi.
   *
   * @param avatar - The Avatar object to register
   */
  public static registerAvatar(avatar: Avatar): void {
    return logic().registerAvatar(avatar);
  }

  /**
   * Unregister an avatar by playerId.
   * Called automatically when Avatar is destroyed.
   *
   * @param avatar - The Avatar object to unregister
   */
  public static unregisterAvatar(avatar: Avatar): void {
    return logic().unregisterAvatar(avatar);
  }

  /**
   * Find an avatar by its player ID.
   *
   * @param playerId - The MongoDB _id of the player
   * @returns The avatar, or undefined if not found
   */
  public static findAvatarByPlayerId(playerId: string): Avatar | undefined {
    return logic().findAvatarByPlayerId(playerId);
  }

  /**
   * Get all active avatars.
   *
   * @returns Array of all active avatars
   */
  public static getAllAvatars(): Avatar[] {
    return logic().getAllAvatars();
  }

  /**
   * Get count of active avatars.
   */
  public static getAvatarCount(): number {
    return logic().getAvatarCount();
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
    return logic().loadAvatarsForUser(user);
  }

  /**
   * Clear all avatars (for testing).
   * WARNING: This will not properly clean up objects.
   * Only use for testing or shutdown.
   */
  public static clearAll(): void {
    return logic().clearAll();
  }
}

SecurityApi.decorateApiClass(PlayerApi);
