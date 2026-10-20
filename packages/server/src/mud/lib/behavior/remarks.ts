/**
 * `remarks` brain — ⭐ **somebody notices what you have on** (cleanliness
 * D29): a `greets`-shaped arrival brain whose lines are keyed by the
 * arriver's outer torso garment. A banker's coat on the wharf is remarked
 * on; a fisherman's smock is not. Data on the row:
 *
 * ```yaml
 * config:
 *   lines:
 *     - { outer: [coat, frock], say: "Lost your way, sir? The bank's up the hill." }
 * ```
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import type { TaskKind } from './Urgency';
import { MixinApi } from '../../api/mixin';

interface Remark {
  outer: string[];
  say: string;
}

export const brain = class {
  static label = 'remarks';
  static kind: TaskKind = 'social';
  static summary =
    'Remarks on what somebody arriving is wearing, from lines keyed by ' +
    'their outer garment.';
  static claims: readonly EngagementSlot[] = ['attention'];

  static act(ctx: BrainContext): void {
    const who = ctx.perceived?.subject ?? null;
    if (!who || !MixinApi.isAttired(who)) return;
    const trunk = who.trunkSite();
    const top = trunk ? who.outermostAt(trunk) : null;
    if (!top || !MixinApi.isPerceptible(top)) return;
    const lines = Array.isArray(ctx.config.lines) ? (ctx.config.lines as Remark[]) : [];
    for (const l of lines) {
      if ((l.outer ?? []).some((w) => top.hasKeyword(String(w).toLowerCase()))) {
        ctx.say(l.say, who);
        return;
      }
    }
  }
} satisfies BrainStatics;
