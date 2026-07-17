// ThermalLogic — the hot-reloadable logic singleton behind ThermalApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';

const ThermalApiCallers = SecurityPolicies.FromModule(
  '/api/thermal#ThermalApi',
);

/**
 * ThermalLogic — the hot-reloadable logic singleton behind
 * {@link ThermalApi}.
 *
 * Lives at `/obj/api/thermal` (a stateless `Stuff` singleton, no backing
 * `Template`); `ThermalApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Homes the **heat-delivery** primitives the
 * mixin-only `ThermalMixin` deliberately kept off its own class surface:
 * `depositHeat` (raise an object's temperature by `ΔT = Q/C`) drives ignition,
 * spread, and phase change; the phase-change reconcile and the inert
 * crafting-reachability read join it in later phases. Holds NO state and NO
 * tick handles — every method is a pure per-call computation over the host's
 * shipped `ThermalMixin` reconcile. Internal sub-logic (when it lands) lives
 * in module-private free functions, so there are no intra-singleton
 * `this.x()` calls to trip the gate; each public method carries the
 * `FromModule` gate. `dest /obj/api/thermal` reloads it.
 *
 * @internal
 */
@Unshadowable
export class ThermalLogic extends ApiLogic {
  /** See {@link ThermalApi.depositHeat}. */
  @CallSecurity(ThermalApiCallers)
  public depositHeat(stuff: Stuff, joules: number): void {
    if (!MixinApi.isThermal(stuff)) return;
    stuff.depositHeat(joules);
  }
}
