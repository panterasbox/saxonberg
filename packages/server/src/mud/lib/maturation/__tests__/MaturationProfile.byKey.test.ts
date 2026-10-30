/**
 * ⭐ `byKey` remembers where a key's profile was found and re-resolves it
 * by that path — the roster walk is a glob over the whole population, and
 * a maturing vessel asks on every read (a salt pan over a lit hearth
 * wedged a drive's server for minutes in one clock advance, run 25).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MaturationProfile from '../../../platform/idea/maturation/MaturationProfile';
import MaturationProfileBase from '../MaturationProfile';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

let seq = 0;
function profile(key: string): MaturationProfile {
  seq += 1;
  return makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey(key);
    return p;
  }, `/stuff/idea/maturation/_bykey-${seq}`) as unknown as MaturationProfile;
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => vi.restoreAllMocks());

describe('MaturationProfile.byKey', () => {
  it('⭐ walks the roster once, then finds the key by its path', () => {
    const brine = profile('bykey-brine');
    expect(MaturationProfileBase.byKey('bykey-brine')).toBe(brine);
    const walk = vi.spyOn(StuffApi, 'findByPathGlob');
    expect(MaturationProfileBase.byKey('bykey-brine')).toBe(brine);
    expect(walk).not.toHaveBeenCalled();
  });

  it('a profile gone from where it was is looked for again', async () => {
    const first = profile('bykey-gone');
    expect(MaturationProfileBase.byKey('bykey-gone')).toBe(first);
    await StuffApi.destruct(first as never);
    const second = profile('bykey-gone');
    expect(MaturationProfileBase.byKey('bykey-gone')).toBe(second);
  });

  it('an unknown key is still null', () => {
    profile('bykey-known');
    expect(MaturationProfileBase.byKey('bykey-nobody')).toBeNull();
  });
});
