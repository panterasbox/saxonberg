/**
 * EncryptedStringMarshaller tests — AES-256-GCM round-trip, GCM tamper
 * detection, and the lazy key-missing error.
 *
 * The marshaller is Idea-rooted Stuff, so it can't be `new`-ed directly:
 * it's registered via the test helper and resolved from `StuffApi`,
 * mirroring the `QuantityMarshaller` test. The key is read lazily on
 * first use, so the key-missing test clears the env before the first
 * round-trip.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as crypto from 'crypto';
import { EncryptedStringMarshaller } from '../EncryptedStringMarshaller';
import type { EncryptedEnvelope } from '../EncryptedStringMarshaller';
import { StuffApi } from '../../../api/stuff';
import { PersistApi } from '../../../api/persist';
import { installEncryptedStringMarshaller } from '../../../lib/persistence/__tests__/encrypted-string-marshaller-test-helpers';

const VALID_KEY = crypto.randomBytes(32).toString('base64');

describe('EncryptedStringMarshaller', () => {
  const ORIG = process.env.TOKEN_ENC_KEY;

  beforeEach(() => {
    process.env.TOKEN_ENC_KEY = VALID_KEY;
    // The key cache lives on PersistApi (process-wide config), so a
    // suite that swaps TOKEN_ENC_KEY between cases must invalidate it.
    PersistApi._resetEncryptionKeyForTest();
    installEncryptedStringMarshaller();
  });
  afterEach(() => {
    PersistApi._resetEncryptionKeyForTest();
    StuffApi.clearAll();
    if (ORIG === undefined) delete process.env.TOKEN_ENC_KEY;
    else process.env.TOKEN_ENC_KEY = ORIG;
  });

  function resolve(): EncryptedStringMarshaller {
    return StuffApi.findByTemplatePath<EncryptedStringMarshaller>(
      EncryptedStringMarshaller.templatePath
    )!;
  }

  describe('round-trip', () => {
    it('encrypts then decrypts back to the original plaintext', () => {
      const m = resolve();
      const plaintext = 'oauth-access-token-abc123';
      const env = m.toStored(plaintext);
      expect(m.fromStored(env)).toBe(plaintext);
    });

    it('stores a versioned envelope, never the plaintext', () => {
      const m = resolve();
      const plaintext = 'super-secret-refresh-token';
      const env = m.toStored(plaintext);
      expect(env.v).toBe(1);
      expect(typeof env.iv).toBe('string');
      expect(typeof env.tag).toBe('string');
      expect(typeof env.ct).toBe('string');
      // The plaintext appears nowhere in the serialized envelope.
      expect(JSON.stringify(env)).not.toContain(plaintext);
    });

    it('uses a fresh IV per call (same plaintext → different ct)', () => {
      const m = resolve();
      const a = m.toStored('same');
      const b = m.toStored('same');
      expect(a.iv).not.toBe(b.iv);
      expect(a.ct).not.toBe(b.ct);
      expect(m.fromStored(a)).toBe('same');
      expect(m.fromStored(b)).toBe('same');
    });

    it('round-trips empty strings and unicode', () => {
      const m = resolve();
      expect(m.fromStored(m.toStored(''))).toBe('');
      expect(m.fromStored(m.toStored('ünîçødé 🎮'))).toBe('ünîçødé 🎮');
    });
  });

  describe('tamper detection', () => {
    it('throws when the ciphertext is corrupted', () => {
      const m = resolve();
      const env = m.toStored('tamper-me');
      const ct = env.ct;
      const flipped = (ct[0] === 'A' ? 'B' : 'A') + ct.slice(1);
      const tampered: EncryptedEnvelope = { ...env, ct: flipped };
      expect(() => m.fromStored(tampered)).toThrow(
        /token decryption failed/i
      );
    });

    it('throws when the auth tag is corrupted', () => {
      const m = resolve();
      const env = m.toStored('tamper-tag');
      const tag = env.tag;
      const flipped = (tag[0] === 'A' ? 'B' : 'A') + tag.slice(1);
      expect(() => m.fromStored({ ...env, tag: flipped })).toThrow(
        /token decryption failed/i
      );
    });

    it('throws on a malformed envelope', () => {
      const m = resolve();
      expect(() =>
        m.fromStored({ v: 2 } as unknown as EncryptedEnvelope)
      ).toThrow(/malformed envelope/i);
    });
  });

  describe('key handling (lazy)', () => {
    it('throws a clear error when TOKEN_ENC_KEY is absent', () => {
      delete process.env.TOKEN_ENC_KEY;
      const m = resolve();
      expect(() => m.toStored('x')).toThrow(/TOKEN_ENC_KEY is not set/);
    });

    it('throws when TOKEN_ENC_KEY is the wrong length', () => {
      process.env.TOKEN_ENC_KEY = Buffer.from('too-short').toString('base64');
      const m = resolve();
      expect(() => m.toStored('x')).toThrow(/must decode to 32 bytes/);
    });

    it('reports a missing key as a key error on the DECRYPT path too', () => {
      // Regression: the key lookup must sit outside fromStored's
      // try/catch. Inside it, a forgotten TOKEN_ENC_KEY surfaces as
      // "tampered or wrong key" and sends the operator hunting for data
      // corruption instead of an env var.
      const m = resolve();
      const env = m.toStored('secret');
      delete process.env.TOKEN_ENC_KEY;
      PersistApi._resetEncryptionKeyForTest();
      expect(() => m.fromStored(env)).toThrow(/TOKEN_ENC_KEY is not set/);
    });

    it('still reports genuine tampering as tampering', () => {
      const m = resolve();
      const env = m.toStored('secret');
      const bytes = Buffer.from(env.ct, 'base64');
      bytes[0] = bytes[0]! ^ 0xff;
      expect(() =>
        m.fromStored({ ...env, ct: bytes.toString('base64') })
      ).toThrow(/tampered or wrong key/);
    });

    it('does not validate the key at registration (lazy)', () => {
      // The marshaller is already registered in beforeEach with the key
      // cleared here — registration itself must not have round-tripped.
      delete process.env.TOKEN_ENC_KEY;
      expect(() => resolve()).not.toThrow();
    });

    it('accepts a hex-encoded 32-byte key', () => {
      process.env.TOKEN_ENC_KEY = crypto.randomBytes(32).toString('hex');
      const m = resolve();
      expect(m.fromStored(m.toStored('hex-key'))).toBe('hex-key');
    });
  });
});
