// ConnectionLogic — the hot-reloadable logic singleton behind
// ConnectionApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { ConnectionManager } from '../../../backend/ConnectionManager';
import type Interactive from '../Interactive';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { HasInteractive } from '../../lib/connection/HasInteractive';
import { EventApi } from '../../api/event';
import { Events } from '../../lib/events';

const ConnectionApiCallers = SecurityPolicies.FromModule(
  'mud/api/connection#ConnectionApi'
);

/**
 * ConnectionLogic — the hot-reloadable logic singleton behind
 * {@link ConnectionApi}.
 *
 * Lives at `/obj/api/connection` (a stateless `Stuff` singleton, no
 * backing `Template`); `ConnectionApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`). 0-guts: every
 * method forwards to the privileged `ConnectionManager` and makes no
 * intra-singleton self-calls, so the plain `FromModule` gate suffices.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
export class ConnectionLogic extends Idea {
  /** See {@link ConnectionApi.getInteractive}. */
  @CallSecurity(ConnectionApiCallers)
  public getInteractive(socketId: string): Interactive | undefined {
    return ConnectionManager.get().getInteractive(socketId);
  }

  /** See {@link ConnectionApi.getAllInteractives}. */
  @CallSecurity(ConnectionApiCallers)
  public getAllInteractives(): Interactive[] {
    return ConnectionManager.get().getAllInteractives();
  }

  /** See {@link ConnectionApi.getConnectionCount}. */
  @CallSecurity(ConnectionApiCallers)
  public getConnectionCount(): number {
    return ConnectionManager.get().getConnectionCount();
  }

  /** See {@link ConnectionApi.hasConnection}. */
  @CallSecurity(ConnectionApiCallers)
  public hasConnection(socketId: string): boolean {
    return ConnectionManager.get().hasConnection(socketId);
  }

  /** See {@link ConnectionApi.getSocketIds}. */
  @CallSecurity(ConnectionApiCallers)
  public getSocketIds(): string[] {
    return ConnectionManager.get().getSocketIds();
  }

  /** See {@link ConnectionApi.transfer}. */
  @CallSecurity(ConnectionApiCallers)
  public transfer(
    interactive: Interactive,
    target: HasInteractive & Stuff
  ): void {
    const previous = interactive.getHolder();
    if (previous === target) return;
    const previousLinkdead = previous?.isLinkdead() ?? true;
    const targetLinkdead = target.isLinkdead();

    if (previous) {
      previous.removeInteractive(interactive);
    }
    target.addInteractive(interactive);
    interactive.setHolder(target);

    // Fire Witness hooks AFTER state mutation. Per-connection
    // notifications fire for both endpoints; presence transitions
    // fire only when the count crosses 0.
    if (previous) {
      previous.onConnectionDetached?.();
      if (!previousLinkdead && previous.isLinkdead()) {
        previous.onLinkdead?.();
      }
    }
    target.onConnectionAttached?.(interactive);
    if (targetLinkdead && !target.isLinkdead()) {
      target.onLinkRestored?.();
    }

    // Cross-cutting global event for any observer that doesn't care
    // about a specific holder. Fires once per attach regardless of
    // whether the per-holder Witness hook is implemented.
    EventApi.emit(Events.ConnectionAttached, {
      interactiveId: interactive.stuffId,
      holderId: target.stuffId,
    });
  }

  /** See {@link ConnectionApi.detach}. */
  @CallSecurity(ConnectionApiCallers)
  public detach(interactive: Interactive): void {
    const previous = interactive.getHolder();
    if (!previous) return;
    const wasConnected = !previous.isLinkdead();
    previous.removeInteractive(interactive);
    interactive.setHolder(null);

    previous.onConnectionDetached?.();
    if (wasConnected && previous.isLinkdead()) {
      previous.onLinkdead?.();
    }
  }
}
