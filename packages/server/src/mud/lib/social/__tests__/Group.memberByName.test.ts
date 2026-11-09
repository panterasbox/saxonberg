/**
 * `Group.memberByName` — a typed member is MATCHED against the roster,
 * which holds identity paths (controller-liquidity D11: `group remove` /
 * `group role` compared the raw string with those paths and matched
 * nobody).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import { Group } from '../Group';
import { PlayerApi } from '../../../api/player';

afterEach(() => vi.restoreAllMocks());

function roster(): Group {
  const g = new Group();
  g.addMember('/platform/agent/Avatar/p-alice', 'owner');
  g.addMember('/platform/agent/Avatar/p-bob');
  g.addMember('/world/x/agent/Smith');
  return g;
}

describe('Group.memberByName', () => {
  it('matches the key, a trailing segment, or a stored player name', async () => {
    vi.spyOn(PlayerApi, 'isAvatarIdentityPath').mockImplementation(
      (p) => !!p && p.startsWith('/platform/agent/Avatar/'),
    );
    vi.spyOn(PlayerApi, 'storedNameOf').mockImplementation(async (id) =>
      id === 'p-bob' ? 'Bob' : id === 'p-alice' ? 'Alice' : null,
    );
    const g = roster();
    expect(await g.memberByName('/world/x/agent/Smith')).toBe('/world/x/agent/Smith');
    expect(await g.memberByName('p-alice')).toBe('/platform/agent/Avatar/p-alice');
    expect(await g.memberByName('bob')).toBe('/platform/agent/Avatar/p-bob');
    expect(await g.memberByName('carol')).toBeNull();
    expect(await g.memberByName('  ')).toBeNull();
  });
});
