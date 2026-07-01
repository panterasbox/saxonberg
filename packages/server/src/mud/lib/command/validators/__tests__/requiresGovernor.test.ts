/**
 * requiresGovernor — the central-bank monetary-authority gate (the
 * `reserve` verb's re-gate, from `requiresWizard` to holding the
 * `central-bank-governor` office). The sync body maps the preloaded
 * boolean to a denial string; the async preload reads
 * `OfficeApi.holdsOffice(giver, 'central-bank-governor')`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import requiresGovernor from '../requiresGovernor';
import { OfficeApi } from '../../../../api/office';
import type { CommandContext } from '../../../../api/command';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requiresGovernor', () => {
  it('rejects a non-Governor (allowed=false) and allows the Governor (allowed=true)', () => {
    const ctx = {
      verb: 'reserve',
      commandGiver: {},
    } as unknown as CommandContext;
    expect(requiresGovernor(ctx, false)).toMatch(/Governor/);
    expect(requiresGovernor(ctx, true)).toBeUndefined();
  });

  it('the preload queries the central-bank-governor office', async () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    const spy = vi
      .spyOn(OfficeApi, 'holdsOffice')
      .mockResolvedValue(true as never);
    await expect(requiresGovernor.preload!(ctx)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith(ctx.commandGiver, 'central-bank-governor');
  });

  it('denies a non-holding wizard (the preload returns false)', async () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    vi.spyOn(OfficeApi, 'holdsOffice').mockResolvedValue(false as never);
    await expect(requiresGovernor.preload!(ctx)).resolves.toBe(false);
    expect(requiresGovernor(ctx, false)).toMatch(/Governor/);
  });
});
