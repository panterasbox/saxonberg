/**
 * `greets` brain — witness trigger on `arrival`: when a player enters
 * the host's room, greet them (directed at the arriver). Claims
 * `attention` (held briefly via a BehaviorBeat), so a concurrently
 * wandering brain yields while the NPC greets.
 *
 * config: `{ lines: string[] }`
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import type { TaskKind } from './Urgency';

export const brain = class {
  static label = 'greets';
  static kind: TaskKind = 'social';
  static summary =
    'Greets somebody arriving in the room with one line from an authored ' +
    'pool, once per arrival.';
  static claims: readonly EngagementSlot[] = ['attention'];

  static act(ctx: BrainContext): void {
    const lines = Array.isArray(ctx.config.lines)
      ? (ctx.config.lines as string[])
      : [];
    if (!lines.length) return;
    const target = ctx.perceived?.subject;
    const line = lines[Math.floor(Math.random() * lines.length)];
    if (typeof line === 'string') ctx.say(line, target);
  }
} satisfies BrainStatics;
