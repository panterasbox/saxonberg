/**
 * `reacts` brain — witness trigger on `emote`: when the NPC perceives
 * another character's emote, respond (an emote back, or a spoken line),
 * directed at the actor. Claims `attention` briefly.
 *
 * The acting subject is recovered by the framework from the perceived
 * frame (`meta.commandId → ReactionApi.actInfo`); reactions only fire
 * when the subject resolves and isn't the host. Wave 1 picks a rule at
 * random — matching on the witnessed emote verb (`to`) is reserved for
 * when the verb is carried structurally on the frame.
 *
 * config: `{ reactions: Array<{ to?: string, emote?: string, respond?: string }> }`
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';

interface ReactionRule {
  to?: string;
  emote?: string;
  respond?: string;
}

export const brain = class {
  static label = 'reacts';
  static claims: readonly EngagementSlot[] = ['attention'];

  static act(ctx: BrainContext): void | Promise<void> {
    const rules = Array.isArray(ctx.config.reactions)
      ? (ctx.config.reactions as ReactionRule[])
      : [];
    if (!rules.length) return;
    const target = ctx.perceived?.subject;
    const rule = rules[Math.floor(Math.random() * rules.length)];
    if (!rule) return;
    if (typeof rule.emote === 'string') return ctx.emote(rule.emote, target);
    if (typeof rule.respond === 'string') ctx.say(rule.respond, target);
  }
} satisfies BrainStatics;
