/**
 * Zustand Store - Client-side state management
 *
 * Manages:
 * - Authentication state
 * - Connection state
 * - User actions
 * - Session-wide stuff metadata registry (populated as a side effect
 *   of MQL subscription / query envelope handling — see
 *   `services/websocket.ts`).
 */

import { create } from 'zustand';
import type {
  AuthState,
  ConnectionEstablishedPayload,
  ConnectionState,
} from '@saxonberg/types';

/**
 * Per-stuff metadata cached on the client for rendering paths that
 * need a per-stuff lookup (today: `MmlRenderer.commandFor()`).
 *
 * The registry is a **side-effect cache for rendering metadata**,
 * not a source of truth for client logic. Widgets that need live
 * state about a Stuff subscribe for it via MQL; they do not query
 * the registry. The single-store, partial-merge, never-evict shape
 * only works because the registry isn't authoritative.
 */
export interface StuffMetadata {
  stuffId: string;
  displayName?: string;
  primaryKeyword?: string;
}

/**
 * Combined store state.
 */
interface StoreState {
  // Auth state
  auth: AuthState;
  setAuth: (auth: Partial<AuthState>) => void;
  clearAuth: () => void;

  // Connection state
  connection: ConnectionState;
  /**
   * The stuffId of the local Interactive — stamped onto the input
   * echoes the server fires for THIS connection. Compared against
   * `payload.originInteractiveId` to recognize our own echo for
   * filtering in multi-device deployments.
   */
  selfInteractiveId: string | null;
  setConnection: (connection: Partial<ConnectionState>) => void;
  setConnected: (payload: ConnectionEstablishedPayload) => void;
  setDisconnected: (error?: string) => void;

  // Stuff registry — session-wide metadata cache (no eviction in v1).
  /**
   * `Map<stuffId, StuffMetadata>`. Populated by every MQL subscription
   * / query consumer the client owns. Reads are O(1) Map lookups.
   * Never evicted; sessions are bounded.
   */
  stuffRegistry: Map<string, StuffMetadata>;
  /**
   * Merge a batch of `StuffMetadata` records into the registry by
   * `stuffId`. Fields present in the new record overwrite; fields
   * absent leave existing values intact (so a subsequent ref-only
   * delta does not clobber detail data previously cached).
   */
  upsertStuffMetadata: (records: StuffMetadata[]) => void;
}

/**
 * Initial auth state.
 */
const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  player: null,
};

/**
 * Initial connection state.
 */
const initialConnectionState: ConnectionState = {
  isConnected: false,
  socketId: null,
  sessionId: null,
  error: null,
};

/**
 * Zustand store.
 */
export const useStore = create<StoreState>((set) => ({
  // Auth state
  auth: initialAuthState,

  setAuth: (auth) =>
    set((state) => ({
      auth: { ...state.auth, ...auth },
    })),

  clearAuth: () =>
    set({
      auth: initialAuthState,
    }),

  // Connection state
  connection: initialConnectionState,
  selfInteractiveId: null,

  setConnection: (connection) =>
    set((state) => ({
      connection: { ...state.connection, ...connection },
    })),

  setConnected: (payload) =>
    set({
      connection: {
        isConnected: true,
        socketId: payload.socketId,
        sessionId: payload.sessionId,
        error: null,
      },
      selfInteractiveId: payload.interactiveStuffId,
      auth: {
        isAuthenticated: true,
        user: {
          id: payload.userId,
          email: '',
          displayName: [
            payload.player.honorific,
            payload.player.name,
            payload.player.surname,
            payload.player.nameSuffix,
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
        },
        player: payload.player,
      },
    }),

  setDisconnected: (error) =>
    set({
      connection: {
        isConnected: false,
        socketId: null,
        sessionId: null,
        error: error || null,
      },
      selfInteractiveId: null,
    }),

  // Stuff registry slice
  stuffRegistry: new Map<string, StuffMetadata>(),

  upsertStuffMetadata: (records) =>
    set((state) => {
      if (records.length === 0) {
        return {};
      }
      // Mutate the existing Map in place — Zustand selectors that
      // consume the registry via `useStore.getState()` snapshot at
      // call time, and the registry is read-on-demand from the
      // renderer rather than driving React subscriptions. Returning
      // the same reference avoids forcing every consumer to re-render
      // on each metadata upsert.
      const registry = state.stuffRegistry;
      for (const incoming of records) {
        if (!incoming || typeof incoming.stuffId !== 'string') {
          continue;
        }
        const existing = registry.get(incoming.stuffId);
        if (!existing) {
          // Defensive shallow copy so callers can't keep mutating
          // the stored record by holding a reference.
          registry.set(incoming.stuffId, { ...incoming });
          continue;
        }
        // Merge fields-present-overwrite, fields-absent-leave.
        const merged = { ...existing } as unknown as Record<string, unknown>;
        for (const [key, value] of Object.entries(incoming)) {
          if (value !== undefined) {
            merged[key] = value;
          }
        }
        registry.set(incoming.stuffId, merged as unknown as StuffMetadata);
      }
      return { stuffRegistry: registry };
    }),
}));
