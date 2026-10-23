/**
 * ReachPatch — ⭐⭐ **the water within hail of you, carried by the river**
 * (river D4–D7).
 *
 * The overworld is the river's LINE, and the only thing tracked on it is a
 * place. A swimmer, a canoe, a log, a body is always IN a place; when the
 * water around them is not an authored place, it is a patch — one room,
 * minted when somebody goes into the river between places, positioned on
 * the line, moved by the current, gone when nothing is left in it.
 *
 * - **What you are in.** River water at the patch's position: its depth,
 *   current and temperature are the line's there (the read is of the
 *   stretch the patch is over).
 * - **Where you can go.** Its ways are worked out against the line when
 *   you take them: `left` / `right` to the bank, `downstream` / `upstream`
 *   by your own stroke, a branch at a junction by its name, and whatever
 *   fixed place is within hail (a quay, a bar).
 * - **Who is with you.** Everyone within hail — patches merge when they
 *   drift within hail of each other and split when a swimmer strokes out
 *   of it.
 * - **What it is told.** The stretch changing under it, as it happens.
 *
 * Minted and moved by the `ReachWarren`; nothing authored composes it,
 * and nothing persists it — a patch is gone when it is empty. Its durable
 * handle is none: no map names a patch.
 */

import { MovingWaterMixin } from '@saxonberg/server/mud/lib/location/MovingWater';
import type { FramePos } from '@saxonberg/server/mud/lib/expanse/Frame';
import Location from '@saxonberg/server/mud/platform/location/Location';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { ShoreMixin } from '@saxonberg/server/mud/lib/location/Shore';
import { SwimmableMixin } from '@saxonberg/server/mud/lib/locomotion/Swimmable';
import { WaterPlaceMixin } from '@saxonberg/server/mud/lib/location/WaterPlace';
import { PositionedMixin } from '@saxonberg/server/mud/lib/expanse/Positioned';
import { MovingMixin } from '@saxonberg/server/mud/lib/expanse/Moving';
import { MovingPlaceMixin } from '@saxonberg/server/mud/lib/location/MovingPlace';
import type { ColumnBand } from '@saxonberg/server/mud/lib/location/WaterColumn';
import type { LinePositionRecord } from '@saxonberg/server/mud/lib/expanse/LineFrame';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Exit from '@saxonberg/server/mud/lib/boundary/Exit';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { RiverWaterMixin } from '../lib/RiverWater';
import type WatercourseCatalogue from '../idea/WatercourseCatalogue';
import type ReachWarren from '../idea/ReachWarren';

const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';
/** Ice this thick closes a stretch over a body in it, m. */
const ICE_CLOSES_M = 0.02;
const WARREN_PATH = '/system/water/idea/ReachWarren';

export const ReachPlaceBase = MovingPlaceMixin(
  RiverWaterMixin(MovingWaterMixin(
    WaterPlaceMixin(SwimmableMixin(ShoreMixin(MovingMixin(PositionedMixin(WarrenMemberMixin(Location)))))),
  )),
);

export default class ReachPatch extends ReachPlaceBase {
  constructor() {
    super();
    // The river's surface is water: no floor but the water itself.
    // The river's bed under its water (D13): stood on where it is shallow.
    this.floor = { template: '/system/water/thing/reach-floor' };
  }

  /**
   * ⭐ Under the ice (river D16): carried into a stretch the cold has
   * frozen over, the sheet is over your head — the water's own words, and
   * the breath model takes it from there. Out the other side, at the open
   * water below, you come up.
   */
  public override headOutAt(occupant: Stuff): boolean {
    void occupant;
    return !this.underIce();
  }

  public override wayUp(): { exit: Exit } | { reason: string; line: string } {
    if (this.underIce()) {
      return { reason: 'under-ice', line: 'The ice is over you, grey and hard; there is no up. The current is taking you along under it.' };
    }
    return super.wayUp();
  }

  /**
   * ⭐ Swum into the shallows of a river, you are still swimming (the drive:
   * a swimmer carried into a fast riffle was stood up and their foot
   * jammed — the engine's choice, not theirs). `stand` finds your feet.
   */
  public override standsOnArrival(mover: Stuff): boolean {
    void mover;
    return false;
  }

  /** Whether the stretch the patch is in reads frozen over now. */
  public underIce(): boolean {
    const pos = this.getLinePosition();
    const cat = this.catalogue();
    const stretch = pos ? cat?.lineOfSync(pos.course)?.stretchAt(pos.km) ?? null : null;
    if (!stretch || !cat) return false;
    let nowS = 0;
    try {
      nowS = WorldClockApi.getNow().rawValue();
    } catch {
      return false;
    }
    const ice = cat.iceAtSync(stretch.id, nowS);
    return ice !== null && ice.thicknessM > ICE_CLOSES_M;
  }

  /** A patch is gone when it is empty: there is nothing durable to name. */
  public override getDurableHandle(): string | null {
    return null;
  }

  /** The river here is too shallow for bands: the bed is the stop's (D9). */
  public override bandsNow(): ColumnBand[] {
    return [];
  }

  /**
   * ⭐ What sinks here lies on the bed at THIS point (river D9): the bed
   * under moving water does not move. It goes to the stop at the patch's
   * km, and the patch drifts on without it.
   */
  public override async sink(thing: Stuff): Promise<boolean> {
    if (thing.isDestroyed() || !MixinApi.isContainable(thing)) return false;
    const warren = await StuffApi.singleton<ReachWarren>(WARREN_PATH).catch(() => null);
    return warren ? warren.sinkFrom(this, thing as Stuff & Containable) : false;
  }

  /**
   * ⭐ The bed does not move, in the shallows or the deep (D9; the drive
   * found a stone dropped in wading water riding on with the patch): a
   * thing that sinks — a stone, a sword, not a body standing — goes to the
   * stop at this km whatever the depth.
   */
  public override onContainableAdded(thing: Stuff & Containable): void {
    super.onContainableAdded(thing);
    if (thing.isAgent() || !this.sinks(thing)) return;
    const floor = this.getFloor();
    const borne = floor !== null && MixinApi.isFloor(floor) && floor.supportIsSlotted() && floor.bears(0);
    if (borne) void Promise.resolve().then(() => this.sink(thing));
  }

  /**
   * ⭐ A disconnected body in moving water (D15): not held here — the patch
   * is going somewhere — but delivered to the first spot downstream that
   * can hold it, and held there.
   */
  public override async holdAtSurface(body: Stuff): Promise<boolean> {
    const pos = this.getLinePosition();
    if (pos === null || !MixinApi.isContainable(body)) return false;
    const warren = await StuffApi.singleton<ReachWarren>(WARREN_PATH).catch(() => null);
    if (!warren) return false;
    await warren.deliver(body as Stuff & Containable, pos);
    return true;
  }

  /** ⭐ The words for the river here, never a number. */
  public override getShort(): string {
    const pos = this.getLinePosition();
    const name = this.courseName(pos?.course ?? null);
    return name ? `In ${name}` : 'In the river';
  }

  public override getLong(): string {
    const lines = [this.riverLines(this.getLinePosition()).join(' ')];
    const self = this as unknown as Stuff & { getContents(): Stuff[] };
    const others = self.getContents().filter((c) => c.isAgent()).length;
    if (others > 1) lines.push('You are near enough to the others in the water to call to them.');
    return lines.filter((l) => l !== '').join(' ');
  }

  /**
   * ⭐ The river under you has changed — told, not the horizon (river D6).
   */
  public override async onFrameMoved(from: FramePos | null, to: FramePos | null): Promise<void> {
    if (to?.frame !== 'line') return;
    const cat = this.catalogue();
    const line = cat?.lineOfSync(to.at.course) ?? null;
    if (!line) return;
    const was = from?.frame === 'line' && from.at.course === to.at.course ? from.at : null;
    const before = was ? line.stretchAt(was.km) : null;
    const after = line.stretchAt(to.at.km);
    if (!after || (before && before.kind === after.kind && before.bendName === after.bendName)) return;
    const iced = this.underIce();
    const said = iced
      ? 'The ice closes over your head: grey light, the sheet a hand above you, and the current taking you along under it.'
      : CHANGE_WORDS[after.kind] ?? 'The river carries you on.';
    const bend = after.bendName ? ` This is ${after.bendName}.` : '';
    // ⭐ Through the chunked teller (D42): a fast run through three riffles
    // is one beat, not three lines.
    await this.tellAboard(`${said}${bend}`);
  }

  private catalogue(): WatercourseCatalogue | null {
    return StuffApi.findByTemplatePath<WatercourseCatalogue>(CATALOGUE_PATH) ?? null;
  }

  private courseName(course: string | null): string | null {
    if (!course) return null;
    const reach = this.catalogue()?.reachNearSync(course, this.getLinePosition()?.km ?? 0) ?? null;
    return reach?.courseName ?? null;
  }

  /** The stretch under the patch, and both banks, in words. */
  protected riverLines(pos: LinePositionRecord | null): string[] {
    if (!pos) return ['You are in the river.'];
    const line = this.catalogue()?.lineOfSync(pos.course) ?? null;
    const s = line?.stretchAt(pos.km) ?? null;
    if (!s) return ['You are in the river.'];
    const out = [`${LOOK_WORDS[s.kind] ?? 'The river carries you'}${s.bendName ? `, at ${s.bendName}` : ''}.`];
    out.push(`On the left, ${BANK_WORDS[s.banks.left.kind] ?? 'the bank'}; on the right, ${BANK_WORDS[s.banks.right.kind] ?? 'the bank'}.`);
    return out;
  }
}

/** What being carried into each kind of water is like, as it happens. */
const CHANGE_WORDS: Record<string, string> = {
  pool: 'The river slows and opens out into a long, deep pool.',
  run: 'The water gathers itself into a smooth, steady run.',
  riffle: 'The bottom comes up under you: the river breaks over gravel, shallow and quick.',
  rapid: 'The river drops away ahead in white water, and takes you with it.',
  falls: 'The river goes over the falls — and you with it.',
  gorge: 'Rock walls close in on both sides and the river runs between them.',
};

/** The river under you, in words. */
const LOOK_WORDS: Record<string, string> = {
  pool: 'You are in a long, deep pool; the water barely moves',
  run: 'You are in a smooth, steady run, carried along',
  riffle: 'You are over a shallow riffle, gravel close under you and the water quick',
  rapid: 'You are in white water, thrown about among the rocks',
  falls: 'You are going over the falls',
  gorge: 'You are in a gorge, the river shut between walls of rock',
};

/** A bank, in words. */
const BANK_WORDS: Record<string, string> = {
  bar: 'shingle shelves up out of the water',
  shelving: 'gravel shelves gently up',
  steep: 'a steep bank of earth and roots',
  undercut: 'a steep undercut of roots, the water sucking in beneath it',
  wall: 'sheer rock',
  place: 'a made bank',
};
