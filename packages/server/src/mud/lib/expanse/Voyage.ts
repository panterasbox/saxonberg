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
 * ## The beat
 *
 * Every watch (`expanse.watchGameHours`, default four game hours):
 *
 * 1. **the water tells you what CHANGED** — at every band boundary the
 *    track crossed since the last watch, in order, the field just before
 *    against the field just after (`Expanse.changesAcross`: the sea
 *    getting up, a current taking her, the water shoaling), and the sky
 *    over the deck against the last watch's (fog closing in). Never a
 *    position, never authored, and a crossing that changes nothing
 *    perceptible says nothing (maritime R9);
 * 2. **arrival** — a course set for a node arrives when the track passes
 *    within the node's radius (`ExpanseNode.getArrivalNm`); a bare bearing
 *    never arrives;
 * 3. **neglect** — the gear on deck wears by the water's hardness and
 *    roughness, at a quarter of that when the watch is manned. Nothing
 *    new persists: the gear remembers.
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
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { PersistableApi } from '../../api/persistable';
import { AppApi } from '../../api/app';
import { WeatherApi } from '../../api/weather';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { Engaged, EngagementSlot } from '../activity/Engaged';
import { Expanse } from './Expanse';
import type { GeoPosition } from './GeoPosition';
import type { Positioned } from './Positioned';
import type { Voyaging } from './Voyaging';

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
export type Craft = Stuff & Engaged & Positioned & Voyaging;

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
    this.lastBeatS = WorldClockApi.getNow().rawValue();
    const watchH = numSetting('expanse.watchGameHours', 4);
    this.emissions = [
      {
        intervalMs: watchH * 3600 * 1000,
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
    const nowS = WorldClockApi.getNow().rawValue();
    const expanse = await this.expanse();
    if (expanse === null) return;
    await expanse.bands();
    const prev = craft.positionAtS(this.lastBeatS);
    const pos = craft.positionAtS(nowS);
    this.lastBeatS = nowS;
    if (prev === null || pos === null) return;

    const aboard = await craft.aboard();
    const deck = await craft.watchRoom();
    const manned = isManned(deck);
    const tell = (text: string, topic = 'sense.surroundings'): void => {
      for (const who of aboard) {
        if (!MixinApi.isSensor(who)) continue;
        MessageApi.scene(who).topic(topic).toSelf(Mml.compose`${Mml.fromMarkup(text)}`).send();
      }
    };

    // 1. The water tells you what changed — every boundary, in order,
    // then the sky.
    for (const line of await this.boundaryReport(expanse, prev, pos, deck)) tell(line);
    const skyLine = await this.skyChange(deck);
    if (skyLine) tell(skyLine);

    // 2. Arrival.
    const course = craft.getCourse();
    if (course?.node) {
      const node = await expanse.node(course.node);
      const at = node?.getExpansePosition() ?? null;
      // ⭐ `isAt(pos)` first: the drift STOPS on the radius's edge
      // (`Voyaging.positionAtS`), measured by the node's own metric, and
      // the segment's closest approach — scaled at a different mid-latitude
      // — can read a hair over it there, missing the arrival for a watch.
      if (node && at && (node.isAt(pos) || closestApproachNm(prev, pos, at) <= node.getArrivalNm())) {
        craft.placeAt(at, nowS);
        this.persist();
        tell(`You raise ${node.getName()} and come up to it.`, 'act.move');
        this.ended = true;
        SchedulerApi.complete(this);
        return;
      }
    }

    // 3. Neglect — the gear remembers.
    const field = await expanse.fieldAt(pos);
    const hardness = field.band?.getGearHardness() ?? 0;
    const rough = await expanse.roughnessAt(pos, deck);
    const wear = hardness * rough * numSetting('expanse.neglectWearPerWatch', 0.02) * (manned ? 0.25 : 1);
    if (wear > 0) {
      for (const g of await craft.gearAboard()) {
        if (MixinApi.isDurable(g)) g.wear(wear);
      }
    }
    this.persist();
  }

  /**
   * What each boundary the straight track crossed CHANGED, in order — the
   * field just before it against just after. ⛔ No hazard is announced:
   * seeing the race ahead is the lookout's job, and the water says what it
   * does to her when she is in it.
   */
  private async boundaryReport(
    expanse: Expanse,
    prev: GeoPosition,
    pos: GeoPosition,
    deck: Stuff | null,
  ): Promise<string[]> {
    const ts: number[] = [];
    for (const b of await expanse.bands()) {
      for (const c of b.crossings(prev, pos)) ts.push(c.t);
    }
    ts.sort((a, b) => a - b);
    const lines: string[] = [];
    for (const t of ts) {
      const before = prev.lerp(pos, Math.max(0, t - 1e-4));
      const after = prev.lerp(pos, Math.min(1, t + 1e-4));
      lines.push(...(await expanse.changesAcross(before, after, deck)));
    }
    return lines;
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

  private async expanse(): Promise<Expanse | null> {
    const path = this.actor.getExpanse();
    if (!path) return null;
    try {
      const s = await StuffApi.singleton<Stuff>(path);
      return s instanceof Expanse ? s : null;
    } catch {
      return null;
    }
  }

  private persist(): void {
    if (!MixinApi.isPersistable(this.actor)) return;
    void PersistableApi.capture(this.actor).catch((err) =>
      console.warn('Voyage: capture failed:', err),
    );
  }
}

/** A watch is manned when a living, conscious body stands in it. */
function isManned(deck: Stuff | null): boolean {
  if (deck === null || !MixinApi.isContainer(deck)) return false;
  return deck.getContents().some((x) => {
    if (!MixinApi.isOrganism(x) || !x.isAlive()) return false;
    return !MixinApi.isVitals(x) || x.getConsciousness() === 'conscious';
  });
}

/** The nearest the segment `a → b` comes to `p`, nautical miles. */
function closestApproachNm(a: GeoPosition, b: GeoPosition, p: GeoPosition): number {
  const ab = a.offsetTo(b);
  const ap = a.offsetTo(p);
  const len2 = ab.northNm ** 2 + ab.eastNm ** 2;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (ap.northNm * ab.northNm + ap.eastNm * ab.eastNm) / len2));
  return Math.hypot(ap.northNm - t * ab.northNm, ap.eastNm - t * ab.eastNm);
}

