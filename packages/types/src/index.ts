/**
 * @saxonberg/types - Shared TypeScript types for Saxonberg 2.0
 *
 * This package contains shared type definitions used across client and server packages.
 */

// ============================================================================
// Message Frame (outbound wire envelope)
// ============================================================================

/**
 * Reference to a Stuff object suitable for transmission over the wire.
 * Display names are pre-resolved server-side at compose time.
 */
export interface StuffRef {
  stuffId: string;
  displayName?: string;
}

/**
 * MudlogApi log level.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Outbound wire envelope. One per audience.
 *
 * - `topic` is mandatory and intrinsic ("what kind of message is this?").
 * - `tags` are orthogonal flat properties (e.g. `audience:witness`).
 * - `body` is always present (MML markup string).
 * - `payload` is optional and typed per topic.
 * - `meta.commandId` is set IFF the frame was composed during the
 *   synchronous span of `executeCommand`.
 * - `meta.causingCommandId` is set IFF the frame was composed inside
 *   work descended from a command (sync or async-via-ScheduleApi).
 * - `meta.frameId` is stamped per-Interactive at send-time by
 *   `Application.sendMessageToInteractive`. Absent at compose time;
 *   producers ignore it. The same logical frame multiplexed to N
 *   Interactives gets N different `frameId`s.
 */
export interface MessageFrame<T = unknown> {
  id: string;
  topic: string;
  tags?: string[];
  body: string;
  payload?: T;
  meta: {
    timestamp: number;
    commandId?: string;
    causingCommandId?: string;
    frameId?: number;
    /**
     * Perception-modality attribution. When present, the frame is
     * dropped at `SensorMixin.filterMessage` for recipients whose
     * sensorium doesn't include the named modality (except for
     * actor self-frames, which always deliver). Frames without
     * `meta.modality` deliver unconditionally — system / log /
     * narrative frames don't ride a sensory channel.
     *
     * Producer-side: `Scene.modality(name)` stamps this; the
     * canonical names are the modality singleton names
     * (`'vision'`, `'hearing'`, `'smell'`, `'touch'`, `'taste'`,
     * `'verbal-esp'`, `'emotive-esp'`).
     */
    modality?: string;
    /**
     * Source amplitude in decibels for acoustic frames. Stamped by
     * `VocalMixin.{say,whisper,shout}` (60 / 30 / 90 by default) so
     * the sound-propagation walk in `SoundModality.signalAt` can
     * compute multi-room reach. Frames without `acousticDb` don't
     * propagate as sound; the senses substrate decides the reach
     * curve from the source level.
     */
    acousticDb?: number;
    /**
     * Channel attribution for chat / multi-party DM frames. Present on
     * every frame whose audience came from a channel — chat posts,
     * chat-routed emotes, multi-party DM frames, DM-cohort-routed
     * emotes. Absent on single-target DM, in-room say/whisper/shout/
     * emote, and channel-management responses.
     */
    channelId?: string;
    /**
     * Reaction scope. Present on a frame that is itself a *reaction* —
     * an emote aimed at a prior act — carrying the `meta.commandId` of
     * the act being reacted to. The client uses it for render-correlation
     * (grouping reaction prose lines onto the target message's always-on
     * indicator). A reaction's own frame is never itself reactable, so
     * `inReactionTo` and "is this act reactable" are orthogonal. See
     * docs/subsystems/reactions.md.
     */
    inReactionTo?: string;
  };
}

// ============================================================================
// Social-graph presence notification (the `world.social.presence` payload)
// ============================================================================

/**
 * WebSocket close code the client uses on a **deliberate** teardown (sign
 * out / switch character) so the server can distinguish a clean departure
 * (→ `loggedOut`) from an involuntary network drop / linkdead (→
 * `disconnected`). In the application-private range (4000–4999) per the
 * WebSocket spec, so it never collides with protocol codes.
 */
export const INTENTIONAL_LEAVE_CLOSE_CODE = 4000;

/**
 * Payload of a `world.social.presence` frame — the social-graph Wave 3
 * presence notification (server `SocialLogic.relayPresence`). Rides the
 * ordinary `MessageFrame` channel (no new wire message type, no separate
 * client notification surface): a presence frame renders **inline in the
 * message buffer** like any other scene frame. The payload is carried for
 * structured consumers (filtering, future styling); the human-readable
 * line is the frame body, tinted server-side by the rule `color`.
 *
 * - `event` is the player-level presence transition, gated on having a
 *   character in the world:
 *   - `loggedIn` — a character entered the game (fresh session);
 *   - `reconnected` — a connection returned to a still-in-world character
 *     that had gone linkdead;
 *   - `loggedOut` — a character deliberately left the game (sign out /
 *     switch character);
 *   - `disconnected` — a character's last connection dropped (linkdead),
 *     the body lingering for a possible reconnect.
 *   A bare socket to the welcome screen and the OAuth/user layer never
 *   surface here.
 * - `color` is a named theme-palette token (e.g. `'amber'`), never raw
 *   hex, so the inline highlight resolves through the theme cascade.
 * - `country` is the connecting player's country of origin (display
 *   name), present on `loggedIn` / `reconnected` when resolvable from the
 *   connection IP (`ConnectionApi.originOf`). Absent on localhost / when
 *   geo can't resolve, and on departures.
 */
export interface SocialNotificationPayload {
  kind: 'presence';
  event: 'loggedIn' | 'loggedOut' | 'reconnected' | 'disconnected';
  actor: StuffRef;
  color: string;
  country?: string;
}

/**
 * One row of the `social.rules` client-state projection — a flattened,
 * wire-safe view of a `NotifyRule` for the "Social / Notifications"
 * settings pane. The server pushes the viewer's effective ordered list
 * (stored rules spliced into the virtual reserved baseline) via
 * `host.pushClientStateUpdate('social.rules', SocialRulesState)` after
 * every `notify` mutation; the pane reads it as a **read-only cache** —
 * the per-character rule store stays the single source of truth, and all
 * writes go back through the `notify` verb.
 *
 * - `groupRef` is the canonical ref the verb addresses (`contacts:<pid>:
 *   <label>`, `managed:<id>`, `mql:<q>`, or the bare `everyone-else` /
 *   `strangers` pseudo-subjects).
 * - `label` is the human-friendly display name (a contacts ref's bare
 *   label, else the ref itself) — display only; commands address
 *   `groupRef`.
 * - `reserved` is `true` for a virtual baseline row not yet materialized
 *   into the stored list (the pane styles it as a default that
 *   editing/reordering will pin).
 * - `color` is a named theme-palette token (never raw hex), mapped
 *   client-side through `tokens.palette`.
 */
export interface SocialRuleProjection {
  groupRef: string;
  label: string;
  nameRendering: 'name' | 'feature-string' | 'count-only' | 'hidden';
  boostInDense: boolean;
  onConnect: 'show' | 'silent';
  onDisconnect: 'show' | 'silent';
  onMessage: 'full' | 'summary' | 'silent';
  color: string;
  reserved: boolean;
}

/**
 * The `social.rules` client-state projection value — the viewer's
 * effective ordered notify-rule list, top = highest precedence. Pushed
 * server→client (`client-state-update`) after every `notify` mutation
 * (and on a bare `notify` list) so the settings pane re-renders without a
 * reconnect snapshot. Not a persisted client-state key — a pure push
 * cache.
 */
export interface SocialRulesState {
  rules: SocialRuleProjection[];
}

// ============================================================================
// Response Envelope (dispatch outcome wire frame)
// ============================================================================

/**
 * Dispatch outcome status. Auto-escalation table lives in
 * `DispatchApi.autoEscalation` on the server.
 */
export type Status = 'ok' | 'partial' | 'declined' | 'error';

/* ---- Glob / quantity notes -------------------------------------- */

export interface QuantityClampedNote {
  kind: 'quantity-clamped';
  field: string;
  requested: number;
  applied: number;
}

export interface QuantityClampedRejectedNote {
  kind: 'quantity-clamped-rejected';
  field: string;
  requested: number;
  available: number;
}

export interface MatchAmbiguousNote {
  kind: 'match-ambiguous';
  field: string;
  query: string;
  candidates: StuffRef[];
}

export interface EmptyResultNote {
  kind: 'empty-result';
  field: string;
  query: string;
}

export interface TargetDeclinedNote {
  kind: 'target-declined';
  target: StuffRef;
  /** open-enum, per controller */
  reason: string;
}

/* ---- Controller-side failure notes (from v1 audit) -------------- */

export interface ControllerRejectedNote {
  kind: 'controller-rejected';
  /** open-enum, per controller */
  reason: string;
  detail?: string;
}

export interface MixinMissingNote {
  kind: 'mixin-missing';
  /** e.g. 'WorkspaceMixin', 'BodyPlanMixin', 'ContainerMixin' */
  mixin: string;
}

export interface LocomotionGateFailedNote {
  kind: 'locomotion-gate-failed';
  gate:
    | 'exit-mode'
    | 'posture'
    | 'body-plan'
    | 'enablement'
    | 'capability'
    | 'no-conveyance'
    | 'blocked'
    | 'door';
  /** 'walk', 'climb', 'swim', etc. */
  mode: string;
}

export interface SlotOccupiedNote {
  kind: 'slot-occupied';
  host: StuffRef;
  slot: string;
  occupant?: StuffRef;
}

/* ---- Pre-controller dispatcher-emitted notes -------------------- */

export interface CommandRejectedNote {
  kind: 'command-rejected';
  reason:
    | 'parse-failed'
    | 'unknown-verb'
    | 'shape-fall-through'
    | 'bind-failed'
    | 'missing-subcommand'
    | 'unknown-subcommand';
  detail?: string;
}

export interface MqlErrorNote {
  kind: 'mql-error';
  field: string;
  stage: 'desugar' | 'lex' | 'parse' | 'resolve';
  detail: string;
}

export interface ValidatorFailedNote {
  kind: 'validator-failed';
  /** present for field validators */
  field?: string;
  /** resolved path or name */
  validator: string;
  detail: string;
}

export interface ControllerErrorNote {
  kind: 'controller-error';
  controller: string;
  detail: string;
}

/* ---- Engagement lifecycle (reserved; no v1 producer) ------------ */

export interface EngagementStartedNote {
  kind: 'engagement-started';
  engagementId: string;
  engagementType: string;
  startedAt: number;
  /** absent for SustainedEngagement */
  duration?: number;
  cancelable: boolean;
}

export interface EngagementCompletedNote {
  kind: 'engagement-completed';
  engagementId: string;
}

export interface EngagementCancelledNote {
  kind: 'engagement-cancelled';
  engagementId: string;
  reason: AbortReason;
}

/**
 * Empty registry the activity framework will augment via
 * declaration merging. v1 declares the surface so the envelope's
 * `engagement-cancelled.reason` typechecks; v1 has no augmentations,
 * so `AbortReason = never` in v1. Harmless because no v1 producer.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AbortReasonRegistry {}
export type AbortReason = keyof AbortReasonRegistry;

/* ---- Prompt substrate notes ------------------------------------- */

/**
 * Tier 1 prompt-content Note kinds. Each rides on a `PromptEnvelope`
 * as the push-side payload describing what the substrate is asking.
 * The client renders the prompt area accordingly; the player's
 * response routes back via `PromptResponseMessage`.
 */

export interface PromptChoice {
  label: string;
  response: string;
}

/**
 * UX-hint flag carried on every push-shape prompt Note. `true` (the
 * default) tells the client to auto-focus the new prompt — the
 * input swaps to its response channel immediately. `false` joins the
 * stack without seizing the active slot — the player notices via
 * the stack-depth badge and switches in when they choose.
 *
 * The server's `PromptOpts.foreground` opt is the source of truth;
 * this field carries that decision onto the wire.
 */
export interface ChoicePromptNote {
  kind: 'prompt-choice';
  label: string;
  choices: PromptChoice[];
  defaultChoice?: string;
  foreground: boolean;
}

export interface ConfirmPromptNote {
  kind: 'prompt-confirm';
  label: string;
  defaultAnswer: 'yes' | 'no';
  foreground: boolean;
}

export interface TextPromptNote {
  kind: 'prompt-text';
  label: string;
  placeholder?: string;
  foreground: boolean;
}

/**
 * Multiline body-composition prompt — the interactive route to a post
 * body (forums first; CMS/wiki later). The client renders a multiline
 * `<textarea>` (markdown; ⌘/Ctrl+Enter submits) with an optional live MML
 * preview; an "open in editor" escalation is stubbed for when the CMS
 * rich editor ships. A *shared* PromptApi/client capability, not
 * forum-only. The response is a plain string (the markdown body).
 */
export interface ComposePromptNote {
  kind: 'prompt-compose';
  label: string;
  placeholder?: string;
  /** Hint the client may show an "open in editor" escalation affordance. */
  allowEditorEscalation?: boolean;
  foreground: boolean;
}

/**
 * Minimal disambiguation-target descriptor sent on `mqlObject` /
 * `mqlMany` prompts. The substrate projects matches at push time
 * (server resolves `displayName` via `Stuff.getPresentation()`);
 * client never sees a Stuff reference.
 */
export interface MqlMatchSummary {
  stuffId: string;
  displayName: string;
}

export interface MqlObjectPromptNote {
  kind: 'prompt-mql-object';
  label: string;
  matches: MqlMatchSummary[];
  foreground: boolean;
}

export interface MqlManyPromptNote {
  kind: 'prompt-mql-many';
  label: string;
  matches: MqlMatchSummary[];
  /** Substrate-enforced minimum selection count (default 0). */
  min?: number;
  /** Substrate-enforced maximum selection count (default unbounded). */
  max?: number;
  foreground: boolean;
}

/**
 * Sent when a `validate` predicate rejects a response. The substrate
 * keeps the prompt alive; the client renders the message inline and
 * awaits a fresh response on the same `promptId`.
 */
export interface PromptValidationFailedNote {
  kind: 'prompt-validation-failed';
  message: string;
  /** Multi-field prompts (future) carry which field failed. */
  field?: string;
}

/**
 * Sent when a prompt leaves the per-Interactive stack. `reason`:
 *   - `'answered'`   — a valid response arrived; the await resolved.
 *   - `'cancelled'`  — the player cancelled (X button or
 *                     `prompt cancel` verb).
 *   - `'host-disconnected'` — connection dropped; substrate
 *                             rejected the await.
 */
export interface PromptDismissedNote {
  kind: 'prompt-dismissed';
  reason: 'answered' | 'cancelled' | 'host-disconnected';
}

/**
 * Server-rendered base-prompt content. Lands inside every
 * `DispatchResponseEnvelope`'s `outcome.notes` so the client can
 * update its command-line prompt area after every command.
 * Rendered from the actor's `prompt.format` setting via
 * `ProseApi.format` against the standard prompt Liquid context.
 */
export interface PromptRefreshNote {
  kind: 'prompt-refresh';
  rendered: string;
}

export type Note =
  | QuantityClampedNote
  | QuantityClampedRejectedNote
  | MatchAmbiguousNote
  | EmptyResultNote
  | TargetDeclinedNote
  | ControllerRejectedNote
  | MixinMissingNote
  | LocomotionGateFailedNote
  | SlotOccupiedNote
  | CommandRejectedNote
  | MqlErrorNote
  | ValidatorFailedNote
  | ControllerErrorNote
  | EngagementStartedNote
  | EngagementCompletedNote
  | EngagementCancelledNote
  | ChoicePromptNote
  | ConfirmPromptNote
  | TextPromptNote
  | ComposePromptNote
  | MqlObjectPromptNote
  | MqlManyPromptNote
  | PromptValidationFailedNote
  | PromptDismissedNote
  | PromptRefreshNote;

export interface DispatchOutcome {
  status: Status;
  notes: Note[];
}

export interface NoteOnlyOutcome {
  notes: Note[];
}

export interface DispatchResponseEnvelope {
  type: 'dispatch-response';
  frameId: number;
  dispatchId: string;
  outcome: DispatchOutcome;
}

export interface ActivityUpdateEnvelope {
  type: 'activity-update';
  frameId: number;
  engagementId: string;
  outcome: NoteOnlyOutcome;
}

export interface PromptEnvelope {
  type: 'prompt';
  frameId: number;
  promptId: string;
  outcome: NoteOnlyOutcome;
}

// ============================================================================
// MQL Subscription Substrate (server ↔ client live-query channel)
// ============================================================================

/**
 * Inbound subscribe message. The substrate registers a re-resolving
 * MQL query under `subscriptionId`, projects the requested `fields`
 * (or the `'ref'` / `'detail'` alias defaults), and ships the
 * initial result + future deltas to the connecting Interactive's
 * holder.
 *
 * When `detailKey` is present, projection runs in focused-detail
 * mode: every mixin that contributes per-detail state surfaces its
 * slice at the key, merged across mixins into a
 * `StuffDetailFocusRecord`. Focus mode requires `cardinality: 'one'`;
 * a `'many'` subscribe with a `detailKey` is rejected with
 * `MqlSubscriptionErrorEnvelope { reason: 'parse' }`. The `fields`
 * parameter is ignored in focus mode.
 *
 * `focusDependent` / `locationDependent` install holder-level
 * dependency entries the result-walk wouldn't naturally find — the
 * subscription wakes on `setFocus` / `setContainer` respectively.
 * Used by client subscriptions that watch the holder's pointer
 * fields (e.g., a focus-pane query like `$focus` or a current-room
 * query like `here`).
 */
export interface MqlSubscribeMessage {
  type: 'mql-subscribe';
  subscriptionId: string;
  query: string;
  cardinality: 'one' | 'many';
  fields?: string[] | 'ref' | 'detail';
  detailKey?: string;
  focusDependent?: boolean;
  locationDependent?: boolean;
}

export interface MqlUnsubscribeMessage {
  type: 'mql-unsubscribe';
  subscriptionId: string;
}

/**
 * One-shot MQL read. Mirrors {@link MqlSubscribeMessage} on the wire —
 * same `query` / `cardinality` / `fields` / `detailKey` fields — but
 * the substrate reuses ONLY the parse + resolve + project pipeline:
 * no registration in the per-Interactive registry, no dependency-
 * index entries, no listener installation. The result envelope ships
 * once; no follow-up deltas are emitted.
 *
 * Discriminator is `queryId` (not `subscriptionId`) so a client may
 * have both subscriptions and queries in flight without correlation
 * collisions.
 *
 * `focusDependent` / `locationDependent` are meaningless for one-shot
 * reads (no subscription state to wake) and are NOT carried.
 */
export interface MqlQueryMessage {
  type: 'mql-query';
  queryId: string;
  query: string;
  cardinality: 'one' | 'many';
  fields?: string[] | 'ref' | 'detail';
  detailKey?: string;
}

/**
 * Client pull for the full reactor-set behind one reactable act. The
 * fixed-cadence {@link ReactionDeltaEnvelope} ships only a capped,
 * per-recipient familiar-biased sample; expand requests the complete
 * (still recognition-named) list on demand — e.g. when the player opens
 * the reaction tray on a message. Correlated by `requestId`; the act is
 * keyed by `commandId`. See docs/subsystems/reactions.md.
 */
export interface ReactionExpandMessage {
  type: 'reaction-expand';
  requestId: string;
  commandId: string;
}

/**
 * Inbound response to a server-pushed prompt. The substrate looks
 * up the resolver by `promptId`, decodes `response` per the prompt
 * kind (string for `choice` / `text`; `'yes'` / `'no'` for
 * `confirm`; stuffId for `mqlObject`; JSON-encoded string-array of
 * stuffIds for `mqlMany`), runs the validator if present, and
 * resolves the caller's await.
 *
 * Routes directly to `PromptApi.handleResponse` — bypasses the
 * command bus deliberately. Wholesale cancel lives on the command
 * bus as the `prompt cancel` verb; this surface is per-prompt
 * direct.
 */
export interface PromptResponseMessage {
  type: 'prompt-response';
  payload: { promptId: string; response: string };
}

/**
 * Inbound per-prompt cancel — the X-button affordance on the
 * client's prompt area. Substrate rejects the await with
 * `PromptCancelledError { reason: 'cancelled' }` and ships a
 * `prompt-dismissed` envelope. Wholesale cancel rides the
 * command bus via `prompt cancel`, not this channel.
 */
export interface PromptCancelMessage {
  type: 'prompt-cancel';
  payload: { promptId: string };
}

/**
 * Minimal Stuff-ref record carried on subscription envelopes.
 * Distinct from {@link StuffRef} (used as a note payload field) so the
 * subscription substrate can grow its record shape independently.
 *
 * `displayName` is non-optional here — the substrate's synthetic
 * descriptor ensures `Stuff.getPresentation()` always renders a
 * usable string. `quantity` rides along for Globbable hosts; absent
 * for non-Globbable. `primaryKeyword` rides along for Perceptible
 * hosts (every in-world Stuff with a keyword pool); absent otherwise.
 */
export interface StuffRefRecord {
  stuffId: string;
  displayName: string;
  quantity?: number;
  primaryKeyword?: string;
}

/**
 * Top-level examinable sub-part of a Stuff. Mirrors DetailedMixin's
 * server-side `DetailEntry`. `ids` carries every alias (multi-key
 * detail); `hasChildren` hints that nested details exist behind a
 * drill-down query.
 */
export interface WireDetailEntry {
  ids: string[];
  description: string;
  hasChildren: boolean;
}

/**
 * Minimal Material wire summary. Identity + display name only;
 * properties (density, hardness, etc.) ship when a consumer
 * demands them — same "no premature wire fields" rule that gates
 * `mixins` and `capabilities`.
 */
export interface MaterialSummary {
  materialId: string;
  templatePath: string;
  name: string;
}

/**
 * Detail-record carried on subscription envelopes when the client
 * subscribes with the `'detail'` field set. Adds the flat detail
 * surface (descriptions, details list, bulk material, mass, contents)
 * on top of the `StuffRefRecord` ref surface. Optional fields are
 * absent when the host doesn't compose the contributing mixin.
 *
 * `contents` is a per-viewer-filtered list of `StuffRefRecord`-shape
 * entries for Container hosts — children the viewer can perceive,
 * minus self / adornments / non-Visible items. The filter mirrors
 * the `look` controller's room-occupants policy.
 */
export interface StuffDetailRecord extends StuffRefRecord {
  shortDescription?: string;
  longDescription?: string;
  /**
   * Bucket-relative media key for this thing's illustration (e.g.
   * `location/duncan-hall-lobby.png`), omitted when none is set. The
   * client prepends its configured media base URL to render it.
   */
  illustration?: string;
  details?: WireDetailEntry[];
  bulkMaterial?: MaterialSummary | null;
  mass?: { value: number; unit: 'kg' };
  contents?: StuffRefRecord[];
  /**
   * Obvious exits for Exitable hosts — what `look` would surface as
   * "Obvious exits: ...". Omitted entirely for non-Exitable hosts.
   * Each entry carries the direction string (`'south'`, `'up'`); the
   * destination is resolved by walking, not displayed.
   */
  exits?: StuffExitRecord[];
}

/**
 * Wire shape for a single obvious exit. Direction is what the
 * player types to traverse (`go <direction>`). When the exit
 * passes through a `Door` (or any Boundary that acts as a door),
 * the door's identity + open/closed state ride along so clients
 * can annotate the exit inline ("south (the front doors, open)")
 * without a second round-trip — mirroring how the look prose
 * surfaces the door via `formatExits`.
 */
export interface StuffExitRecord {
  direction: string;
  door?: StuffExitDoor;
}

/**
 * Wire-side door projection embedded in `StuffExitRecord.door`.
 * Carries the door's `stuffId` (so a click affordance can resolve
 * its display name from the stuff registry / send `look` against
 * the canonical keyword), the display name for inline rendering,
 * and the current open/closed state for the user-facing
 * annotation.
 */
export interface StuffExitDoor {
  stuffId: string;
  displayName: string;
  open: boolean;
  /**
   * Door's `primaryKeyword` when set — the canonical disambiguator
   * the server resolves cleanly. Click affordances prefer this
   * over `displayName` so a door named "the front doors" routes
   * to `look doors` instead of the unwieldy / parse-rejected
   * `look the front doors`. Optional because not every Door has
   * one (Perceptible's primaryKeyword is fail-soft).
   */
  primaryKeyword?: string;
}

/**
 * Focused-detail projection — entity-oriented view of one detail
 * across every mixin that contributes per-detail state. Sent when
 * the subscribe message carries `detailKey`.
 *
 * Each contributing mixin's `perDetailRead` returns a partial of
 * this record; the substrate merges them via Object.assign. Shape
 * stays open (`[key: string]: unknown`) so future per-detail
 * contributions don't break clients pinned to a closed type.
 */
export interface StuffDetailFocusRecord {
  stuffId: string;
  detailKey: string;
  // From DetailedMixin (omitted when no Detail at this key):
  ids?: string[];
  description?: string;
  hasChildren?: boolean;
  // From TangibleMixin (omitted when no material resolves):
  material?: MaterialSummary;
  // Future per-detail fields land additively here.
  [key: string]: unknown;
}

export interface MqlSubscriptionResultEnvelope {
  type: 'mql-subscription-result';
  frameId: number;
  subscriptionId: string;
  /**
   * Flat-mode subscriptions ship `StuffRefRecord | StuffDetailRecord`;
   * focus-mode subscriptions ship `StuffDetailFocusRecord`. Same
   * envelope shape carries both.
   */
  result: (StuffRefRecord | StuffDetailRecord | StuffDetailFocusRecord)[];
}

export interface Change {
  op: 'replace' | 'update' | 'add' | 'remove';
  key: string;
  fields?: Partial<StuffRefRecord | StuffDetailRecord | StuffDetailFocusRecord>;
}

export interface MqlSubscriptionDeltaEnvelope {
  type: 'mql-subscription-delta';
  frameId: number;
  subscriptionId: string;
  changes: Change[];
}

export type MqlSubscriptionErrorReason =
  | 'parse'
  | 'resolve'
  | 'permission'
  | 'closed';

export interface MqlSubscriptionErrorEnvelope {
  type: 'mql-subscription-error';
  frameId: number;
  subscriptionId: string;
  reason: MqlSubscriptionErrorReason;
  detail?: string;
}

/**
 * One-shot query result. Mirrors
 * {@link MqlSubscriptionResultEnvelope} but correlates to a
 * {@link MqlQueryMessage} via `queryId` instead of
 * `subscriptionId`. The wire shape of the projected records is
 * identical — flat-mode queries ship `StuffRefRecord | StuffDetailRecord`,
 * focus-mode queries ship `StuffDetailFocusRecord`. No delta envelope
 * follows: queries are one-shot reads.
 */
export interface MqlQueryResultEnvelope {
  type: 'mql-query-result';
  frameId: number;
  queryId: string;
  result: (StuffRefRecord | StuffDetailRecord | StuffDetailFocusRecord)[];
}

/**
 * One-shot query failure. Reuses {@link MqlSubscriptionErrorReason} so
 * client error-handling code can branch by reason uniformly across
 * subscribes and queries.
 */
export interface MqlQueryErrorEnvelope {
  type: 'mql-query-error';
  frameId: number;
  queryId: string;
  reason: MqlSubscriptionErrorReason;
  detail?: string;
}

// ============================================================================
// Forum subscription (document-change observer — distinct from MQL-sub)
// ============================================================================

/**
 * What a forum subscription watches:
 *   - `index` — the set of boards the viewer can see (the forum landing
 *     list); `id` is unused.
 *   - `board` — a board's thread-list; `id` is the board `_id` or its flat
 *     title handle.
 *   - `thread` — a thread's post-tree; `id` is the thread-root entry `_id`.
 */
export interface ForumSubscriptionScope {
  kind: 'index' | 'board' | 'thread';
  id: string;
}

/** One forum entry projected for the client (thread root or post). */
export interface ForumEntryRecord {
  id: string;
  /** Parent entry id, or null for a thread root. */
  parent: string | null;
  board: string;
  /** Author player reference (durable id; empty for anonymous guests). */
  author: string;
  /** Author display name captured at post time (the byline). */
  authorName: string;
  title: string;
  /** Body as MML markup (the client `parseMml`/`MmlRenderer` displays it). */
  body: string;
  up: number;
  down: number;
  /** True net score; the client may prefer `displayScore` for the gate. */
  score: number;
  /** Anti-snowball display gate: the net score, or null while suppressed. */
  displayScore: number | null;
  state: 'active' | 'locked';
  /** Promoted thread-subject id, or null. */
  subject: string | null;
  /** Creation time (ms since epoch). */
  createdAt: number;
  /** Last-edit time (ms since epoch), or null — drives the "edited" marker. */
  editedAt?: number | null;

  // ── Argument organizer (cycle 2) — all optional, so a popularity
  // projection is byte-identical when they are absent. ──
  /**
   * The board's organizer, stamped so the client picks its render mode
   * explicitly rather than inferring. Present on every argument record;
   * absent (or `'popularity'`) for the popularity view.
   */
  organizer?: 'popularity' | 'argument';
  /** The typed edge to the parent (argument boards): pro/con/neutral. */
  relation?: 'reply' | 'supports' | 'objects-to' | 'responds-to';
  /**
   * True on an `objects-to` claim with no answering child — the
   * open-objection flag (the triage cue + convergence signal). Computed
   * from relations only; never read from `up`/`down`.
   */
  openObjection?: boolean;
  /**
   * Per-viewer highlight: the author is in the viewer's circle. A
   * non-reordering overlay (it never changes node order).
   */
  inCircle?: boolean;
}

export interface ForumSubscribeMessage {
  type: 'forum-subscribe';
  subscriptionId: string;
  scope: ForumSubscriptionScope;
}

export interface ForumUnsubscribeMessage {
  type: 'forum-unsubscribe';
  subscriptionId: string;
}

export interface ForumSubscriptionResultEnvelope {
  type: 'forum-subscription-result';
  frameId: number;
  subscriptionId: string;
  scope: ForumSubscriptionScope;
  records: ForumEntryRecord[];
}

export interface ForumChange {
  op: 'add' | 'replace' | 'remove';
  key: string;
  fields?: ForumEntryRecord;
}

export interface ForumSubscriptionDeltaEnvelope {
  type: 'forum-subscription-delta';
  frameId: number;
  subscriptionId: string;
  changes: ForumChange[];
}

export type ForumSubscriptionErrorReason = 'parse' | 'resolve' | 'closed';

export interface ForumSubscriptionErrorEnvelope {
  type: 'forum-subscription-error';
  frameId: number;
  subscriptionId: string;
  reason: ForumSubscriptionErrorReason;
  detail?: string;
}

// ============================================================================
// Reactions (act-scoped emote aggregation)
// ============================================================================

/**
 * One emote-or-tag bucket's running count on one act. Counts are
 * **absolute running totals**, never deltas — the client replaces its
 * bucket count on receipt and synthesizes animation from the change.
 */
export interface ReactionBucket {
  /** Tag-group key (e.g. `'approval'`) OR the verb when the act is ungrouped. */
  tag: string;
  /** Canonical emote verb that dominates the bucket. */
  emote: string;
  emoji?: string;
  /** Authoritative running total (NOT a delta). */
  count: number;
  /**
   * Viewer-named reactors for this bucket, present only when the bucket
   * is **small enough to display** (count ≤ the name cap). Drives the
   * "who reacted" hover on the chip. Omitted on large buckets (the chip
   * shows just the count). Per-recipient (recognition-named).
   */
  reactors?: string[];
}

/**
 * A capped, per-recipient attributed sample entry — one named reactor
 * the recipient recognizes / has in contacts. Strangers stay in the
 * count, unnamed. `reactorName` is `RecognitionApi.describe(viewer,
 * reactor)`, so two recipients may see the same reactor named
 * differently.
 */
export interface ReactionSampleEntry {
  /** Durable stuffId. */
  reactorId: string;
  /** Viewer-aware name (recognition / disguise resolved per recipient). */
  reactorName: string;
  emote: string;
  emoji?: string;
  /** Free-form / fill text inherited from the underlying emote. */
  customText?: string;
}

/** Per-act aggregate state as it stands this tick (counts are absolute). */
export interface ReactionActState {
  /** The act key — `meta.commandId` of the act being reacted to. */
  commandId: string;
  /** `payload.speaker.stuffId` of the act's author. */
  subjectId: string;
  /** Audience-scope key: `'channel:<groupRef>' | 'location:<stuffId>'`. */
  scope: string;
  buckets: ReactionBucket[];
  /** Capped, familiar-biased, per-recipient. */
  sample: ReactionSampleEntry[];
  total: number;
  /** True once at/above threshold (client switches prose → counter). */
  aggregated: boolean;
  /**
   * The recipient's OWN present reactions on this act (the emote verbs).
   * Per-recipient. The client marks these chips active and clicks them
   * to `react --remove` (un-react) rather than add — reacting is
   * add-only, so removal is the explicit op.
   */
  mine?: string[];
}

/**
 * Fixed-cadence delta: one per recipient per tick, carrying only the
 * acts that *moved in that recipient's view* this window. This is the
 * bounded backbone — per-tick wire cost is `audience × cadence`, never a
 * function of reaction throughput. The "delta" framing is *which acts
 * moved*, not arithmetic deltas; the counts inside are absolute.
 */
export interface ReactionDeltaEnvelope {
  type: 'reaction-delta';
  frameId: number;
  acts: ReactionActState[];
}

/** Result of a {@link ReactionExpandMessage}: the FULL reactor set. */
export interface ReactionExpandResultEnvelope {
  type: 'reaction-expand-result';
  frameId: number;
  requestId: string;
  commandId: string;
  /** Every present reactor, still recognition-named per viewer. */
  reactors: ReactionSampleEntry[];
}

/**
 * Live broadcast state — the public, read-only overlay projection
 * served to `service:broadcast` connections (OBS browser sources).
 * Deliberately tiny in Phase 1; later gains active scene, lower-third
 * text, camera focus, and the alert queue. `awayUntil` is absolute
 * epoch-ms so the overlay ticks locally and survives reconnects.
 */
export interface StreamStateSnapshot {
  mode: "live" | "standby";
  awayUntil: number | null; // epoch ms; null when live
}

/**
 * Server→broadcast push of the whole {@link StreamStateSnapshot}. A
 * dedicated lightweight envelope (not modeled as Stuff+MQL): the
 * broadcast principal isn't a normal player, the state is tiny, and
 * re-sending the full snapshot on every change is simpler than diffing.
 */
export interface StreamStateEnvelope {
  type: "stream-state";
  frameId: number;
  state: StreamStateSnapshot;
}

export type Envelope =
  | DispatchResponseEnvelope
  | ActivityUpdateEnvelope
  | PromptEnvelope
  | MqlSubscriptionResultEnvelope
  | MqlSubscriptionDeltaEnvelope
  | MqlSubscriptionErrorEnvelope
  | MqlQueryResultEnvelope
  | MqlQueryErrorEnvelope
  | ForumSubscriptionResultEnvelope
  | ForumSubscriptionDeltaEnvelope
  | ForumSubscriptionErrorEnvelope
  | ReactionDeltaEnvelope
  | ReactionExpandResultEnvelope
  | StreamStateEnvelope;

/**
 * Envelope shape pre-`frameId`-stamp. Producers build this; the
 * delivery layer stamps `frameId` per-Interactive at send-time.
 */
export type EnvelopeTemplate =
  | Omit<DispatchResponseEnvelope, 'frameId'>
  | Omit<ActivityUpdateEnvelope, 'frameId'>
  | Omit<PromptEnvelope, 'frameId'>
  | Omit<MqlSubscriptionResultEnvelope, 'frameId'>
  | Omit<MqlSubscriptionDeltaEnvelope, 'frameId'>
  | Omit<MqlSubscriptionErrorEnvelope, 'frameId'>
  | Omit<MqlQueryResultEnvelope, 'frameId'>
  | Omit<MqlQueryErrorEnvelope, 'frameId'>
  | Omit<ForumSubscriptionResultEnvelope, 'frameId'>
  | Omit<ForumSubscriptionDeltaEnvelope, 'frameId'>
  | Omit<ForumSubscriptionErrorEnvelope, 'frameId'>
  | Omit<ReactionDeltaEnvelope, 'frameId'>
  | Omit<ReactionExpandResultEnvelope, 'frameId'>
  | Omit<StreamStateEnvelope, 'frameId'>;

// ============================================================================
// Identity Types (Persistent Objects)
// ============================================================================

/**
 * Pronouns enum for gendered references.
 */
export enum Pronouns {
  He = 'he',
  She = 'she',
  They = 'they',
  It = 'it',
}

/**
 * Human-readable display label for each pronoun value (the enum holds
 * the canonical short value; the full "subject/object" form shown in UI
 * can't be derived from it, so it's colocated here with the enum it
 * labels). Keyed by `Pronouns` value.
 */
export const PRONOUN_LABELS: Record<Pronouns, string> = {
  [Pronouns.They]: 'they/them',
  [Pronouns.She]: 'she/her',
  [Pronouns.He]: 'he/him',
  [Pronouns.It]: 'it/its',
};

/**
 * User account (persistent).
 * Represents an authenticated user account linked to OAuth provider.
 */
export interface User {
  /** MongoDB ObjectId */
  _id?: string;
  /**
   * Associated Google profile ID. Optional: a Twitch-origin account may
   * carry only `twitchProfileId`. An at-least-one-provider invariant
   * holds across the two FK fields.
   */
  googleProfileId?: string;
  /** Associated Twitch profile ID (the credential-bearing provider). */
  twitchProfileId?: string;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Categories for `AlternateName.kind` — see NamedMixin.
 */
export type NameKind =
  | 'nickname'
  | 'title'
  | 'credential'
  | 'middle'
  | 'maiden'
  | 'alias';

export interface AlternateName {
  kind: NameKind;
  value: string;
}

/**
 * Google OAuth profile data (persistent).
 */
export interface GoogleProfile {
  /** MongoDB ObjectId */
  _id?: string;
  /** Google profile ID (unique) */
  googleId: string;
  /** Email address */
  email: string;
  /** Display name from Google */
  displayName: string;
  /** Given name (first name) */
  givenName?: string;
  /** Family name (last name) */
  familyName?: string;
  /** Profile photo URL */
  photoUrl?: string;
  /** Profile data from Google */
  rawProfile: Record<string, unknown>;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Twitch OAuth profile data (persistent), credential-bearing. Mirrors
 * {@link GoogleProfile} for identity, plus the OAuth tokens the chat
 * relay later spends. The token fields are **encrypted at rest** by an
 * `EncryptedStringMarshaller` and transparently decrypted on read; the
 * plaintext lives only in memory and on the wire to/from the marshaller.
 */
export interface TwitchProfile {
  /** MongoDB ObjectId */
  _id?: string;
  /** Twitch user id (unique, stable identifier from Helix). */
  twitchUserId: string;
  /** Twitch login (lowercased handle). */
  login: string;
  /** Display name from Twitch. */
  displayName: string;
  /** Email address (when the `user:read:email` scope was granted). */
  email?: string;
  /** Raw Helix identity payload (for future use). */
  rawProfile: Record<string, unknown>;
  /** OAuth access token (encrypted at rest). */
  accessToken: string;
  /** OAuth refresh token (encrypted at rest). */
  refreshToken: string;
  /** Access-token expiry as epoch ms. */
  expiresAt: number;
  /** Granted OAuth scopes. */
  scopes: string[];
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * The login providers the auth spine is parameterized over. Adding a
 * provider is a procedure argument, not a code fork. YouTube grows
 * `GoogleProfile` (it's Google OAuth), not a third value.
 */
export type AuthProvider = 'google' | 'twitch';

/**
 * Session user data stored in express-session.
 */
export interface SessionUser {
  /** User ID from database */
  id: string;
  /**
   * Which provider authenticated *this* session. Reserved for
   * downstream name-refraction; unused by char-gen this build.
   */
  authProvider?: AuthProvider;
}

/**
 * Normalized Twitch identity the verify callback produces from the
 * Helix `/users` fetch, parallel to {@link PassportGoogleProfile}. The
 * OAuth tokens ride alongside on a {@link PassportTwitchProfileWithTokens}
 * before reaching the find-or-create path.
 */
export interface PassportTwitchProfile {
  id: string;
  login: string;
  displayName: string;
  email?: string;
  _json: Record<string, unknown>;
}

/**
 * {@link PassportTwitchProfile} plus the OAuth credentials harvested in
 * the verify callback. This is what the find-or-create / link paths
 * persist into a `TwitchProfile`.
 */
export interface PassportTwitchProfileWithTokens extends PassportTwitchProfile {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
}

/**
 * Passport user profile from Google OAuth.
 */
export interface PassportGoogleProfile {
  id: string;
  displayName: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  emails?: Array<{
    value: string;
    verified?: boolean;
  }>;
  photos?: Array<{
    value: string;
  }>;
  provider: string;
  _raw: string;
  _json: Record<string, unknown>;
}

// ============================================================================
// Connection Types (Runtime)
// ============================================================================

/**
 * Interactive connection state (runtime only, not persisted).
 * Represents an active WebSocket connection.
 */
export interface InteractiveData {
  /** Runtime ID (nanoid) */
  stuffId: string;
  /** Socket ID for this connection */
  socketId: string;
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId: string;
  /** Player ID */
  playerId: string;
  /** Connection timestamp */
  connectedAt: Date;
}

/**
 * Wire-safe descriptor for an authored message topic. The
 * `TopicCatalogue` snapshot ships an array of these on session-
 * establish; the client mirrors the same three-tier resolution
 * (cache hit → family-inherited → derived default) the server uses
 * so a frame on a previously-unknown topic still resolves to a
 * populated descriptor.
 */
export interface TopicDescriptor {
  /** Dotted topic path (e.g. `'world.speech.say'`). */
  topic: string;
  /** Dotted family prefix (e.g. `'world.speech'`); `''` at root. */
  family: string;
  /** Friendly display label. */
  label: string;
  /** Authored prose description. */
  description: string;
}

/**
 * Shape of a single console tab in the cockpit's tabbed terminal.
 * Wire transport is `Record<string, unknown>` inside `clientState`;
 * this type keeps client + server aligned on the structure.
 */
export interface ConsoleTab {
  name: string;
  /** Leaf topic strings the tab suppresses. */
  muted: string[];
}

/**
 * Payload of the `system.connection.established` MessageFrame.
 * Server composes at connection-finalization; client stashes
 * `interactiveStuffId` as `selfInteractiveId` for own-echo
 * filtering downstream.
 */
export interface ConnectionEstablishedPayload {
  userId: string;
  socketId: string;
  sessionId: string;
  /** Freshly-minted Interactive's stuffId. */
  interactiveStuffId: string;
  /** The connected Avatar's stuffId — used by the renderer for
   *  self-mention / own-name highlight comparisons (mention
   *  `stuff-id="X"` matches this → self-match treatment). */
  avatarStuffId: string;
  player: {
    _id: string;
    honorific?: string;
    name: string;
    surname?: string;
    nameSuffix?: string;
    alternateNames?: AlternateName[];
    pronouns: Pronouns;
    /** Resolved portrait URL (setting → account photo → placeholder).
     *  Always present — the server resolves to at least a placeholder. */
    portraitUrl: string;
    /** True iff this is an anonymous guest avatar (throwaway, never
     *  persisted). Drives guest UI treatment; absent/false for real
     *  characters. */
    isGuest?: boolean;
  };
  /**
   * Authored topic descriptors. The client caches this snapshot for
   * the session; mid-session descriptor edits land at next login.
   * Inherited / derived shapes are NOT in the snapshot — the client
   * runs the same three-tier resolution against its cached snapshot.
   */
  topicCatalogue: TopicDescriptor[];
  /**
   * Client UI state persisted server-side (tabs, theme, notification
   * prefs, etc.). Dense snapshot — schema-declared keys carry their
   * stored value or their default. Keys are open enums declared by
   * `ClientStateMixin`-contributing mixins on the holder.
   */
  clientState: Record<string, unknown>;
  /**
   * The viewer's reaction render preferences — the client-honored subset
   * of the `social.react.*` settings, resolved server-side at connect.
   * The *delta-shaping* prefs (`tagGroup`, `collapseThreshold`) are
   * honored server-side in the per-recipient reaction delta and so are
   * NOT sent here; these three are pure render/transcript choices the
   * client applies. See docs/subsystems/reactions.md. Optional on the
   * wire — the client falls back to defaults when absent.
   */
  reactionPrefs?: {
    /** `social.react.intensity` — counter/train animation level. */
    intensity: 'off' | 'subtle' | 'normal' | 'vivid';
    /** `social.react.alwaysAggregate` — hide reaction prose lines (chip only). */
    alwaysAggregate: boolean;
    /** `social.react.muteChannels` — no reaction widgets on chat lines. */
    muteChannels: boolean;
  };
}

/**
 * Char-gen — the pre-world character-creation phase. Both payloads ride
 * as `MessageFrame.payload` on system-family topics (no new envelope
 * type): the roster on `system.charactergen.roster`, the per-step state
 * on `system.charactergen.state`. Delivered to the connected `Login`
 * (a Sensor) and read by the cockpit's char-gen layout.
 */

/**
 * The settable char-gen fields. Each is set by a live `enroll <field>
 * <value>` command; the client lays them out however it likes (one per
 * screen, grouped, or all on one page) — the server is layout-agnostic.
 */
export type CharGenField =
  | 'species'
  | 'sex'
  | 'name'
  | 'pronouns'
  | 'aspiration';

/** One closed-choice option for the current char-gen step. */
export interface CharGenOption {
  /** The token the client sends as `enroll <field> <value>`. */
  value: string;
  /** Human-facing label. */
  label: string;
  /** Optional one-line description (themed flavor). */
  description?: string;
  /**
   * Optional illustration for the option, surfaced in the char-gen
   * detail pane (3:4 portrait). A bucket-relative media key (e.g.
   * `species/khazadicus.png`), or `null` when no asset exists (the
   * client renders a framed placeholder). The client prepends its
   * configured `MEDIA_BASE_URL` to resolve it — same key contract as
   * `StuffDetailRecord.illustration`.
   */
  image?: string | null;
  /**
   * Optional structured dossier shown in the detail pane — the
   * showcase of how deeply the species is modeled (scientific name,
   * full taxonomic classification, biology, anatomy, material). Derived
   * server-side from the real `Species` template and its resolved
   * `BodyPlan` / `Material` / clade chain; every row is real data, so
   * a missing section/row means the data genuinely isn't authored.
   * Species options only; other fields omit it.
   */
  dossier?: SpeciesDossier;
}

/** One labeled section of a {@link SpeciesDossier} (e.g. "Classification"). */
export interface DossierSection {
  heading: string;
  rows: { label: string; value: string }[];
}

/**
 * The species dossier surfaced in char-gen. `binomial` is the Latin
 * scientific name; `sections` are pre-formatted, content-driven groups
 * (Classification, Biology, Anatomy, Composition) so the client renders
 * them generically without knowing the field taxonomy.
 */
export interface SpeciesDossier {
  binomial: string;
  sections: DossierSection[];
}

/** The accumulated picks so far (client-readable draft). */
export interface CharGenPicks {
  species?: { key: string; commonName: string };
  sex?: string;
  name?: string;
  surname?: string;
  pronouns?: string;
  aspiration?: string;
}

/**
 * `system.charactergen.state` payload — the complete live draft state.
 * The server re-emits the whole thing after every `enroll <field>
 * <value>`; the client renders whatever layout it wants from it. No
 * notion of a "current step" — flow/layout is entirely client-side.
 */
export interface CharGenStatePayload {
  /** Current chosen values (the live draft). */
  picks: CharGenPicks;
  /** Species options (carry the dossier + illustration). */
  speciesOptions: CharGenOption[];
  /**
   * Sex options for the chosen species — EMPTY when the species isn't
   * sexed, which is also how the client knows the field doesn't apply.
   */
  sexOptions: CharGenOption[];
  pronounOptions: CharGenOption[];
  aspirationOptions: CharGenOption[];
  /** Current name suggestion (drives the name fields' pre-fill). */
  suggestion?: { name: string; surname?: string };
  /**
   * The player's real account display name (Google `displayName`; Twitch
   * later), shown on the name field for reference. Absent if unavailable.
   */
  accountName?: string;
  /**
   * Required fields still unset — gates `enroll confirm` and lets the
   * client show what's left. A `sex` entry appears only when applicable.
   */
  missing: CharGenField[];
  /** Last validation rejection, scoped to the field it concerns. */
  error?: { field: CharGenField; message: string };
}

/** One character in the post-login roster. */
export interface CharGenRosterEntry {
  playerId: string;
  name: string;
  species: string;
  description: string;
}

/** `system.charactergen.roster` payload — the character-select list. */
export interface CharGenRosterPayload {
  characters: CharGenRosterEntry[];
}

/**
 * Inbound client mutation of a `ClientStateMixin` key. The server
 * validates the key against the aggregated schema chain (rejects
 * unknown keys; runs the entry's optional validator), calls
 * `setClientState`, then `save()` to persist.
 */
export interface ClientStateWriteMessage {
  type: 'client-state-write';
  payload: { key: string; value: unknown };
}

/**
 * Outbound server→client push of a `ClientStateMixin` value. Server
 * code that mutates a client-state key out-of-band (e.g. the `style`
 * verb writes the overlay, an admin rewrites a player's tab layout)
 * pushes the new value so the client can re-render immediately
 * without waiting for the reconnect snapshot.
 *
 * Distinct from `ClientStateWriteMessage` (which is the *client's*
 * optimistic mutation, server-validated). The two messages share no
 * shape beyond `{key, value}` because the contracts differ — write is
 * a request, update is an authoritative push.
 */
export interface ClientStateUpdateMessage {
  type: 'client-state-update';
  payload: { key: string; value: unknown };
}

// ============================================================================
// Style overlay (message-rendering Wave 1)
// ============================================================================

/**
 * A single visual treatment applied to a selector match. Bounded
 * vocabulary: the stylesheet engine recognizes the keys below and
 * no-ops on anything else. Color values are palette tokens or
 * raw CSS color strings — the renderer trusts them; the channel
 * gating is at the editor (`style` verb validators), not at render
 * time.
 */
export interface StyleTreatment {
  fg?: string;
  bg?: string;
  weight?: 'normal' | 'bold';
  italic?: boolean;
  prefix?: string;
  chip?: boolean;
  indent?: 'hang' | 'block' | 'none';
}

/**
 * Reader-owned visual customization overlay, persisted as one blob on
 * `HasInteractiveMixin.clientState` under key `style.overlay`. Keys
 * are dotted selectors; values are either scalars (for the toggle
 * keys) or `StyleTreatment` objects.
 *
 * Selector vocabulary the engine recognizes:
 *   - `theme`             — `'default' | 'high-contrast'`
 *   - `plain`             — boolean (global plain-mode)
 *   - `plain.channel.<k>` — boolean (per-channel plain-mode)
 *   - `mention.self`      — boolean (own-name highlight; default ON)
 *   - `channel.<k>.color` — `string`
 *   - `element.<tag>`     — `StyleTreatment`
 *   - `topic.<prefix>`    — `StyleTreatment`
 *   - `attribute.<attr>.<value>` — `StyleTreatment`
 *   - `mention.match`     — `StyleTreatment` (self-mention)
 *   - `mention.other`     — `StyleTreatment` (mention of someone else)
 *
 * Unknown selectors are silently ignored by the engine; the
 * `client-state-write` validator accepts any object shape so a
 * future visual editor can write partial states mid-edit.
 */
export type StyleOverlay = Record<string, string | boolean | StyleTreatment>;

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response structure.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Authentication status response.
 */
export interface AuthStatusResponse {
  isAuthenticated: boolean;
  /**
   * Non-authoritative developer-tier hint: true iff the session's loaded
   * Avatar is a developer (`AccessApi.isDeveloper`). The client uses it
   * only to hide the CMS launcher for non-developers; the REST CMS gates
   * remain the server-side authority. Absent/false when no in-world Avatar
   * is loaded for the session.
   */
  isDeveloper?: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
  };
  player?: {
    _id: string;
    honorific?: string;
    name: string;
    surname?: string;
    nameSuffix?: string;
    alternateNames?: AlternateName[];
    pronouns: Pronouns;
    portraitUrl: string;
    isGuest?: boolean;
  };
}

// ============================================================================
// Client Store Types
// ============================================================================

/**
 * Client-side auth state.
 */
export interface AuthState {
  isAuthenticated: boolean;
  /**
   * Non-authoritative developer-tier hint, mirrored from the
   * {@link AuthStatusResponse.isDeveloper} field of `/auth/status`. The
   * client uses it only to decide whether to show the CMS launcher; the
   * REST CMS gates remain the server-side authority. Absent/false when no
   * developer Avatar is loaded for the session.
   */
  isDeveloper?: boolean;
  user: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  player: {
    _id: string;
    honorific?: string;
    name: string;
    surname?: string;
    nameSuffix?: string;
    alternateNames?: AlternateName[];
    pronouns: Pronouns;
    portraitUrl: string;
    isGuest?: boolean;
  } | null;
}

/**
 * Client-side connection state.
 *
 * `link` is the authoritative three-state of the bus connection;
 * `isConnected` is derived (`link === 'connected'`) and kept for
 * existing callers. `reconnecting` = auto-retrying with backoff;
 * `dropped` = gave up (manual reconnect / routing applies).
 */
export interface ConnectionState {
  link: "connected" | "reconnecting" | "dropped";
  isConnected: boolean;
  socketId: string | null;
  sessionId: string | null;
  error: string | null;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Persistable interface for objects that can be saved to database.
 */
export interface Persistable {
  _id?: string;
  save(): Promise<void>;
  delete(): Promise<void>;
}

/**
 * Constructor type for Persistable classes.
 */
export interface PersistableConstructor<T extends Persistable> {
  new (...args: never[]): T;
  findById(id: string): Promise<T | null>;
  find(query: Record<string, unknown>): Promise<T[]>;
}

// ============================================================================
// CMS data surface (REST: explorer tree + read/write/stat)
// ============================================================================

export type CmsBackend = 'content' | 'source' | 'document';
export type CmsNodeKind = 'folder' | 'leaf';

/** One entry in a directory/folder listing. */
export interface CmsTreeEntry {
  backend: CmsBackend;
  path: string; // backend-local canonical path
  name: string; // last segment, for display
  kind: CmsNodeKind;
}

/** Result of listTree — the children of one node. */
export interface CmsTreeListing {
  backend: CmsBackend;
  path: string; // the listed node
  entries: CmsTreeEntry[];
}

/** Result of read — the editable body of one leaf. */
export interface CmsReadResult {
  backend: CmsBackend;
  path: string;
  kind: CmsNodeKind; // always 'leaf' on success
  /** Content: pretty-printed JSON of template.data. Source: raw file bytes.
   *  Document: the stored `data` (a script kind's source text, else
   *  pretty-printed JSON). */
  body: string;
  /** Editor language hint: 'json' | 'typescript' | 'yaml' | 'plaintext'. */
  language: string;
  /** Content-only: the template's backing class + hydrator, echoed back so
   *  write can round-trip them unchanged. Absent for source. */
  templateMeta?: { class: string; hydratorClass?: string };
}

/** stat — lightweight existence/kind probe (no body). */
export interface CmsStatResult {
  backend: CmsBackend;
  path: string;
  exists: boolean;
  kind?: CmsNodeKind;
}

/** write request body (REST POST). */
export interface CmsWriteRequest {
  backend: CmsBackend;
  path: string;
  body: string; // JSON (content) | raw bytes (source)
}

/** write result — what went live. */
export interface CmsWriteResult {
  backend: CmsBackend;
  path: string;
  reloaded: boolean; // did the go-live step run
  reloadDetail?: string; // human note, e.g. 're-hydrated 1 live instance'
}

/** Uniform error body for the REST surface. */
export interface CmsErrorBody {
  error: string; // machine code: 'denied' | 'not-found' | 'invalid' | 'sandbox' | 'internal'
  message: string; // human detail
}
