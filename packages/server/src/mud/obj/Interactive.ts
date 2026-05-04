/**
 * Interactive - Runtime connection state object.
 *
 * Represents an active WebSocket connection. Runtime-only — not
 * persisted. Holds:
 *   - The authenticated `User` (stamped by Application before handoff
 *     to Login).
 *   - The `holder`: whoever currently owns this connection — a `Login`
 *     during entry, an `Avatar` (or another `HasInteractive`) after the
 *     entry handoff. Routing is done through `ConnectionApi.transfer`
 *     and `ConnectionApi.detach`; this class doesn't perform the
 *     routing itself.
 *
 * Interactive deliberately knows nothing about Avatars. Avatars are an
 * in-world concept; Interactive is a connection concept. Code that
 * needs to load, look up, or operate on a user's Avatars goes through
 * `PlayerApi`.
 *
 * Lifetime: created when a user connects, destroyed when the connection
 * drops. `prepareDestroy` detaches from the current holder via
 * `ConnectionApi.detach`.
 */

import { Idea } from '../lib/stuff/Idea';
import { ConnectionApi } from '../api/connection';
import { DescribeApi } from '../api/describe';
import type { Stuff } from '../lib/stuff/Stuff';
import type { User } from '../lib/identity/User';
import type { HasInteractive } from '../lib/connection/HasInteractive';

export class Interactive extends Idea {
  socketId: string;
  sessionId: string;
  user: User;
  connectedAt: Date;

  /**
   * Whoever currently owns this connection. Set via
   * `ConnectionApi.transfer`; cleared via `ConnectionApi.detach`. Always
   * a Stuff at runtime — `HasInteractiveMixin` only composes onto Stuff
   * — so the typed intersection captures that. Mutation goes through
   * the Api, not direct assignment.
   */
  holder: (HasInteractive & Stuff) | null = null;

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
    ConnectionApi.detach(this);
  }

  public toString(): string {
    const holderInfo = this.holder
      ? ` holder=${DescribeApi.getDisplayName(this.holder, '?')}`
      : '';
    return `[Interactive socketId=${this.socketId} userId=${this.userId ?? '(unsaved)'}${holderInfo}]`;
  }
}
