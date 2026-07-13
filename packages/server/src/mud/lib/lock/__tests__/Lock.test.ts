/**
 * Lock / KeyCredential — the pure value-object core of the lock/key substrate:
 * the bearer match (a key opens a lock iff technology AND keyway match, or a
 * master for the technology), the round-trip, and the key prose. The physical
 * Key Thing + CredentialApi.presentsKey wiring is covered end-to-end by the DormWarren
 * key-gate test.
 */

import { describe, it, expect } from 'vitest';
import { Lock, LOCK_TYPES } from '../Lock';
import { KeyCredential, Credential } from '../../credential/Credential';

describe('KeyCredential.authorize — the bearer match', () => {
  it('opens iff BOTH the keyway and the technology match', () => {
    const c = new KeyCredential();
    c.addKey('kw-1', 'pin-tumbler');

    expect(c.authorize('kw-1', 'pin-tumbler')).toBe(true); // exact
    expect(c.authorize('kw-2', 'pin-tumbler')).toBe(false); // wrong keyway
    expect(c.authorize('kw-1', 'keycard')).toBe(false); // wrong technology
    expect(c.authorize('kw-9', 'keycard')).toBe(false); // neither
  });

  it('a master opens any keyway of its technology — but not another technology', () => {
    const c = new KeyCredential();
    c.addMaster('pin-tumbler');

    expect(c.authorize('kw-anything', 'pin-tumbler')).toBe(true);
    expect(c.authorize('kw-else', 'pin-tumbler')).toBe(true);
    expect(c.authorize('kw-anything', 'keycard')).toBe(false); // wrong tech
  });

  it('holds many bearer keys; removeKey kills one', () => {
    const c = new KeyCredential();
    c.addKey('kw-1', 'pin-tumbler');
    c.addKey('kw-2', 'keycard');
    expect(c.authorize('kw-1', 'pin-tumbler')).toBe(true);
    expect(c.authorize('kw-2', 'keycard')).toBe(true);

    expect(c.removeKey('kw-1')).toBe(true);
    expect(c.authorize('kw-1', 'pin-tumbler')).toBe(false);
    expect(c.authorize('kw-2', 'keycard')).toBe(true); // the other survives
    expect(c.removeKey('kw-1')).toBe(false); // already gone
  });

  it('addKey is idempotent on the keyway+technology pair', () => {
    const c = new KeyCredential();
    c.addKey('kw-1', 'pin-tumbler');
    c.addKey('kw-1', 'pin-tumbler');
    expect(c.getKeys()).toHaveLength(1);
  });
});

describe('KeyCredential — round-trip', () => {
  it('toData/fromData preserves keys + master technologies', () => {
    const c = new KeyCredential();
    c.addKey('kw-1', 'pin-tumbler');
    c.addKey('kw-2', 'keycard');
    c.addMaster('pin-tumbler');

    const restored = Credential.fromData(c.toData()) as KeyCredential;
    expect(restored.kind).toBe('key');
    expect(restored.authorize('kw-1', 'pin-tumbler')).toBe(true);
    expect(restored.authorize('kw-2', 'keycard')).toBe(true);
    expect(restored.authorize('kw-x', 'pin-tumbler')).toBe(true); // master
    expect([...restored.getMasterTechnologies()]).toEqual(['pin-tumbler']);
  });

  it('Credential.mint("key") yields an empty keychain', () => {
    const c = Credential.mint('key') as KeyCredential;
    expect(c.kind).toBe('key');
    expect(c.getKeys()).toHaveLength(0);
    expect(c.authorize('kw-1', 'pin-tumbler')).toBe(false);
  });
});

describe('Lock', () => {
  it('carries a keyway + technology', () => {
    const lock = new Lock('kw-1', 'pin-tumbler');
    expect(lock.keyway).toBe('kw-1');
    expect(lock.technology).toBe('pin-tumbler');
  });

  it('keyDescription distinguishes technology + master', () => {
    expect(Lock.keyDescription('pin-tumbler')).toMatch(/brass/);
    expect(Lock.keyDescription('keycard')).toMatch(/keycard/);
    expect(Lock.keyDescription('pin-tumbler', true)).toMatch(/master/);
    expect(LOCK_TYPES).toContain('pin-tumbler');
    expect(LOCK_TYPES).toContain('keycard');
  });
});
