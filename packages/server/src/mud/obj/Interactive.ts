/**
 * Interactive - Runtime connection state object.
 *
 * Represents an active WebSocket connection. This is a RUNTIME object —
 * not persisted to the database.
 *
 * Holds a reference to the authenticated User (stamped by Application
 * before handoff to Login). Avatar loading iterates `user.playerIds` and
 * threads `{ user, playerId }` into `StuffApi.clone` as context so each
 * Avatar.initialize() sees its owning user synchronously.
 *
 * Lifetime: created when a user connects, destroyed when the connection
 * drops.
 */

import { Idea } from '../lib/stuff/Idea';
import { StuffApi } from '../api/stuff';
import { PlayerApi } from '../api/player';
import type { User } from '../lib/identity/User';
import type { Avatar } from './Avatar';

export class Interactive extends Idea {
  socketId: string;
  sessionId: string;
  user: User;
  connectedAt: Date;

  currentAvatar: Avatar | null = null;

  /**
   * Available Avatars for this user's characters (playerId → Avatar).
   */
  availableAvatars: Map<string, Avatar> = new Map();

  constructor(socketId: string, sessionId: string, user: User) {
    super();

    this.socketId = socketId;
    this.sessionId = sessionId;
    this.user = user;
    this.connectedAt = new Date();
  }

  /**
   * Convenience: owning user's `_id`. May be undefined for an unsaved
   * User (primarily relevant in tests).
   */
  get userId(): string | undefined {
    return this.user._id;
  }

  /**
   * Clone each of the user's avatar templates into runtime Avatars
   * (reusing any that another connection already loaded for multiplexing).
   */
  public async loadAvailableAvatars(): Promise<void> {
    const { Avatar: AvatarClass } = await import('./Avatar');

    for (const playerId of this.user.playerIds) {
      let avatar = PlayerApi.findAvatarByPlayerId(playerId);

      if (!avatar) {
        avatar = await StuffApi.clone<Avatar>(
          AvatarClass.getTemplatePath(playerId),
          { user: this.user, playerId }
        );
      }

      this.availableAvatars.set(playerId, avatar);
    }
  }

  /**
   * Switch to a different Avatar (character switching).
   */
  public async switchAvatar(playerId: string): Promise<void> {
    if (this.currentAvatar) {
      this.currentAvatar.removeInteractive(this);
    }

    const newAvatar = this.availableAvatars.get(playerId);
    if (!newAvatar) {
      throw new Error(
        `Interactive.switchAvatar(): Avatar not found for playerId: ${playerId}`
      );
    }

    newAvatar.addInteractive(this);
    this.currentAvatar = newAvatar;
  }

  /**
   * Stub for client messaging. Actual delivery runs through
   * Application.sendMessageToInteractive().
   */
  public send(message: unknown): void {
    console.log(`Interactive.send(): Message to ${this.socketId}:`, message);
  }

  public getConnectionDuration(): number {
    return Date.now() - this.connectedAt.getTime();
  }

  protected prepareDestroy(): void {
    if (this.currentAvatar) {
      this.currentAvatar.removeInteractive(this);
      this.currentAvatar = null;
    }
    this.availableAvatars.clear();
  }

  public toString(): string {
    const avatarInfo = this.currentAvatar
      ? ` avatar=${this.currentAvatar.fullName}`
      : '';
    return `[Interactive socketId=${this.socketId} userId=${this.userId ?? '(unsaved)'}${avatarInfo}]`;
  }
}
