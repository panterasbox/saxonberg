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

import { Marshaller } from './Marshaller';
import { PersistApi, type EncryptedEnvelope } from '../../api/persist';
import { TemplatePaths } from '../paths';

export type { EncryptedEnvelope };

export class EncryptedStringMarshaller extends Marshaller<
  string,
  EncryptedEnvelope
> {
  public static readonly templatePath =
    TemplatePaths.encryptedStringMarshaller;

  public toStored(plaintext: string): EncryptedEnvelope {
    if (typeof plaintext !== 'string') {
      throw new TypeError(
        'EncryptedStringMarshaller: toStored expects a string'
      );
    }
    return PersistApi.sealString(plaintext);
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
    return PersistApi.unsealString(stored);
  }
}
