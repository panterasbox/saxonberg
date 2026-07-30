/**
 * requiresFoundingAuthority — the meta-level governance-root gate on
 * `office assign` / `office vacate`. The sync body maps the preloaded
 * boolean to a denial string; the async preload reads
 * `CompactApi.isFounder(giver)` (the founder's pool-of-one power to
 * constitute the government — never a per-feature role check).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import requiresFoundingAuthority from '../requiresFoundingAuthority';
import { CompactApi } from '../../../../api/compact';
import type { CommandContext } from '../../../../api/command';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requiresFoundingAuthority', () => {
  it('allows the founder (allowed=true) and denies a non-founder (allowed=false)', () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    expect(requiresFoundingAuthority(ctx, true)).toBeUndefined();
    expect(requiresFoundingAuthority(ctx, false)).toMatch(/founder/);
  });

  it('the preload reads CompactApi.isFounder of the command giver', async () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    const spy = vi
      .spyOn(CompactApi, 'isFounder')
      .mockResolvedValue(true as never);
    await expect(requiresFoundingAuthority.preload!(ctx)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith(ctx.commandGiver);
  });

  it('denies when the giver is not the founder (the preload returns false)', async () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    vi.spyOn(CompactApi, 'isFounder').mockResolvedValue(false as never);
    await expect(requiresFoundingAuthority.preload!(ctx)).resolves.toBe(false);
    expect(requiresFoundingAuthority(ctx, false)).toMatch(/founder/);
  });
});
