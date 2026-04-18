/**
 * Interactive - Runtime connection state object
 *
 * Represents an active WebSocket connection.
 * This is a RUNTIME object - it is NOT persisted to the database.
 *
 * Responsibilities:
 * - Track WebSocket connection (socketId, sessionId, userId)
 * - Track available Avatars for this user (multiple Players)
 * - Track current active Avatar (character switching support)
 * - Send messages to client via Backend
 * - Connection lifecycle management
 *
 * Key Features:
 * - Supports multiple Players per User (availableAvatars map)
 * - Supports character switching via switchAvatar()
 * - Multiplexing: Multiple Interactives can control same Avatar
 *
 * Lifetime: Created when user connects, destroyed when user disconnects.
 */

import { Idea } from '../lib/stuff/Idea';
import { StuffApi } from '../api/stuff';
import { Player } from '../lib/identity/Player';
import { PlayerApi } from '../api/player';
import type { Avatar } from './Avatar';

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
   * User ID (from authentication).
   */
  userId: string;

  /**
   * Connection timestamp.
   */
  connectedAt: Date;

  /**
   * Currently active Avatar (which character they're controlling).
   */
  currentAvatar: Avatar | null = null;

  /**
   * Available Avatars for this user (playerId → Avatar).
   * Maps all of the user's Players to their runtime Avatars.
   */
  availableAvatars: Map<string, Avatar> = new Map();

  /**
   * Constructor.
   *
   * @param socketId - WebSocket socket ID
   * @param sessionId - Express session ID
   * @param userId - User's MongoDB _id
   */
  constructor(socketId: string, sessionId: string, userId: string) {
    super(); // Generates stuffId

    this.socketId = socketId;
    this.sessionId = sessionId;
    this.userId = userId;
    this.connectedAt = new Date();
  }

  /**
   * Load all available Avatars for this user's Players.
   * Checks if Avatars already exist (from other connections), otherwise creates them.
   */
  public async loadAvailableAvatars(): Promise<void> {
    // Load all Players for this userId
    const players = await Player.find({ userId: this.userId });

    for (const player of players) {
      const playerId = player._id!;

      // Check if Avatar already exists (another Interactive might have loaded it)
      let avatar = PlayerApi.findAvatarByPlayerId(playerId);

      // Create if not exists
      if (!avatar) {
        const AvatarClass = (await import('./Avatar')).Avatar;
        avatar = await StuffApi.clone<Avatar>(AvatarClass.getTemplatePath(playerId));
      }

      this.availableAvatars.set(playerId, avatar);
    }

    console.log(`Interactive.loadAvailableAvatars(): Loaded ${this.availableAvatars.size} avatars for user ${this.userId}`);
  }

  /**
   * Switch to a different Avatar (character switching).
   * Removes Interactive from old Avatar, adds to new Avatar.
   *
   * @param playerId - Player ID to switch to
   */
  public async switchAvatar(playerId: string): Promise<void> {
    // Remove from old avatar
    if (this.currentAvatar) {
      this.currentAvatar.removeInteractive(this);
    }

    // Get new avatar
    const newAvatar = this.availableAvatars.get(playerId);
    if (!newAvatar) {
      throw new Error(`Interactive.switchAvatar(): Avatar not found for playerId: ${playerId}`);
    }

    // Add to new avatar
    newAvatar.addInteractive(this);
    this.currentAvatar = newAvatar;

    console.log(`Interactive.switchAvatar(): Switched to avatar ${newAvatar.fullName}`);

    // Send confirmation (Backend will handle sending)
    // Note: Backend.sendMessageToSocket() should be called by Application, not here
  }

  /**
   * Send a message to the client.
   * This is a stub - actual sending is done via Backend.sendMessageToSocket().
   * Application layer calls this method.
   *
   * @param message - Message to send
   */
  public send(message: any): void {
    // This is a stub for now - Backend handles actual sending
    // Application will call Backend.sendMessageToSocket(this.socketId, message)
    console.log(`Interactive.send(): Message to ${this.socketId}:`, message);
  }

  /**
   * Get connection duration in milliseconds.
   */
  public getConnectionDuration(): number {
    return Date.now() - this.connectedAt.getTime();
  }

  /**
   * Cleanup hook (called on disconnect).
   * Removes from current Avatar and clears available avatars.
   */
  protected prepareDestroy(): void {
    // Remove from current avatar
    if (this.currentAvatar) {
      this.currentAvatar.removeInteractive(this);
      this.currentAvatar = null;
    }

    // Clear available avatars
    this.availableAvatars.clear();
  }

  /**
   * String representation.
   */
  public toString(): string {
    const avatarInfo = this.currentAvatar ? ` avatar=${this.currentAvatar.fullName}` : '';
    return `[Interactive socketId=${this.socketId} userId=${this.userId}${avatarInfo}]`;
  }
}
