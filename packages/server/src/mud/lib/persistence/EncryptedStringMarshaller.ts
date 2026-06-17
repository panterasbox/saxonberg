/**
 * EncryptedStringMarshaller — Marshaller subclass that encrypts a
 * single string field at rest and decrypts it transparently on read.
 *
 * The decided seam for bearer-credential secrecy (no `CryptoApi`):
 * `Document.toDocument` / `fromDocument` already run `fieldMarshallers`
 * natively, so a field declared with this marshaller's templatePath
 * (e.g. `TwitchProfile.accessToken` / `refreshToken`) round-trips
 * through `toStored` on write and `fromStored` on read. Plaintext lives
 * only in memory and on the wire to/from this class; Mongo only ever
 * sees the {@link EncryptedEnvelope}.
 *
 * Algorithm: AES-256-GCM with a fresh random 12-byte IV per value. The
 * stored envelope carries `iv` + `tag` + `ct` (all base64) and a format
 * version `v`, so a corrupted/tampered ciphertext fails authentication
 * on decrypt and a later re-key migration can distinguish formats.
 *
 * Key: `TOKEN_ENC_KEY` (32 bytes; base64 — `openssl rand -base64 32` —
 * or hex) from `process.env`. Validated **lazily on first use** (not at
 * construction or boot), so environments that never touch a
 * `TwitchProfile` (CI without Twitch, the Google-only regression suite)
 * boot without the key. A missing / wrong-length key throws a clear
 * error only when a token is actually encrypted or decrypted. The key
 * is never logged; neither is any plaintext.
 *
 * Singleton at {@link TemplatePaths.encryptedStringMarshaller} — one
 * instance, no per-field parameter. Registered exactly like
 * `QuantityMarshaller` (seed YAML in production; `registerMarshallerForTest`
 * in tests).
 */

import * as crypto from 'crypto';
import { Marshaller } from './Marshaller';
import { TemplatePaths } from '../paths';

/**
 * Stored shape for an encrypted string. A structured object (not a
 * concatenated blob) so the field stays greppable in Mongo and the
 * version tag supports a future re-key/algorithm migration.
 */
export interface EncryptedEnvelope {
  /** Format version (for future re-key / algorithm migration). */
  v: 1;
  /** Base64-encoded 12-byte GCM nonce, fresh per `toStored` call. */
  iv: string;
  /** Base64-encoded 16-byte GCM authentication tag. */
  tag: string;
  /** Base64-encoded ciphertext. */
  ct: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class EncryptedStringMarshaller extends Marshaller<
  string,
  EncryptedEnvelope
> {
  public static readonly templatePath =
    TemplatePaths.encryptedStringMarshaller;

  /**
   * Decoded 32-byte key, cached after the first successful load.
   * Validated lazily on first round-trip (see class docs).
   */
  private cachedKey?: Buffer;

  /**
   * Load + validate `TOKEN_ENC_KEY` once, lazily. Accepts base64 or hex
   * encoding; both must decode to exactly 32 bytes. Throws a clear,
   * key-free error on absence or wrong length.
   */
  private getKey(): Buffer {
    if (this.cachedKey) return this.cachedKey;

    const raw = process.env.TOKEN_ENC_KEY;
    if (!raw) {
      throw new Error(
        'EncryptedStringMarshaller: TOKEN_ENC_KEY is not set — cannot ' +
          'encrypt/decrypt token fields. Set a 32-byte key (e.g. ' +
          '`openssl rand -base64 32`).'
      );
    }

    let key = Buffer.from(raw, 'base64');
    if (key.length !== KEY_BYTES && /^[0-9a-fA-F]+$/.test(raw)) {
      // Fall back to hex if the value isn't a 32-byte base64 string but
      // is valid hex.
      const hex = Buffer.from(raw, 'hex');
      if (hex.length === KEY_BYTES) key = hex;
    }
    if (key.length !== KEY_BYTES) {
      throw new Error(
        `EncryptedStringMarshaller: TOKEN_ENC_KEY must decode to ` +
          `${KEY_BYTES} bytes (got ${key.length}). Generate with ` +
          '`openssl rand -base64 32`.'
      );
    }

    this.cachedKey = key;
    return key;
  }

  public toStored(plaintext: string): EncryptedEnvelope {
    if (typeof plaintext !== 'string') {
      throw new TypeError(
        'EncryptedStringMarshaller: toStored expects a string'
      );
    }
    const key = this.getKey();
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const ct = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
      v: 1,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ct: ct.toString('base64'),
    };
  }

  public fromStored(stored: EncryptedEnvelope): string {
    if (
      stored === null ||
      typeof stored !== 'object' ||
      (stored as EncryptedEnvelope).v !== 1 ||
      typeof (stored as EncryptedEnvelope).iv !== 'string' ||
      typeof (stored as EncryptedEnvelope).tag !== 'string' ||
      typeof (stored as EncryptedEnvelope).ct !== 'string'
    ) {
      throw new Error(
        'EncryptedStringMarshaller: malformed envelope (expected ' +
          '{ v: 1, iv, tag, ct }).'
      );
    }
    const key = this.getKey();
    try {
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(stored.iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(stored.tag, 'base64'));
      const pt = Buffer.concat([
        decipher.update(Buffer.from(stored.ct, 'base64')),
        decipher.final(),
      ]);
      return pt.toString('utf8');
    } catch {
      // GCM authentication failure (tampered ciphertext / IV / tag, or
      // wrong key). Never surface the underlying message — it could leak
      // key/ciphertext detail.
      throw new Error(
        'EncryptedStringMarshaller: token decryption failed (tampered ' +
          'or wrong key).'
      );
    }
  }
}
