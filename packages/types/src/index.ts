/**
 * @saxonberg/types - Shared TypeScript types for Saxonberg 2.0
 *
 * This package contains shared type definitions used across client and server packages.
 */

// ============================================================================
// Message Protocol (Framework 2)
// ============================================================================

/**
 * Base structure for all WebSocket messages exchanged between client and server.
 */
export interface WebSocketMessage {
  /** Message type identifier (e.g., 'connection_established', 'echo', 'ping') */
  type: string;
  /** Message-specific data */
  payload?: unknown;
  /** Optional message ID for request/response pairing */
  id?: string;
  /** Optional error message if the message represents an error */
  error?: string;
}

/**
 * Message types for WebSocket communication.
 */
export enum MessageType {
  /** Server → Client: Connection successfully established */
  ConnectionEstablished = 'connection_established',
  /** Bidirectional: Echo test message */
  Echo = 'echo',
  /** Client → Server: Heartbeat ping */
  Ping = 'ping',
  /** Server → Client: Heartbeat response */
  Pong = 'pong',
  /** Server → Client: Error notification */
  Error = 'error',
  /** Client → Server: User command input */
  Command = 'command',
  /** Server → Client: Command response/game output */
  Output = 'output',
}

/**
 * Payload for connection_established message.
 */
export interface ConnectionEstablishedPayload {
  /** User ID from database */
  userId: string;
  /** Socket ID for this connection */
  socketId: string;
  /** Session ID */
  sessionId: string;
  /** Player information */
  player: {
    _id: string;
    firstName: string;
    lastName: string;
    pronouns: Pronouns;
  };
  /** Welcome message */
  message: string;
}

/**
 * Payload for echo message (test).
 */
export interface EchoPayload {
  /** The message to echo back */
  message: string;
  /** Timestamp when echo was sent */
  timestamp: number;
}

/**
 * Payload for error message.
 */
export interface ErrorPayload {
  /** Error message */
  message: string;
  /** Error code (optional) */
  code?: string;
  /** Stack trace (development only) */
  stack?: string;
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
 * Player character (persistent).
 * Represents a character that can enter the game world.
 */
export interface Player {
  /** MongoDB ObjectId */
  _id?: string;
  /** User ID that owns this player */
  userId: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Pronouns */
  pronouns: Pronouns;
  /** Character creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
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
    firstName: string;
    lastName: string;
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
    firstName: string;
    lastName: string;
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
