/**
 * GoogleProfile - Persistent Google OAuth profile data
 *
 * Stores OAuth profile information from Google.
 * Linked to User via googleProfileId.
 *
 * Persistence: Saved to MongoDB 'google_profiles' collection
 */

import { Persistable } from '../persistence/Persistable';
import type { GoogleProfile as IGoogleProfile } from '@saxonberg/types';

/**
 * Google OAuth profile data (persistent).
 */
export class GoogleProfile extends Persistable implements IGoogleProfile {
  /**
   * MongoDB collection name.
   */
  static collectionName = 'google_profiles';

  /**
   * Persistent fields for auto-sync.
   */
  static persistentFields = [
    'googleId',
    'email',
    'displayName',
    'givenName',
    'familyName',
    'photoUrl',
    'rawProfile',
  ];

  /**
   * Google profile ID (unique identifier from Google).
   */
  googleId: string = '';

  /**
   * Email address.
   */
  email: string = '';

  /**
   * Display name from Google.
   */
  displayName: string = '';

  /**
   * Given name (first name).
   */
  givenName?: string;

  /**
   * Family name (last name).
   */
  familyName?: string;

  /**
   * Profile photo URL.
   */
  photoUrl?: string;

  /**
   * Raw profile data from Google (for future use).
   */
  rawProfile: Record<string, unknown> = {};

  /**
   * Find profile by Google ID.
   * Convenience method for common query.
   */
  public static async findByGoogleId(
    googleId: string
  ): Promise<GoogleProfile | null> {
    const results = await this.find({ googleId });
    return results.length > 0 && results[0] ? results[0] : null;
  }

  public toString(): string {
    return `[GoogleProfile ${this.displayName} (${this._id ?? '(unsaved)'})]`;
  }
}
