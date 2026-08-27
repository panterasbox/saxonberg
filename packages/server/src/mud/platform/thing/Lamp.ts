/**
 * Lamp — a street lamppost that lights the crossing after dark.
 *
 * Composition: `LightSource` (it casts light when on), `Switchable`
 * (on/off — the same axis `switch`/`toggle` target on any Switchable),
 * `Detailed` (the fluted post, the glass head, the posters someone stuck
 * to it) over a `Thing`. `PostRegistration` so it can arm its day/night
 * schedule once it is live in the registry.
 *
 * Day/night is clock-driven: a host-bound `WorldClockApi.every` schedule
 * (auto-cancelled when the lamp destructs) re-evaluates the game hour on
 * a cadence and switches the lamp on at dusk / off at dawn. The player
 * can still `switch` it by hand between boundaries. Thresholds are a
 * simple fixed dusk/dawn hour — the acceptance is only "toggles on/off
 * and is clock-driven".
 */

import Thing from '../../lib/stuff/Thing';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import { SwitchableMixin } from '../../lib/boundary/Switchable';
import { DetailedMixin } from '../../lib/description/Detailed';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi, type ClockHandle } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import { TemplatePaths } from '../../lib/paths';
import { DefaultCalendar } from '../../lib/time/DefaultCalendar';

const LampBase = PostRegistrationMixin(
  LightSourceMixin(SwitchableMixin(DetailedMixin(Thing))),
);

/** Lamppost day/night dials. Playtest-tuned, not plan decisions. */
const LAMP = {
  /** Lamp comes on at or after this hour (dusk). */
  DUSK_HOUR: 18,
  /** Lamp goes off at or after this hour (dawn). */
  DAWN_HOUR: 6,
  /** How often the day/night schedule re-evaluates the hour (game-sec). */
  CHECK_INTERVAL_SEC: 3600,
} as const;

export default class Lamp extends LampBase {
  /**
   * Live handle onto the day/night schedule; runtime-only bookkeeping so
   * a re-armed schedule can cancel the prior one.
   */
  private nightHandle: ClockHandle | null = null;

  /**
   * Arm the day/night schedule after registration and set the initial
   * on/off state for the current hour. Host-bound so it auto-cancels on
   * destruct.
   */
  override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    this.refreshForTimeOfDay();
    this.armDayNight();
  }

  /** (Re-)arm the host-bound recurring day/night toggle. */
  private armDayNight(): void {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      return;
    }
    this.nightHandle?.cancel();
    this.nightHandle = WorldClockApi.every(
      Quantity.of(LAMP.CHECK_INTERVAL_SEC, 's'),
      () => this.refreshForTimeOfDay(),
      { host: this },
    );
  }

  /**
   * Switch on when the current game hour is between dusk and dawn, off
   * otherwise. A no-op when no world clock is running.
   */
  public refreshForTimeOfDay(): void {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      return;
    }
    const now = WorldClockApi.getNow();
    const hour = DefaultCalendar.singleton().decompose(now).hour;
    const shouldBeOn = hour >= LAMP.DUSK_HOUR || hour < LAMP.DAWN_HOUR;
    if (shouldBeOn) {
      this.switchOn();
    } else {
      this.switchOff();
    }
  }
}
