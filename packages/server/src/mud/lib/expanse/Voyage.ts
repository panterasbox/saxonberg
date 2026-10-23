/**
 * Voyage — a craft holding a course, as a SUSTAINED engagement whose one
 * beat is a WATCH.
 *
 * ## Held by the craft, not by a person
 *
 * The actor is the craft (a `Structure` or a boat). Logging out does not
 * end it, nobody's `cancel` reaches it (the craft is nobody's giver), and
 * a craft under way with nobody aboard still advances. `anchor` ends it
 * with `anchored`; arriving completes it.
 *
 * ## It holds no state
 *
 * The position is DERIVED from the craft's three persisted fields
 * (`Voyaging`), so this object only remembers what it has already told
 * people (runtime) and when it last beat. Re-establishing it after a
 * restart (`Voyaging` hosts' `onRestored`) loses nothing but the memory of
 * what was said.
 *
 * ## The beat — one watch, either frame (river review, W7)
 *
 * Every watch (the frame's `watchIntervalS`: four game hours at sea, ten
 * game minutes on a river) the craft's FRAME says what the watch brought
 * (`Frame.watchCraft`): what changed in the water since the last, how far
 * she came, and — when it has come — the stop (a node raised, a landing,
 * the ground, the sea). The voyage then tells it, adds the sky over the
 * deck, burns what drove her that far (`burnFor`; with none left she loses
 * way and the water has her), and at the stop places her and asks the
 * craft what it does to her (`onStop`).
 *
 * ⛔ **What it does NOT do (maritime R9): see or fix anything.** Noticing
 * a sail is the lookout's job (`watch horizon`, the `keeps-watch` brain)
 * and fixing the position is the navigator's (`measure bearing`). A beat
 * that announced them made both seats decorative — the engine doing the
 * player's job.
 *
 * Nothing is drawn. Crossings are exact; traffic is seeded.
 */

import type { SustainedEngagement, ScheduledEmission } from '../../api/scheduler';
import { SchedulerApi } from '../../api/scheduler';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { WorldClockApi } from '../../api/worldclock';
import { PersistableApi } from '../../api/persistable';
import { AppApi } from '../../api/app';
import { WeatherApi } from '../../api/weather';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { Engaged, EngagementSlot } from '../activity/Engaged';
import type { Positioned } from './Positioned';
import type { Voyaging } from './Voyaging';
import type { Moving } from './Moving';

export const VOYAGE_TYPE = 'expanse-voyage';

/** What a turn of the weather looks like from the deck. */
const SKY_CHANGE: Record<string, string> = {
  fog: 'Fog closes in.',
  rain: 'Rain comes on.',
  storm: 'It comes on to blow hard.',
  snow: 'Snow begins to fall.',
  overcast: 'The sky clouds over.',
  clear: 'The sky clears.',
};

declare module '@saxonberg/types' {
  interface AbortReasonRegistry {
    /** The craft let go its anchor and stopped where it was. */
    anchored: true;
  }
}

/** What a voyage's actor must be. */
export type Craft = Stuff & Engaged & Positioned & Moving & Voyaging;

function numSetting(key: string, fallback: number): number {
  try {
    const n = Number(AppApi.setting(key));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

export class Voyage implements SustainedEngagement {
  engagementId = '';
  readonly type = VOYAGE_TYPE;
  readonly actor: Craft;
  startedAt = 0;
  readonly slots = new Set<EngagementSlot>(['body']);
  /** Nothing interrupts a voyage but its own anchor. */
  readonly interruptibleBy = new Set<AbortReason>();
  /** Nobody's `cancel` reaches it; the envelope says so. */
  readonly cancelable = false;
  readonly emissions: readonly ScheduledEmission[];

  private lastBeatS: number;
  /** The sky over the deck at the last watch (runtime). */
  private lastSky: string | null = null;
  private beating = false;
  private ended = false;

  constructor(craft: Craft) {
    this.actor = craft;
    // A hair before now: a stop planned at the very moment the course was
    // set (she takes the ground where she lies) is inside the first watch.
    this.lastBeatS = WorldClockApi.getNow().rawValue() - 1e-3;
    // ⭐ The frame says how long a watch is: hours at sea, minutes on a
    // river, where a reach goes by and is told as she comes into it.
    const watchMs = (craft.peekFrame()?.watchIntervalS() ?? numSetting('expanse.watchGameHours', 4) * 3600) * 1000;
    this.emissions = [
      {
        intervalMs: watchMs,
        event: () => {
          void this.watch();
        },
      },
    ];
  }

  onStart(): void {
    this.startedAt = WorldClockApi.getNow().rawValue() * 1000;
  }

  onAbort(_reason: AbortReason): void {
    this.ended = true;
  }

  /** The craft — its destruction ends the voyage. */
  getHost(): Stuff | null {
    return this.actor;
  }

  /**
   * One watch. Public so a test (and only a test) can keep time by hand;
   * the scheduler is what calls it.
   */
  public async watch(): Promise<void> {
    if (this.ended || this.beating) return;
    this.beating = true;
    try {
      await this.beat();
    } catch (err) {
      console.warn(`Voyage: a watch on '${this.actor.getTemplatePath()}' failed:`, err);
    } finally {
      this.beating = false;
    }
  }

  private async beat(): Promise<void> {
    const craft = this.actor;
    const frame = await craft.liveFrame();
    if (frame === null) return;
    await frame.ready();
    const nowS = WorldClockApi.getNow().rawValue();
    const fromS = this.lastBeatS;
    const report = await frame.watchCraft(craft, fromS, nowS);
    this.lastBeatS = nowS;

    const aboard = await craft.aboard();
    const tell = (text: string, topic = 'sense.surroundings'): void => {
      for (const who of aboard) {
        if (!MixinApi.isSensor(who)) continue;
        MessageApi.scene(who).topic(topic).toSelf(Mml.compose`${Mml.fromMarkup(text)}`).send();
      }
    };

    // 1. The water tells you what changed, then the sky.
    for (const line of report.told) tell(line);
    const skyLine = await this.skyChange(await craft.watchRoom());
    if (skyLine) tell(skyLine);

    // 2. What drove her that far: with none left she loses way, and the
    // water has her — adrift with the set at sea, down the river on one.
    const course = craft.getCourse();
    if (report.distanceKm > 0 && (course?.speedKn ?? 0) > 0 && !(await craft.burnFor(report.distanceKm))) {
      tell('The fire dies in her firebox and the paddles stop. She loses way, and the water takes her.');
      await craft.steer({ speedKn: 0, bearingDeg: course?.bearingDeg ?? 0, direction: 'downstream' });
      return;
    }

    // 3. The stop, when it has come — or, with none planned and the
    // trajectory running out (a bare bearing's horizon), the course planned on.
    const stop = report.stop;
    const traj = craft.getTrajectory();
    // Planned on a watch EARLY, from the trajectory's own end: no read
    // between the horizon and the watch finds her parked at the end of it.
    const watchS = frame.watchIntervalS();
    if (stop === null && traj !== null && course !== null && nowS + watchS >= traj.endsAtS() &&
        !traj.getMarks().some((m) => m.name === 'stop' || m.name === 'arrived')) {
      await craft.extendCourse(traj.endsAtS());
    }
    if (stop !== null) {
      craft.placeAt(stop.at, nowS);
      const words = await craft.onStop(stop);
      tell(words, stop.reason === 'arrived' || stop.reason === 'landing' ? 'act.move' : 'sense.surroundings');
      this.persist();
      this.ended = true;
      SchedulerApi.complete(this);
      return;
    }
    this.persist();
  }

  /**
   * The sky over the deck against the last watch's, in words — or `null`
   * when it is the same (or this is the first look, which only notes it).
   */
  private async skyChange(deck: Stuff | null): Promise<string | null> {
    if (deck === null || !MixinApi.isContainer(deck)) return null;
    let now: string;
    try {
      now = (await WeatherApi.skyReadFor(deck)).currentType;
    } catch {
      return null;
    }
    const was = this.lastSky;
    this.lastSky = now;
    if (was === null || was === now) return null;
    if (was === 'fog') return now === 'clear' ? 'The fog lifts, and the sky is clear.' : 'The fog thins and lifts.';
    return SKY_CHANGE[now] ?? null;
  }

  private persist(): void {
    if (!MixinApi.isPersistable(this.actor)) return;
    void PersistableApi.capture(this.actor).catch((err) =>
      console.warn('Voyage: capture failed:', err),
    );
  }
}
