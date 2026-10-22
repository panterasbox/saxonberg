/**
 * MovingPlaceMixin — ⭐⭐ **a place whose position is a variable** (river
 * D4): the water within hail of you on a river, carried by the current;
 * a stopped ship's room at sea; one day a raft yard or an ice floe.
 *
 * Only places are tracked on the overworld. A person, a canoe, a log, a
 * body is always IN a place, and its position is its container's; the
 * place itself is what moves. So a moving place is an ordinary room — it
 * holds things, has ways out, has a look — whose position on a frame
 * (`Positioned`: a river's line or the sea's chart) changes, and whose
 * ways out are worked out against that frame when they are taken.
 *
 * What composing this claims about the host:
 *
 * - **Its zone is its own moving zone** (D38): one `MovingZone` per moving
 *   place, minted with it and reaped with it, whose identity never
 *   changes and whose STATE (elevation, address, climate) follows the
 *   place's position. No zone changes at runtime.
 * - **Movers inside it carry an offset** along the frame — a swimmer
 *   stroking ahead, a boat being paddled — integrated by whoever owns the
 *   frame; the place is still one room while they are within hail.
 * - **It is told when it moves** ({@link onFrameMoved}), so it can tell
 *   its occupants what changed — told, not the horizon.
 *
 * The motion itself — when the next thing happens, merges and splits —
 * belongs to the warren that mints the place (`ReachWarren`, the sea's
 * `SeaWarren`); a {@link Drift} on the place holds its one scheduled
 * event. Nothing authored composes this: a moving place is always minted.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Exitable } from '../boundary/Exitable';
import type { Positioned } from '../expanse/Positioned';
import type { LinePositionRecord } from '../expanse/LineFrame';
import { AppApi } from '../../api/app';
import type { Drift } from './Drift';

/** How far a hail carries on open water when nobody says otherwise, m. */
const DEFAULT_HAIL_M = 100;

export interface MovingPlace {
  hailRangeM(): number;
  isUnderWay(): boolean;
  offsetOf(mover: Stuff): number;
  setOffsetOf(mover: Stuff, km: number): void;
  clearOffsetOf(mover: Stuff): void;
  offsetsOf(): ReadonlyMap<string, number>;
  onFrameMoved(from: LinePositionRecord | null, to: LinePositionRecord | null): Promise<void>;
  getDrift(): Drift | null;
  setDrift(drift: Drift | null): void;
}

export function MovingPlaceMixin<
  TBase extends MixinConstructor<Stuff & Container & Exitable & Positioned>,
>(Base: TBase) {
  return class MovingPlaceMixin extends Base implements MovingPlace {
    static _mixinName: string = 'MovingPlaceMixin';

    /** Mover stuffId → km offset along the frame (+ downstream). Runtime. */
    private _offsets = new Map<string, number>();

    /** The one scheduled next event. Runtime: a restart re-derives it. */
    private _drift: Drift | null = null;

    /**
     * How far a hail carries here, m — the room IS the water within hail.
     * @hook Override where the water says otherwise. Default: the
     *   `expanse.hailRangeM` dial, else 100 m.
     */
    public hailRangeM(): number {
      try {
        const raw = AppApi.setting('expanse.hailRangeM');
        const n = raw ? Number.parseFloat(raw) : NaN;
        return Number.isFinite(n) && n > 0 ? n : DEFAULT_HAIL_M;
      } catch {
        return DEFAULT_HAIL_M;
      }
    }

    /**
     * Is the place being carried right now? A stopped place (a bar, a
     * moored boat's eddy) answers `false` and the frame leaves it alone.
     * @hook Override on a place that can stop. Default `true`.
     */
    public isUnderWay(): boolean {
      return true;
    }

    public offsetOf(mover: Stuff): number {
      return this._offsets.get(mover.stuffId) ?? 0;
    }

    public setOffsetOf(mover: Stuff, km: number): void {
      if (!Number.isFinite(km)) return;
      this._offsets.set(mover.stuffId, km);
    }

    public clearOffsetOf(mover: Stuff): void {
      this._offsets.delete(mover.stuffId);
    }

    public offsetsOf(): ReadonlyMap<string, number> {
      return this._offsets;
    }

    /**
     * The place has moved along its frame.
     * @hook Override to tell the occupants what changed — *the run opens
     *   out into a long brown pool*. Default: nothing.
     */
    public async onFrameMoved(
      from: LinePositionRecord | null,
      to: LinePositionRecord | null,
    ): Promise<void> {
      void from;
      void to;
    }

    public getDrift(): Drift | null {
      return this._drift;
    }

    public setDrift(drift: Drift | null): void {
      if (this._drift !== null && this._drift !== drift) this._drift.cancel();
      this._drift = drift;
    }
  };
}
