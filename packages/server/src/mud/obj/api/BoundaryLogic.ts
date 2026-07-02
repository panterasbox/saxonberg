// BoundaryLogic — the hot-reloadable logic singleton behind BoundaryApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Boundary } from '../../lib/boundary/Boundary';
import type { Adornable } from '../../lib/boundary/Adornable';
import { BoundaryAnchor } from '../../lib/boundary/BoundaryAnchor';
import { StuffApi } from '../../api/stuff';
import type {
  AttachExistingBoundaryOptions,
  CreateBoundaryOptions,
} from '../../api/boundary';

const BoundaryApiCallers = SecurityPolicies.FromModule('/api/boundary#BoundaryApi'
);

/**
 * BoundaryLogic — the hot-reloadable logic singleton behind
 * {@link BoundaryApi}.
 *
 * Lives at `/obj/api/boundary` (a stateless `Stuff` singleton, no
 * backing `Template`); `BoundaryApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`). The
 * install-on-two-hosts body shared by `attachExistingBoundary` and
 * `create` lives in the module-private `installBoundary` free function
 * (off-class, ungated, un-callable from outside), so the async `create`
 * doesn't make an intra-singleton `this.attachExistingBoundary()`
 * self-call that the gate would deny.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class BoundaryLogic extends ApiLogic {
  /** See {@link BoundaryApi.attachExistingBoundary}. */
  @CallSecurity(BoundaryApiCallers)
  public attachExistingBoundary<T extends Boundary>(
    opts: AttachExistingBoundaryOptions<T>
  ): T {
    return installBoundary(opts.boundary, opts.hostA, opts.hostB);
  }

  /** See {@link BoundaryApi.create}. */
  @CallSecurity(BoundaryApiCallers)
  public async create<T extends Boundary>(
    opts: CreateBoundaryOptions<T>
  ): Promise<T> {
    const { factory, hostA, hostB } = opts;
    const boundary = await StuffApi.create(factory);
    return installBoundary(boundary, hostA, hostB);
  }

  /** See {@link BoundaryApi.destruct}. */
  @CallSecurity(BoundaryApiCallers)
  public destruct(boundary: Boundary): void {
    StuffApi.destruct(boundary as unknown as Stuff);
  }
}

/**
 * Install an already-constructed Boundary on two hosts: create the two
 * `BoundaryAnchor`s, wire `boundary.anchorA`/`anchorB`, and call each
 * host's `addFixture(anchor)`. Returns the boundary for fluent
 * chaining.
 *
 * Rejects when the boundary already has anchors wired (use `destruct`
 * first to migrate). Rejects `hostA === hostB` (a Boundary connecting a
 * room to itself has no use case in v1 and would confuse the
 * `getOtherHost` walk).
 */
function installBoundary<T extends Boundary>(
  boundary: T,
  hostA: Stuff & Adornable,
  hostB: Stuff & Adornable
): T {
  if (hostA === hostB) {
    throw new Error(
      'BoundaryApi.attachExistingBoundary: hostA and hostB must differ.'
    );
  }
  if (boundary.getAnchorA() || boundary.getAnchorB()) {
    throw new Error(
      'BoundaryApi.attachExistingBoundary: boundary already has anchors; ' +
        'destruct or detach the boundary first.'
    );
  }

  const anchorA = StuffApi.createSync(() => new BoundaryAnchor('A'));
  const anchorB = StuffApi.createSync(() => new BoundaryAnchor('B'));

  anchorA._setBoundary(boundary);
  anchorB._setBoundary(boundary);
  boundary._setAnchors(anchorA, anchorB);

  hostA.addFixture(anchorA);
  hostB.addFixture(anchorB);

  return boundary;
}
