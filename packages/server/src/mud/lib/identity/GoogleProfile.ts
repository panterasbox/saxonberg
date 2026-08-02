/**
 * GoogleProfile - Persistent Google OAuth profile data
 *
 * Stores OAuth profile information from Google.
 * Linked to User via googleProfileId.
 *
 * Persistence: Saved to MongoDB 'google_profiles' collection
 */

import { Document } from '../persistence/Document';
import type { GoogleProfile as IGoogleProfile } from '@saxonberg/types';
import type { FieldMeta } from '../mixin';

/**
 * Google OAuth profile data (persistent). A Document — plain persisted
 * state, NOT a Stuff.
 */
export class GoogleProfile extends Document implements IGoogleProfile {
  /**
   * MongoDB collection name.
   */
  static collectionName = 'google_profiles';

  /**
   * Persistent fields for auto-sync.
   */
  static fieldMeta: FieldMeta = {
    googleId: { persistent: true },
    email: { persistent: true },
    displayName: { persistent: true },
    givenName: { persistent: true },
    familyName: { persistent: true },
    photoUrl: { persistent: true },
    rawProfile: { persistent: true },
  };

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
