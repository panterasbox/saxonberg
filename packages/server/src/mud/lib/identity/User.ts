/**
 * User - Persistent user account
 *
 * Auth-layer record linked to an OAuth provider. Owns one or more
 * character slots via `playerIds`. Lives in MongoDB `users` collection.
 *
 * User is NOT a Stuff — it's meta-game (auth/identity), not game-world.
 * Extends `Persistable` directly. No path, no zone, no clone pipeline.
 */

import { Persistable } from '../stuff/Persistable';
import type { User as IUser } from '@saxonberg/types';

export class User extends Persistable implements IUser {
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
   * template at `/avatar/<playerId>` in the `domain` collection.
   *
   * This list is the authoritative "what does this user own" source.
   * Appended on character creation; removed on character deletion.
   */
  playerIds: string[] = [];
}
