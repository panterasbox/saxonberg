/**
 * MechanicalMovementMixin — the *movement* of a mechanical timepiece: a
 * windable mainspring, a hand-set point, and honest drift. It is the
 * clockwork that sits inside a `Timekeeping` face, and it is where the
 * `wind`/`adjust` verbs get their capability gate.
 *
 * The taxonomy: `Timekeeping` is the base capability (a thing you can
 * look at to read a clock face). The *movement* varies. A mechanical
 * movement drifts and stops: its face is `setTo + runningElapsed * rate`,
 * gated on a depleting mainspring `Reserve`. A future aether / accurate
 * movement would be plain `Timekeeping` reading true time straight — no
 * mainspring, no set-point — so it composes NO `MechanicalMovementMixin`
 * and therefore affords neither `wind` nor `adjust`. That fall-out is the
 * whole point: the mechanical verbs gate on the presence of this mixin
 * (a local `MixinApi.hasMixin(s, Mixins.MechanicalMovement)` guard in the
 * bundle's controllers), not on any concrete class. This is locality
 * content, not engine substrate — future timepieces are electronic; only
 * `Timekeeping` (the general read seam) stays in `lib/time`.
 *
 * Composition: the mixin folds in `TimekeepingMixin` (the read contract it
 * re-defines with its drift physics) over `ReservedMixin` (the mainspring,
 * reached through the documented `Reserved` cast — the `Foldable` /
 * `BistateInternal` idiom), so a composing class is `isTimekeeping` and
 * `isReserved` for free.
 *
 * Drift + mainspring (the `Campfire.reconcileFuel` non-biological Reserve
 * pattern): the displayed face is `setTo + runningElapsed * rate`, where
 * `runningElapsed` is the game-time the mainspring has *permitted* the
 * movement to run since it was last set. The spring depletes lazily
 * against elapsed game-time; when it floors, `runningElapsed` freezes, so
 * a fully-unwound movement shows its stop-time until it is wound again.
 * `rate` slightly off 1.0 is the honest drift — a movement runs a touch
 * slow, so it disagrees with an accurate civic clock. The full mainspring
 * is installed lazily on first touch (and a stored `reserves` record from
 * hydrate is honoured wholesale), so no mixin constructor is needed.
 */

import type { MixinConstructor } from '../../../lib/mixin';
import { TimekeepingMixin } from '../../../lib/time/Timekeeping';
import { ReservedMixin, Reserve, type Reserved } from '../../../lib/reserve';
import { Time } from '../../../lib/time/Time';
import { Quantity } from '../../../lib/quantity';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { TemplatePaths } from '../../../lib/paths';

/** Mechanical-movement dials. Playtest-tuned, not plan decisions. */
const MOVEMENT = {
  /** Drift multiplier — a touch under 1.0 runs slow. */
  DEFAULT_RATE: 0.995,
  /**
   * Fully-wound mainspring run capacity (game-seconds). A large default
   * so a carried, daily-wound movement never floors — it only drifts.
   */
  MAINSPRING_CAP_SEC: 172_800, // two game-days of run
  /** Guard: ignore an implausibly large reconcile gap (a resumed box). */
  MAX_REASONABLE_GAP_SEC: 90 * 86_400,
} as const;

const MAINSPRING = 'mainspring';

/**
 * Public shape added by MechanicalMovementMixin. The inter-Stuff contract
 * is the read (`currentReading`, from Timekeeping) plus the two mechanical
 * operations (`wind`, `setTime`) and the mainspring gauge the verbs and
 * tests read.
 */
export interface MechanicalMovement {
  currentReading(): Time | null;
  /** Wind the mainspring back to full — the movement resumes ticking. */
  wind(): void;
  /** Set the displayed time; resets the drift anchor to now. */
  setTime(minutes: number): void;
  /** Remaining mainspring run capacity (game-seconds). */
  mainspringRemaining(): number;
}

export function MechanicalMovementMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  return class MechanicalMovementMixin extends TimekeepingMixin(
    ReservedMixin(Base),
  ) {
    static _mixinName = 'MechanicalMovementMixin';

    /**
     * Clock-face minute-of-day the movement was last set to.
     *
     * @authorable
     */
    public setTo = 0;

    /**
     * Game-time (seconds) at which the movement was last set — the drift
     * anchor. Seed it in the past to make the movement already-wrong.
     *
     * @authorable
     */
    public setAt = 0;

    /**
     * Drift multiplier applied to running elapsed time.
     *
     * @authorable
     */
    public rate: number = MOVEMENT.DEFAULT_RATE;

    /**
     * Accumulated game-seconds the movement has actually run since it was
     * last set — grows lazily, freezes when the mainspring floors.
     *
     * @runtimeState
     */
    public runSeconds = 0;

    /**
     * Game-time (seconds) of the last mainspring reconcile; 0 = unseeded.
     *
     * @runtimeState
     */
    public springStamp = 0;

    static persistentFields = [
      'setTo',
      'setAt',
      'rate',
      'runSeconds',
      'springStamp',
    ];

    /**
     * The face reading: reconcile the mainspring, then compose
     * `setTo + runningElapsed * rate`. When the spring has floored,
     * `runSeconds` is frozen, so the reading holds at the stop-time.
     * Returns null only when no world clock is running (a bare harness);
     * a host with a lid (e.g. a pocket watch) re-defines this to gate on
     * it. Re-defines `TimekeepingMixin.currentReading`.
     */
    currentReading(): Time | null {
      this.reconcileMainspring();
      const driftedMinutes = this.setTo + (this.runSeconds * this.rate) / 60;
      return Time.ofMinutes(driftedMinutes);
    }

    /** Wind the mainspring back to full — the movement resumes ticking. */
    wind(): void {
      // Capture any run accrued right up to the wind before refilling.
      this.reconcileMainspring();
      const reserved = this as unknown as Reserved;
      const existing = reserved.getReserve(MAINSPRING);
      const cap =
        existing?.capacity ?? Quantity.of(MOVEMENT.MAINSPRING_CAP_SEC, 's');
      reserved.setReserve(
        new Reserve(
          MAINSPRING,
          cap,
          cap,
          existing?.theme ?? 'mechanical',
          existing?.floorEffect ?? 'stopped',
        ),
      );
      // Re-anchor the reconcile stamp so winding doesn't retroactively
      // "catch up" the idle interval while the movement was stopped.
      this.springStamp = this.nowSeconds() ?? this.springStamp;
    }

    /** Set the displayed time; resets the drift anchor to now. */
    setTime(minutes: number): void {
      this.setTo = new Time(minutes).minutes;
      const now = this.nowSeconds();
      this.setAt = now ?? this.setAt;
      this.springStamp = now ?? this.springStamp;
      this.runSeconds = 0;
    }

    /** Remaining mainspring run capacity (game-seconds). */
    mainspringRemaining(): number {
      return (
        (this as unknown as Reserved).getReserve(MAINSPRING)?.current.rawValue() ??
        0
      );
    }

    /**
     * Install a full mainspring on first touch, unless one is already
     * present (a stored `reserves` record from hydrate, or an explicit
     * test seed) — a freshly-constructed movement runs. Idempotent.
     */
    protected ensureMainspring(): void {
      const reserved = this as unknown as Reserved;
      if (reserved.hasReserve(MAINSPRING)) return;
      reserved.setReserve(
        new Reserve(
          MAINSPRING,
          Quantity.of(MOVEMENT.MAINSPRING_CAP_SEC, 's'),
          Quantity.of(MOVEMENT.MAINSPRING_CAP_SEC, 's'),
          'mechanical',
          'stopped',
        ),
      );
    }

    /**
     * Deplete the mainspring against elapsed game-time (the
     * `Campfire.reconcileFuel` pattern). The consumed seconds accumulate
     * into `runSeconds`; when the spring can't cover the whole gap, only
     * the covered part advances — so `runSeconds` freezes at the stop.
     */
    protected reconcileMainspring(): void {
      this.ensureMainspring();
      const now = this.nowSeconds();
      if (now === null) return;
      if (this.springStamp === 0) {
        this.springStamp = now;
        return;
      }
      const elapsed = now - this.springStamp;
      if (elapsed <= 0 || elapsed > MOVEMENT.MAX_REASONABLE_GAP_SEC) {
        this.springStamp = now;
        return;
      }
      const available = this.mainspringRemaining();
      const consumed = Math.min(elapsed, available);
      if (consumed > 0) {
        this.runSeconds += consumed;
        (this as unknown as Reserved).adjustReserve(
          MAINSPRING,
          Quantity.of(-consumed, 's'),
        );
      }
      this.springStamp = now;
    }

    /** In-session game-time (seconds), or null when no world clock runs. */
    protected nowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}
