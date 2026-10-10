/**
 * SnowboundExit — **a way that closes when the snow lies too deep.**
 *
 * FordExit's twin, and like the ford its point is how little it invents.
 * The floor already knows how deep the snow lies on it — derived from the
 * weather its place has had, the same snow the river's catchment banks
 * (`FloorMixin.getSnowDepthM`, the climate build) — so a pass that
 * closes in winter is **that number**, asked by an exit instead of by a
 * person. No snow of its own, no schedule, no weather of its own: a
 * northern pass shuts in its winter and a southern one in its own.
 *
 * ## How it answers
 *
 * One cached answer per weather segment (the snow's own memo period),
 * written to the shipped `blocked` bit. `applyTraversal` refreshes it
 * before every crossing and falls through, so the ordinary `blocked`
 * gate refuses — with the reason below — and the lane compile and a
 * `Journey` mid-route see the same bit.
 *
 * ⚠ **Physical only** (the requirements' AC 19). Nothing here touches
 * comms, teleport or the peer graph: a pass under snow stops a body and
 * a cart, and a `tell` from behind it goes through.
 *
 * ## It reads the floor by SHAPE
 *
 * The floor is kernel, so there is no pack dependency at all; the shape
 * read (`getFloor` → `getSnowDepthM`) keeps the exit composable over any
 * room that has a floor and honest over one that does not (no floor, no
 * snow, open).
 *
 * See [docs/subsystems/logistics.md], [docs/subsystems/ground.md].
 */

import Exit, { type ExitOptions } from '@saxonberg/server/mud/lib/boundary/Exit';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';

/** The weather segment — six game hours, the snow's own memo period. */
const SEGMENT_S = 6 * 3_600;

/** The one read a snowbound way asks of a floor. */
interface SnowFloor {
  getSnowDepthM(): number;
}

export interface SnowboundExitOptions extends ExitOptions {
  /** Metres of snow above which the way is shut. */
  closesAboveM?: number;
}

export default class SnowboundExit extends Exit {
  static fieldMeta: FieldMeta = {
    ...Exit.fieldMeta,
    _closesAboveM: { persistent: true, authorable: true },
  };

  /** Metres of lying snow above which nothing gets through. Default knee-deep. */
  protected _closesAboveM = 0.5;

  /** The weather segment the cached answer belongs to; `-1` = never read. */
  private checkedSegment = -1;

  constructor(opts?: SnowboundExitOptions) {
    super(opts);
    if (opts?.closesAboveM !== undefined) this.setClosesAboveM(opts.closesAboveM);
  }

  public getClosesAboveM(): number {
    return this._closesAboveM;
  }
  public setClosesAboveM(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new TypeError('SnowboundExit.setClosesAboveM: expected a positive number');
    }
    this._closesAboveM = value;
  }

  /**
   * Re-read the snow lying where the way starts and set `blocked` from
   * it. Idempotent within a weather segment. Awaits the place's own
   * site and weather walks first, so the read is never the unresolved
   * zero.
   */
  public async refreshCrossing(force = false): Promise<void> {
    const nowS = WorldClockApi.getNow().rawValue();
    const segment = Math.floor(nowS / SEGMENT_S);
    if (!force && segment === this.checkedSegment) return;
    const depth = await SnowboundExit.snowAt(this.getSource());
    this.checkedSegment = segment;
    this.setBlocked(depth > this._closesAboveM);
  }

  /** Refresh, then fall through: the `blocked` gate does the refusing. */
  public override async applyTraversal(_mover: Stuff): Promise<boolean> {
    await this.refreshCrossing();
    return false;
  }

  /** The refusal names the snow, not "the way". */
  public override canTraverse(mover: Stuff & Containable, mode?: string): TraversalGuard {
    const base = super.canTraverse(mover, mode);
    if (base.ok || base.gate !== 'blocked') return base;
    return {
      ok: false,
      gate: 'blocked',
      reason:
        'The way is under snow — deeper than your knee and drifted higher ' +
        'against the rocks. Nothing is getting through until it goes.',
    };
  }

  /** Metres of snow on a place's floor, by SHAPE; `0` with no floor. */
  private static async snowAt(place: Stuff | null): Promise<number> {
    if (!place) return 0;
    if (MixinApi.isAtmospheric(place)) {
      await place.resolveClimateSite();
      await place.resolveWeatherLocality();
    }
    if (!MixinApi.isAdornable(place)) return 0;
    const floor = place.getFloor() as unknown as Partial<SnowFloor> | null;
    return typeof floor?.getSnowDepthM === 'function' ? floor.getSnowDepthM() : 0;
  }
}
