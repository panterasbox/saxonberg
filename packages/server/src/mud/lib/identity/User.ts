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
import type { User as IUser } from '@saxonberg/types';

export class User extends Document implements IUser {
  static collectionName = 'users';

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
  static persistentFields = ['googleProfileId', 'playerIds'];

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
   */
  googleProfileId: string = '';

  /**
   * IDs of this user's character slots. Each corresponds to an Avatar
   * template at `/obj/Avatar/<playerId>` in the `domain` collection.
   *
   * This list is the authoritative "what does this user own" source.
   * Appended on character creation; removed on character deletion.
   */
  playerIds: string[] = [];
}
