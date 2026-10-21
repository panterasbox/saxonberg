/**
 * surfaces — ⭐ **an air-breather that lives in the water** (underwater
 * D21): a frog, an otter, a seal. It goes down and stays a while — as
 * long as its breath lets it — and when its body says so it comes up.
 * Nothing about it is scripted: how long it stays is the breath store ÷
 * the burn, slowed by what its skin takes from the water.
 *
 * One beat (the `wary` shape): under the water with the urge on it, it
 * kicks for the surface (`pressing` — a body need); at the surface, its
 * breath back and a while since the last dive, it goes down again
 * (`wanted`). Config: `restS` (game-seconds it lies at the surface
 * between dives, default 120); `dives: false` keeps it at the top.
 */

import { MixinApi } from '../../api/mixin';
import { BiomeApi } from '../../api/biome';
import { LocomotionApi } from '../../api/locomotion';
import { WorldClockApi } from '../../api/worldclock';
import type { Stuff } from '../stuff/Stuff';
import type Exit from '../boundary/Exit';
import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import type { TaskKind } from './Urgency';
import { Urgency } from './Urgency';

/** The urge at which it turns for the surface (0..1). */
const SURFACE_AT_URGE = 0.5;

/** Where it is: under the surface, at it, or not in water at all. */
function whereIn(host: Stuff): 'under' | 'surface' | 'dry' {
  const read = BiomeApi.mediumFor(host);
  if (!read.immersed || read.tag !== 'water') return 'dry';
  return read.atSurface ? 'surface' : 'under';
}

function nowS(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}

export const brain = class Surfaces {
  static label = 'surfaces';
  static kind: TaskKind = 'body';
  static summary =
    'An air-breather that lives in the water: it dives and stays as long ' +
    'as its breath lets it, then comes up for air.';
  static claims: readonly EngagementSlot[] = ['attention'];
  static presenceGated = false;
  static ambient = false;

  static urgency(ctx: BrainContext): Urgency {
    const host = ctx.host;
    if (!MixinApi.isRespiration(host) || !MixinApi.isMobile(host)) return new Urgency('idle');
    const where = whereIn(host);
    if (where === 'under') {
      if (host.isInDrowningResponse() || host.getBreathUrge() >= SURFACE_AT_URGE) {
        return new Urgency('pressing', 'kicks for the surface');
      }
      return new Urgency('idle');
    }
    if (where !== 'surface' || ctx.config.dives === false) return new Urgency('idle');
    const restS = typeof ctx.config.restS === 'number' ? ctx.config.restS : 120;
    const last = typeof ctx.state.upAtS === 'number' ? ctx.state.upAtS : null;
    if (last === null) {
      ctx.state.upAtS = nowS();
      return new Urgency('idle');
    }
    if (nowS() - last < restS || host.getBreathUrge() > 0.05) return new Urgency('idle');
    return new Urgency('wanted', 'gulps air and slips under');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isMobile(host) || !MixinApi.isContainable(host)) return;
    const room = host.getContainer();
    if (room === null || !MixinApi.isExitable(room)) return;
    const where = whereIn(host);
    if (where === 'dry') return;
    const up = where === 'under';
    if (!up && MixinApi.isWaterPlace(room)) await room.ensureColumnExits();
    const exit = room.getExit(up ? 'up' : 'down') as Exit | undefined;
    if (!exit) return;
    await LocomotionApi.preloadActorAnatomy(host);
    const mode = await LocomotionApi.loadMode('swim');
    const guard = await host.traverse(exit, mode.getName());
    if (guard.ok && up && whereIn(host) === 'surface') ctx.state.upAtS = nowS();
  }
} satisfies BrainStatics;
