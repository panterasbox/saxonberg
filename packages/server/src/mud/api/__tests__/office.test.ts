/**
 * CompactApi — the facade's two surfaces: ungated public reads forward
 * freely; the `assign`/`vacate` mutations are narrow-entry gated to
 * `OfficeController` and throw `SecurityError` from any other caller.
 * The no-registry path returns the documented closed-fail defaults.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CompactApi } from '../compact';
import { StuffApi } from '../stuff';
import Avatar from '../../platform/agent/Avatar';
import { SecurityError } from '../../lib/security/errors';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

describe('CompactApi facade', () => {
  beforeEach(() => {
    CompactApi._resetOfficeRegistryRefForReload();
    StuffApi.clearAll();
  });

  afterEach(() => {
    CompactApi._resetOfficeRegistryRefForReload();
    StuffApi.clearAll();
  });

  it('assign throws SecurityError from a non-OfficeController caller', () => {
    expect(() => CompactApi.assignOffice('alice', 'prime-minister')).toThrow(
      SecurityError,
    );
  });

  it('vacate throws SecurityError from a non-OfficeController caller', () => {
    expect(() => CompactApi.vacateOffice('prime-minister')).toThrow(SecurityError);
  });

  it('public reads forward without a caller frame (ungated)', async () => {
    // No live registry → the documented closed-fail defaults, but the
    // calls themselves do not throw (ungated).
    await expect(CompactApi.isFounder(makeAvatar('x'))).resolves.toBe(false);
    await expect(
      CompactApi.holdsOffice(makeAvatar('x'), 'prime-minister'),
    ).resolves.toBe(false);
    await expect(CompactApi.officesOf(makeAvatar('x'))).resolves.toEqual([]);
    await expect(CompactApi.officeRoster()).resolves.toEqual([]);
    expect(CompactApi.founderLabel()).toBe('(founder unset)');
    const held = await CompactApi.officeHolderOf('prime-minister');
    expect(held.kind).toBe('unknown');
  });

  it('isFounder of a null subject is false (closed-fail)', async () => {
    await expect(CompactApi.isFounder(null)).resolves.toBe(false);
  });
});
