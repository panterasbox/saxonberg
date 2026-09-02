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
 * `/platform/idea/api/connection`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/connection` reloads it.
 */

import type { EnvelopeTemplate, MessageFrame } from '@saxonberg/types';
import type Interactive from '../platform/idea/Interactive';
import type { Stuff } from '../lib/stuff/Stuff';
import type { HasInteractive } from '../lib/connection/HasInteractive';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ConnectionLogic } from '../platform/idea/api/ConnectionLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/connection';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ConnectionLogic', import.meta.url)
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
   * Run one inbound message from `socketId` in its lane, on a fresh
   * root frame carrying the socket's circle scope.
   *
   * **Two lanes.** Ordinary messages process in arrival order, so a
   * player's commands cannot overtake each other. A prompt reply
   * (`prompt-response` / `prompt-cancel`) rides a second lane: it is
   * addressed by `promptId` rather than by position — an interrupt,
   * which is what a prompt is — and a command awaiting a prompt cannot
   * settle until the reply lands, so sharing one lane deadlocks the
   * socket. The second lane keeps replies ordered against each other
   * without ever waiting on a command.
   *
   * `run` is invoked when the lane reaches it, and is expected to
   * plant its own root frame — `ExecutionContextApi`'s frame mutators
   * are gated to boundary files, and a lane is not a boundary. This
   * decides WHEN a message runs; the transport decides what frame it
   * runs in.
   *
   * Never throws to the caller and never returns a promise: the
   * transport's job is to hand the message over, not to await a turn.
   *
   * Ungated like its `ConnectionApi` siblings — the caller is the
   * WebSocket transport, which sits outside the mudlib and so cannot
   * be named by a `FromModule` policy.
   */
  public static sequenceInbound(
    socketId: string,
    messageType: string,
    run: () => Promise<void>,
  ): void {
    logic().sequenceInbound(socketId, messageType, run);
  }

  /** Drop a closed socket's lanes. Called on disconnect. */
  public static clearInboundSequencing(socketId: string): void {
    logic().clearInboundSequencing(socketId);
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
   * The connecting player's origin, by playerId. Returns **country only**
   * (a display name, broadly readable) — the raw IP never leaves the
   * connection layer (the developer-gated IP read is deferred). Empty
   * object when the player isn't connected or geo didn't resolve
   * (localhost / private IP / unknown). The social presence relay reads
   * `originOf(player).country` for the "from <country>" arrival line.
   */
  public static originOf(playerId: string): ConnectionOrigin {
    return logic().originOf(playerId);
  }


}

/**
 * A connection's geographic origin, privilege-split. v1 surfaces only
 * `country` (broadly readable); the raw IP stays in the connection layer
 * (the developer-gated read is a later build). See the connection-origin
 * slate.
 */
export interface ConnectionOrigin {
  /** Country display name (e.g. "Germany"), or absent when unresolved. */
  country?: string;
}

SecurityApi.decorateApiClass(ConnectionApi);
