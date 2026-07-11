// ConditionLogic — the hot-reloadable logic singleton behind ConditionApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { ExecutionContextApi } from '../../api/execution-context';
import { WorldClockApi } from '../../api/worldclock';
import { StuffApi } from '../../api/stuff';
import { TemplatePaths } from '../../lib/paths';
import { HARM_DEFAULTS, TRAUMA_BEHAVIOR } from '../../lib/vitals/Condition';
import type {
  ActiveCondition,
  Mechanism,
  Trauma,
  TraumaType,
} from '../../lib/vitals/Condition';
import type { InflictSpec, InflictOutcome } from '../../api/condition';

const ConditionApiCallers = SecurityPolicies.FromModule(
  '/api/condition#ConditionApi'
);

/**
 * The bijective mechanism → trauma-type map. A small switch (NOT a
 * `type → number` severity table — that antipattern is barred): mechanism
 * chooses which trauma *behaves*, severity is the separate magnitude read.
 */
function mechanismToType(mechanism: Mechanism): TraumaType {
  switch (mechanism) {
    case 'sharp':
      return 'laceration';
    case 'blunt':
      return 'contusion';
    case 'crushing':
      return 'fracture';
    case 'thermal':
      return 'burn';
    case 'tearing':
      return 'avulsion';
  }
}

/**
 * The v1 severity magnitude function — `energy → severity`, linear via a
 * single dial. Magnitude-only: `mechanism` is recorded on the trauma but
 * does NOT modulate severity yet (the deferred materials-response seam).
 */
function severityFromEnergy(energy: number): number {
  return Math.max(0, energy) * HARM_DEFAULTS.SEVERITY_PER_ENERGY;
}

/**
 * Resolve the inflicter's durable `templatePath` from execution context —
 * the command-frame giver (non-forced, single-consistent) or the REST
 * acting-author stamp. Never a caller-supplied parameter (the gated-Api
 * actor-from-context rule); `undefined` for an environmental / far-cause
 * / unattributable insult (forced dispatch, cross-actor cascade).
 */
function resolveInflicter(): string | undefined {
  const author = ExecutionContextApi.getActingAuthor();
  if (author == null) return undefined;
  const path = (author as Stuff).getTemplatePath?.();
  return path ?? undefined;
}

/** In-session game-time seconds, or `null` when no world clock is running. */
function conditionNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}

/**
 * Binary coverage-presence: is `partKey` covered by a worn item? Resolves
 * the body plan's `getSlotsCovering(partKey)` (the `covers` edge — NOT
 * `bodyPart`; the `feet` slot couples to the foot parts via `covers`) and
 * returns true iff any covering slot holds a `Wearable` occupant. No
 * materials / degree (deferred). A module-private free function (no
 * intra-singleton self-call).
 */
function isSiteCoveredImpl(host: Stuff, partKey: string): boolean {
  if (!MixinApi.isOrganism(host) || !MixinApi.isSlotted(host)) return false;
  const covering = host.getSpecies()?.getBodyPlan()?.getSlotsCovering(partKey);
  if (!covering || covering.length === 0) return false;
  for (const spec of covering) {
    for (const occ of host.getOccupants(spec.name)) {
      if (MixinApi.isWearable(occ)) return true;
    }
  }
  return false;
}

/**
 * ConditionLogic — the hot-reloadable logic singleton behind
 * {@link ConditionApi}.
 *
 * Lives at `/obj/api/condition` (a stateless `Stuff` singleton, no backing
 * `Template`); `ConditionApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The gated **inflict producer**, the plain
 * condition mutators (`afflict` / `relieve`), the condition query, and the
 * coverage-presence read. Wound progression (bleed / heal / death) is
 * driven **reconcile-on-read** by `VitalsMixin.reconcileConditions` — this
 * singleton holds NO tick handles and NO in-memory state. Internal
 * sub-logic lives in module-private free functions, so there are no
 * intra-singleton `this.x()` calls to trip the gate. Each public method
 * carries the `FromModule` gate. `dest /obj/api/condition` reloads it.
 *
 * @internal
 */
@Unshadowable
export class ConditionLogic extends ApiLogic {
  /** See {@link ConditionApi.inflict}. */
  @CallSecurity(ConditionApiCallers)
  public inflict(target: Stuff, spec: InflictSpec): InflictOutcome {
    const type = mechanismToType(spec.mechanism);
    const trauma: Trauma = {
      kind: 'trauma',
      type,
      site: spec.site,
      severity: severityFromEnergy(spec.energy),
      mechanism: spec.mechanism,
    };
    const inflicter = resolveInflicter();
    if (inflicter !== undefined) trauma.inflictedBy = inflicter;

    // A non-wound-able target (a cart, a bare Idea) takes no trauma —
    // the outcome carries the built trauma but nothing is afflicted.
    if (!MixinApi.isVitals(target)) {
      return { trauma, afflicted: false };
    }

    // Stamp the reconcile-on-read anchor so the first read integrates only
    // the post-inflict span (a null clock leaves it unset — the first read
    // first-touches it). Run the type's onset (laceration opens the bleed)
    // and land it; progression is driven on read, no arming.
    const nowS = conditionNowSeconds();
    if (nowS !== null) trauma.tickedAt = nowS;
    TRAUMA_BEHAVIOR[type].onset(target, trauma);
    target.afflict(trauma);
    return { trauma, afflicted: true };
  }

  /** See {@link ConditionApi.afflict}. */
  @CallSecurity(ConditionApiCallers)
  public afflict(target: Stuff, condition: ActiveCondition): void {
    if (!MixinApi.isVitals(target)) return;
    target.afflict(condition);
  }

  /** See {@link ConditionApi.relieve}. */
  @CallSecurity(ConditionApiCallers)
  public relieve(target: Stuff, condition: ActiveCondition): boolean {
    if (!MixinApi.isVitals(target)) return false;
    return target.relieve(condition);
  }

  /** See {@link ConditionApi.conditionsOf}. */
  @CallSecurity(ConditionApiCallers)
  public conditionsOf(target: Stuff): readonly ActiveCondition[] {
    if (!MixinApi.isVitals(target)) return [];
    return target.getConditions();
  }

  /** See {@link ConditionApi.isSiteCovered}. */
  @CallSecurity(ConditionApiCallers)
  public isSiteCovered(host: Stuff, partKey: string): boolean {
    return isSiteCoveredImpl(host, partKey);
  }
}
