/**
 * ShadowChangedEvent unit tests — declared but unfired in Wave 1.
 * Sanity-checks the KIND + payload shape so descriptors that name
 * the class can compile and the wire-level identity is stable.
 */

import { describe, it, expect } from 'vitest';
import { ShadowChangedEvent } from '../ShadowChangedEvent';

describe('ShadowChangedEvent', () => {
  it('carries kind, payload, and exposes static KIND', () => {
    const event = new ShadowChangedEvent({
      target: 'stuff-1',
      shadow: 'HoodShadow',
      cause: 'attach',
    });
    expect(event.kind).toBe('stuff.shadowChanged');
    expect(ShadowChangedEvent.KIND).toBe('stuff.shadowChanged');
    expect(event.payload).toEqual({
      target: 'stuff-1',
      shadow: 'HoodShadow',
      cause: 'attach',
    });
  });

  it('cause supports attach / detach / mutate', () => {
    for (const cause of ['attach', 'detach', 'mutate'] as const) {
      const event = new ShadowChangedEvent({
        target: 't',
        shadow: 's',
        cause,
      });
      expect(event.payload.cause).toBe(cause);
    }
  });
});
