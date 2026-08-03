/**
 * MagicApi — the gated facade over the **casting core**: the single
 * pipeline every cast runs (resolve spell → faculty / impairment / band
 * / suppression gates → spend the reserve → run the declarative effects
 * through their backing Apis → stamp provenance → credit the
 * Transcript).
 *
 * Magic is a new *trigger*, never a new *mechanism* — every effect
 * executor is a thin wrapper over a shipped gated Api (`ConditionApi.
 * inflict`, `ThermalApi.depositHeat` + `FireApi.tryAutoignite`,
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
 * singleton at `/obj/api/magic`; this Api is the thin forwarding shell.
 * See `docs/subsystems/magic.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { MagicLogic } from '../obj/api/MagicLogic';
import type {
  PrepareOutcome,
  CastOutcome,
  SpellsView,
} from '../obj/api/MagicLogic';
import type { MagicSuppression } from '../lib/magic/Suppression';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

export type { PrepareOutcome, CastOutcome, SpellsView };

const LOGIC_PATH = '/obj/api/magic';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/MagicLogic', import.meta.url),
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
   * Run every gate a cast must pass **before** its activity is
   * scheduled — faculty active, spell known to the catalogue, band gate
   * on both grid axes (competence IS access), casting-hand impairment,
   * targeting shape, the anti-magic field. Returns the effective cast
   * time (overchannel strain slows it) on success, or a legible
   * player-facing refusal. Spends nothing.
   */
  public static prepareCast(
    caster: Stuff,
    spellId: string,
    target?: Stuff,
  ): Promise<PrepareOutcome> {
    return logic().prepareCast(caster, spellId, target);
  }

  /**
   * The cast's resolution body — runs at the cast activity's
   * *completion* (an aborted cast never reaches here): re-validates,
   * spends the reserve (overchanneling past empty afflicts strain),
   * executes the effect list through the backing Apis, stamps the
   * provenance tag, credits both grid Disciplines on the Transcript.
   */
  public static resolveCast(
    caster: Stuff,
    spellId: string,
    target?: Stuff,
  ): Promise<CastOutcome> {
    return logic().resolveCast(caster, spellId, target);
  }

  /**
   * **The item trigger** — fire the working bound into `item` at an
   * optional `target`, through the same executors a cast runs.
   *
   * The one entry point every item class uses: a wand's `zap`, a
   * scroll's `read`, a quaffed potion. What differs between the classes
   * is *who pays and what happens to the item afterwards* — and that is
   * the caller's business, not this method's. `discharge` fires; the
   * capability mixin that called it has already spent the charge,
   * drained the reader's reserve, or consumed the flask.
   *
   * It runs **no band gate and no cast time** (an item ignores the
   * spell's casting profile wholesale — requirements D3), and it
   * **credits no Transcript** (firing a wand teaches nothing; competence
   * derives from deeds). Potency comes from the item's maker-fixed
   * delivery efficiency rather than the user's competence, which is why
   * a novice with a master's wand outperforms that novice casting.
   *
   * **The actor is derived from the execution context**, never passed —
   * the `ProvenanceApi.recordAuthoring` precedent. The effect context of
   * D1 is internal plumbing beneath this gate.
   */
  public static discharge(item: Stuff, target?: Stuff): Promise<CastOutcome> {
    return logic().discharge(item, target);
  }

  /**
   * The `spells` self-view model — the roster with per-cell band status
   * plus the faculty view. **Bands and prose only, never numbers.**
   */
  public static spellsView(caster: Stuff): Promise<SpellsView> {
    return logic().spellsView(caster);
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
