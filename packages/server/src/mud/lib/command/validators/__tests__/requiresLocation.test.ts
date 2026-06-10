/**
 * requiresLocation — rejects when the giver has no location, passes
 * when it has one. The single home of the "you're nowhere" message.
 */

import { describe, it, expect } from 'vitest';
import requiresLocation from '../requiresLocation';
import type { CommandContext } from '../../../../api/command';

function ctx(location: unknown): CommandContext {
  return {
    commandGiver: { getDisplayName: () => 'you' },
    location,
  } as unknown as CommandContext;
}

describe('requiresLocation', () => {
  it('passes when a location is present', () => {
    const fakeContainer = { stuffId: 'loc-1' };
    expect(requiresLocation(ctx(fakeContainer), undefined)).toBeUndefined();
  });

  it('rejects with a wayfinding message when location is null', () => {
    const msg = requiresLocation(ctx(null), undefined);
    expect(typeof msg).toBe('string');
    expect(msg).toMatch(/nowhere/i);
    expect(msg).toMatch(/recall|help/i);
  });
});
