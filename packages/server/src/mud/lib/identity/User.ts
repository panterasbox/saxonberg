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
   * Persistent fields copied to/from the MongoDB document.
   */
  static persistentFields = ['googleProfileId', 'playerIds'];

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
