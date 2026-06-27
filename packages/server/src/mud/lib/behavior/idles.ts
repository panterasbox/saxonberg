/**
 * `idles` brain — ambient flavor on a cadence. Samples one entry from a
 * **mixed emission pool** (emote / free-form / speech) each fire, the
 * "lean-and-polish / wipe-the-rail" idle business that makes a room feel
 * inhabited. Claims no slots (instant; yields to nothing, blocks
 * nothing) and is presence-gated by default (an empty room stays quiet).
 *
 * config: `{ pool: Array<{ kind: 'emote'|'free'|'say', value: string }> }`
 */

import type { BrainContext, BrainStatics } from './brain';

interface PoolEntry {
  kind?: string;
  value?: string;
}

export const brain = class {
  static label = 'idles';

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
