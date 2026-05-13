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
    | 'missing-subcommand';
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
  | EngagementCancelledNote;

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

export type Envelope =
  | DispatchResponseEnvelope
  | ActivityUpdateEnvelope
  | PromptEnvelope;

/**
 * Envelope shape pre-`frameId`-stamp. Producers build this; the
 * delivery layer stamps `frameId` per-Interactive at send-time.
 */
export type EnvelopeTemplate =
  | Omit<DispatchResponseEnvelope, 'frameId'>
  | Omit<ActivityUpdateEnvelope, 'frameId'>
  | Omit<PromptEnvelope, 'frameId'>;

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
