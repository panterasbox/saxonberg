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
 * 1. **the water tells you** — every band boundary the track crossed since
 *    the last watch is reported in order, described by the medium (the
 *    sea state), never by a position;
 * 2. **arrival** — a course set for a node arrives when the track passes
 *    within `expanse.arrivalNm` of it; a bare bearing never arrives;
 * 3. **a landmark is a free fix** — a fixed tall thing in sight corrects
 *    the reckoning;
 * 4. **sightings** — craft and seeded traffic in range, from the
 *    lookout's height if the seat is manned;
 * 5. **neglect** — the gear on deck wears by the water's hardness and
 *    roughness, at a quarter of that when the watch is manned. Nothing
 *    new persists: the gear remembers.
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
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { Engaged, EngagementSlot } from '../activity/Engaged';
import { Template } from '../stuff/Template';
import { Expanse } from './Expanse';
import type { GeoPosition } from './GeoPosition';
import type { Positioned } from './Positioned';
import type { Voyaging } from './Voyaging';

export const VOYAGE_TYPE = 'expanse-voyage';

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

/** `070` — a bearing as a navigator writes it. */
function bearingWords(deg: number): string {
  return `${String(Math.round(((deg % 360) + 360) % 360)).padStart(3, '0')}`;
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
  private beating = false;
  private ended = false;
  /** Contacts already reported this voyage (runtime). */
  private readonly told = new Set<string>();
  /** Landmarks already fixed from this voyage (runtime). */
  private readonly fixedFrom = new Set<string>();

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

    // 1. The water tells you — every boundary crossed, in order.
    for (const line of await this.boundaryReport(expanse, prev, pos, deck, manned)) tell(line);

    // 2. Arrival.
    const course = craft.getCourse();
    if (course?.node) {
      const node = await expanse.node(course.node);
      const at = node?.getExpansePosition() ?? null;
      if (node && at && closestApproachNm(prev, pos, at) <= numSetting('expanse.arrivalNm', 1)) {
        craft.placeAt(at, nowS);
        this.persist();
        tell(`You raise ${node.getName()} and come up to it.`, 'act.move');
        this.ended = true;
        SchedulerApi.complete(this);
        return;
      }
    }

    // 3 & 4. What is in sight — from the lookout's height if the seat is manned.
    const observer = lookoutAmong(craft, aboard) ?? aboard[0] ?? craft;
    const hour = Math.floor(nowS / 3600);
    const contacts = await expanse.contactsFrom(craft, observer, 'visual', hour);
    for (const c of contacts) {
      if (c.craft && c.fixed) {
        if (this.fixedFrom.has(c.craft.stuffId)) continue;
        this.fixedFrom.add(c.craft.stuffId);
        craft.takeFix(pos, 0.2);
        tell(`${capitalize(c.name)} is in sight, bearing ${bearingWords(c.bearingDeg)}; you fix your position by it.`);
        continue;
      }
      const key = c.craft ? c.craft.stuffId : `seeded:${c.name}:${hour}`;
      if (this.told.has(key)) continue;
      this.told.add(key);
      tell(`A sail: ${c.name}, bearing ${bearingWords(c.bearingDeg)}, perhaps ${Math.round(c.rangeNm)} miles off.`);
    }

    // 5. Neglect — the gear remembers.
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

  /** Each boundary the straight track crossed, described by the medium after it. */
  private async boundaryReport(
    expanse: Expanse,
    prev: GeoPosition,
    pos: GeoPosition,
    deck: Stuff | null,
    manned: boolean,
  ): Promise<string[]> {
    const events: { t: number; entering: boolean; hazards: string[] }[] = [];
    for (const b of await expanse.bands()) {
      for (const c of b.crossings(prev, pos)) {
        events.push({ t: c.t, entering: c.entering, hazards: c.entering ? b.getHazards() : [] });
      }
    }
    events.sort((a, b) => a.t - b.t);
    const lines: string[] = [];
    for (const e of events) {
      const after = prev.lerp(pos, Math.min(1, e.t + 1e-4));
      const read = await expanse.readAt(after, deck);
      let line = `The water changes. ${read}`.trim();
      if (manned && e.hazards.length > 0) {
        line += ` The watch calls a warning: ${(await hazardNames(e.hazards)).join(', ')}.`;
      }
      lines.push(line);
    }
    return lines;
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

/** Whoever aboard sees from highest — the lookout on shift, if any. */
function lookoutAmong(craft: Craft, aboard: Stuff[]): Stuff | null {
  let best: Stuff | null = null;
  let bestH = -Infinity;
  for (const who of aboard) {
    const h = craft.sightHeightFor(who);
    if (h > bestH) {
      best = who;
      bestH = h;
    }
  }
  return best;
}

/** The nearest the segment `a → b` comes to `p`, nautical miles. */
function closestApproachNm(a: GeoPosition, b: GeoPosition, p: GeoPosition): number {
  const ab = a.offsetTo(b);
  const ap = a.offsetTo(p);
  const len2 = ab.northNm ** 2 + ab.eastNm ** 2;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (ap.northNm * ab.northNm + ap.eastNm * ab.eastNm) / len2));
  return Math.hypot(ap.northNm - t * ab.northNm, ap.eastNm - t * ab.eastNm);
}

async function hazardNames(paths: string[]): Promise<string[]> {
  const rows = new Map((await Template.findByPaths(paths)).map((t) => [t.path, t]));
  return paths.map((p) => {
    const name = (rows.get(p)?.data as Record<string, unknown> | undefined)?.name;
    return typeof name === 'string' && name !== '' ? name : (p.split('/').pop() ?? p).replace(/-/g, ' ');
  });
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}
