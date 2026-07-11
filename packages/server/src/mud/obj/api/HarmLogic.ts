// HarmLogic — the hot-reloadable logic singleton behind HarmApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { ExecutionContextApi } from '../../api/execution-context';
import {
  HARM_DEFAULTS,
  TRAUMA_BEHAVIOR,
} from '../../lib/vitals/Condition';
import type {
  Mechanism,
  Trauma,
  TraumaType,
} from '../../lib/vitals/Condition';
import type { InflictSpec, InflictOutcome } from '../../api/harm';

const HarmApiCallers = SecurityPolicies.FromModule('/api/harm#HarmApi');

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

/**
 * HarmLogic — the hot-reloadable logic singleton behind {@link HarmApi}.
 *
 * Lives at `/obj/api/harm` (a stateless `Stuff` singleton, no backing
 * `Template`); `HarmApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The gated **inflict producer** + (later phases)
 * the recurring wound-tick driver, the bleed→death stamp, and the coverage
 * read. Internal sub-logic lives in module-private free functions, so there
 * are no intra-singleton `this.x()` calls to trip the gate. Each public
 * method carries the `FromModule` gate. `dest /obj/api/harm` reloads it.
 *
 * @internal
 */
@Unshadowable
export class HarmLogic extends ApiLogic {
  /** See {@link HarmApi.inflict}. */
  @CallSecurity(HarmApiCallers)
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

    // Run the type's onset (laceration sets `bleeding`), then land it.
    TRAUMA_BEHAVIOR[type].onset(target, trauma);
    target.afflict(trauma);
    return { trauma, afflicted: true };
  }
}
