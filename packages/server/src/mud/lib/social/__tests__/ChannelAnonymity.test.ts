/**
 * Chat anonymity — the channel setting, and the four rows of its table.
 *
 * ⭐⭐ **Disguise is perceptual; anonymity is declarative**, and they used
 * to be one mechanism, which is why *"is a hooded man anonymous on a
 * channel?"* had no answer rather than a wrong one. A disguise works
 * because somebody is **looking at you**. A channel is not looking — it
 * is reading what you typed. So:
 *
 * | channel | post | shows |
 * |---|---|---|
 * | `forbidden` | plain | the NAME, for everyone, hood or no hood |
 * | `forbidden` | `--anon` | refused — never silently named |
 * | `permitted` | plain | today's concise identity, byte-identical |
 * | `permitted` | `--anon` | a short handle, no `stuff-id`, no speaker ref |
 *
 * The default is `permitted`, because that is what every channel did
 * before the field existed.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { Channel } from '../Channel';

describe('the default reproduces today exactly', () => {
  it('a fresh channel permits anonymity', () => {
    expect(new Channel().anonymity).toBe('permitted');
    expect(new Channel().permitsAnonymity()).toBe(true);
  });

  it('⚠ a row minted before the field hydrates the default', () => {
    // No migration: an absent value reads as `permitted`, and a
    // permitted channel posting plainly renders the concise identity —
    // which is byte-identical to what it did before.
    const c = new Channel();
    (c as unknown as Record<string, unknown>).anonymity = undefined;
    expect(c.permitsAnonymity()).toBe(true);
  });
});

describe('forbidding it', () => {
  it('refuses anonymity', () => {
    const c = new Channel();
    c.anonymity = 'forbidden';
    expect(c.permitsAnonymity()).toBe(false);
  });

  it('is a persistent field, so it survives a reload', () => {
    expect(Channel.fieldMeta.anonymity?.persistent).toBe(true);
  });
});
