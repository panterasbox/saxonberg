/**
 * `shifts` brain — time-of-day / day-of-week **presence**. On a cadence,
 * reads the game clock (`WorldClockApi` + `DefaultCalendar`), finds the
 * matching schedule entry, and migrates the NPC to the location its
 * current shift state implies:
 *
 * - `on-shift`     → `behindBar` (working)
 * - `off-shift-day` → `railStool` (present as a patron — the warmth tell)
 * - `fully-off`     → `offstage` (a holding location, out of play)
 *
 * Migration is a `teleport` (locations need no diegetic exit between
 * them). **Not** presence-gated: it must run unwatched so off-stage cast
 * are moved out before any player arrives. This is presence/migration
 * only — the in-room shift-*change* ritual (count-out, reconcile) is a
 * later wave.
 *
 * config: `{ schedule: Array<{ days: number[], hours: [number, number],
 *   state: 'on-shift'|'off-shift-day'|'fully-off' }>, behindBar: string,
 *   railStool: string, offstage: string }` — location paths are
 *   templatePaths resolved live.
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { DefaultCalendar } from '../time/DefaultCalendar';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { BrainContext, BrainStatics } from './brain';

interface ShiftEntry {
  days?: number[];
  hours?: [number, number];
  state?: string;
}

export const brain = class {
  static label = 'shifts';
  static presenceGated = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isMobile(host)) return;
    const mob = host as Stuff & Mobile & Containable;
    const schedule = Array.isArray(ctx.config.schedule)
      ? (ctx.config.schedule as ShiftEntry[])
      : [];
    if (!schedule.length) return;

    const date = DefaultCalendar.singleton().decompose(WorldClockApi.getNow());
    const entry = schedule.find(
      (e) =>
        Array.isArray(e.days) &&
        e.days.includes(date.weekday) &&
        Array.isArray(e.hours) &&
        date.hour >= e.hours[0] &&
        date.hour < e.hours[1]
    );
    const state = entry?.state ?? 'fully-off';

    const targetPath =
      state === 'on-shift'
        ? ctx.config.behindBar
        : state === 'off-shift-day'
          ? ctx.config.railStool
          : ctx.config.offstage;
    if (typeof targetPath !== 'string') return;

    // Resolve (materializing) the destination singleton — the bar is
    // already live; the offstage holding room is created on demand.
    const dest = await StuffApi.singletonOrClone(targetPath);
    if (!MixinApi.isContainer(dest)) return;
    const current = mob.getContainer();
    if (current && current.stuffId === dest.stuffId) return; // already there
    mob.teleport(dest as Stuff & Container);
  }
} satisfies BrainStatics;
