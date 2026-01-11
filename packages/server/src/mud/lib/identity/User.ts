/**
 * User - Persistent user account object
 *
 * Represents an authenticated user account linked to an OAuth provider.
 * One user can have multiple player characters.
 *
 * Persistence: Saved to MongoDB 'users' collection
 */

import { Persistent } from '../stuff/Persistent.js';
import type { User as IUser } from '@saxonberg/types';

/**
 * User account (persistent).
 */
export class User extends Persistent implements IUser {
  /**
   * MongoDB collection name.
   */
  static collectionName = 'users';

  /**
   * Persistent fields for auto-sync (no mixins, so only class fields).
   */
  static persistentFields = ['googleProfileId'];

  /**
   * Associated Google profile ID (MongoDB _id).
   */
  googleProfileId: string = '';

  /**
   * Constructor.
   */
  constructor() {
    super(); // Auto-registers with StuffApi
  }
}
