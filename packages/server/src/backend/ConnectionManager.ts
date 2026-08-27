/**
 * ConnectionManager - Manages active WebSocket connections
 *
 * This is a privileged singleton that tracks all active Interactive connections.
 * Mudlib code should access this through ConnectionApi, not directly.
 *
 * Responsibilities:
 * - Track interactivesBySocketId map
 * - Create/destroy Interactive objects
 * - Connection queries and statistics
 *
 * This is a Manager (privileged) - has state and business logic.
 */

import Interactive from '../mud/platform/idea/Interactive';
import { StuffApi } from '../mud/api/stuff';
import type { User } from '../mud/lib/identity/User';

/**
 * ConnectionManager - Singleton for connection state management.
 */
export class ConnectionManager {
  private static instance: ConnectionManager;

  /**
   * Map of socket IDs to Interactive objects.
   * This tracks all active connections.
   */
  private interactivesBySocketId: Map<string, Interactive> = new Map();

  /**
   * Private constructor (singleton pattern).
   */
  private constructor() {}

  /**
   * Get the singleton instance.
   */
  public static get(): ConnectionManager {
    if (!this.instance) {
      this.instance = new ConnectionManager();
    }
    return this.instance;
  }

  /**
   * Create and register a new Interactive connection.
   *
   * @param socketId - WebSocket socket ID
   * @param sessionId - Express session ID
   * @param user - Authenticated User (already loaded by Application)
   * @returns The created Interactive object
   */
  public async createInteractive(
    socketId: string,
    sessionId: string,
    user: User
  ): Promise<Interactive> {
    if (this.interactivesBySocketId.has(socketId)) {
      console.warn(
        `ConnectionManager: Interactive already exists for socket ${socketId}`
      );
      return this.interactivesBySocketId.get(socketId)!;
    }

    const interactive = await StuffApi.create(
      () => new Interactive(socketId, sessionId, user)
    );

    this.interactivesBySocketId.set(socketId, interactive);

    console.info(
      `ConnectionManager: Created Interactive for socket ${socketId}, user ${user._id}`
    );

    return interactive;
  }

  /**
   * Remove and destroy an Interactive connection.
   *
   * @param socketId - Socket ID to remove
   * @returns True if Interactive was found and removed
   */
  public removeInteractive(socketId: string): boolean {
    const interactive = this.interactivesBySocketId.get(socketId);

    if (!interactive) {
      console.warn(
        `ConnectionManager: No Interactive found for socket ${socketId}`
      );
      return false;
    }

    // Destroy the Interactive (cleans up Avatar, etc.)
    StuffApi.destruct(interactive);

    // Remove from map
    this.interactivesBySocketId.delete(socketId);

    console.info(`ConnectionManager: Removed Interactive for socket ${socketId}`);

    return true;
  }

  /**
   * Get an Interactive by socket ID.
   *
   * @param socketId - Socket ID to look up
   * @returns Interactive or undefined if not found
   */
  public getInteractive(socketId: string): Interactive | undefined {
    return this.interactivesBySocketId.get(socketId);
  }

  /**
   * Get all active Interactive connections.
   *
   * @returns Array of all Interactive objects
   */
  public getAllInteractives(): Interactive[] {
    return Array.from(this.interactivesBySocketId.values());
  }

  /**
   * Get count of active connections.
   *
   * @returns Number of active connections
   */
  public getConnectionCount(): number {
    return this.interactivesBySocketId.size;
  }

  /**
   * Get all socket IDs.
   *
   * @returns Array of socket IDs
   */
  public getSocketIds(): string[] {
    return Array.from(this.interactivesBySocketId.keys());
  }

  /**
   * Check if a socket ID has an active connection.
   *
   * @param socketId - Socket ID to check
   * @returns True if connection exists
   */
  public hasConnection(socketId: string): boolean {
    return this.interactivesBySocketId.has(socketId);
  }

  /**
   * Clear all connections (for shutdown/testing).
   * WARNING: Does not send close messages or cleanup properly.
   * Use Backend.closeAllConnections() for proper shutdown.
   */
  public clearAll(): void {
    // Destroy all Interactives
    for (const interactive of this.interactivesBySocketId.values()) {
      StuffApi.destruct(interactive);
    }

    this.interactivesBySocketId.clear();

    console.info('ConnectionManager: Cleared all connections');
  }
}
