/**
 * `random-chatter` brain — periodic spoken lines on a cadence (Remy
 * "holding court"). Claims `voice`. Presence-gated by default.
 *
 * config: `{ lines: string[] }`
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';

export const brain = class {
  static label = 'random-chatter';
  static claims: readonly EngagementSlot[] = ['voice'];
  // Yield while the host is mid-conversation (voice/attention held) so it
  // doesn't interleave undirected chatter with the directed dialogue.
  static requiresFree: readonly EngagementSlot[] = ['voice', 'attention'];

  static act(ctx: BrainContext): void {
    const lines = Array.isArray(ctx.config.lines)
      ? (ctx.config.lines as string[])
      : [];
    if (!lines.length) return;
    const line = lines[Math.floor(Math.random() * lines.length)];
    if (typeof line === 'string') ctx.say(line);
  }
} satisfies BrainStatics;
