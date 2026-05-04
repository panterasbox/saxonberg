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
  };
}

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
  Ze = 'ze',
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
