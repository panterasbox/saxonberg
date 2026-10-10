/**
 * HorizonWatch — keeping a watch: `watch horizon`, a SUSTAINED engagement
 * on the watcher's attention (maritime R6).
 *
 * ⭐⭐ **The engine does not do the lookout's job; it gives the lookout a
 * job to do.** Nothing on the horizon is ever pushed at anybody. Somebody
 * has to be watching, and a ship with nobody watching is blind by its own
 * choice — so noticing a sail is an act a person (or a hired lookout,
 * the `keeps-watch` brain) takes on, holds, and can be distracted from.
 *
 * Each beat (`perception.watchGameMinutes`, default five game minutes)
 * recomputes the watcher's horizon (`PerceptionApi.horizonFor` — from
 * THEIR eye, so the masthead sees further) and says only what CHANGED:
 * what came into view, and what dropped out of it. Starting the watch
 * reports what is in view now — the first look.
 *
 * It keeps the beat's news for whoever is reading it on the watcher's
 * behalf: the lookout brain drains it with {@link takeNews} and calls it
 * out to the deck. A player's watch is told to the player.
 *
 * Holds no persisted state; a restart ends the watch, as standing down
 * would. `cancel` ends it.
 */

import type { AbortReason } from '@saxonberg/types';
import type { SustainedEngagement, ScheduledEmission } from '../../api/scheduler';
import { PerceptionApi } from '../../api/perception';
import type { HorizonView } from '../../api/perception';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import type { Stuff } from '../stuff/Stuff';
import type { Engaged, EngagementSlot } from '../activity/Engaged';

/** The activity type key registered with the scheduler. */
export const HORIZON_WATCH_TYPE = 'horizon-watch';

/** One change the watch noticed. */
export interface HorizonNews {
  /** `sighted` came into view; `lost` dropped out of it. */
  change: 'sighted' | 'lost';
  /** What it is, in words (`the light on Gannet Rock`, `a fishing boat`). */
  name: string;
  /** Degrees true from the watcher; `null` ashore. */
  bearingDeg: number | null;
  /** Nautical miles; `null` ashore. */
  rangeNm: number | null;
}

/** At most this many undrained items are kept — a lookout nobody reads. */
const NEWS_CAP = 20;

function watchMinutes(): number {
  try {
    const n = Number(AppApi.setting('perception.watchGameMinutes'));
    return Number.isFinite(n) && n > 0 ? n : 5;
  } catch {
    return 5;
  }
}

export class HorizonWatch implements SustainedEngagement {
  engagementId = '';
  readonly type = HORIZON_WATCH_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots = new Set<EngagementSlot>(['attention']);
  readonly interruptibleBy = new Set<AbortReason>();
  readonly cancelable = true;
  readonly emissions: readonly ScheduledEmission[];

  /** What was in view at the last beat: key → news shape. */
  private inView = new Map<string, HorizonNews>();
  private news: HorizonNews[] = [];
  private ended = false;
  private beating = false;

  constructor(watcher: Stuff & Engaged) {
    this.actor = watcher;
    this.emissions = [
      {
        intervalMs: watchMinutes() * 60 * 1000,
        event: () => {
          void this.watch();
        },
      },
    ];
  }

  onStart(): void {
    this.startedAt = Date.now();
    void this.watch();
  }

  onAbort(_reason: AbortReason): void {
    this.ended = true;
  }

  /** The watcher — their destruction ends the watch. */
  getHost(): Stuff | null {
    return this.actor;
  }

  /** The news since the last call, oldest first; drains it. */
  public takeNews(): HorizonNews[] {
    const out = this.news;
    this.news = [];
    return out;
  }

  /**
   * One look. Public so a test (and only a test) can keep time by hand;
   * the scheduler is what calls it.
   */
  public async watch(): Promise<void> {
    if (this.ended || this.beating || this.actor.isDestroyed()) return;
    this.beating = true;
    try {
      const view = await PerceptionApi.horizonFor(this.actor);
      if (this.ended || this.actor.isDestroyed()) return;
      this.report(this.diff(view));
    } catch (err) {
      console.warn(`HorizonWatch: a look by '${this.actor.stuffId}' failed:`, err);
    } finally {
      this.beating = false;
    }
  }

  /** What came into view and what went out of it, against the last look. */
  private diff(view: HorizonView): HorizonNews[] {
    const now = new Map<string, HorizonNews>();
    for (const t of view.things) {
      now.set(`stuff:${t.stuff.stuffId}`, {
        change: 'sighted',
        name: t.stuff.getPresentation(),
        bearingDeg: t.bearingDeg,
        rangeNm: t.rangeNm,
      });
    }
    for (const p of view.traffic) {
      // Seeded traffic has no identity: the same passer is the same name
      // on the same point of the compass.
      now.set(`traffic:${p.name}:${Math.round(p.bearingDeg / 45) % 8}`, {
        change: 'sighted',
        name: p.name,
        bearingDeg: p.bearingDeg,
        rangeNm: p.rangeNm,
      });
    }
    const out: HorizonNews[] = [];
    for (const [k, n] of now) if (!this.inView.has(k)) out.push(n);
    for (const [k, n] of this.inView) if (!now.has(k)) out.push({ ...n, change: 'lost' });
    this.inView = now;
    return out;
  }

  private report(changes: HorizonNews[]): void {
    if (changes.length === 0) return;
    this.news.push(...changes);
    if (this.news.length > NEWS_CAP) this.news = this.news.slice(-NEWS_CAP);
    if (!MixinApi.isSensor(this.actor)) return;
    for (const n of changes) {
      const where = n.bearingDeg === null || n.rangeNm === null
        ? ''
        : `, ${PerceptionApi.glance(n.bearingDeg, n.rangeNm)}`;
      const line = n.change === 'sighted'
        ? `You make out ${n.name}${where}.`
        : `${n.name.charAt(0).toUpperCase()}${n.name.slice(1)} is lost to sight.`;
      MessageApi.scene(this.actor).topic('sense.surroundings').toSelf(Mml.compose`${line}`).send();
    }
  }
}
