/**
 * Watch — a brass hunter-cased pocket watch that keeps game-time and
 * *drifts*, because nobody ever sets it right.
 *
 * Composition: `Sealable` (the hunter lid — shut → the dial is hidden →
 * `currentReading()` is null), `Timekeeping` (the read contract),
 * `Detailed` (the engraving), and `Reserved` (the mainspring) over a
 * `Thing` (brass, via `Tangible`). It carries `wind`/`set` from its
 * inventory bucket (`commandContributions`); the capability mixin grants
 * no verbs.
 *
 * Drift + mainspring (the `Campfire.reconcileFuel` non-biological Reserve
 * pattern): the displayed face is `setTo + runningElapsed * rate`, where
 * `runningElapsed` is the game-time the mainspring has *permitted* the
 * movement to run since it was last set. The spring depletes lazily
 * against elapsed game-time; when it floors, `runningElapsed` freezes, so
 * a fully-unwound watch shows its stop-time until it is wound again.
 * `rate` slightly off 1.0 is the honest drift — the watch runs a touch
 * slow, so it disagrees with the accurate `ClockTower` across the street.
 */

import Thing from '../lib/stuff/Thing';
import { SealableMixin } from '../lib/spatial/Sealable';
import { TimekeepingMixin } from '../lib/time/Timekeeping';
import { DetailedMixin } from '../lib/description/Detailed';
import { ReservedMixin, Reserve } from '../lib/reserve';
import { Time } from '../lib/time/Time';
import { Quantity } from '../lib/quantity';
import { StuffApi } from '../api/stuff';
import { WorldClockApi } from '../api/worldclock';
import { TemplatePaths } from '../lib/paths';
import type { CommandContributions } from '../api/command';

const WatchBase = SealableMixin(
  TimekeepingMixin(ReservedMixin(DetailedMixin(Thing))),
);

/** Watch mechanism dials. Playtest-tuned, not plan decisions. */
const WATCH = {
  /** Drift multiplier — a touch under 1.0 runs slow. */
  DEFAULT_RATE: 0.995,
  /**
   * Fully-wound mainspring run capacity (game-seconds). A large default
   * so a carried, daily-wound watch never floors — it only drifts.
   */
  MAINSPRING_CAP_SEC: 172_800, // two game-days of run
  /** Guard: ignore an implausibly large reconcile gap (a resumed box). */
  MAX_REASONABLE_GAP_SEC: 90 * 86_400,
} as const;

const MAINSPRING = 'mainspring';

export default class Watch extends WatchBase {
  /**
   * `wind` / `set` light up only while a Watch is in hand — the verbs
   * are carried by the object, gated at the object, per the no-dead-props
   * / object-afforded-verb law.
   */
  static commandContributions: CommandContributions = {
    self: [],
    inventory: ['device/wind.yaml', 'device/set.yaml'],
    environment: [],
    peers: [],
  };

  /**
   * Clock-face minute-of-day the watch was last set to.
   *
   * @authorable
   */
  public setTo = 0;

  /**
   * Game-time (seconds) at which the watch was last set — the drift
   * anchor. Seed it in the past to make the watch already-wrong.
   *
   * @authorable
   */
  public setAt = 0;

  /**
   * Drift multiplier applied to running elapsed time.
   *
   * @authorable
   */
  public rate: number = WATCH.DEFAULT_RATE;

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

  static persistentFields = ['setTo', 'setAt', 'rate', 'runSeconds', 'springStamp'];

  constructor() {
    super();
    // Install a full mainspring so a freshly-constructed watch runs.
    // A stored `reserves` record (hydrate) replaces this wholesale.
    this.setReserve(
      new Reserve(
        MAINSPRING,
        Quantity.of(WATCH.MAINSPRING_CAP_SEC, 's'),
        Quantity.of(WATCH.MAINSPRING_CAP_SEC, 's'),
        'mechanical',
        'stopped',
      ),
    );
  }

  /**
   * The face reading. Lid shut → null (hidden dial). Otherwise reconcile
   * the mainspring, then compose `setTo + runningElapsed * rate`. When
   * the spring has floored, `runSeconds` is frozen, so the reading holds
   * at the stop-time.
   */
  override currentReading(): Time | null {
    if (!this.isOpen()) return null;
    this.reconcileMainspring();
    const driftedMinutes = this.setTo + (this.runSeconds * this.rate) / 60;
    return Time.ofMinutes(driftedMinutes);
  }

  /** Wind the mainspring back to full — the watch resumes ticking. */
  wind(): void {
    // Capture any run accrued right up to the wind before refilling.
    this.reconcileMainspring();
    const existing = this.getReserve(MAINSPRING);
    const cap = existing?.capacity ?? Quantity.of(WATCH.MAINSPRING_CAP_SEC, 's');
    this.setReserve(
      new Reserve(
        MAINSPRING,
        cap,
        cap,
        existing?.theme ?? 'mechanical',
        existing?.floorEffect ?? 'stopped',
      ),
    );
    // Re-anchor the reconcile stamp so winding doesn't retroactively
    // "catch up" the idle interval while the watch was stopped.
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
    return this.getReserve(MAINSPRING)?.current.rawValue() ?? 0;
  }

  /**
   * Dynamic long description — recomputed each look (`getMarkupLong`
   * calls `getLong` afresh). Lid shut → shows the closed case; open →
   * the static engraving prose plus the live reading.
   */
  override getLong(): string {
    const reading = this.currentReading();
    const base = super.getLong();
    if (reading === null) {
      return `${base} The hunter lid is shut, hiding the dial.`;
    }
    return `${base} The dial reads ${reading.format()}.`;
  }

  /**
   * Deplete the mainspring against elapsed game-time (the
   * `Campfire.reconcileFuel` pattern). The consumed seconds accumulate
   * into `runSeconds`; when the spring can't cover the whole gap, only
   * the covered part advances — so `runSeconds` freezes at the stop.
   */
  protected reconcileMainspring(): void {
    const now = this.nowSeconds();
    if (now === null) return;
    if (this.springStamp === 0) {
      this.springStamp = now;
      return;
    }
    const elapsed = now - this.springStamp;
    if (elapsed <= 0 || elapsed > WATCH.MAX_REASONABLE_GAP_SEC) {
      this.springStamp = now;
      return;
    }
    const available = this.mainspringRemaining();
    const consumed = Math.min(elapsed, available);
    if (consumed > 0) {
      this.runSeconds += consumed;
      this.adjustReserve(MAINSPRING, Quantity.of(-consumed, 's'));
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
}
