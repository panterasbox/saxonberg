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
 * drops. `onDestruct` detaches from the current holder via
 * `ConnectionApi.detach`.
 */

import { Idea } from '../lib/stuff/Idea';
import { ConnectionApi } from '../api/connection';
import { DescribeApi } from '../api/describe';
import type { Stuff } from '../lib/stuff/Stuff';
import type { User } from '../lib/identity/User';
import type { HasInteractive } from '../lib/connection/HasInteractive';

export default class Interactive extends Idea {
  protected socketId: string;
  protected sessionId: string;
  protected user: User;
  protected connectedAt: Date;

  public getSocketId(): string { return this.socketId; }
  public getSessionId(): string { return this.sessionId; }
  public getUser(): User { return this.user; }
  public getConnectedAt(): Date { return this.connectedAt; }

  /**
   * Per-Interactive monotonic frame counter. Shared by every
   * server→client frame (prose MessageFrame + dispatch-response
   * Envelope alike). State-sync, when it ships, reads the same
   * counter — single ordering primitive across all wire traffic
   * per Interactive. Resets naturally on reconnect because the
   * client gets a fresh `Interactive`.
   *
   * `_` prefix marks this as the sealed-mutation surface for
   * `nextFrameId()` — touch the counter only through that method.
   */
  private _frameCounter = 0;

  /**
   * Allocate the next frame id. Returns 1 on the first call after
   * connection; monotonic from there. Stamped per-Interactive by
   * `Application.sendMessageToInteractive` / `sendEnvelopeToInteractive`.
   */
  public nextFrameId(): number {
    return ++this._frameCounter;
  }

  /**
   * Whoever currently owns this connection. Set via
   * `ConnectionApi.transfer`; cleared via `ConnectionApi.detach`. Always
   * a Stuff at runtime — `HasInteractiveMixin` only composes onto Stuff
   * — so the typed intersection captures that. Mutation goes through
   * the Api, not direct assignment.
   */
  protected holder: (HasInteractive & Stuff) | null = null;
  public getHolder(): (HasInteractive & Stuff) | null { return this.holder; }
  public setHolder(value: (HasInteractive & Stuff) | null): void { this.holder = value; }

  constructor(socketId: string, sessionId: string, user: User) {
    super();

    this.socketId = socketId;
    this.sessionId = sessionId;
    this.user = user;
    this.connectedAt = new Date();
  }

  /**
   * Convenience: owning user's `_id`. May be undefined for an unsaved
   * User (primarily relevant in tests). Host-internal accessor; external
   * callers go through `getUserId()`.
   */
  protected get userId(): string | undefined {
    return this.user._id;
  }
  public getUserId(): string | undefined { return this.userId; }

  /**
   * Stub for client messaging. Actual delivery runs through
   * Application.sendMessageToInteractive().
   */
  public send(message: unknown): void {
    console.debug(`Interactive.send(): Message to ${this.socketId}:`, message);
  }

  public getConnectionDuration(): number {
    return Date.now() - this.connectedAt.getTime();
  }

  public onDestruct(): void {
    ConnectionApi.detach(this);
  }

  public toString(): string {
    const holderInfo = this.holder
      ? ` holder=${DescribeApi.getDisplayName(this.holder)}`
      : '';
    return `[Interactive socketId=${this.socketId} userId=${this.getUserId() ?? '(unsaved)'}${holderInfo}]`;
  }
}
