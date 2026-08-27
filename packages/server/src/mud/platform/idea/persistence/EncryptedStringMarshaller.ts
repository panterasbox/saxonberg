/**
 * EncryptedStringMarshaller — Marshaller subclass that encrypts a
 * single string field at rest and decrypts it transparently on read.
 *
 * The decided seam for bearer-credential secrecy: `Document.toDocument`
 * / `fromDocument` already run `fieldMarshallers` natively, so a field
 * declared with this marshaller's templatePath (e.g.
 * `TwitchProfile.accessToken` / `refreshToken`) round-trips through
 * `toStored` on write and `fromStored` on read. Plaintext lives only in
 * memory; Mongo only ever sees the `EncryptedEnvelope`.
 *
 * **The cipher is not here.** AES-256-GCM, the `TOKEN_ENC_KEY` load and
 * its lazy validation live on `PersistApi.sealString` / `unsealString`
 * — `crypto` is outside `src/mud/`, so only the Api tier may import it
 * (docs/architecture.md § The import boundary), and encrypt-at-rest is
 * a persistence concern that belongs on that subsystem's face. This
 * class holds no key.
 *
 * Deliberately *not* a standalone `CryptoApi`: a general-purpose
 * encryption face invites callers who have no persistence reason to
 * encrypt, and the one real use is field-level round-tripping. Folding
 * it into `PersistApi` keeps the surface tied to the need. What remains
 * here is the field-level adapter — the `Marshaller` shape and the
 * stored-envelope validation.
 *
 * Singleton at {@link TemplatePaths.encryptedStringMarshaller} — one
 * instance, no per-field parameter. Registered exactly like
 * `QuantityMarshaller` (seed YAML in production;
 * `registerMarshallerForTest` in tests).
 */

import { Marshaller } from '../../../lib/persistence/Marshaller';
import { PersistApi, type EncryptedEnvelope } from '../../../api/persist';
import { TemplatePaths } from '../../../lib/paths';

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
