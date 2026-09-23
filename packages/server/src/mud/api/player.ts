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
 * `/platform/idea/api/player`, reached synchronously via `StuffApi.singletonSync`.
 * `dest /platform/idea/api/player` reloads it.
 */

import type Avatar from '../platform/agent/Avatar';
import type { EstateState } from '../lib/character/Estate';
import type { User } from '../lib/identity/User';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import type { Stuff } from '../lib/stuff/Stuff';
import { PlayerLogic } from '../platform/idea/api/PlayerLogic';
import type { EstateTouch } from '../platform/idea/api/PlayerLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/player';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/PlayerLogic', import.meta.url)
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
export type { EstateState } from '../lib/character/Estate';
export { ESTATE_STATES } from '../lib/character/Estate';
export type { EstateTouch } from '../platform/idea/api/PlayerLogic';

export class PlayerApi {
  /**
   * Type-guard: is this Stuff an Avatar?
   *
   * Identity is read off the template path prefix
   * (`Avatar.TEMPLATE_PATH_PREFIX === '/platform/agent/Avatar/'`) rather than
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
   * Every registered avatar.
   *
   * ⚠ **This is the BROADCAST roster** — the set every logged-in person
   * is in — and its size is bounded by concurrency, not by how much
   * world exists. Consuming all of it is legitimate when the operation
   * genuinely is *"tell everyone"* (a channel, a ticker, a presence
   * relay). It is NOT the way to find one person: narrowing it at the
   * call site with `.find` is a scan wearing a nice name, and the three
   * keyed reads below are what those callers want.
   */
  public static getAllAvatars(): Avatar[] {
    return logic().getAllAvatars();
  }

  /** One registered avatar by name or presentation, case-insensitive. */
  public static findAvatarByName(name: string): Avatar | undefined {
    return logic().findAvatarByName(name);
  }

  /** The registered avatar belonging to a user account, if one is live. */
  public static findAvatarByUserId(userId: string): Avatar | undefined {
    return logic().findAvatarByUserId(userId);
  }

  /** The connected, non-destroyed avatars — the `who` roster's source. */
  public static connectedAvatars(): Avatar[] {
    return logic().connectedAvatars();
  }

  /**
   * ⭐ The **active member count** — the perpetual rule's denominator
   * (economic bootstrap D9/D16): every member who is connected now or whose
   * estate is `active` (last snapshot written within
   * `estate.dormantAfterDays`). This wave counts the connected set; the
   * estate read lands with the three states (W9) and widens it to the
   * snapshot scan.
   */
  public static activeMemberCount(): Promise<number> {
    return logic().activeMemberCount();
  }

  /**
   * Real days `identityPath`'s member has been absent — 0 while connected,
   * 0 for a never-played character, and 0 for anything that is not a player
   * Avatar (an NPC is never absent, D23). The short clock every vacancy /
   * closure read compares against.
   */
  /** Is `identityPath` a player Avatar's — the one kind an estate read applies to (D23)? */
  public static isAvatarIdentityPath(identityPath: string | null | undefined): boolean {
    return logic().isAvatarIdentityPath(identityPath);
  }

  public static absentForDays(identityPath: string): Promise<number> {
    return logic().absentForDays(identityPath);
  }

  /**
   * ⭐ The estate state (economic bootstrap D16): `active` (connected, or
   * seen inside `estate.dormantAfterDays`), `dormant` (absent past it — the
   * account frozen, seats vacant, shops closed, the house asleep),
   * `escheated` (absent past `estate.escheatAfterDays` — the estate passes
   * on the next touch). Derived from the snapshot's `writtenAt`; a
   * connected avatar is active whatever its row says.
   */
  public static estateStateOf(identityPath: string): Promise<EstateState> {
    return logic().estateStateOf(identityPath);
  }

  /**
   * ⭐ The ESTATE TOUCH (economic bootstrap D16/D17) — run at login
   * (`returning: true`: the reclaim of unclaimed property, or the vacancy
   * of seats held past the short clock), at every credit landing on a
   * member's primary account and at the roster pass (the escheat, when the
   * long clock has run and the estate has not yet passed). Fire-and-forget
   * safe: it never throws for a member it cannot read.
   */
  public static touchEstate(
    identityPath: string,
    opts: { returning?: boolean } = {},
  ): Promise<EstateTouch> {
    return logic().touchEstate(identityPath, opts);
  }

  /**
   * ⭐ ESCHEAT `identityPath`'s estate now (D17) — debts first, then situs
   * up the title tree; the balance held unclaimed, or passed to a named,
   * active beneficiary. Idempotent. Returns the balance that passed.
   */
  public static escheat(identityPath: string): Promise<number> {
    return logic().escheat(identityPath);
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
