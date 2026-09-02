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
 * `/platform/idea/api/fire`; this Api is the thin forwarding shell. `dest /platform/idea/api/fire`
 * reloads it. See `docs/subsystems/fire.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { AppApi } from './app';
import { AppSettingKeys } from '../lib/config/AppSettings';
import { FireLogic } from '../platform/idea/api/FireLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

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

const LOGIC_PATH = '/platform/idea/api/fire';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/FireLogic', import.meta.url),
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
   * The presence-gated fire tick — advance and spread every fire in an
   * **occupied** scope (the weather-boundary / storm-strike precedent). Armed
   * by `WorldClockRegistry` on the game clock; an unwatched fire freezes.
   */
  public static onFireTick(): void {
    logic().onFireTick();
  }

  /** The fire-tick interval in game-seconds (the `fire.tickIntervalSeconds`
   * dial). Read by `WorldClockRegistry` to arm the recurring tick. Falls back
   * to the seeded literal when AppSettings isn't warmed yet (a pre-warm boot /
   * test read is safe — the weather-dial precedent). */
  public static fireTickIntervalSeconds(): number {
    try {
      const raw = AppApi.setting(AppSettingKeys.fireTickIntervalSeconds);
      const n = raw == null || raw === '' ? NaN : Number.parseFloat(raw);
      return Number.isFinite(n) ? n : 30;
    } catch {
      return 30;
    }
  }
}

SecurityApi.decorateApiClass(FireApi);
