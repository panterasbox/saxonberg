/**
 * `wanders` brain — on a cadence, step through a random available exit
 * of the host's current room. Claims `body`; **requires `attention`
 * free**, so it yields a tick while the NPC is engaged (e.g. greeting an
 * arrival). Presence-gated by default.
 *
 * config: `{ avoid?: string[] }` — directions to skip.
 */

import { MixinApi } from '../../api/mixin';
import { LocomotionApi } from '../../api/locomotion';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Containable } from '../spatial/Containable';
import type { Exitable } from '../boundary/Exitable';
import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';

export const brain = class {
  static label = 'wanders';
  static claims: readonly EngagementSlot[] = ['body'];
  static requiresFree: readonly EngagementSlot[] = ['attention'];

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isMobile(host)) return;
    const mob = host as Stuff & Mobile & Containable;
    const room = mob.getContainer();
    if (!room || !MixinApi.isExitable(room)) return;
    const exits = [...(room as Stuff & Exitable).getExits().values()];
    if (!exits.length) return;
    const avoid = Array.isArray(ctx.config.avoid)
      ? (ctx.config.avoid as string[])
      : [];
    const candidates = exits.filter((e) => !avoid.includes(e.getDirection()));
    const pool = candidates.length ? candidates : exits;
    const exit = pool[Math.floor(Math.random() * pool.length)];
    if (!exit) return;
    try {
      await LocomotionApi.traverseWithDefault(mob, exit);
    } catch {
      // Exit blocked / mode-gated — hold position, try again next tick.
    }
  }
} satisfies BrainStatics;
