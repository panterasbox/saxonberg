/**
 * `patrols` brain — like `wanders`, but follows an ordered `route` of
 * directions, cycling through it (the step index lives in per-host
 * runtime `state`). Claims `body`; requires `attention` free.
 * Presence-gated by default.
 *
 * config: `{ route: string[] }` — directions in patrol order. (Wave 1:
 * directions; room-path-ref routing is a later refinement.)
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
  static label = 'patrols';
  static claims: readonly EngagementSlot[] = ['body'];
  static requiresFree: readonly EngagementSlot[] = ['attention'];

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isMobile(host)) return;
    const mob = host as Stuff & Mobile & Containable;
    const route = Array.isArray(ctx.config.route)
      ? (ctx.config.route as string[])
      : [];
    if (!route.length) return;
    const room = mob.getContainer();
    if (!room || !MixinApi.isExitable(room)) return;

    const idx =
      typeof ctx.state.index === 'number' ? ctx.state.index : 0;
    const dir = route[idx % route.length];
    ctx.state.index = (idx + 1) % route.length;
    if (typeof dir !== 'string') return;

    const exit = (room as Stuff & Exitable).getExits().get(dir);
    if (!exit) return;
    try {
      await LocomotionApi.traverseWithDefault(mob, exit);
    } catch {
      // Exit blocked — hold this step; advance index next tick.
    }
  }
} satisfies BrainStatics;
