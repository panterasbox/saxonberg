/**
 * TwitchProfile - Persistent, credential-bearing Twitch OAuth profile.
 *
 * Mirrors `GoogleProfile` (a `Document`, not a Stuff) for identity, plus
 * the OAuth tokens the chat relay later spends. Unlike Google (login-
 * only — Passport mints a session and discards the token), Twitch is
 * called *as the user* for the life of the link, so its profile is the
 * credential-bearing one.
 *
 * The `accessToken` / `refreshToken` fields are **encrypted at rest** via
 * the `EncryptedStringMarshaller` declared in `fieldMarshallers`:
 * `Document.toDocument` runs `toStored` (plaintext → ciphertext envelope)
 * on save and `fromDocument` runs `fromStored` (ciphertext → plaintext)
 * on read, so callers always see plaintext and Mongo never does.
 *
 * Persistence: `twitch_profiles` collection. Linked to `User` via
 * `User.twitchProfileId`.
 */

import { Document } from '../persistence/Document';
import { EncryptedStringMarshaller } from '../../platform/idea/persistence/EncryptedStringMarshaller';
import type { TwitchProfile as ITwitchProfile } from '@saxonberg/types';
import type { FieldMeta } from '../mixin';
import { Collections } from '../persistence/Collections';

/**
 * Twitch OAuth profile data (persistent, token-bearing). A Document —
 * plain persisted state, NOT a Stuff.
 */
export class TwitchProfile extends Document implements ITwitchProfile {
  /**
   * MongoDB collection name.
   */
  static collectionName = Collections.TwitchProfiles;

  /**
   * Persistent fields for auto-sync.
   *
   * Encrypt the two bearer-token fields at rest. The marshaller's
   * `toStored` / `fromStored` run inside `Document.toDocument` /
   * `fromDocument`, so plaintext never reaches Mongo.
   */
  static fieldMeta: FieldMeta = {
    twitchUserId: { persistent: true },
    login: { persistent: true },
    displayName: { persistent: true },
    email: { persistent: true },
    rawProfile: { persistent: true },
    accessToken: { persistent: true, marshaller: EncryptedStringMarshaller.templatePath },
    refreshToken: { persistent: true, marshaller: EncryptedStringMarshaller.templatePath },
    expiresAt: { persistent: true },
    scopes: { persistent: true },
  };

  /**
   * Twitch user id (unique, stable identifier from Helix).
   */
  twitchUserId: string = '';

  /**
   * Twitch login (lowercased handle).
   */
  login: string = '';

  /**
   * Display name from Twitch.
   */
  displayName: string = '';

  /**
   * Email address (present when the `user:read:email` scope was granted).
   */
  email?: string;

  /**
   * Raw Helix identity payload (for future use).
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
   * Find profile by Twitch user id. Convenience method for the common
   * query, mirroring `GoogleProfile.findByGoogleId`.
   */
  public static async findByTwitchUserId(
    twitchUserId: string
  ): Promise<TwitchProfile | null> {
    const results = await this.find({ twitchUserId });
    return results.length > 0 && results[0] ? results[0] : null;
  }

  /**
   * Write back a refreshed token set and persist. This is the
   * `RefreshingAuthProvider.onRefresh` target: the relay calls it with
   * the rotated credentials, and `save()` → `toDocument()` re-encrypts
   * the two token fields automatically, so the rotated token never hits
   * Mongo in plaintext.
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
   * Whether this profile currently holds a given OAuth scope. The relay's
   * outbound path reads `hasScope('user:write:chat')` to decide between a
   * send and a reject-and-point into the re-consent flow.
   */
  public hasScope(scope: string): boolean {
    return this.scopes.includes(scope);
  }

  public toString(): string {
    return `[TwitchProfile ${this.displayName} (${this._id ?? '(unsaved)'})]`;
  }
}
