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
import type { Interactive } from '../lib/connection/Interactive';

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
}
