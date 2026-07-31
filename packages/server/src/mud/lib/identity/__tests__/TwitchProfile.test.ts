/**
 * TwitchProfile tests — ciphertext-at-rest, decrypt-on-read, and the
 * `applyRefreshedToken` write-back.
 *
 * PersistenceManager is stubbed (no Mongo). The `EncryptedStringMarshaller`
 * singleton is registered in StuffApi via the test helper, and the
 * Document marshaller-resolution seam is wired to StuffApi exactly as
 * `AppBootstrap` does at boot — so `toDocument` / `fromDocument` run the
 * marshaller and we can assert the raw doc holds an envelope, not the
 * plaintext token.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as crypto from 'crypto';
import { TwitchProfile } from '../TwitchProfile';
import { Document } from '../../persistence/Document';
import { Marshaller } from '../../persistence/Marshaller';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import { PersistApi } from '../../../api/persist';
import { installEncryptedStringMarshaller } from '../../persistence/__tests__/encrypted-string-marshaller-test-helpers';

const VALID_KEY = crypto.randomBytes(32).toString('base64');

interface EnvelopeShape {
  v: number;
  iv: string;
  tag: string;
  ct: string;
}

describe('TwitchProfile', () => {
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
    // Wire the marshaller-resolution seam to StuffApi (mirrors
    // AppBootstrap). Both sync + async resolvers hit the in-memory
    // registry the helper just populated.
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
      return doc._id ? (doc._id as string) : 'tp-inserted';
    });
  });

  afterEach(() => {
    StuffApi.clearAll();
    vi.restoreAllMocks();
    if (ORIG === undefined) delete process.env.TOKEN_ENC_KEY;
    else process.env.TOKEN_ENC_KEY = ORIG;
  });

  function seed(): TwitchProfile {
    const p = new TwitchProfile();
    p.twitchUserId = '12345';
    p.login = 'streamer';
    p.displayName = 'Streamer';
    p.email = 'streamer@example.com';
    p.accessToken = 'access-token-plaintext';
    p.refreshToken = 'refresh-token-plaintext';
    p.expiresAt = 1000;
    p.scopes = ['user:read:email'];
    return p;
  }

  it('collection + persistent fields + marshaller declarations', () => {
    expect(TwitchProfile.collectionName).toBe('twitch_profiles');
    expect(TwitchProfile.persistentFields).toContain('accessToken');
    expect(TwitchProfile.persistentFields).toContain('refreshToken');
    expect(TwitchProfile.fieldMarshallers.accessToken).toBe(
      '/lib/persistence/EncryptedStringMarshaller'
    );
    expect(TwitchProfile.fieldMarshallers.refreshToken).toBe(
      '/lib/persistence/EncryptedStringMarshaller'
    );
  });

  it('writes ciphertext (envelope) at rest for the token fields', async () => {
    const p = seed();
    await p.save();

    expect(saves).toHaveLength(1);
    const doc = saves[0]!.doc;
    expect(saves[0]!.collection).toBe('twitch_profiles');

    // The token fields are encrypted envelopes, NOT the plaintext.
    const at = doc.accessToken as EnvelopeShape;
    const rt = doc.refreshToken as EnvelopeShape;
    expect(at.v).toBe(1);
    expect(typeof at.ct).toBe('string');
    expect(JSON.stringify(doc)).not.toContain('access-token-plaintext');
    expect(JSON.stringify(doc)).not.toContain('refresh-token-plaintext');
    expect(rt.v).toBe(1);

    // Non-token identity fields stay plaintext.
    expect(doc.login).toBe('streamer');
    expect(doc.twitchUserId).toBe('12345');
  });

  it('decrypts the token fields transparently on read', async () => {
    const p = seed();
    await p.save();
    const storedDoc = { ...saves[0]!.doc, _id: 'tp-1' };

    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'findById').mockResolvedValue(storedDoc);

    const loaded = await TwitchProfile.findById('tp-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.accessToken).toBe('access-token-plaintext');
    expect(loaded!.refreshToken).toBe('refresh-token-plaintext');
    expect(loaded!.login).toBe('streamer');
    expect(loaded!.scopes).toEqual(['user:read:email']);
  });

  it('applyRefreshedToken re-encrypts the rotated token (onRefresh write-back)', async () => {
    const p = seed();
    p._id = 'tp-1';
    await p.save();
    saves.length = 0;

    await p.applyRefreshedToken({
      accessToken: 'rotated-access',
      refreshToken: 'rotated-refresh',
      expiresAt: 5000,
      scopes: ['user:read:email'],
    });

    expect(saves).toHaveLength(1);
    const doc = saves[0]!.doc;
    expect((doc.accessToken as EnvelopeShape).v).toBe(1);
    expect(JSON.stringify(doc)).not.toContain('rotated-access');
    expect(JSON.stringify(doc)).not.toContain('rotated-refresh');
    expect(doc.expiresAt).toBe(5000);

    // And reading it back yields the rotated plaintext.
    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'findById').mockResolvedValue({ ...doc, _id: 'tp-1' });
    const reloaded = await TwitchProfile.findById('tp-1');
    expect(reloaded!.accessToken).toBe('rotated-access');
    expect(reloaded!.refreshToken).toBe('rotated-refresh');
  });
});
