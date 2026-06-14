// ProseLogic — the hot-reloadable logic singleton behind ProseApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Mml } from '../../api/mml';
import { Prose, type FilterFn } from '../../lib/prose/Prose';

const ProseApiCallers = SecurityPolicies.FromModule('mud/api/prose#ProseApi');

/**
 * ProseLogic — the hot-reloadable logic singleton behind
 * {@link ProseApi}.
 *
 * Lives at `/obj/api/prose` (a stateless `Stuff` singleton, no backing
 * `Template`); `ProseApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The templating engine, default filters, and
 * the compiled {@link Prose} value object live in `lib/prose/Prose.ts`;
 * this singleton just threads the gated calls through to them.
 *
 * Each method carries the `FromModule` gate **per method** (a
 * class-level default would also deny the inherited `Stuff`/`Idea`
 * framework methods the framework itself invokes).
 *
 * @internal
 */
@Unshadowable
export class ProseLogic extends Idea {
  /** See {@link ProseApi.format}. */
  @CallSecurity(ProseApiCallers)
  public format(source: string, vars: Record<string, unknown>): Mml {
    return Prose.parse(source).render(vars);
  }

  /** See {@link ProseApi.registerFilter}. */
  @CallSecurity(ProseApiCallers)
  public registerFilter(name: string, fn: FilterFn): void {
    Prose.registerFilter(name, fn);
  }
}
