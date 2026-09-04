/**
 * FordExit — **a crossing that closes when the river comes up.**
 *
 * ⭐ The point of this class is how little it invents. Watershed already
 * derives flow at every reach from the season, the catchment and the
 * snowpack — *"nobody writes down a navigable reach; it is navigable and
 * knows that changes with the season"* — so a road that changes with the
 * season is **the same number `measure` reads**, asked by an exit
 * instead of by a person. No new field on the water, no new mechanism,
 * no weather of its own.
 *
 * ## How it answers
 *
 * The ford holds one cached reading, keyed on the **weather segment**
 * the catalogue itself memoises on (six game hours, piecewise-constant),
 * and sets the shipped `blocked` bit from it. Everything downstream then
 * works untouched: `canTraverse` refuses with a reason that names the
 * water, the lane compile drops the edge, and a `Journey` mid-route
 * aborts `route-blocked` at the leg boundary.
 *
 * Two things refresh it, and between them nobody ever reads a stale
 * ford:
 *
 *   - **`applyTraversal`**, which `Mobile.traverse` awaits before
 *     anything else — so a person walking up to the water always gets
 *     today's answer. It never *handles* the traversal; it refreshes and
 *     falls through, letting the ordinary `blocked` gate do the refusing.
 *   - **`refreshCrossing()`**, which the `LaneCatalogue`'s induced walk
 *     calls by SHAPE on any exit that has one — so a compiled road is
 *     as current as the river.
 *
 * ## ⚠ It reads the water pack by SHAPE, never by import
 *
 * The `AnalyzeWaterController` / `TravelNode` idiom: a ford resolves the
 * `WatercourseCatalogue` singleton by template path and duck-types the
 * one method it needs. An install with no water pack has a ford that is
 * simply always passable — which is the honest degradation, and it keeps
 * `transport` free of a dependency on `water` for one crossing.
 *
 * See [docs/subsystems/logistics.md].
 */

import Exit, { type ExitOptions } from '@saxonberg/server/mud/lib/boundary/Exit';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';

/** Where the water pack's compiled drainage lives, if it is installed. */
const WATERCOURSE_CATALOGUE = '/system/water/idea/WatercourseCatalogue';

/** The catalogue's own memo period — six game hours, in game seconds. */
const SEGMENT_S = 6 * 3_600;

/** The one method a ford asks the water for. */
interface FlowSource {
  flowAt(
    ref: string,
    nowS: number,
  ): Promise<{ m3s: number } | null>;
}

export interface FordExitOptions extends ExitOptions {
  /** `"<courseKey>:<nodeName>"` — the reach this ford crosses. */
  crossesReach?: string;
  /** Cubic metres per second above which the ford is up. */
  floodThresholdM3S?: number;
}

export default class FordExit extends Exit {
  static fieldMeta: FieldMeta = {
    ...Exit.fieldMeta,
    _crossesReach: { persistent: true, authorable: true },
    _floodThresholdM3S: { persistent: true, authorable: true },
  };

  /** The reach this ford crosses; `''` ⇒ nothing to read, always open. */
  protected _crossesReach = '';
  /** Above this flow the ford is up. */
  protected _floodThresholdM3S = 0;

  /** The weather segment the cached answer belongs to; `-1` = never read. */
  private checkedSegment = -1;

  constructor(opts?: FordExitOptions) {
    super(opts);
    if (opts?.crossesReach !== undefined) this.setCrossesReach(opts.crossesReach);
    if (opts?.floodThresholdM3S !== undefined) {
      this.setFloodThresholdM3S(opts.floodThresholdM3S);
    }
  }

  public getCrossesReach(): string {
    return this._crossesReach;
  }
  public setCrossesReach(value: string): void {
    this._crossesReach = value;
  }

  public getFloodThresholdM3S(): number {
    return this._floodThresholdM3S;
  }
  public setFloodThresholdM3S(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(
        'FordExit.setFloodThresholdM3S: expected a non-negative number',
      );
    }
    this._floodThresholdM3S = value;
  }

  /**
   * Re-read the river and set the shipped `blocked` bit from it.
   *
   * Idempotent within a weather segment: the catalogue memoises flow on
   * the same period, so asking twice in six game hours cannot produce
   * two answers. Called by the induced-lane walk (by shape) and by
   * `applyTraversal`.
   */
  public async refreshCrossing(force = false): Promise<void> {
    if (this._crossesReach === '' || this._floodThresholdM3S <= 0) return;
    const nowS = WorldClockApi.getNow().rawValue();
    const segment = Math.floor(nowS / SEGMENT_S);
    if (!force && segment === this.checkedSegment) return;

    const water = await FordExit.flowSource();
    if (!water) {
      // No water pack — a ford with no river behind it is a road.
      this.checkedSegment = segment;
      this.setBlocked(false);
      return;
    }
    const reading = await water.flowAt(this._crossesReach, nowS);
    this.checkedSegment = segment;
    this.setBlocked(
      reading !== null && reading.m3s > this._floodThresholdM3S,
    );
  }

  /**
   * ⚠ Never handles the traversal — it refreshes and returns `false`, so
   * the ordinary `blocked` gate does the refusing with the reason below.
   * `Mobile.traverse` awaits this before resolving anything, which is
   * what makes a person walking up to the water get today's answer.
   */
  public override async applyTraversal(_mover: Stuff): Promise<boolean> {
    await this.refreshCrossing();
    return false;
  }

  /** The refusal names the water, not "the way". */
  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    const base = super.canTraverse(mover, mode);
    if (base.ok || base.gate !== 'blocked') return base;
    return {
      ok: false,
      gate: 'blocked',
      reason:
        'The ford is up — the water is over the stones and moving, and ' +
        'nothing is getting across here today.',
    };
  }

  /** The water pack's catalogue, by SHAPE; `null` when it is not installed. */
  private static async flowSource(): Promise<FlowSource | null> {
    try {
      const cat = await StuffApi.singleton<Stuff>(WATERCOURSE_CATALOGUE);
      const duck = cat as unknown as Partial<FlowSource>;
      return typeof duck.flowAt === 'function' ? (duck as FlowSource) : null;
    } catch {
      return null;
    }
  }
}
