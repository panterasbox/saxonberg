/**
 * ConnectionApi - Public API for connection queries
 *
 * This is the public interface for mudlib code to query connection state.
 * It delegates to ConnectionManager (privileged) but only exposes safe operations.
 *
 * Mudlib code should use this API, not access ConnectionManager directly.
 * With future call security, access to ConnectionManager will be restricted.
 *
 * This is an Api (public) - stateless interface to privileged Manager.
 */

import { ConnectionManager } from '../../backend/ConnectionManager';
import type { Interactive } from '../obj/Interactive';
import type { Stuff } from '../lib/stuff/Stuff';
import type { HasInteractive } from '../lib/connection/HasInteractive';
import { SecurityApi } from './security';
import { EventApi } from './event';
import { Events } from '../lib/events';

/**
 * Static API for connection queries (public interface for mudlib).
 */
export class ConnectionApi {
  /**
   * Get an Interactive by socket ID.
   * Safe read-only operation for mudlib.
   *
   * @param socketId - Socket ID to look up
   * @returns Interactive or undefined if not found
   */
  public static getInteractive(socketId: string): Interactive | undefined {
    return ConnectionManager.get().getInteractive(socketId);
  }

  /**
   * Get all active Interactive connections.
   * Safe read-only operation for mudlib.
   *
   * @returns Array of all Interactive objects
   */
  public static getAllInteractives(): Interactive[] {
    return ConnectionManager.get().getAllInteractives();
  }

  /**
   * Get count of active connections.
   * Safe read-only operation for mudlib.
   *
   * @returns Number of active connections
   */
  public static getConnectionCount(): number {
    return ConnectionManager.get().getConnectionCount();
  }

  /**
   * Check if a socket ID has an active connection.
   * Safe read-only operation for mudlib.
   *
   * @param socketId - Socket ID to check
   * @returns True if connection exists
   */
  public static hasConnection(socketId: string): boolean {
    return ConnectionManager.get().hasConnection(socketId);
  }

  /**
   * Get all socket IDs.
   * Safe read-only operation for mudlib.
   *
   * @returns Array of socket IDs
   */
  public static getSocketIds(): string[] {
    return ConnectionManager.get().getSocketIds();
  }

  // Note: createInteractive and removeInteractive are NOT exposed here.
  // Those are privileged operations that only Application/Backend should perform.

  /**
   * Route an Interactive to a new holder. Idempotent on the same target.
   *
   * This is **connection routing**, not character control or
   * "operate on this avatar" — `target` is intentionally the broad
   * `HasInteractive` set (Login during entry, Avatar during play, any
   * future Bot/Spirit). Code that needs to act on an avatar
   * specifically should narrow with `instanceof Avatar` (or
   * `MixinApi.isCommandGiver` for command dispatch).
   *
   * Mechanics: removes `interactive` from its previous holder (if any),
   * adds it to `target` via the `HasInteractiveMixin` primitives, and
   * updates `interactive.holder`.
   */
  public static transfer(
    interactive: Interactive,
    target: HasInteractive & Stuff
  ): void {
    const previous = interactive.holder;
    if (previous === target) return;
    const previousLinkdead = previous?.isLinkdead() ?? true;
    const targetLinkdead = target.isLinkdead();

    if (previous) {
      previous.removeInteractive(interactive);
    }
    target.addInteractive(interactive);
    interactive.holder = target;

    // Fire Witness hooks AFTER state mutation. Per-connection
    // notifications fire for both endpoints; presence transitions
    // fire only when the count crosses 0.
    if (previous) {
      callConnHook(previous, 'onConnectionDetached', []);
      if (!previousLinkdead && previous.isLinkdead()) {
        callConnHook(previous, 'onLinkdead', []);
      }
    }
    callConnHook(target, 'onConnectionAttached', [interactive]);
    if (targetLinkdead && !target.isLinkdead()) {
      callConnHook(target, 'onLinkRestored', []);
    }

    // Cross-cutting global event for any observer that doesn't care
    // about a specific holder. Fires once per attach regardless of
    // whether the per-holder Witness hook is implemented.
    EventApi.emit(Events.ConnectionAttached, {
      interactiveId: interactive.stuffId,
      holderId: target.stuffId,
    });
  }

  /**
   * Detach an Interactive from its current holder. After detach,
   * `interactive.holder` is null. Used at disconnect / cleanup
   * (`Interactive.prepareDestroy` calls this).
   *
   * No-op when there's no current holder.
   */
  public static detach(interactive: Interactive): void {
    const previous = interactive.holder;
    if (!previous) return;
    const wasConnected = !previous.isLinkdead();
    previous.removeInteractive(interactive);
    interactive.holder = null;

    callConnHook(previous, 'onConnectionDetached', []);
    if (wasConnected && previous.isLinkdead()) {
      callConnHook(previous, 'onLinkdead', []);
    }
  }
}

function callConnHook(obj: object, name: string, args: unknown[]): void {
  const fn = (obj as Record<string, unknown>)[name];
  if (typeof fn !== 'function') return;
  (fn as (...a: unknown[]) => void).apply(obj, args);
}


SecurityApi.decorateApiClass(ConnectionApi);
