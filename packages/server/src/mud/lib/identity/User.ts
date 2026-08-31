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
