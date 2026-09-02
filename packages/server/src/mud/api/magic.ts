/**
 * MagicApi — the gated facade over the **casting core**: the single
 * pipeline every cast runs (resolve spell → faculty / impairment / band
 * / suppression gates → spend the reserve → run the declarative effects
 * through their backing Apis → stamp provenance → credit the
 * Transcript).
 *
 * Magic is a new *trigger*, never a new *mechanism* — every effect
 * executor is a thin wrapper over a shipped gated Api (`ConditionApi.
 * inflict`, `Thermal.depositHeat` + `FireApi.tryAutoignite`,
 * `ElectricityApi.conduct`, `Vitals.afflict/relieve`, `StuffApi.clone`,
 * `BulkableApi.transfer`, `Disguisable.setDisguise`, …), so magic can do
 * exactly what the world already can, from a new door — and the caster
 * obeys their own physics (a spark finds the caster in the shared pool).
 *
 * All **hostile channel-delivery** routes through one internal
 * `deliverAt` leg on the logic — the documented **ranged-integration
 * seam** (v1 body = the reachable, in-scene envelope; the future ranged
 * build swaps this one leg) — which also appends the accountability
 * `harm` row for a non-consenting sentient victim outside a shared
 * combat session (the trap-spring producer precedent).
 *
 * The logic lives in the gated, hot-reloadable {@link MagicLogic}
 * singleton at `/platform/idea/api/magic`; this Api is the thin forwarding shell.
 * See `docs/subsystems/magic.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { MagicLogic } from '../platform/idea/api/MagicLogic';
import type {
  PrepareOutcome,
  CastOutcome,
  SpellsView,
  DischargeOptions,
} from '../platform/idea/api/MagicLogic';
import type { MagicSuppression } from '../lib/magic/Suppression';
import type { SpellDescriptor } from '../platform/idea/magic/Spell';
import { fileURLToPath } from 'url';
export type { ChargeTransfer } from '../platform/idea/api/MagicLogic';
import type { ChargeTransfer } from '../platform/idea/api/MagicLogic';
import { SecurityApi } from './security';

export type { PrepareOutcome, CastOutcome, SpellsView, DischargeOptions };
export type { SpellDescriptor };

const LOGIC_PATH = '/platform/idea/api/magic';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/MagicLogic', import.meta.url),
);

/** Resolve the HMR-able MagicLogic singleton (sync). */
function logic(): MagicLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'MagicLogic',
      ) as typeof MagicLogic | null) ?? MagicLogic)(),
  );
}

export class MagicApi {
  /**
   * One authored spell descriptor by id, or `null`. The read a
   * *consumer of a spell* needs — a spellbook resolving what it teaches,
   * an item resolving what it carries — as opposed to the caster-facing
   * roster, which is `spellsView`.
   */
  public static spellAt(path: string): SpellDescriptor | null {
    return logic().spellAt(path);
  }

  /**
   * The suppression field covering `place`, resolved by the SYNC
   * outward containment walk (room tier — the dormancy reconcile's
   * read). `null` = no field. See docs/subsystems/magic.md.
   */
  public static suppressionAt(place: Stuff | null): MagicSuppression | null {
    return logic().suppressionAt(place);
  }

  /**
   * The suppression field covering `place`, folding the ASYNC zone
   * chain over the sync walk (cast-time / validator-preload tier).
   */
  public static suppressionAtDeep(
    place: Stuff | null,
  ): Promise<MagicSuppression | null> {
    return logic().suppressionAtDeep(place);
  }
}

SecurityApi.decorateApiClass(MagicApi);
