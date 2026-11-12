/**
 * `Group.rename(newName, by)` — the owner rule and the unique name are the
 * GROUP's (controller-liquidity C71: `group rename` wrote `g.name` with no
 * duplicate check). A direct call, no controller in the way: another
 * player is refused, and a name another group holds is refused, both
 * before the write.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import { Group } from '../Group';
import { GroupApi } from '../../../api/group';
import type { Stuff } from '../../stuff/Stuff';

afterEach(() => vi.restoreAllMocks());

const alice = { name: 'alice' } as unknown as Stuff;
const bob = { name: 'bob' } as unknown as Stuff;

function owned(): Group {
  const g = new Group();
  g._id = 'g1';
  g.name = 'smiths';
  vi.spyOn(GroupApi, 'ownsGroup').mockImplementation(async (who) => who === alice);
  return g;
}

describe('Group.rename', () => {
  it('refuses anybody but the owner, before the write', async () => {
    const g = owned();
    const save = vi.spyOn(g, 'save').mockResolvedValue(undefined as never);
    expect(await g.rename('wrights', bob)).toEqual({ ok: false, reason: 'not-owner' });
    expect(g.name).toBe('smiths');
    expect(save).not.toHaveBeenCalled();
  });

  it('refuses a name another group already holds', async () => {
    const g = owned();
    const other = new Group();
    other._id = 'g2';
    other.name = 'wrights';
    vi.spyOn(Group, 'find').mockResolvedValue([other] as never);
    const save = vi.spyOn(g, 'save').mockResolvedValue(undefined as never);
    expect(await g.rename('wrights', alice)).toEqual({ ok: false, reason: 'duplicate-name' });
    expect(g.name).toBe('smiths');
    expect(save).not.toHaveBeenCalled();
  });

  it('renames for the owner and announces the change', async () => {
    const g = owned();
    vi.spyOn(Group, 'find').mockResolvedValue([] as never);
    const save = vi.spyOn(g, 'save').mockResolvedValue(undefined as never);
    const fireChange = vi.fn();
    vi.spyOn(GroupApi, 'registry').mockResolvedValue({
      managed: () => ({ fireChange }),
    } as never);
    expect(await g.rename('wrights', alice)).toEqual({ ok: true });
    expect(g.name).toBe('wrights');
    expect(save).toHaveBeenCalled();
    expect(fireChange).toHaveBeenCalledWith('g1');
  });
});
