/**
 * requiresFinanceMinister — the Treasury's fiscal gate (economic
 * bootstrap D7): the sync body maps the preloaded boolean to a denial
 * string; the async preload reads `CompactApi.holdsOffice(giver,
 * 'minister-of-finance')`. The Governor's seat is NOT this one.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import requiresFinanceMinister from '../requiresFinanceMinister';
import { CompactApi } from '../../../../api/compact';
import type { CommandContext } from '../../../../api/command';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requiresFinanceMinister', () => {
  it('rejects a non-holder (allowed=false) and allows the Minister (allowed=true)', () => {
    const ctx = { verb: 'treasury', commandGiver: {} } as unknown as CommandContext;
    expect(requiresFinanceMinister(ctx, false)).toMatch(/Minister of Finance/);
    expect(requiresFinanceMinister(ctx, true)).toBeUndefined();
  });

  it('the preload queries the minister-of-finance office — never the Governor', async () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    const spy = vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(true as never);
    await expect(requiresFinanceMinister.preload!(ctx)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith(ctx.commandGiver, 'minister-of-finance');
    expect(spy).not.toHaveBeenCalledWith(ctx.commandGiver, 'central-bank-governor');
  });
});
