/**
 * requiresAuthor — verb-level author gate for `bulletin`. Mirrors the
 * `requiresDeveloper` gate test in ConfigController.test.ts: the sync body
 * maps the threaded `allowed` boolean to a denial string, and the async
 * `preload` reads `AccessApi.isAuthor(commandGiver)`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import requiresAuthor from '../requiresAuthor';
import { AccessApi } from '../../../../api/access';
import type { CommandContext } from '../../../../api/command';

describe('requiresAuthor validator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes (undefined) when the giver is allowed', () => {
    const ctx = {
      verb: 'bulletin',
      commandGiver: {},
    } as unknown as CommandContext;
    expect(requiresAuthor(ctx, true)).toBeUndefined();
  });

  it('rejects a non-author with a permission message', () => {
    const ctx = {
      verb: 'bulletin',
      commandGiver: {},
    } as unknown as CommandContext;
    expect(requiresAuthor(ctx, false)).toBe(
      "you don't have permission to bulletin",
    );
  });

  it('preload reads AccessApi.isAuthor(commandGiver)', async () => {
    const giver = { id: 'g' };
    const ctx = { commandGiver: giver } as unknown as CommandContext;
    const spy = vi
      .spyOn(AccessApi, 'isAuthor')
      .mockResolvedValue(true as never);
    await expect(requiresAuthor.preload!(ctx)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith(giver);
  });

  it('preload propagates a false (non-author) verdict', async () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false as never);
    await expect(requiresAuthor.preload!(ctx)).resolves.toBe(false);
  });
});
