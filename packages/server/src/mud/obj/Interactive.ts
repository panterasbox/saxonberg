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
import { MqlSubscriptionApi } from '../api/mql-subscription';
import { ForumsApi } from '../api/forums';
import { ReactionApi } from '../api/reaction';
import { PromptApi } from '../api/prompt';
import type { Stuff } from '../lib/stuff/Stuff';
import type { User } from '../lib/identity/User';
import type { HasInteractive } from '../lib/connection/HasInteractive';

export default class Interactive extends Idea {
  protected socketId: string;
  protected sessionId: string;
  protected user: User;
  protected connectedAt: Date;

  /**
   * The wall-clock time of this session's most recent player input.
   * Transient (in-memory only — Interactive is never persisted), the
   * sibling of {@link connectedAt}; seeded to `connectedAt` so a freshly
   * connected session reads as active. Refreshed by {@link touchInput}
   * at the `CommandGiver` dispatch tail. The idle status is *derived* from
   * this against `social.idleAfter` (see `PresenceApi.statusOf`) — there
   * is no stored idle flag and no per-player timer.
   */
  protected lastInputAt: Date;

  public getSocketId(): string { return this.socketId; }
  public getSessionId(): string { return this.sessionId; }
  public getUser(): User { return this.user; }
  public getConnectedAt(): Date { return this.connectedAt; }
  public getLastInputAt(): Date { return this.lastInputAt; }

  /** Mark this session active as of now (a single transient assignment). */
  public touchInput(): void { this.lastInputAt = new Date(); }

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

  /**
   * Transient connection origin captured at the WS handshake: the raw
   * client `ip` and the derived `country` display name. **In-memory only**
   * — an Interactive is never persisted, so the IP's lifetime is bounded
   * to the live connection (the PII posture: country may surface broadly;
   * the IP stays here). `null` until `ConnectionApi.recordOrigin` runs (or
   * when geo can't resolve). Set/read through the Api, not directly.
   */
  protected origin: { ip?: string; country?: string } | null = null;
  public getOrigin(): { ip?: string; country?: string } | null {
    return this.origin;
  }
  public setOrigin(value: { ip?: string; country?: string } | null): void {
    this.origin = value;
  }

  constructor(socketId: string, sessionId: string, user: User) {
    super();

    this.socketId = socketId;
    this.sessionId = sessionId;
    this.user = user;
    this.connectedAt = new Date();
    this.lastInputAt = this.connectedAt;
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

  /**
   * Tear down all per-Interactive substrate state on disconnect: live
   * subscriptions (MQL + forum), reaction streams, and pending prompts.
   * This is the one home for the per-Interactive teardown list — each
   * subsystem's `cancelAllForInteractive` is invoked from here rather
   * than enumerated at the network boundary (Application).
   *
   * Called by `Application.handleUserDisconnect` BEFORE the Interactive
   * is removed, so any final substrate-side delivery still has a live
   * Interactive to address. Prompts reject last (`host-disconnected`)
   * so a controller's catch block can react while the Interactive is
   * still around.
   */
  public teardownSubstrateState(): void {
    MqlSubscriptionApi.cancelAllForInteractive(this);
    ForumsApi.cancelAllForInteractive(this);
    ReactionApi.cancelAllForInteractive(this);
    PromptApi.cancelAll(this, 'host-disconnected');
  }

  public onDestruct(): void {
    ConnectionApi.detach(this);
  }

  public toString(): string {
    const holderInfo = this.holder
      ? ` holder=${this.holder.getPresentation()}`
      : '';
    return `[Interactive socketId=${this.socketId} userId=${this.getUserId() ?? '(unsaved)'}${holderInfo}]`;
  }
}
