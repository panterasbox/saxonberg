/**
 * ConditionApi — the gated facade over the vitals **condition** surface:
 * inflicted trauma + afflictions, the one home for inflicted status
 * effects on a body. (Reserves and transient combat flags are NOT
 * conditions and stay out.)
 *
 * Its keystone is the **inflict producer**: the single gated seam every
 * harm source (this build's floor-glass hazard, later combat, later
 * environmental hazards) calls to wound a body. `inflict(target, {
 * mechanism, site, energy })` builds a {@link Trauma} and lands it through
 * the `VitalsMixin.afflict()` door; the wound then progresses / heals /
 * kills **reconcile-on-read** (`VitalsMixin.reconcileConditions`, the
 * metabolism / thermal / respiration precedent — no recurring push tick,
 * no re-arm seam). The facade also forwards the plain condition mutators
 * (`afflict` / `relieve`) and a query (`conditionsOf`).
 *
 * `inflict` is a **powerful primitive** — it must not be callable by
 * arbitrary content. The logic lives in the gated, hot-reloadable
 * {@link ConditionLogic} singleton at `/obj/api/condition` (its methods
 * carry `@CallSecurity(FromModule('/api/condition#ConditionApi'))`, so only
 * this Api forwards in); this Api is the thin forwarding shell trusted
 * producers reach. The **inflicter is un-spoofable** — derived from
 * execution context inside `ConditionLogic`
 * (`ExecutionContextApi.getActingAuthor`), never a caller-supplied
 * parameter (the gated-Api actor-from-context rule). `dest
 * /obj/api/condition` reloads it.
 *
 * See `docs/subsystems/harm.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type {
  ActiveCondition,
  Mechanism,
  Trauma,
} from '../lib/vitals/Condition';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { ConditionLogic } from '../obj/api/ConditionLogic';
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

const LOGIC_PATH = '/obj/api/condition';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ConditionLogic', import.meta.url)
);

/** Resolve the HMR-able ConditionLogic singleton (sync). */
function logic(): ConditionLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ConditionLogic'
      ) as typeof ConditionLogic | null) ?? ConditionLogic)()
  );
}

export class ConditionApi {
  /**
   * Wound `target`. Builds a {@link Trauma} from `spec` (mechanism →
   * `TraumaType`, `energy` → severity, `mechanism` recorded raw), stamps
   * the context-derived inflicter, afflicts it through `VitalsMixin`, runs
   * the trauma's `onset`, and stamps the reconcile-on-read `tickedAt`
   * anchor. No-op-afflict (`afflicted: false`) when `target` is not a
   * wound-able body.
   */
  public static inflict(target: Stuff, spec: InflictSpec): InflictOutcome {
    return logic().inflict(target, spec);
  }

  /**
   * Add a condition to `target` — a `Trauma` value or an
   * `AfflictionRecord` — through the `VitalsMixin.afflict()` door. A no-op
   * for a non-wound-able (non-`Vitals`) target. The bounded gated facade
   * over the body's own condition mutator (internal drivers — metabolism,
   * respiration — keep calling the body method directly).
   */
  public static afflict(target: Stuff, condition: ActiveCondition): void {
    logic().afflict(target, condition);
  }

  /**
   * Remove a condition from `target` by reference; returns true iff it was
   * present. A no-op (`false`) for a non-`Vitals` target. The facade over
   * the body's own `relieve`.
   */
  public static relieve(target: Stuff, condition: ActiveCondition): boolean {
    return logic().relieve(target, condition);
  }

  /**
   * Read `target`'s active conditions (both kinds, one collection). Returns
   * an empty array for a non-`Vitals` target. Reconcile-on-read applies —
   * a just-healed wound is already gone from the returned list.
   */
  public static conditionsOf(target: Stuff): readonly ActiveCondition[] {
    return logic().conditionsOf(target);
  }

  /**
   * Binary **coverage-presence** read: is `partKey` covered by any worn
   * item on `host`? Resolves the body plan's `getSlotsCovering(partKey)`
   * (the `covers` edge, not `bodyPart`) and returns true iff any covering
   * slot holds a worn (`Wearable`) occupant. No materials / degree — the
   * mitigation *curve* is deferred to materials-response. Used by the
   * floor hazard's barefoot gate (shoes protect; barefoot cuts).
   */
  public static isSiteCovered(host: Stuff, partKey: string): boolean {
    return logic().isSiteCovered(host, partKey);
  }
}

SecurityApi.decorateApiClass(ConditionApi);
