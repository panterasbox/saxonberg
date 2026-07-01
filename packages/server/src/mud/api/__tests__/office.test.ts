/**
 * OfficeApi — the facade's two surfaces: ungated public reads forward
 * freely; the `assign`/`vacate` mutations are narrow-entry gated to
 * `OfficeController` and throw `SecurityError` from any other caller.
 * The no-registry path returns the documented closed-fail defaults.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OfficeApi } from '../office';
import { StuffApi } from '../stuff';
import Avatar from '../../obj/Avatar';
import { SecurityError } from '../../lib/security/errors';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

describe('OfficeApi facade', () => {
  beforeEach(() => {
    OfficeApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  afterEach(() => {
    OfficeApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  it('assign throws SecurityError from a non-OfficeController caller', () => {
    expect(() => OfficeApi.assign('alice', 'prime-minister')).toThrow(
      SecurityError,
    );
  });

  it('vacate throws SecurityError from a non-OfficeController caller', () => {
    expect(() => OfficeApi.vacate('prime-minister')).toThrow(SecurityError);
  });

  it('public reads forward without a caller frame (ungated)', async () => {
    // No live registry → the documented closed-fail defaults, but the
    // calls themselves do not throw (ungated).
    await expect(OfficeApi.isFounder(makeAvatar('x'))).resolves.toBe(false);
    await expect(
      OfficeApi.holdsOffice(makeAvatar('x'), 'prime-minister'),
    ).resolves.toBe(false);
    await expect(OfficeApi.officesOf(makeAvatar('x'))).resolves.toEqual([]);
    await expect(OfficeApi.roster()).resolves.toEqual([]);
    expect(OfficeApi.founderLabel()).toBe('(founder unset)');
    const held = await OfficeApi.holderOf('prime-minister');
    expect(held.kind).toBe('unknown');
  });

  it('isFounder of a null subject is false (closed-fail)', async () => {
    await expect(OfficeApi.isFounder(null)).resolves.toBe(false);
  });
});
