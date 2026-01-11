/**
 * Interactive - Runtime connection state object
 *
 * Represents an active WebSocket connection.
 * This is a RUNTIME object - it is NOT persisted to the database.
 *
 * Responsibilities:
 * - Track WebSocket connection (socketId, sessionId)
 * - Link to Avatar (the player's game presence)
 * - Connection lifecycle management
 *
 * Does NOT:
 * - Store user/player data (that's Avatar's job)
 *
 * Lifetime: Created when user connects, destroyed when user disconnects.
 */

import { Idea } from '../stuff/Idea.js';
import type { Avatar } from '../../obj/Avatar.js';

/**
 * Interactive connection state (runtime only).
 */
export class Interactive extends Idea {
  /**
   * Socket ID for this connection (from WebSocket).
   */
  socketId: string;

  /**
   * Session ID (from express-session).
   */
  sessionId: string;

  /**
   * Connection timestamp.
   */
  connectedAt: Date;

  /**
   * Reference to the Avatar object.
   * Avatar holds user/player data and game state.
   */
  avatar?: Avatar;

  /**
   * Constructor.
   *
   * @param socketId - WebSocket socket ID
   * @param sessionId - Express session ID
   */
  constructor(socketId: string, sessionId: string) {
    super(); // Auto-registers with StuffApi

    this.socketId = socketId;
    this.sessionId = sessionId;
    this.connectedAt = new Date();
  }

  /**
   * Link this Interactive to an Avatar object.
   * Creates bidirectional link between Interactive and Avatar.
   *
   * @param avatar - The Avatar object
   */
  public linkAvatar(avatar: Avatar): void {
    this.avatar = avatar;
  }

  /**
   * Unlink the Avatar.
   */
  public unlinkAvatar(): void {
    this.avatar = undefined;
  }

  /**
   * Get connection duration in milliseconds.
   */
  public getConnectionDuration(): number {
    return Date.now() - this.connectedAt.getTime();
  }

  /**
   * Cleanup hook (called on disconnect).
   * Unlinks avatar reference.
   */
  protected prepareDestroy(): void {
    // Unlink avatar if present
    if (this.avatar) {
      this.unlinkAvatar();
    }
  }

  /**
   * String representation.
   */
  public toString(): string {
    const avatarInfo = this.avatar ? ` avatar=${this.avatar.fullName}` : '';
    return `[Interactive socketId=${this.socketId}${avatarInfo}]`;
  }
}
