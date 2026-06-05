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
 * - Inspection pane state (header focus name + fragment, body
 *   paint/clear flag, last subscription result snapshot, breadcrumb
 *   trail). Single slice per inspection-pane requirements — no
 *   competing-rendering-authority splits.
 */

import { create } from 'zustand';
import type {
  AuthState,
  ConnectionEstablishedPayload,
  ConnectionState,
  StuffDetailRecord,
  StuffRefRecord,
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

  // Inspection-pane slice ---------------------------------------------
  /**
   * Display name shown in the pane header. Tracks the live focus name
   * from the canonical `me.focus` subscription's first record; falls
   * back to `paneFocusFragment` (the raw fragment text) when the
   * subscription's records have not yet arrived or when focus is
   * multi-cardinality. The header is always-live; deltas update it
   * irrespective of `paneBodyPainted`.
   */
  paneFocusName: string | null;
  /**
   * The literal focus fragment string as understood server-side (e.g.
   * `'here'`, `'apple'`, `'friends'`). The client tracks it
   * separately so the paint/clear policy can compare across deltas:
   * a fragment change clears the body, an unchanged fragment lets
   * deltas patch in place.
   */
  paneFocusFragment: string;
  /**
   * Body paint/clear flag. False on mount and after any focus-verb
   * driven focus change; true after a `look` against the current
   * focus. While cleared, deltas update `paneLastResult` (cache stays
   * warm) but the body renders the placeholder. While painted,
   * deltas update the body in place.
   */
  paneBodyPainted: boolean;
  /**
   * Most recent canonical `me.focus` subscription record set. Held in
   * a single slot so the body renderer can branch on cardinality
   * without re-deriving from individual deltas. Patched in place by
   * every subscription envelope; rendered only when `paneBodyPainted`.
   */
  paneLastResult: (StuffRefRecord | StuffDetailRecord)[] | null;
  /**
   * Session-scoped focus-fragment history. Capped at 6 entries (the
   * requirements' "last 6" rule); newest at index 0. Distinct
   * fragments only — pushing a duplicate of the current head is a
   * no-op. Click on a breadcrumb routes through the command bus as a
   * `look <fragment>` (paints + drills in one motion).
   */
  paneBreadcrumbs: string[];
  /**
   * Flip the paint/clear flag. Called from outgoing `look`-detection
   * (paints) and from the focus-change delta path (clears). The
   * paint policy is client-side, not substrate-driven — the server
   * always ships the up-to-date result, the client decides whether
   * to render it.
   */
  setPanePainted: (painted: boolean) => void;
  /**
   * Push a focus fragment onto the breadcrumb trail. Deduplicates
   * against the current head; caps at 6 entries; older entries fall
   * off the tail.
   */
  pushBreadcrumb: (fragment: string) => void;
  /**
   * Replace the cached subscription result snapshot. Called by the
   * canonical-kind subscription consumer (see InspectionPane.tsx).
   */
  setPaneResult: (
    result: (StuffRefRecord | StuffDetailRecord)[] | null
  ) => void;
  /**
   * Replace the live header name (display name from the first
   * subscription record, or fragment fallback when the record set
   * is empty / multi-cardinality).
   */
  setPaneFocusName: (name: string | null) => void;
  /**
   * Replace the tracked focus fragment. The paint/clear policy
   * compares this across deltas to decide whether a focus change
   * just happened.
   */
  setPaneFocusFragment: (fragment: string) => void;
}

/**
 * Maximum breadcrumb history depth — the inspection-pane
 * requirements' "last 6 focus values" rule.
 */
const PANE_BREADCRUMB_CAP = 6;

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

  // Inspection-pane slice (initial cleared state)
  paneFocusName: null,
  paneFocusFragment: '',
  paneBodyPainted: false,
  paneLastResult: null,
  paneBreadcrumbs: [],

  setPanePainted: (painted) =>
    set(() => ({
      paneBodyPainted: painted,
    })),

  pushBreadcrumb: (fragment) =>
    set((state) => {
      const trimmed = fragment.trim();
      if (!trimmed) return {};
      // Dedupe against the head — repeated `look` against the same
      // focus shouldn't pollute the trail.
      if (state.paneBreadcrumbs[0] === trimmed) return {};
      const next = [trimmed, ...state.paneBreadcrumbs];
      if (next.length > PANE_BREADCRUMB_CAP) {
        next.length = PANE_BREADCRUMB_CAP;
      }
      return { paneBreadcrumbs: next };
    }),

  setPaneResult: (result) =>
    set(() => ({
      paneLastResult: result,
    })),

  setPaneFocusName: (name) =>
    set(() => ({
      paneFocusName: name,
    })),

  setPaneFocusFragment: (fragment) =>
    set(() => ({
      paneFocusFragment: fragment,
    })),

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
