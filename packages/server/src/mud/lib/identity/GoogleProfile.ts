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
import { Collections } from '../persistence/Collections';
import { EncryptedStringMarshaller } from '../../platform/idea/persistence/EncryptedStringMarshaller';

/**
 * Google OAuth profile data (persistent). A Document — plain persisted
 * state, NOT a Stuff.
 */
export class GoogleProfile extends Document implements IGoogleProfile {
  /**
   * MongoDB collection name.
   */
  static collectionName = Collections.GoogleProfiles;

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
    youtubeRefreshToken: { persistent: true, marshaller: EncryptedStringMarshaller.templatePath },
    youtubeChannelId: { persistent: true },
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
   * ⭐ The `youtube.readonly` step-up (broadcast-ready D12): a refresh
   * token for this Google identity's own YouTube, granted at
   * `/auth/google/youtube`. Encrypted at rest (the `TwitchProfile` token
   * precedent). Empty when never stepped up. It is what finds a streamer's
   * own live broadcast for one quota unit instead of a hundred.
   */
  youtubeRefreshToken: string = '';

  /** The stepped-up identity's own channel id (`channels.list?mine=true`). */
  youtubeChannelId: string = '';

  /** Has this identity granted its YouTube to the overlay? */
  public hasYoutube(): boolean {
    return this.youtubeRefreshToken !== '';
  }

  /**
   * Find profile by Google ID.
   * Convenience method for common query.
   */
  private static async findByGoogleId(
    googleId: string
  ): Promise<GoogleProfile | null> {
    const results = await this.find({ googleId });
    return results.length > 0 && results[0] ? results[0] : null;
  }

  public toString(): string {
    return `[GoogleProfile ${this.displayName} (${this._id ?? '(unsaved)'})]`;
  }
}
