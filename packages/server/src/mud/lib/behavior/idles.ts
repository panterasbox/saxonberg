/**
 * `idles` brain — ambient flavor on a cadence. Samples one entry from a
 * **mixed emission pool** (emote / free-form / speech) each fire, the
 * "lean-and-polish / wipe-the-rail" idle business that makes a room feel
 * inhabited. Claims no slots, but **yields while the host's `voice` or
 * `attention` is engaged** (e.g. mid-conversation) so the NPC stops idle
 * muttering/fidgeting and focuses on whoever it's talking to.
 * Presence-gated by default (an empty room stays quiet).
 *
 * config: `{ pool: Array<{ kind: 'emote'|'free'|'say', value: string }> }`
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';

interface PoolEntry {
  kind?: string;
  value?: string;
}

export const brain = class {
  static label = 'idles';
  // Yield while the host is mid-conversation (voice/attention held).
  static requiresFree: readonly EngagementSlot[] = ['voice', 'attention'];

  static act(ctx: BrainContext): void | Promise<void> {
    const pool = Array.isArray(ctx.config.pool)
      ? (ctx.config.pool as PoolEntry[])
      : [];
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick || typeof pick.value !== 'string') return;
    switch (pick.kind) {
      case 'say':
        ctx.say(pick.value);
        return;
      case 'emote':
        return ctx.emote(pick.value);
      case 'free':
      default:
        ctx.emoteFree(pick.value);
        return;
    }
  }
} satisfies BrainStatics;
