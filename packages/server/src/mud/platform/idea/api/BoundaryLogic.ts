// BoundaryLogic — the hot-reloadable logic singleton behind BoundaryApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Boundary } from '../../../lib/boundary/Boundary';
import type Exit from '../../../lib/boundary/Exit';
import { Lock } from '../../../lib/lock/Lock';

const BoundaryApiCallers = SecurityPolicies.FromModule('/api/boundary#BoundaryApi');

/**
 * The logic behind {@link BoundaryApi}: attaching a boundary to the exits
 * that are its sides, and letting them go.
 *
 * @internal
 */
@Unshadowable
export class BoundaryLogic extends ApiLogic {
  @CallSecurity(BoundaryApiCallers)
  public attach<T extends Boundary>(boundary: T, sides: readonly Exit[]): T {
    if (new Set(sides).size !== sides.length) {
      throw new Error('BoundaryApi.attach: the same exit cannot be both sides of a way.');
    }
    for (const side of sides) {
      const held = side.getBoundary();
      if (held && held !== boundary) {
        throw new Error(
          `BoundaryApi.attach: exit '${side.getDirection()}' already has a ` +
            `boundary (${held.getTemplatePath() ?? held.stuffId}); detach it first.`,
        );
      }
    }
    const fresh = sides.filter((s) => boundary.sideOf(s) === null);
    const [a, b] = boundary.getSides();
    const free = (a ? 0 : 1) + (b ? 0 : 1);
    if (fresh.length > free) {
      throw new Error(
        `BoundaryApi.attach: ${boundary.getTemplatePath() ?? boundary.stuffId} ` +
          `already has two sides; a way has only two.`,
      );
    }
    for (const side of sides) {
      boundary._attachSide(side);
      side._setBoundary(boundary);
    }
    return boundary;
  }

  @CallSecurity(BoundaryApiCallers)
  public detach(sides: readonly Exit[]): void {
    for (const side of sides) {
      const held = side.getBoundary();
      if (!held) continue;
      held._detachSide(side);
      side._setBoundary(null);
    }
  }

  @CallSecurity(BoundaryApiCallers)
  public mintKeyway(): string {
    return Lock.mintKeyway();
  }
}
