/**
 * `fishes` brain — **the fisher fishes on his own cadence** (fishing D16).
 *
 * Each beat, if no `fishing` engagement is live on him, he starts one
 * with the rod in his own inventory and no bait: the same engagement a
 * player runs, drawing from the same record through the same
 * arithmetic, and when the actor is not a player the landing releases
 * the fish at once and speaks one line. Bare-hook take is honest and
 * small, so he is a reader with a rod, not a supplier — and a reach a
 * net has emptied is a reach he sits at all day with nothing on the
 * line, which is exactly what he will tell you.
 *
 * config: `{ shore?: <template path of a Shore> }` — the water he fishes;
 * absent, his room's Locality reach.
 */

import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import Waters, { WATERS_PATH } from '../idea/Waters';
import { FishingEngagement, FISHING_TYPE } from '../lib/FishingEngagement';
import Rod from '../thing/Rod';

export const brain = class {
  static label = 'fishes';
  static requiresFree: readonly EngagementSlot[] = ['hands'];
  /** Unwatched: the record is drawn down whether or not anybody is on the bank. */
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (host.isDestroyed() || !MixinApi.isEngaged(host) || !MixinApi.isContainer(host)) return;
    if (host.getEngagementByType(FISHING_TYPE)) return;
    if (!MixinApi.isContainable(host)) return;
    const room = host.getContainer();
    if (!room) return;
    const rod = [...host.getContents()].find((t) => t instanceof Rod);
    if (!rod) return;

    const waters = await StuffApi.singleton<Waters>(WATERS_PATH);
    const reach = (await shoreReach(ctx.config)) ?? (await waters.reachAt(room));
    if (reach === null) return;
    const registry = await waters.registry();
    if (registry === null) return;
    SchedulerApi.start(
      new FishingEngagement({
        actor: host,
        rod,
        bait: null,
        reachRef: reach,
        room,
        registry,
        feedFactors: (r, nowS) => waters.feedFactorsAt(r, nowS),
      }),
    );
  }
} satisfies BrainStatics;

/** The configured Shore's reach, when the row is resident. */
async function shoreReach(config: Record<string, unknown>): Promise<string | null> {
  const path = typeof config.shore === 'string' ? config.shore : '';
  if (!path) return null;
  try {
    const shore = (await StuffApi.singleton<Stuff>(path)) as unknown as { getReachRef?: () => string } | null;
    const ref = shore?.getReachRef?.() ?? '';
    return ref === '' ? null : ref;
  } catch {
    return null;
  }
}
