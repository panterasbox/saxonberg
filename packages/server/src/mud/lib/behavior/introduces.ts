/**
 * `introduces` brain — witness trigger on `arrival`: when a new person
 * enters the host's room, the host introduces itself (so the newcomer
 * learns its name), unless they already know it. The intrinsic
 * auto-introduce for social NPCs — a bartender who names themselves to
 * every newcomer — and the NPC half of the auto-introduce feature
 * (players opt in via the `social.autoIntroduce` setting instead; NPCs
 * have no settings store, so it rides their behavior data). A reserved /
 * secretive NPC simply omits this brain.
 *
 * Real recognition, not a name bypass: it routes through
 * `SoulMixin.introduceSelf` → `RecognitionApi.learnIdentity`, the same
 * path the `introduce` verb uses. Claims `attention` (held briefly via a
 * BehaviorBeat) like `greets`.
 *
 * config: none.
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import { MixinApi } from '../../api/mixin';
import { RecognitionApi } from '../../api/recognition';

export const brain = class {
  static label = 'introduces';
  static claims: readonly EngagementSlot[] = ['attention'];

  static act(ctx: BrainContext): void {
    const arriver = ctx.perceived?.subject;
    if (!arriver) return;
    const host = ctx.host;
    if (!MixinApi.isSoul(host)) return;
    // Don't re-introduce to someone who already knows us.
    if (RecognitionApi.recognizes(arriver, host)) return;
    host.introduceSelf();
  }
} satisfies BrainStatics;
