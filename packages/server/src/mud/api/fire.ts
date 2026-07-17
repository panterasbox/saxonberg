/**
 * FireApi — the gated facade over the **combustion driver**: the single
 * external writer of a {@link Combustible} object's fire. Igniting (deliberate
 * or heat-threshold), the three extinguishers (water/douse, smother,
 * fuel-starvation), and advancing a burning object one tick all route through
 * here — never a bespoke poke at the Burning state.
 *
 * `FireApi` is the domain noun (parallel to `WeatherApi` / `ElectricityApi`);
 * the future magic Fire school will actuate this exact channel (inject heat →
 * the same combustion physics). Harm to a *body* from fire routes through the
 * separate `heat` materials-response channel (`ConditionApi.inflict`); this
 * owns the combustion of an *object*.
 *
 * The logic lives in the gated, hot-reloadable {@link FireLogic} singleton at
 * `/obj/api/fire`; this Api is the thin forwarding shell. `dest /obj/api/fire`
 * reloads it. See `docs/subsystems/fire.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { AppApi } from './app';
import { AppSettingKeys } from '../lib/config/AppSettings';
import { FireLogic } from '../obj/api/FireLogic';
import { fileURLToPath } from 'url';

/** The result of a deliberate {@link FireApi.ignite} attempt. */
export interface IgniteOutcome {
  /** Did it catch? */
  lit: boolean;
  /**
   * Why it didn't, when `lit` is false: `'not-flammable'` (no fuel / material
   * autoignition), `'already-burning'`, or `'too-wet'` (a hand-flame can't dry
   * it). Absent on success.
   */
  reason?: 'not-flammable' | 'already-burning' | 'too-wet';
}

const LOGIC_PATH = '/obj/api/fire';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/FireLogic', import.meta.url),
);

/** Resolve the HMR-able FireLogic singleton (sync). */
function logic(): FireLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'FireLogic',
      ) as typeof FireLogic | null) ?? FireLogic)(),
  );
}

export class FireApi {
  /**
   * Deliberate ignition (the `ignite` verb): a hand-flame lights a flammable,
   * dry-enough object. Returns `{lit:true}` on success, or `{lit:false,
   * reason}` — `'not-flammable'`, `'already-burning'`, or `'too-wet'` (the
   * water penalty exceeds what a sustained hand-flame can dry through).
   */
  public static ignite(stuff: Stuff): IgniteOutcome {
    return logic().ignite(stuff);
  }

  /**
   * Heat-threshold autoignition — ignites `stuff` iff its temperature has
   * crossed its (wetness-adjusted) autoignition point (and it has fuel). The
   * derivable energy balance the spread check drives: the caller delivered the
   * heat, this decides whether the threshold was reached. Returns whether it
   * lit.
   */
  public static tryAutoignite(stuff: Stuff): boolean {
    return logic().tryAutoignite(stuff);
  }

  /**
   * Douse `stuff` — the water/wet extinguisher: puts the fire out and wets the
   * object so it resists re-ignition until dried. Returns whether anything was
   * doused (false on a non-burning / non-combustible target).
   */
  public static douse(stuff: Stuff): boolean {
    return logic().douse(stuff);
  }

  /**
   * Advance one burning object one tick — drain its fuel (self-extinguishing +
   * charring / destructing at exhaustion). The presence-gated fire tick fans
   * this out over occupied scopes; a lone object also reconciles-on-read for
   * `analyze` freshness.
   */
  public static advance(stuff: Stuff): void {
    logic().advance(stuff);
  }

  /** Is `stuff` a Combustible that is currently on fire? */
  public static isBurning(stuff: Stuff): boolean {
    return logic().isBurning(stuff);
  }

  /**
   * The presence-gated fire tick — advance and spread every fire in an
   * **occupied** scope (the weather-boundary / storm-strike precedent). Armed
   * by `WorldClockRegistry` on the game clock; an unwatched fire freezes.
   */
  public static onFireTick(): void {
    logic().onFireTick();
  }

  /** The fire-tick interval in game-seconds (the `fire.tickIntervalSeconds`
   * dial). Read by `WorldClockRegistry` to arm the recurring tick. */
  public static fireTickIntervalSeconds(): number {
    const raw = AppApi.setting(AppSettingKeys.fireTickIntervalSeconds);
    const n = raw == null || raw === '' ? NaN : Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 30;
  }
}

SecurityApi.decorateApiClass(FireApi);
