/**
 * User - Persistent user account
 *
 * Auth-layer record linked to an OAuth provider. Owns one or more
 * character slots via `playerIds`. Lives in MongoDB `users` collection.
 *
 * User is a Document — plain persisted state, NOT a Stuff. It is not
 * registered with `StuffApi`, not proxy-wrapped, and has no lifecycle.
 * Construct with a plain `new User()`; persist with `save()`; load with
 * `User.findById` / `User.find`.
 */

import { Document } from '../persistence/Document';
import type { AuthProvider, User as IUser } from '@saxonberg/types';
import type { FieldMeta } from '../mixin';
import { Collections } from '../persistence/Collections';

/**
 * @internal only the backend auth layer reads it — this is login
 * machinery, never author surface.
 */
export class User extends Document implements IUser {
  static collectionName = Collections.Users;

  /**
   * Session-principal id prefix that marks an *anonymous* (guest) login
   * — a session with no persisted account behind it. The `/auth/guest`
   * route mints `anon:<nanoid>` principals; the connect path recognizes
   * the prefix and constructs an ephemeral, never-saved `User` instead
   * of a Mongo lookup. This is the **authentication axis** (authed vs
   * anonymous) — distinct from a character being a guest (`Avatar.isGuest`).
   */
  static readonly ANONYMOUS_PREFIX = 'anon:';

  /**
   * Persistent fields copied to/from the MongoDB document.
   */
  static fieldMeta: FieldMeta = {
    googleProfileId: { persistent: true },
    twitchProfileId: { persistent: true },
    kickProfileId: { persistent: true },
    playerIds: { persistent: true },
    compactPlayerId: { persistent: true },
  };

  /**
   * Map a provider to its FK field name — the single source of truth
   * for the computed-key access the provider-parameterized spine uses
   * (`User.find({ [User.profileFieldFor(provider)]: id })`) and the
   * at-least-one invariant. Explicit fields, not a generic
   * `identities[]` map (premature at N=3).
   */
  public static profileFieldFor(
    provider: AuthProvider
  ): 'googleProfileId' | 'twitchProfileId' | 'kickProfileId' {
    switch (provider) {
      case 'google':
        return 'googleProfileId';
      case 'twitch':
        return 'twitchProfileId';
      case 'kick':
        return 'kickProfileId';
    }
  }

  /**
   * Runtime-only marker: this is an anonymous (guest) session with no
   * persisted account. Never saved (not in `persistentFields`). Set on
   * the ephemeral `User` the connect path builds for an `anon:`
   * principal; `Login.enter` reads it to mint a throwaway guest avatar
   * instead of loading a roster.
   */
  anonymous: boolean = false;

  /**
   * Associated Google profile ID (MongoDB _id of the GoogleProfile doc).
   * Optional: a Twitch-origin account may carry only `twitchProfileId`.
   */
  googleProfileId?: string;

  /**
   * Associated Twitch profile ID (MongoDB _id of the TwitchProfile doc).
   * Optional: a Google-origin account may carry only `googleProfileId`.
   */
  twitchProfileId?: string;

  /**
   * Associated Kick profile ID (MongoDB _id of the KickProfile doc).
   * Optional — the third co-equal provider FK.
   */
  kickProfileId?: string;

  /**
   * IDs of this user's character slots. Each corresponds to an Avatar
   * template at `/platform/agent/Avatar/<playerId>` in the `content` collection.
   *
   * This list is the authoritative "what does this user own" source.
   * Appended on character creation; removed on character deletion.
   */
  playerIds: string[] = [];

  /**
   * The character this account takes part in the Compact through, as the
   * player chose it with `compact character` — or unset, which means the
   * first character. Read it through {@link compactCharacterId}, never
   * directly: a stored id that is no longer one of `playerIds` is not an
   * answer (front-page-sources D1).
   */
  compactPlayerId?: string;

  /**
   * ⭐ The account's **Compact character** — the one character it takes
   * part in the Compact through: it shows the account's labor and capital
   * standing, casts the account's vote, and alone may hold a Compact
   * office. The chosen one while it is still on the account, else the
   * first character, else none. Derived on every read and never written
   * by one, so an account that never chose has its first character, and a
   * designation that went stale can never strand an account.
   */
  public compactCharacterId(): string | null {
    const chosen = this.compactPlayerId ?? '';
    if (chosen.length > 0 && this.playerIds.includes(chosen)) return chosen;
    return this.playerIds[0] ?? null;
  }

  /**
   * Make `playerId` the account's Compact character. Throws on an id the
   * account does not own — the act's own checks run first
   * (`CompactApi.designateCompactCharacter`), so reaching this with a
   * stranger's id is a programming error. Does not save.
   */
  public setCompactCharacter(playerId: string): void {
    if (!this.playerIds.includes(playerId)) {
      throw new Error(
        `User.setCompactCharacter: ${playerId} is not one of this account's characters`,
      );
    }
    this.compactPlayerId = playerId;
  }

  /**
   * The at-least-one-provider invariant predicate — true iff the
   * account is reachable through at least one login provider. Lives on
   * the data object; the link/unlink paths defend the invariant by
   * checking it.
   */
  public hasAnyProvider(): boolean {
    return !!(
      this.googleProfileId ||
      this.twitchProfileId ||
      this.kickProfileId
    );
  }
}
