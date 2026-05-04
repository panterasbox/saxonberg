/**
 * Interactive - Runtime connection state object.
 *
 * Represents an active WebSocket connection. This is a RUNTIME object —
 * not persisted to the database.
 *
 * Holds a reference to the authenticated User (stamped by Application
 * before handoff to Login). Avatar loading iterates `user.playerIds` and
 * threads `{ user, playerId }` into `StuffApi.clone` as context so each
 * Avatar.postRegister() sees its owning user synchronously.
 *
 * The back-reference to whoever currently owns the connection is the
 * generic `holder: HasInteractive | null`. During the entry procedure,
 * the `Login` is the holder; after `switchAvatar` runs, the chosen
 * `Avatar` is the holder. Consumers that need an Avatar specifically
 * should narrow with `instanceof Avatar` (Avatar's the only HasInteractive
 * besides Login today, but adding a third — a Bot or a Spirit — is the
 * whole point of this abstraction).
 *
 * Lifetime: created when a user connects, destroyed when the connection
 * drops.
 */

import { Idea } from '../lib/stuff/Idea';
import { StuffApi } from '../api/stuff';
import { PlayerApi } from '../api/player';
import { DescribeApi } from '../api/describe';
import type { Stuff } from '../lib/stuff/Stuff';
import type { User } from '../lib/identity/User';
import type { Avatar } from './Avatar';
import type { HasInteractive } from '../lib/connection/HasInteractive';

export class Interactive extends Idea {
  socketId: string;
  sessionId: string;
  user: User;
  connectedAt: Date;

  /**
   * Whoever currently owns this connection. Set to a `Login` for the
   * entry procedure, then to the chosen `Avatar` after `switchAvatar`
   * runs. Always a Stuff at runtime — `HasInteractiveMixin` only
   * composes onto Stuff — so the typed intersection captures that.
   */
  holder: (HasInteractive & Stuff) | null = null;

  /**
   * Available Avatars for this user's characters (playerId → Avatar).
   * Forward-typed because `availableAvatars` is the concrete avatar
   * registry, not the back-reference.
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
   * Switch to a different Avatar (character switching). Replaces the
   * current `holder` (which may be a `Login` during entry, an existing
   * `Avatar` after a previous switch, or null on first switch).
   */
  public async switchAvatar(playerId: string): Promise<Avatar> {
    if (this.holder) {
      this.holder.removeInteractive(this);
    }

    const newAvatar = this.availableAvatars.get(playerId);
    if (!newAvatar) {
      throw new Error(
        `Interactive.switchAvatar(): Avatar not found for playerId: ${playerId}`
      );
    }

    newAvatar.addInteractive(this);
    this.holder = newAvatar;
    return newAvatar;
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
    if (this.holder) {
      this.holder.removeInteractive(this);
      this.holder = null;
    }
    this.availableAvatars.clear();
  }

  public toString(): string {
    const holderInfo = this.holder
      ? ` holder=${DescribeApi.getDisplayName(this.holder, '?')}`
      : '';
    return `[Interactive socketId=${this.socketId} userId=${this.userId ?? '(unsaved)'}${holderInfo}]`;
  }
}
