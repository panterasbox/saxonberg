/**
 * KickProfile - Persistent, credential-bearing Kick OAuth profile.
 *
 * The `TwitchProfile` shape on the third provider (a `Document`, not a
 * Stuff): identity + the OAuth tokens, plus the owner's channel (`slug`
 * + `broadcasterUserId`) that character-form `tune` and the reverse
 * speaker-link resolve through. A user with no Kick channel links fine
 * with an empty `slug`.
 *
 * The `accessToken` / `refreshToken` fields are **encrypted at rest** via
 * the `EncryptedStringMarshaller` declared in `fieldMarshallers`:
 * `Document.toDocument` runs `toStored` (plaintext → ciphertext envelope)
 * on save and `fromDocument` runs `fromStored` (ciphertext → plaintext)
 * on read, so callers always see plaintext and Mongo never does.
 *
 * Persistence: `kick_profiles` collection. Linked to `User` via
 * `User.kickProfileId`.
 */

import { Document } from '../persistence/Document';
import { EncryptedStringMarshaller } from '../persistence/EncryptedStringMarshaller';
import type { KickProfile as IKickProfile } from '@saxonberg/types';

/**
 * Kick OAuth profile data (persistent, token-bearing). A Document —
 * plain persisted state, NOT a Stuff.
 */
export class KickProfile extends Document implements IKickProfile {
  /**
   * MongoDB collection name.
   */
  static collectionName = 'kick_profiles';

  /**
   * Persistent fields for auto-sync.
   */
  static persistentFields = [
    'kickUserId',
    'slug',
    'displayName',
    'email',
    'broadcasterUserId',
    'rawProfile',
    'accessToken',
    'refreshToken',
    'expiresAt',
    'scopes',
  ];

  /**
   * Encrypt the two bearer-token fields at rest. The marshaller's
   * `toStored` / `fromStored` run inside `Document.toDocument` /
   * `fromDocument`, so plaintext never reaches Mongo.
   */
  static fieldMarshallers = {
    accessToken: EncryptedStringMarshaller.templatePath,
    refreshToken: EncryptedStringMarshaller.templatePath,
  };

  /**
   * Kick user id (unique, stable identifier).
   */
  kickUserId: string = '';

  /**
   * Kick channel slug (lowercased; empty when the user has no channel).
   */
  slug: string = '';

  /**
   * Display name from Kick.
   */
  displayName: string = '';

  /**
   * Email address (present when granted).
   */
  email?: string;

  /**
   * Kick broadcaster user id (empty when the user has no channel).
   */
  broadcasterUserId: string = '';

  /**
   * Raw identity payload (for future use).
   */
  rawProfile: Record<string, unknown> = {};

  /**
   * OAuth access token. Plaintext in memory; encrypted at rest.
   */
  accessToken: string = '';

  /**
   * OAuth refresh token. Plaintext in memory; encrypted at rest.
   */
  refreshToken: string = '';

  /**
   * Access-token expiry as epoch ms.
   */
  expiresAt: number = 0;

  /**
   * Granted OAuth scopes.
   */
  scopes: string[] = [];

  /**
   * Find profile by Kick user id. Convenience method for the common
   * query, mirroring `TwitchProfile.findByTwitchUserId`.
   */
  public static async findByKickUserId(
    kickUserId: string
  ): Promise<KickProfile | null> {
    const results = await this.find({ kickUserId });
    return results.length > 0 && results[0] ? results[0] : null;
  }

  /**
   * Write back a refreshed token set and persist. `save()` →
   * `toDocument()` re-encrypts the two token fields automatically, so
   * the rotated token never hits Mongo in plaintext.
   */
  public async applyRefreshedToken(tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
  }): Promise<void> {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.expiresAt = tokens.expiresAt;
    this.scopes = tokens.scopes;
    await this.save();
  }

  /**
   * Whether this profile currently holds a given OAuth scope. The
   * deferred posting path reads `hasScope('chat:write')` to decide
   * between a send and a reject-and-point into the re-consent flow.
   */
  public hasScope(scope: string): boolean {
    return this.scopes.includes(scope);
  }

  public toString(): string {
    return `[KickProfile ${this.displayName} (${this._id ?? '(unsaved)'})]`;
  }
}
