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
  };
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

export interface ChoicePromptNote {
  kind: 'prompt-choice';
  label: string;
  choices: PromptChoice[];
  defaultChoice?: string;
}

export interface ConfirmPromptNote {
  kind: 'prompt-confirm';
  label: string;
  defaultAnswer: 'yes' | 'no';
}

export interface TextPromptNote {
  kind: 'prompt-text';
  label: string;
  placeholder?: string;
}

/**
 * Minimal disambiguation-target descriptor sent on `mqlObject` /
 * `mqlMany` prompts. The substrate projects matches at push time
 * (server resolves `displayName` via `DescribeApi.getDisplayName`);
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
}

export interface MqlManyPromptNote {
  kind: 'prompt-mql-many';
  label: string;
  matches: MqlMatchSummary[];
  /** Substrate-enforced minimum selection count (default 0). */
  min?: number;
  /** Substrate-enforced maximum selection count (default unbounded). */
  max?: number;
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
 * When `kind` is present, the substrate resolves the name against
 * its canonical-kind registry (`MqlSubscriptionApi.registerKind`)
 * and overlays the registered spec — `query`, `cardinality`,
 * `fields`, `detailKey`, `focusDependent` — onto the request. Any
 * client-supplied `query` / `cardinality` / `fields` is ignored
 * when `kind` resolves; the registered spec wins. Unknown kind
 * names emit `MqlSubscriptionErrorEnvelope { reason: 'parse' }`.
 * Canonical kinds let clients subscribe by name (e.g., `'me.focus'`)
 * instead of by raw `(query, fields)` shape.
 */
export interface MqlSubscribeMessage {
  type: 'mql-subscribe';
  subscriptionId: string;
  /** Optional when `kind` is present (the kind spec supplies it). */
  query?: string;
  /** Optional when `kind` is present (the kind spec supplies it). */
  cardinality?: 'one' | 'many';
  fields?: string[] | 'ref' | 'detail';
  detailKey?: string;
  /**
   * Canonical-kind name registered via
   * `MqlSubscriptionApi.registerKind`. When present, the registered
   * spec wins over any client-supplied `query` / `cardinality` /
   * `fields` / `detailKey`.
   */
  kind?: string;
}

export interface MqlUnsubscribeMessage {
  type: 'mql-unsubscribe';
  subscriptionId: string;
}

/**
 * One-shot MQL read. Mirrors {@link MqlSubscribeMessage} on the wire —
 * same `query` / `cardinality` / `fields` / `detailKey` / `kind`
 * fields, same canonical-kind overlay semantics — but the substrate
 * reuses ONLY the parse + resolve + project pipeline: no registration
 * in the per-Interactive registry, no dependency-index entries, no
 * listener installation. The result envelope ships once; no follow-up
 * deltas are emitted.
 *
 * Discriminator is `queryId` (not `subscriptionId`) so a client may
 * have both subscriptions and queries in flight without correlation
 * collisions.
 *
 * When `kind` is present, the substrate resolves the name against
 * its canonical-kind registry (`MqlSubscriptionApi.registerKind`)
 * exactly as it does for `mql-subscribe`. The registered spec's
 * `query` / `cardinality` / `fields` / `detailKey` overlay this
 * request; `focusDependent` is meaningless for one-shot reads (no
 * subscription state to wake) and is ignored. Unknown kind names emit
 * `MqlQueryErrorEnvelope { reason: 'parse' }`.
 */
export interface MqlQueryMessage {
  type: 'mql-query';
  queryId: string;
  /** Optional when `kind` is present (the kind spec supplies it). */
  query?: string;
  /** Optional when `kind` is present (the kind spec supplies it). */
  cardinality?: 'one' | 'many';
  fields?: string[] | 'ref' | 'detail';
  detailKey?: string;
  /**
   * Canonical-kind name registered via
   * `MqlSubscriptionApi.registerKind`. When present, the registered
   * spec wins over any client-supplied `query` / `cardinality` /
   * `fields` / `detailKey`.
   */
  kind?: string;
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
 * descriptor ensures `DescribeApi.getDisplayName` always renders a
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
  details?: WireDetailEntry[];
  bulkMaterial?: MaterialSummary | null;
  mass?: { value: number; unit: 'kg' };
  contents?: StuffRefRecord[];
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

export type Envelope =
  | DispatchResponseEnvelope
  | ActivityUpdateEnvelope
  | PromptEnvelope
  | MqlSubscriptionResultEnvelope
  | MqlSubscriptionDeltaEnvelope
  | MqlSubscriptionErrorEnvelope
  | MqlQueryResultEnvelope
  | MqlQueryErrorEnvelope;

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
  | Omit<MqlQueryErrorEnvelope, 'frameId'>;

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
 * User account (persistent).
 * Represents an authenticated user account linked to OAuth provider.
 */
export interface User {
  /** MongoDB ObjectId */
  _id?: string;
  /** Associated Google profile ID */
  googleProfileId: string;
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

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Session user data stored in express-session.
 */
export interface SessionUser {
  /** User ID from database */
  id: string;
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
  player: {
    _id: string;
    honorific?: string;
    name: string;
    surname?: string;
    nameSuffix?: string;
    alternateNames?: AlternateName[];
    pronouns: Pronouns;
  };
}

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
  } | null;
}

/**
 * Client-side connection state.
 */
export interface ConnectionState {
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
  new (...args: any[]): T;
  findById(id: string): Promise<T | null>;
  find(query: Record<string, unknown>): Promise<T[]>;
}
