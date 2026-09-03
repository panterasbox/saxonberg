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

import { Idea } from '../../lib/stuff/Idea';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { User } from '../../lib/identity/User';
import type { HasInteractive } from '../../lib/connection/HasInteractive';
import type {
  CardCloseReason,
  CardId,
  EnvelopeTemplate,
  MessageFrame,
  PromptChoice,
} from '@saxonberg/types';
import type { CardOpenOptions } from './CardRegistry';
import type {
  ChoicePromptOpts,
  ComposePromptOpts,
  MqlManyPromptOpts,
  PromptOpts,
  TextPromptOpts,
} from '../../api/prompt';
import { ConnectionLogic } from './api/ConnectionLogic';
import { MqlSubscriptionLogic } from './api/MqlSubscriptionLogic';
import { CardLogic } from './api/CardLogic';
import { PromptLogic } from './api/PromptLogic';
import ReactionRegistry from './ReactionRegistry';
import ForumSubscriptionRegistry from './ForumSubscriptionRegistry';
import { Final, Unshadowable } from '../../lib/security/decorators';
import { TemplatePaths } from '../../lib/paths';

/*
 * Logic-singleton resolvers (the `Energized` precedent): the instance
 * methods below forward into the same HMR-able singletons the Api
 * facades reach, resolved lazily so module eval stays declaration-only.
 * `singletonSync` only constructs when the singleton is absent — in a
 * wired process the Api facade's HMR-aware factory has usually run
 * first, so these plain constructors are the cold-start fallback.
 */
function connectionLogic(): ConnectionLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/connection',
    () => new ConnectionLogic(),
  );
}
function mqlSubscriptionLogic(): MqlSubscriptionLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/mql-subscription',
    () => new MqlSubscriptionLogic(),
  );
}
function cardLogic(): CardLogic {
  return StuffApi.singletonSync('/platform/idea/api/card', () => new CardLogic());
}
function promptLogic(): PromptLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/prompt',
    () => new PromptLogic(),
  );
}
/** The forum-subscription registry (lazy-created in tests; manifest in prod). */
function forumSubscriptions(): ForumSubscriptionRegistry {
  return StuffApi.singletonSync<ForumSubscriptionRegistry>(
    TemplatePaths.forumSubscriptionRegistry,
    () => new ForumSubscriptionRegistry(),
  );
}

/** The reaction state singleton (lazy-created in tests; manifest in prod). */
function reactionRegistry(): ReactionRegistry {
  return StuffApi.singletonSync<ReactionRegistry>(
    TemplatePaths.reactionRegistry,
    () => new ReactionRegistry(),
  );
}

export default class Interactive extends Idea {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
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
   * this against `social.idleAfter` (see `SocialApi.statusOf`) — there
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
   * the IP stays here). `null` until `recordOrigin` runs (or
   * when geo can't resolve). Set/read through the Api, not directly.
   */
  protected origin: { ip?: string; country?: string } | null = null;
  public getOrigin(): { ip?: string; country?: string } | null {
    return this.origin;
  }
  public setOrigin(value: { ip?: string; country?: string } | null): void {
    this.origin = value;
  }

  /**
   * Record the connection's transient origin (the B2 vanguard of the
   * Interactive method surface). Ungated: the caller is the backend
   * connection layer, which carries no module stamp (every FromX
   * policy would fail closed on it) — and which is also the layer that
   * owns the raw request, so the country is derived THERE and handed
   * in. No-op without an ip.
   */
  public recordOrigin(ip: string | undefined, country?: string): void {
    if (!ip) return;
    this.origin = { ip, country };
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

  /* ──────────────── the outbound message surface ─────────────── */

  /**
   * Deliver a `MessageFrame` to this connection's client — the
   * sensor-pipeline exit (a multiplexing `SensorMixin` host calls this
   * once per forwarding target). `frameId` is stamped per-Interactive
   * at send time from this object's own monotonic counter, which is
   * why the pair below is `@Final @Unshadowable`: the ordering
   * primitive must not be overridable or shadowable. A detached or
   * socket-less Interactive is a silent no-op. Ungated — sending a
   * frame to your own client is the trusted relationship every caller
   * already has by holding the Interactive.
   */
  @Final
  @Unshadowable
  public sendMessage(frame: MessageFrame): void {
    connectionLogic().sendMessage(this, frame);
  }

  /**
   * Envelope counterpart to {@link sendMessage} — the structured
   * server→client push, stamped from the same per-Interactive `frameId`
   * counter so one ordering primitive covers all wire traffic.
   */
  @Final
  @Unshadowable
  public sendEnvelope(template: EnvelopeTemplate): void {
    connectionLogic().sendEnvelope(this, template);
  }

  /* ─────────────────── connection routing ────────────────────── */

  /**
   * Route this connection to a new holder. Idempotent on the same
   * target. **Connection routing**, not character control — `target`
   * is deliberately the broad `HasInteractive` set (Login during
   * entry, Avatar during play). Ungated: the caller is the backend
   * connection layer (Login/entry handoff), which carries no module
   * stamp.
   */
  public transferTo(target: HasInteractive & Stuff): void {
    connectionLogic().transfer(this, target);
  }

  /**
   * Detach from the current holder (disconnect / cleanup;
   * {@link onDestruct} calls this). No-op when there's no holder.
   * Ungated — same trusted backend caller as {@link transferTo}.
   */
  public detach(): void {
    connectionLogic().detach(this);
  }

  /* ─────────────────── the card surface ──────────────────────── */
  // Ungated parity with the retired CardApi statics: card pushes are
  // server-side by construction (the wire cannot name a card), and the
  // one client-influenced entry keeps its `opens_card` gate on
  // `CardApi.open`.

  /** Push a card with no running command (arrangement resolver, prompts). */
  public pushCard(cardId: CardId, opts: CardOpenOptions = {}): string | null {
    return cardLogic().open(this, cardId, opts);
  }

  /** Bring a card forward and reset its window; re-resolve if static. */
  public touchCard(key: string, opts: CardOpenOptions = {}): boolean {
    return cardLogic().touchCard(this, key, opts);
  }

  /**
   * Pin / unpin, resolving `cardRef` by catalogue name first and
   * instance id second. `null` hands the decision back to the
   * catalogue's own default.
   */
  public setCardPinned(cardRef: string, pinned: boolean | null): boolean {
    return cardLogic().setPinned(this, cardRef, pinned);
  }

  /** Close one card, stating the reason. */
  public closeCard(instanceId: string, reason: CardCloseReason): boolean {
    return cardLogic().close(this, instanceId, reason);
  }

  /** The open cards — `cockpit card list`'s report. */
  public listCards(): {
    instanceId: string;
    cardId: CardId;
    key: string;
    pinned: boolean;
    live: boolean;
  }[] {
    return cardLogic().list(this);
  }

  /**
   * ⭐⭐ Open exactly the cards an arrangement names — the SERVER
   * resolving a workspace, not the client replaying it.
   */
  public applyCardArrangement(cards: readonly CardId[]): {
    opened: number;
    closed: number;
  } {
    return cardLogic().applyArrangement(this, cards);
  }

  /**
   * ⭐ A prompt settled — close the card waiting on it, with reason
   * `answered` (the retired `unanswered` hold's guarantee).
   */
  public notifyPromptSettled(promptId: string): void {
    cardLogic().notifyPromptSettled(this, promptId);
  }

  /** Drop every card (disconnect). No envelopes. */
  public cancelAllCards(): void {
    cardLogic().cancelAllForInteractive(this);
  }

  /* ─────────────────── the prompt surface ────────────────────── */
  // Ungated: a controller prompting its own player is the trusted
  // relationship, and the inbound handlers' caller is the backend
  // routing layer. Await-shaped — the promise settles when the player
  // answers (or the prompt is cancelled / times out).

  /** Tier-1 choice prompt. */
  public promptChoice<T extends string = string>(
    label: string,
    choices: PromptChoice[],
    opts?: ChoicePromptOpts<T>,
  ): Promise<T> {
    return promptLogic().choice(this, label, choices, opts);
  }

  /** Tier-1 yes/no confirm prompt. */
  public promptConfirm(
    label: string,
    defaultAnswer: 'yes' | 'no' = 'no',
    opts?: PromptOpts<boolean>,
  ): Promise<boolean> {
    return promptLogic().confirm(this, label, defaultAnswer, opts);
  }

  /** Tier-1 single-line text prompt. */
  public promptText(label: string, opts?: TextPromptOpts): Promise<string> {
    return promptLogic().text(this, label, opts);
  }

  /** Multiline body-composition prompt (markdown; forums/CMS/wiki). */
  public promptCompose(
    label: string,
    opts?: ComposePromptOpts,
  ): Promise<string> {
    return promptLogic().compose(this, label, opts);
  }

  /** Pick-one disambiguation over an MQL match set. */
  public promptMqlObject(
    label: string,
    matches: Stuff[],
    opts?: PromptOpts<Stuff | null>,
  ): Promise<Stuff | null> {
    return promptLogic().mqlObject(this, label, matches, opts);
  }

  /** Pick-many selection over an MQL match set. */
  public promptMqlMany(
    label: string,
    matches: Stuff[],
    opts?: MqlManyPromptOpts,
  ): Promise<Stuff[]> {
    return promptLogic().mqlMany(this, label, matches, opts);
  }

  /** Route a `prompt-response` wire message (inbound layer). */
  public handlePromptResponse(payload: {
    promptId: string;
    response: string;
  }): void {
    promptLogic().handleResponse(this, payload);
  }

  /** Route a `prompt-cancel` wire message (inbound layer). */
  public handlePromptCancel(payload: { promptId: string }): void {
    promptLogic().handleCancel(this, payload);
  }

  /**
   * Server-side wholesale cancel — every prompt held here. Returns the
   * count cancelled (`prompt cancel` verb; disconnect teardown).
   */
  public cancelPrompts(reason: 'cancelled' | 'host-disconnected'): number {
    return promptLogic().cancelAll(this, reason);
  }

  /**
   * Is `promptId` still awaiting an answer? The read behind the
   * `unanswered` card hold — absence IS the answer.
   */
  public hasPendingPrompt(promptId: string): boolean {
    return promptLogic().isPending(this, promptId);
  }

  /* ──────────────── the MQL-subscription surface ─────────────── */

  /** Cancel one live MQL subscription (the `mql-unsubscribe` wire). */
  public cancelMqlSubscription(subscriptionId: string): void {
    mqlSubscriptionLogic().handleUnsubscribe(this, subscriptionId);
  }

  /** Drop every live MQL subscription (disconnect). */
  public cancelAllMqlSubscriptions(): void {
    mqlSubscriptionLogic().cancelAllForInteractive(this);
  }

  /**
   * Re-resolve every subscription this Interactive holds — the sandbox
   * crossing calls this after moving a socket between bodies, so the
   * client's cards re-render for the body it now drives.
   */
  public refreshMqlSubscriptions(): void {
    mqlSubscriptionLogic().refreshForInteractive(this);
  }

  /* ─────────────── the forum-subscription surface ────────────── */

  /** Cancel one live forum subscription (the `forum-unsubscribe` wire). */
  public cancelForumSubscription(subscriptionId: string): void {
    forumSubscriptions().handleUnsubscribe(this, subscriptionId);
  }

  /** Drop every live forum subscription (disconnect). */
  public cancelAllForumSubscriptions(): void {
    forumSubscriptions().cancelAllForInteractive(this);
  }

  /* ─────────────────── the reaction surface ──────────────────── */

  /** Register the normal per-player reaction sink (on connect). */
  public registerReactions(): void {
    reactionRegistry().registerInteractive(this);
  }

  /** Disconnect cleanup (mirrors the MQL-subscription sweep). */
  public cancelAllReactions(): void {
    reactionRegistry().cancelAllForInteractive(this);
  }

  /** The most-recent reactable act delivered here (default selector). */
  public lastDeliveredAct(): string | null {
    return reactionRegistry().lastDeliveredActFor(this);
  }

  /**
   * Record that a reactable-act frame was delivered, keying its gutter
   * `frameId` → the act's `commandId` so `react --msg <n>` resolves
   * server-side. Bounded ring.
   */
  public noteDeliveredFrame(frameId: number, commandId: string): void {
    reactionRegistry().noteDeliveredFrame(this, frameId, commandId);
  }

  /** Resolve a gutter number to a `commandId`. */
  public resolveGutter(frameId: number): string | null {
    return reactionRegistry().resolveGutter(this, frameId);
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
    this.cancelAllMqlSubscriptions();
    this.cancelAllCards();
    this.cancelAllForumSubscriptions();
    this.cancelAllReactions();
    this.cancelPrompts('host-disconnected');
  }

  public onDestruct(): void {
    this.detach();
    // ⚠ This call was MISSING, and the three Interactive-keyed
    // registries rely on it.
    //
    // `MqlSubscriptionRegistry`, `ForumSubscriptionRegistry` and
    // `ReactionRegistry` are all keyed by a live `Interactive`. They are
    // indexes, not references — they do not own their keys, and
    // `Interactive` must not grow a back-ref to them — so no `lifetime`
    // declaration is the right answer for any of the three. What they
    // DO need is for a destructed key to be swept, and
    // `teardownSubstrateState` is the sweep. It was wired to the
    // disconnect path only, so an `Interactive` that was destructed
    // without disconnecting first left three registry entries behind
    // pointing at a dead key.
    //
    // Idempotent (each `cancelAllFor*` is a no-op on an unknown
    // Interactive), so the disconnect path calling it first costs
    // nothing.
    this.teardownSubstrateState();
    super.onDestruct();
  }

  public toString(): string {
    const holderInfo = this.holder
      ? ` holder=${this.holder.getPresentation()}`
      : '';
    return `[Interactive socketId=${this.socketId} userId=${this.getUserId() ?? '(unsaved)'}${holderInfo}]`;
  }
}
