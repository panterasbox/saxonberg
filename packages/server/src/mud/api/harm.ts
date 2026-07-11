/**
 * HarmApi — the **inflict producer**: the single gated seam every harm
 * source (this build's floor-glass hazard, later combat, later
 * environmental hazards) calls to wound a body. `inflict(target, {
 * mechanism, site, energy })` builds a {@link Trauma} and lands it through
 * the existing `VitalsMixin.afflict()` door, then arms the recurring
 * wound-tick that progresses / heals / kills.
 *
 * `inflict` is a **powerful primitive** — it must not be callable by
 * arbitrary content. The logic lives in the gated, hot-reloadable
 * {@link HarmLogic} singleton at `/obj/api/harm` (its methods carry
 * `@CallSecurity(FromModule('/api/harm#HarmApi'))`, so only this Api
 * forwards in); this Api is the thin forwarding shell trusted producers
 * reach. The **inflicter is un-spoofable** — derived from execution
 * context inside `HarmLogic` (`ExecutionContextApi.getActingAuthor`),
 * never a caller-supplied parameter (the gated-Api actor-from-context
 * rule). `dest /obj/api/harm` reloads it.
 *
 * See `docs/subsystems/harm.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Mechanism, Trauma } from '../lib/vitals/Condition';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { HarmLogic } from '../obj/api/HarmLogic';
import { fileURLToPath } from 'url';

export type { Mechanism } from '../lib/vitals/Condition';
export { MECHANISMS } from '../lib/vitals/Condition';

/** The insult a producer describes: what kind, where, and how hard. */
export interface InflictSpec {
  /** The physical mechanism — mapped to a `TraumaType`, recorded raw. */
  mechanism: Mechanism;
  /** A `body.*` part key (anatomy) the wound sits at. */
  site: string;
  /** Magnitude of the insult; mapped to severity (magnitude-only in v1). */
  energy: number;
}

/** The result of an `inflict` call — the built trauma and whether it landed. */
export interface InflictOutcome {
  /** The trauma value the insult produced. */
  trauma: Trauma;
  /** True iff the target was a wound-able body and the trauma was afflicted. */
  afflicted: boolean;
}

const LOGIC_PATH = '/obj/api/harm';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/HarmLogic', import.meta.url)
);

/** Resolve the HMR-able HarmLogic singleton (sync). */
function logic(): HarmLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'HarmLogic'
      ) as typeof HarmLogic | null) ?? HarmLogic)()
  );
}

export class HarmApi {
  /**
   * Wound `target`. Builds a {@link Trauma} from `spec` (mechanism →
   * `TraumaType`, `energy` → severity, `mechanism` recorded raw), stamps
   * the context-derived inflicter, afflicts it through `VitalsMixin`, runs
   * the trauma's `onset`, and arms the recurring wound-tick. No-op-afflict
   * (`afflicted: false`) when `target` is not a wound-able body.
   */
  public static inflict(target: Stuff, spec: InflictSpec): InflictOutcome {
    return logic().inflict(target, spec);
  }
}

SecurityApi.decorateApiClass(HarmApi);
