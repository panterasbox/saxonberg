// ArrayLogic — the hot-reloadable logic singleton behind ArrayApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';

const ArrayApiCallers = SecurityPolicies.FromModule('mud/api/array#ArrayApi');

/**
 * ArrayLogic — the hot-reloadable logic singleton behind
 * {@link ArrayApi}.
 *
 * Lives at `/obj/api/array` (a stateless `Stuff` singleton, no backing
 * `Template`); `ArrayApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`): `dest` is the
 * reload invalidator and the next `singletonSync` re-creates against
 * the current blueprint.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level: a class-level default would also cover the inherited
 * `Stuff`/`Idea` framework methods the framework itself invokes (whose
 * caller is `StuffApi`, not `ArrayApi`) — and they'd be denied.
 *
 * @internal
 */
export class ArrayLogic extends Idea {
  /** See {@link ArrayApi.equal}. */
  @CallSecurity(ArrayApiCallers)
  public equal<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /** See {@link ArrayApi.isPrefix}. */
  @CallSecurity(ArrayApiCallers)
  public isPrefix<T>(
    prefix: ReadonlyArray<T>,
    full: ReadonlyArray<T>
  ): boolean {
    if (prefix.length > full.length) return false;
    for (let i = 0; i < prefix.length; i++) {
      if (prefix[i] !== full[i]) return false;
    }
    return true;
  }
}
