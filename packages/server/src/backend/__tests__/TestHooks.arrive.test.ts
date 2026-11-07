/**
 * TestHooks.arriveCharacter — a test character arrives as a newcomer does,
 * with the Arrival Note's coin in hand. The water-supply walk staged money
 * by `reserve override` (ledger money with no coin behind it) and read the
 * till's designed refusal as a dead till.
 */

import '../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestHooks } from '../TestHooks';
import { PlayerApi } from '../../mud/api/player';
import { ContractApi } from '../../mud/api/contract';
import type Avatar from '../../mud/lib/character/Avatar';

describe('TestHooks.arriveCharacter', () => {
  beforeEach(() => {
    process.env.AUTH_MODE = 'test';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.env.AUTH_MODE = 'test';
  });

  it('⭐ issues the note on the character\'s identity, as `embody confirm` does', async () => {
    const body = { getIdentityPath: () => '/platform/agent/Avatar/p1' } as unknown as Avatar;
    vi.spyOn(PlayerApi, 'findAvatarByName').mockReturnValue(body);
    const issued = { ok: true as const, contractId: 'c1', principal: 20, paperPath: '/home/p1/papers/arrival-note' };
    const issue = vi.spyOn(ContractApi, 'issueNote').mockResolvedValue(issued);
    await expect(TestHooks.arriveCharacter('walker')).resolves.toEqual(issued);
    expect(issue).toHaveBeenCalledWith('/platform/agent/Avatar/p1');
  });

  it('⚠ says so when nobody answers to the handle', async () => {
    vi.spyOn(PlayerApi, 'findAvatarByName').mockReturnValue(undefined);
    await expect(TestHooks.arriveCharacter('nobody')).rejects.toThrow(/no resident character/i);
  });

  it('⛔ refuses outright when AUTH_MODE is not test', async () => {
    delete process.env.AUTH_MODE;
    await expect(TestHooks.arriveCharacter('walker')).rejects.toThrow(/test-only/i);
  });
});
