/**
 * Avatar template-path constants.
 *
 * Lives in its own module (no other imports) so consumers that
 * cycle with `obj/Avatar.ts` — primarily `api/player.ts`, which
 * `Avatar.ts` itself imports — can read the constants without
 * pulling Avatar's whole dependency graph along.
 *
 * Single source of truth: `obj/Avatar.ts` re-exposes
 * `TEMPLATE_PATH_PREFIX` / `SEED_PLAYER_ID` as static readonly
 * fields delegating here, so existing call sites
 * (`Avatar.TEMPLATE_PATH_PREFIX`, `Avatar.SEED_PLAYER_ID`)
 * continue to work unchanged.
 */

/**
 * Template path prefix for avatars in the domain collection.
 * Avatar templates live at `/obj/Avatar/<playerId>` — instances of
 * a class share the same `/obj/<ClassName>` namespace as singleton
 * templates of that class (`/obj/EventRegistry`), with a per-
 * instance suffix.
 */
export const AVATAR_TEMPLATE_PATH_PREFIX = '/obj/Avatar/';

/**
 * Reserved playerId for the seed avatar at `/obj/Avatar/seed` — the
 * orphan template every new user's avatar is forked from. 4 chars;
 * nanoids are 21, so it can't collide with a real playerId.
 */
export const AVATAR_SEED_PLAYER_ID = 'seed';

/** Convenience: the seed avatar's full template path. */
export const AVATAR_SEED_TEMPLATE_PATH =
  AVATAR_TEMPLATE_PATH_PREFIX + AVATAR_SEED_PLAYER_ID;
