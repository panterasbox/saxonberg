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
   * Inspection-pane breadcrumb root — the player's current
   * physical location (room or vessel). Sourced from the
   * `me.location` canonical subscription, NOT from focus changes.
   * Movement reroots this; focus changes don't.
   *
   * Shape mirrors what `<EntityName>` needs: display name for
   * label, primaryKeyword (or fallback) for the click-target
   * command, stuffId for `data-stuff-id`. Null when the player
   * has no current location (pre-login / disconnect).
   */
  paneBreadcrumbRoot: {
    stuffId: string;
    displayName: string;
    primaryKeyword?: string;
  } | null;
  /**
   * Trail segments pushed since the last reroot — each entry is a
   * past focus that wasn't the location. Click on a segment sends
   * the look command that originally produced it. Capped at
   * `PANE_BREADCRUMB_CAP` entries.
   */
  paneBreadcrumbTrail: {
    label: string;
    command: string;
    stuffId?: string;
  }[];
  /**
   * Detail-drill stack on the currently-focused Stuff. Empty means
   * the pane is viewing the Stuff itself (long description, exits,
   * contents). Non-empty means the pane has descended through one
   * or more detail keys — `['counter']` means the player is
   * looking AT the counter detail (its description replaces the
   * long, contents hide, exits stay marked as parent-Stuff). The
   * focused Stuff itself doesn't change as you drill; only the
   * level of inspection descends.
   *
   * Cleared on any focus change (subscription delta with a new
   * fragment) and on explicit pop. v1 supports one-level drilling
   * because the wire shape doesn't ship nested-detail children;
   * the stack is array-shaped to make extension trivial.
   */
  paneDetailPath: string[];
  /**
   * Flip the paint/clear flag. Called from outgoing `look`-detection
   * (paints) and from the focus-change delta path (clears). The
   * paint policy is client-side, not substrate-driven — the server
   * always ships the up-to-date result, the client decides whether
   * to render it.
   */
  setPanePainted: (painted: boolean) => void;
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
  /**
   * Push a detail key onto the detail-drill stack — the player is
   * descending into a detail of the focused Stuff. Idempotent on
   * the head (clicking the same detail twice is a no-op).
   */
  pushPaneDetail: (key: string) => void;
  /**
   * Pop the detail stack one level (back-out toward the focused
   * Stuff). Empty stack stays empty.
   */
  popPaneDetail: () => void;
  /**
   * Slice the detail stack so position `index` is the new tail.
   * Used by detail-breadcrumb clicks to back out to that level
   * without traversing one pop at a time. `index < 0` clears.
   */
  popPaneDetailToIndex: (index: number) => void;
  /**
   * Clear the detail-drill stack entirely. Called from the
   * focus-change path so a focus shift resets the drill state.
   */
  clearPaneDetail: () => void;
  /**
   * Replace the breadcrumb root from a `me.location` subscription
   * delivery. Clears the trail — movement re-roots and starts a
   * fresh push series.
   */
  setPaneBreadcrumbRoot: (
    root: {
      stuffId: string;
      displayName: string;
      primaryKeyword?: string;
    } | null
  ) => void;
  /**
   * Push a trail segment from a focus change. Dedupes against the
   * head, caps at `PANE_BREADCRUMB_CAP`.
   */
  pushPaneBreadcrumbTrail: (entry: {
    label: string;
    command: string;
    stuffId?: string;
  }) => void;
  /**
   * Pop the trail to a specific index (inclusive). Used by trail
   * segment clicks to back out to that level.
   */
  popPaneBreadcrumbTrail: (index: number) => void;
  /**
   * Ephemeral door-context annotation. Stashed when the player
   * clicks a door affordance inside an exits projection — carries
   * the direction the door belongs to so the pane can synthesise
   * an exit link when the focused thing is that door. Cleared
   * whenever focus changes to a different stuffId (so a stale
   * context never bleeds into the wrong inspection).
   *
   * Pure UI sugar — the door Stuff itself has no notion of "which
   * exit am I"; the client reconstructs the relationship from the
   * click site that has both pieces in scope.
   */
  paneDoorContext: { stuffId: string; direction: string } | null;
  /** Replace the door-context annotation. Null clears it. */
  setPaneDoorContext: (
    ctx: { stuffId: string; direction: string } | null
  ) => void;
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
  paneBreadcrumbRoot: null,
  paneBreadcrumbTrail: [],
  paneDetailPath: [],
  paneDoorContext: null,

  setPanePainted: (painted) =>
    set(() => ({
      paneBodyPainted: painted,
    })),

  pushPaneDetail: (key) =>
    set((state) => {
      const trimmed = key.trim();
      if (!trimmed) return {};
      if (state.paneDetailPath[state.paneDetailPath.length - 1] === trimmed) {
        return {};
      }
      return { paneDetailPath: [...state.paneDetailPath, trimmed] };
    }),

  popPaneDetail: () =>
    set((state) => {
      if (state.paneDetailPath.length === 0) return {};
      return { paneDetailPath: state.paneDetailPath.slice(0, -1) };
    }),

  popPaneDetailToIndex: (index) =>
    set((state) => {
      if (index < 0) {
        if (state.paneDetailPath.length === 0) return {};
        return { paneDetailPath: [] };
      }
      const target = index + 1;
      if (target >= state.paneDetailPath.length) return {};
      return { paneDetailPath: state.paneDetailPath.slice(0, target) };
    }),

  clearPaneDetail: () =>
    set((state) => {
      if (state.paneDetailPath.length === 0) return {};
      return { paneDetailPath: [] };
    }),

  setPaneBreadcrumbRoot: (root) =>
    set((state) => {
      // Same stuffId → no-op. Different stuffId → reroot (clear
      // trail). Null → clear root + trail (disconnect / pre-login).
      if (root === null) {
        if (state.paneBreadcrumbRoot === null) return {};
        return { paneBreadcrumbRoot: null, paneBreadcrumbTrail: [] };
      }
      if (
        state.paneBreadcrumbRoot &&
        state.paneBreadcrumbRoot.stuffId === root.stuffId
      ) {
        // Same room — refresh the projection in case displayName /
        // keyword changed, but keep the trail intact.
        return { paneBreadcrumbRoot: root };
      }
      return { paneBreadcrumbRoot: root, paneBreadcrumbTrail: [] };
    }),

  pushPaneBreadcrumbTrail: (entry) =>
    set((state) => {
      const head = state.paneBreadcrumbTrail[state.paneBreadcrumbTrail.length - 1];
      if (head && head.command === entry.command) return {};
      const next = [...state.paneBreadcrumbTrail, entry];
      if (next.length > PANE_BREADCRUMB_CAP) next.shift();
      return { paneBreadcrumbTrail: next };
    }),

  popPaneBreadcrumbTrail: (index) =>
    set((state) => {
      if (index < 0 || index >= state.paneBreadcrumbTrail.length) return {};
      return {
        paneBreadcrumbTrail: state.paneBreadcrumbTrail.slice(0, index),
      };
    }),

  setPaneDoorContext: (ctx) =>
    set((state) => {
      if (ctx === null) {
        return state.paneDoorContext === null ? {} : { paneDoorContext: null };
      }
      const current = state.paneDoorContext;
      if (
        current &&
        current.stuffId === ctx.stuffId &&
        current.direction === ctx.direction
      ) {
        return {};
      }
      return { paneDoorContext: ctx };
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
