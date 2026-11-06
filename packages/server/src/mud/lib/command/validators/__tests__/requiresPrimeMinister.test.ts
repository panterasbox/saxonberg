/**
 * requiresPrimeMinister — `config`'s gate (wizard-axis D12): the world's
 * settings are the chief executive's, not a wizard's. The sync body maps
 * the preloaded boolean to a denial naming the seat; the async preload
 * reads `CompactApi.holdsOffice(giver, 'prime-minister')`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import requiresPrimeMinister from '../requiresPrimeMinister';
import { CompactApi } from '../../../../api/compact';
import type { CommandContext } from '../../../../api/command';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requiresPrimeMinister', () => {
  it('rejects a non-holder naming the seat, and allows the Prime Minister', () => {
    const ctx = { verb: 'config', commandGiver: {} } as unknown as CommandContext;
    expect(requiresPrimeMinister(ctx, false)).toMatch(/Prime Minister/);
    expect(requiresPrimeMinister(ctx, true)).toBeUndefined();
  });

  it('the preload queries the prime-minister office', async () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    const spy = vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(true as never);
    await expect(requiresPrimeMinister.preload!(ctx)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith(ctx.commandGiver, 'prime-minister');
  });

  it('⭐ a seatless wizard is refused — the axis is not a seat', async () => {
    const ctx = { verb: 'config', commandGiver: {} } as unknown as CommandContext;
    vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(false as never);
    await expect(requiresPrimeMinister.preload!(ctx)).resolves.toBe(false);
    expect(requiresPrimeMinister(ctx, false)).toMatch(/Prime Minister/);
  });
});
