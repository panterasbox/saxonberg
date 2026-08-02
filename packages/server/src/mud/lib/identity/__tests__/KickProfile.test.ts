/**
 * KickProfile tests — ciphertext-at-rest, decrypt-on-read, and the
 * `applyRefreshedToken` write-back. The TwitchProfile suite transcribed
 * onto the third provider (same marshaller wiring; see that file's
 * header for the seam notes).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as crypto from 'crypto';
import { KickProfile } from '../KickProfile';
import { Document } from '../../persistence/Document';
import { Marshaller } from '../../persistence/Marshaller';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import { PersistApi } from '../../../api/persist';
import { installEncryptedStringMarshaller } from '../../persistence/__tests__/encrypted-string-marshaller-test-helpers';
import { MixinApi } from '../../../api/mixin';

const VALID_KEY = crypto.randomBytes(32).toString('base64');

interface EnvelopeShape {
  v: number;
  iv: string;
  tag: string;
  ct: string;
}

describe('KickProfile', () => {
  const ORIG = process.env.TOKEN_ENC_KEY;
  let saves: Array<{ collection: string; doc: Record<string, unknown> }>;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.TOKEN_ENC_KEY = VALID_KEY;
    // The key cache is process-wide (it lives on PersistApi, not on the
    // marshaller instance), so clearAll() no longer drops it. Without
    // this the suite passes only by vitest's per-file module isolation.
    PersistApi._resetEncryptionKeyForTest();
    installEncryptedStringMarshaller();
    Document.setMarshallerResolver(
      (path) =>
        StuffApi.findByTemplatePath<Marshaller<unknown, unknown>>(path),
      async (path) =>
        StuffApi.findByTemplatePath<Marshaller<unknown, unknown>>(path)
    );

    saves = [];
    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'save').mockImplementation(async (collection, doc) => {
      saves.push({ collection, doc: doc as Record<string, unknown> });
      return doc._id ? (doc._id as string) : 'kp-inserted';
    });
  });

  afterEach(() => {
    StuffApi.clearAll();
    vi.restoreAllMocks();
    if (ORIG === undefined) delete process.env.TOKEN_ENC_KEY;
    else process.env.TOKEN_ENC_KEY = ORIG;
  });

  function seed(): KickProfile {
    const p = new KickProfile();
    p.kickUserId = '54321';
    p.slug = 'streamer';
    p.displayName = 'Streamer';
    p.email = 'streamer@example.com';
    p.broadcasterUserId = '123';
    p.accessToken = 'access-token-plaintext';
    p.refreshToken = 'refresh-token-plaintext';
    p.expiresAt = 1000;
    p.scopes = ['user:read'];
    return p;
  }

  it('collection + persistent fields + marshaller declarations', () => {
    expect(KickProfile.collectionName).toBe('kick_profiles');
    expect(MixinApi.getAllPersistentFields(KickProfile)).toContain('accessToken');
    expect(MixinApi.getAllPersistentFields(KickProfile)).toContain('refreshToken');
    expect(MixinApi.getAllPersistentFields(KickProfile)).toContain('slug');
    expect(MixinApi.getAllPersistentFields(KickProfile)).toContain('broadcasterUserId');
    expect(MixinApi.getAllFieldMarshallers(KickProfile).accessToken).toBe(
      '/lib/persistence/EncryptedStringMarshaller'
    );
    expect(MixinApi.getAllFieldMarshallers(KickProfile).refreshToken).toBe(
      '/lib/persistence/EncryptedStringMarshaller'
    );
  });

  it('writes ciphertext (envelope) at rest for the token fields', async () => {
    const p = seed();
    await p.save();

    expect(saves).toHaveLength(1);
    const doc = saves[0]!.doc;
    expect(saves[0]!.collection).toBe('kick_profiles');

    const at = doc.accessToken as EnvelopeShape;
    const rt = doc.refreshToken as EnvelopeShape;
    expect(at.v).toBe(1);
    expect(typeof at.ct).toBe('string');
    expect(JSON.stringify(doc)).not.toContain('access-token-plaintext');
    expect(JSON.stringify(doc)).not.toContain('refresh-token-plaintext');
    expect(rt.v).toBe(1);

    // Non-token identity fields stay plaintext.
    expect(doc.slug).toBe('streamer');
    expect(doc.kickUserId).toBe('54321');
    expect(doc.broadcasterUserId).toBe('123');
  });

  it('decrypts the token fields transparently on read', async () => {
    const p = seed();
    await p.save();
    const storedDoc = { ...saves[0]!.doc, _id: 'kp-1' };

    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'findById').mockResolvedValue(storedDoc);

    const loaded = await KickProfile.findById('kp-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.accessToken).toBe('access-token-plaintext');
    expect(loaded!.refreshToken).toBe('refresh-token-plaintext');
    expect(loaded!.slug).toBe('streamer');
    expect(loaded!.scopes).toEqual(['user:read']);
  });

  it('applyRefreshedToken re-encrypts the rotated token (write-back)', async () => {
    const p = seed();
    p._id = 'kp-1';
    await p.save();
    saves.length = 0;

    await p.applyRefreshedToken({
      accessToken: 'rotated-access',
      refreshToken: 'rotated-refresh',
      expiresAt: 5000,
      scopes: ['user:read'],
    });

    expect(saves).toHaveLength(1);
    const doc = saves[0]!.doc;
    expect((doc.accessToken as EnvelopeShape).v).toBe(1);
    expect(JSON.stringify(doc)).not.toContain('rotated-access');
    expect(JSON.stringify(doc)).not.toContain('rotated-refresh');
    expect(doc.expiresAt).toBe(5000);

    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'findById').mockResolvedValue({ ...doc, _id: 'kp-1' });
    const reloaded = await KickProfile.findById('kp-1');
    expect(reloaded!.accessToken).toBe('rotated-access');
    expect(reloaded!.refreshToken).toBe('rotated-refresh');
  });
});
