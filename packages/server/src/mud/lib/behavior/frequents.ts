/**
 * `frequents` brain — a regular: somebody who goes to a place at set hours,
 * takes a seat if there is one, and leaves when the hours are up.
 *
 * ⭐ It is the off-shift half of a working cast (owner, 2026-11-01): the
 * bar has one bartender working and, most evenings, one more of the crew
 * in for a drink — on a stool, not standing around the rail. A rota is
 * just which nights each of them frequents; busy hours are a second
 * window. Nothing here knows it is a bar.
 *
 * Config:
 * - `place` — the templatePath of the place frequented.
 * - `visits` — `{ days, hours }` windows, the roster's own shape and
 *   calendar (weekday 0-based, hours half-open `[start, end)`).
 * - `sit` — optional: a keyword of the seats to take (`stool`). A free one
 *   is picked by occupancy and taken by id, so two regulars never contend
 *   for one word.
 * - `home` — optional: where to go when the visit ends. Absent: back to
 *   wherever it set out from.
 *
 * ⚠ It never works a shift's hours: an employed host that is on shift is
 * left alone (the roster tick owns where a working hand stands).
 *
 * Moving: it WALKS (`ctx.goTo` — one visible step a beat). Coming out of,
 * or going back to, a house's offstage is staged the way the roster tick
 * stages a shift (`BrainMoves.goTo`), because offstage is outside the
 * fiction and no route reaches it.
 */

import { MixinApi } from '../../api/mixin';
import { WorldClockApi } from '../../api/worldclock';
import { DefaultCalendar } from '../time/DefaultCalendar';
import { Postures } from '../slot/Postured';
import type { Stuff } from '../stuff/Stuff';
import type { ShiftEntry } from '../employment/Roster';
import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import { Urgency } from './Urgency';
import type { TaskKind } from './Urgency';

/** What this beat calls for — read once, by both `urgency` and `act`. */
type Wants = 'go' | 'sit' | 'leave' | null;

export const brain = class {
  static label = 'frequents';
  static kind: TaskKind = 'social';
  static summary =
    'Goes to a place at set hours as a regular, takes a free seat, and leaves when the hours are up.';
  static claims: readonly EngagementSlot[] = ['body'];
  /**
   * ⚠ Runs unwatched: a regular sets out from where nobody is looking (the
   * house's offstage, a back office) — gated on an audience, it would only
   * ever leave a room somebody was already watching, i.e. never come in.
   * The `eats` / `homes` / `restocks` precedent.
   */
  static presenceGated = false;
  static requiresFree: readonly EngagementSlot[] = ['attention'];

  static urgency(ctx: BrainContext): Urgency {
    switch (brain.wants(ctx)) {
      case 'go':
        return new Urgency('wanted', 'heads out for a drink');
      case 'sit':
        return new Urgency('wanted', 'looks for somewhere to sit');
      case 'leave':
        return new Urgency('wanted', 'settles up and heads out');
      default:
        return new Urgency('idle');
    }
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host) || !MixinApi.isContainable(host)) return;
    const place = String(ctx.config.place ?? '');
    switch (brain.wants(ctx)) {
      case 'go': {
        const from = host.getContainer()?.getTemplatePath();
        if (from && ctx.state.from === undefined) ctx.state.from = from;
        ctx.state.visiting = true;
        await ctx.goTo(place);
        return;
      }
      case 'sit': {
        const seat = brain.freeSeat(host, String(ctx.config.sit));
        if (seat) await host.forceCommand(`sit #${seat.stuffId}`);
        return;
      }
      case 'leave': {
        if (MixinApi.isPosed(host) && host.currentRest()) await host.forceCommand('stand');
        const home = String(ctx.config.home ?? ctx.state.from ?? '');
        ctx.state.visiting = false;
        delete ctx.state.from;
        if (home) await ctx.goTo(home);
        return;
      }
      default:
        return;
    }
  }

  /** What the host wants this beat, if anything. */
  static wants(ctx: BrainContext): Wants {
    const host = ctx.host;
    const place = typeof ctx.config.place === 'string' ? ctx.config.place : '';
    if (!place || !MixinApi.isContainable(host)) return null;
    if (MixinApi.isEmployed(host) && host.shiftState() === 'on-shift') return null;
    const here = host.getContainer()?.getTemplatePath() === place;
    if (brain.inVisit(ctx.config.visits)) {
      if (!here) return 'go';
      const sit = ctx.config.sit;
      const seated = MixinApi.isPosed(host) && host.currentRest() !== null;
      if (typeof sit === 'string' && !seated && brain.freeSeat(host, sit)) return 'sit';
      return null;
    }
    // Only a visit it MADE ends here — a regular who happens to be in the
    // place for another reason is not sent home by this brain.
    return here && ctx.state.visiting === true ? 'leave' : null;
  }

  /** Is the clock inside one of the visit windows (the roster's calendar)? */
  static inVisit(raw: unknown): boolean {
    if (!Array.isArray(raw)) return false;
    const date = DefaultCalendar.singleton().decompose(WorldClockApi.getNow());
    return (raw as ShiftEntry[]).some(
      (e) =>
        Array.isArray(e.days) &&
        e.days.includes(date.weekday) &&
        Array.isArray(e.hours) &&
        date.hour >= e.hours[0] &&
        date.hour < e.hours[1],
    );
  }

  /** A seat in the host's room answering to `keyword` with a free posture slot. */
  static freeSeat(host: Stuff, keyword: string): Stuff | null {
    if (!MixinApi.isContainable(host) || !MixinApi.isSlottable(host)) return null;
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return null;
    for (const x of room.getContents()) {
      if (!MixinApi.isPostured(x) || !MixinApi.isPerceptible(x)) continue;
      if (!x.getKeywords().includes(keyword)) continue;
      // ⚠ A SEATING slot that is free — not just any open slot: a stool
      // has others, and "any open slot" sent a regular to sit on an
      // occupied stool ("a bar stool is occupied").
      if (x.getSlotsAcceptingPosture(Postures.Sit).some((slot) => !x.isSlotFull(slot))) return x;
    }
    return null;
  }
} satisfies BrainStatics;
