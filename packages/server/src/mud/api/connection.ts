/**
 * ConnectionApi - Public API for connection queries
 *
 * This is the public interface for mudlib code to query connection state.
 * It delegates to ConnectionManager (privileged) but only exposes safe operations.
 *
 * Mudlib code should use this API, not access ConnectionManager directly.
 * With future call security, access to ConnectionManager will be restricted.
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link ConnectionLogic} singleton at
 * `/obj/api/connection`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/connection` reloads it.
 */

import type Interactive from '../obj/Interactive';
import type { Stuff } from '../lib/stuff/Stuff';
import type { HasInteractive } from '../lib/connection/HasInteractive';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { ConnectionLogic } from '../obj/api/ConnectionLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/connection';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ConnectionLogic', import.meta.url)
);

/** Resolve the HMR-able ConnectionLogic singleton (sync). */
function logic(): ConnectionLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ConnectionLogic'
      ) as typeof ConnectionLogic | null) ?? ConnectionLogic)()
  );
}

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
    return logic().getInteractive(socketId);
  }

  /**
   * Get all active Interactive connections.
   * Safe read-only operation for mudlib.
   *
   * @returns Array of all Interactive objects
   */
  public static getAllInteractives(): Interactive[] {
    return logic().getAllInteractives();
  }

  /**
   * Get count of active connections.
   * Safe read-only operation for mudlib.
   *
   * @returns Number of active connections
   */
  public static getConnectionCount(): number {
    return logic().getConnectionCount();
  }

  /**
   * Check if a socket ID has an active connection.
   * Safe read-only operation for mudlib.
   *
   * @param socketId - Socket ID to check
   * @returns True if connection exists
   */
  public static hasConnection(socketId: string): boolean {
    return logic().hasConnection(socketId);
  }

  /**
   * Get all socket IDs.
   * Safe read-only operation for mudlib.
   *
   * @returns Array of socket IDs
   */
  public static getSocketIds(): string[] {
    return logic().getSocketIds();
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
    return logic().transfer(interactive, target);
  }

  /**
   * Detach an Interactive from its current holder. After detach,
   * `interactive.holder` is null. Used at disconnect / cleanup
   * (`Interactive.onDestruct` calls this).
   *
   * No-op when there's no current holder.
   */
  public static detach(interactive: Interactive): void {
    return logic().detach(interactive);
  }
}


SecurityApi.decorateApiClass(ConnectionApi);
