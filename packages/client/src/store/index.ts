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
  MqlMatchSummary,
  PromptChoice,
  StuffDetailRecord,
  StuffRefRecord,
  TopicDescriptor,
} from '@saxonberg/types';

/**
 * Client mirror of one entry on the per-Interactive prompt stack.
 * One per active server-pushed `PromptEnvelope`, keyed by
 * `promptId`. The substrate ships the entry's shape in
 * `outcome.notes`; this discriminator gives the renderer a
 * single field to branch on without re-walking notes.
 *
 * `foreground` mirrors the wire-level UX hint from the substrate:
 * when `true` (default) the client makes this prompt the active
 * slot on arrival; when `false` it appends to the stack without
 * seizing input.
 *
 * `validationError` is set when the substrate keeps the prompt
 * alive via `prompt-validation-failed`. The renderer surfaces it
 * inline; the player retries on the same id.
 */
export type PromptEntry =
  | {
      kind: 'choice';
      promptId: string;
      label: string;
      choices: PromptChoice[];
      defaultChoice?: string;
      foreground: boolean;
      validationError?: string;
    }
  | {
      kind: 'confirm';
      promptId: string;
      label: string;
      defaultAnswer: 'yes' | 'no';
      foreground: boolean;
      validationError?: string;
    }
  | {
      kind: 'text';
      promptId: string;
      label: string;
      placeholder?: string;
      foreground: boolean;
      validationError?: string;
    }
  | {
      kind: 'mql-object';
      promptId: string;
      label: string;
      matches: MqlMatchSummary[];
      foreground: boolean;
      validationError?: string;
    }
  | {
      kind: 'mql-many';
      promptId: string;
      label: string;
      matches: MqlMatchSummary[];
      min?: number;
      max?: number;
      foreground: boolean;
      validationError?: string;
    };

/**
 * Reserved key for the always-present base command slot on the
 * CommandBar's slot picker. Distinguishes from `promptId`s, which
 * are nanoids and therefore never collide.
 */
export const BASE_SLOT = 'base' as const;

/**
 * One pending echo-pairing snapshot. The CommandBar pushes one of
 * these onto the FIFO queue every time a command goes out; the
 * websocket service shifts one off on every inbound input-echo
 * MessageFrame (`system.log.command.{info|warn}`) and uses it to
 * annotate the rendered terminal line. Slot is the active slot at
 * send time (`BASE_SLOT` or a promptId); sigil is the base-prompt
 * string at send time, so the scrollback stays internally
 * consistent even if focus moves before the echo arrives.
 */
export interface EchoSnapshot {
  slot: string;
  sigil: string;
}

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
 * One frame as the cockpit's tabbed terminal stores it. `id` is
 * the server's `MessageFrame.id`; `topic` is the raw dotted-path
 * string the wire carries; `body` is the rendered MML body the
 * Terminal pipes through `MmlRenderer`; `sigil` is the optional
 * echo-paired prompt sigil for command-echo frames (only set on
 * `system.log.command.{info|warn}` deliveries).
 *
 * Sigils are held alongside the body, NOT concatenated in — the
 * Terminal renderer is responsible for prefix-concatenation at
 * render time so topic-keyed rendering decisions see a clean body.
 */
export interface Frame {
  id: string;
  topic: string;
  body: string;
  sigil?: string;
  timestamp: number;
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

  // Frames — typed message-frame buffer feeding the Terminal.
  /**
   * Catch-all message log. Every `MessageFrame` the server emits to
   * this client is appended here (regardless of topic). Tabs filter
   * over this single array — they don't own their own histories.
   */
  frames: Frame[];
  /** Append one frame; preserves arrival order. */
  appendFrame: (frame: Frame) => void;
  /** Empty the buffer; called on disconnect. */
  clearFrames: () => void;

  // Topic catalogue — session-wide cache of authored descriptors.
  /**
   * `Map<topic, TopicDescriptor>`. Wholesale replaced on every
   * session-establish from `payload.topicCatalogue`. Lookups go
   * through `getTopicDescriptor` — three-tier resolution
   * (cache hit → family-inherited → derived default) mirroring the
   * server's `TopicCatalogue.getDescriptor` so a frame on a
   * previously-unknown topic still resolves to a populated
   * descriptor.
   */
  topicCatalogue: Map<string, TopicDescriptor>;
  /** Replace the cache wholesale. Called from session-establish. */
  setTopicCatalogue: (records: TopicDescriptor[]) => void;
  /** Resolve a topic via the three-tier chain. Always returns a value. */
  getTopicDescriptor: (topic: string) => TopicDescriptor;

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
  /**
   * Typed keyword/fragment from the player's most recent
   * focus-changing command (`look <X>` / `focus <X>`), stashed so
   * the breadcrumb-trail push can label entries by what the player
   * actually typed instead of the focused Stuff's primaryKeyword.
   *
   * Set by the outgoing-command seam in App.tsx; consumed (read +
   * cleared) by the focus-subscription delivery path in
   * InspectionPane when it pushes a trail entry. `null` between
   * commands or after consumption — in which case the trail push
   * falls back to primaryKeyword.
   */
  pendingTrailLabel: string | null;
  /** Set the pending typed label for the next breadcrumb push. */
  setPendingTrailLabel: (label: string | null) => void;

  // Prompt-stack slice -------------------------------------------------
  /**
   * Per-Interactive prompt stack ordered by arrival. Server
   * pushes append; dismissals remove by `promptId`. Doesn't
   * include the base command slot — that's an implicit always-
   * present slot keyed by `BASE_SLOT`.
   */
  prompts: PromptEntry[];
  /**
   * Per-slot draft text. Keyed by `BASE_SLOT` for the base
   * command line, or by `promptId` for each pending prompt.
   * Persists across active-slot switches so a half-typed
   * response survives the player checking on a different prompt.
   * Removed when its prompt dismisses; the base entry persists
   * for the session.
   */
  promptDrafts: Record<string, string>;
  /**
   * Which slot the CommandBar input is currently bound to. Either
   * `BASE_SLOT` or a `promptId` from `prompts`. Set to a new
   * arrival iff `foreground` is true; preserved otherwise.
   */
  activeSlot: string;
  /**
   * Server-rendered base-prompt string from the most recent
   * `prompt-refresh` Note. Defaults to a quiet `'>'` until the
   * first dispatch-response lands. Shown as the CommandBar sigil
   * when the base slot is active.
   */
  basePrompt: string;
  /**
   * FIFO queue of pending echo-pairing snapshots. One per
   * outbound command; shifted by the inbound `system.log.command.*`
   * handler so the rendered echo line carries the prompt context
   * that was active when the command was sent (per the slate's
   * snapshot-on-send pattern).
   */
  echoSnapshotQueue: EchoSnapshot[];
  /**
   * Push a fresh prompt entry. If `entry.foreground` is true (the
   * default), the active slot flips to the new entry; if false,
   * the entry joins the stack but active stays put. Idempotent
   * on duplicate `promptId` (substrate should never re-push the
   * same id, but the dedupe keeps client state honest).
   */
  pushPrompt: (entry: PromptEntry) => void;
  /**
   * Remove a prompt by id. Drops its draft. If the dismissed
   * prompt was active, fall through to the new top of stack, or
   * back to `BASE_SLOT` when the stack empties.
   */
  dismissPrompt: (promptId: string) => void;
  /**
   * Annotate (or clear) a prompt's inline validation error. The
   * server keeps the prompt alive when the validator rejects;
   * the renderer surfaces the message and waits for a fresh
   * response on the same id.
   */
  setPromptValidationError: (
    promptId: string,
    message: string | null
  ) => void;
  /**
   * Switch the active slot. Pass `BASE_SLOT` to return to command
   * mode. Pass a `promptId` to bind input to that prompt. Unknown
   * slots are no-ops (so a stale UI click after the prompt
   * dismissed doesn't strand the state).
   */
  setActiveSlot: (slot: string) => void;
  /**
   * Replace the draft text for a slot. Writes to `BASE_SLOT` or
   * any pending prompt id; unknown slots are stored anyway so
   * a same-tick race (typing while a prompt dismisses) doesn't
   * silently swallow input.
   */
  setDraft: (slot: string, text: string) => void;
  /**
   * Replace the base-prompt string. Called whenever a
   * `prompt-refresh` Note arrives on a dispatch-response.
   */
  setBasePrompt: (rendered: string) => void;
  /**
   * Push an echo-pairing snapshot onto the FIFO queue. Called by
   * the App's `sendCommand` seam at command send time.
   */
  pushEchoSnapshot: (snap: EchoSnapshot) => void;
  /**
   * Pop the FIFO head and return it; `null` when the queue is
   * empty (which can happen on server-initiated echoes the
   * client didn't trigger — disconnect-replay, audit injection,
   * etc.).
   */
  shiftEchoSnapshot: () => EchoSnapshot | null;
  /**
   * Drop all prompt state. Called by the WebSocket service on
   * disconnect — pending awaits server-side are already being
   * cancelled via `cancelAll('host-disconnected')` and the
   * client-side stack should match. Base prompt is preserved
   * across disconnects (reconnect refreshes it on the next
   * dispatch).
   */
  clearPrompts: () => void;
}

/**
 * Maximum breadcrumb history depth — the inspection-pane
 * requirements' "last 6 focus values" rule.
 */
const PANE_BREADCRUMB_CAP = 6;

/**
 * Three-tier topic resolution mirroring
 * `TopicCatalogue.getDescriptor` on the server. Cache hit →
 * family-inherited (walk the dotted-path chain for the nearest
 * authored ancestor) → derived default (titlecased last segment,
 * `'(no description)'`). Always returns a populated descriptor.
 */
function resolveTopicDescriptor(
  cache: Map<string, TopicDescriptor>,
  topic: string
): TopicDescriptor {
  const authored = cache.get(topic);
  if (authored) return authored;
  const segments = topic.split('.');
  for (let i = segments.length - 1; i >= 1; i--) {
    const ancestorPath = segments.slice(0, i).join('.');
    const ancestor = cache.get(ancestorPath);
    if (ancestor) {
      const leaf = segments[segments.length - 1] ?? '';
      return {
        topic,
        family: ancestorPath,
        label: `${ancestor.label} (${titleCase(leaf)})`,
        description: ancestor.description,
      };
    }
  }
  const leaf = segments[segments.length - 1] ?? topic;
  const family = segments.length > 1 ? segments.slice(0, -1).join('.') : '';
  return {
    topic,
    family,
    label: titleCase(leaf),
    description: '(no description)',
  };
}

function titleCase(segment: string): string {
  if (!segment) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
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
export const useStore = create<StoreState>((set, get) => ({
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

  setConnected: (payload) => {
    const topicMap = new Map<string, TopicDescriptor>();
    for (const d of payload.topicCatalogue ?? []) {
      topicMap.set(d.topic, d);
    }
    set({
      connection: {
        isConnected: true,
        socketId: payload.socketId,
        sessionId: payload.sessionId,
        error: null,
      },
      selfInteractiveId: payload.interactiveStuffId,
      topicCatalogue: topicMap,
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
    });
  },

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
  pendingTrailLabel: null,

  setPendingTrailLabel: (label) =>
    set((state) =>
      state.pendingTrailLabel === label ? {} : { pendingTrailLabel: label }
    ),

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

  // Prompt-stack slice (initial cleared state)
  prompts: [],
  promptDrafts: { [BASE_SLOT]: '' },
  activeSlot: BASE_SLOT,
  basePrompt: '>',
  echoSnapshotQueue: [],

  pushPrompt: (entry) =>
    set((state) => {
      // Dedupe on promptId — if a duplicate id arrives (substrate
      // bug or replay), replace the existing entry so the renderer
      // doesn't double-display it.
      const filtered = state.prompts.filter(
        (p) => p.promptId !== entry.promptId
      );
      const prompts = [...filtered, entry];
      const drafts = state.promptDrafts[entry.promptId] !== undefined
        ? state.promptDrafts
        : { ...state.promptDrafts, [entry.promptId]: '' };
      // foreground: true → take the active slot; false → leave
      // whatever the player was on. Per the slate's auto-switch
      // default.
      const activeSlot = entry.foreground ? entry.promptId : state.activeSlot;
      return { prompts, promptDrafts: drafts, activeSlot };
    }),

  dismissPrompt: (promptId) =>
    set((state) => {
      const prompts = state.prompts.filter((p) => p.promptId !== promptId);
      if (prompts.length === state.prompts.length) {
        // Nothing to dismiss. Fall back to BASE if active was the
        // missing id anyway (paranoia for stale UI state).
        return state.activeSlot === promptId
          ? { activeSlot: BASE_SLOT }
          : {};
      }
      // Drop the draft for the dismissed slot. The base slot's
      // draft is never the target here (BASE_SLOT never matches a
      // promptId).
      const { [promptId]: _drop, ...promptDrafts } = state.promptDrafts;
      let activeSlot: string = state.activeSlot;
      if (activeSlot === promptId) {
        const newTop = prompts[prompts.length - 1];
        activeSlot = newTop ? newTop.promptId : BASE_SLOT;
      }
      return { prompts, promptDrafts, activeSlot };
    }),

  setPromptValidationError: (promptId, message) =>
    set((state) => {
      let changed = false;
      const prompts = state.prompts.map((p) => {
        if (p.promptId !== promptId) return p;
        if (message === null) {
          if (p.validationError === undefined) return p;
          changed = true;
          const { validationError: _drop, ...rest } = p;
          return rest as PromptEntry;
        }
        if (p.validationError === message) return p;
        changed = true;
        return { ...p, validationError: message } as PromptEntry;
      });
      return changed ? { prompts } : {};
    }),

  setActiveSlot: (slot) =>
    set((state) => {
      if (slot === state.activeSlot) return {};
      if (slot === BASE_SLOT) return { activeSlot: BASE_SLOT };
      if (!state.prompts.some((p) => p.promptId === slot)) return {};
      return { activeSlot: slot };
    }),

  setDraft: (slot, text) =>
    set((state) => {
      if (state.promptDrafts[slot] === text) return {};
      return { promptDrafts: { ...state.promptDrafts, [slot]: text } };
    }),

  setBasePrompt: (rendered) =>
    set((state) => {
      if (state.basePrompt === rendered) return {};
      return { basePrompt: rendered };
    }),

  pushEchoSnapshot: (snap) =>
    set((state) => ({
      echoSnapshotQueue: [...state.echoSnapshotQueue, snap],
    })),

  shiftEchoSnapshot: () => {
    let popped: EchoSnapshot | null = null;
    set((state) => {
      if (state.echoSnapshotQueue.length === 0) return {};
      const [head, ...rest] = state.echoSnapshotQueue;
      popped = head ?? null;
      return { echoSnapshotQueue: rest };
    });
    return popped;
  },

  clearPrompts: () =>
    set(() => ({
      prompts: [],
      promptDrafts: { [BASE_SLOT]: '' },
      activeSlot: BASE_SLOT,
      echoSnapshotQueue: [],
    })),

  // Frames slice
  frames: [],

  appendFrame: (frame) =>
    set((state) => ({ frames: [...state.frames, frame] })),

  clearFrames: () =>
    set((state) => (state.frames.length === 0 ? {} : { frames: [] })),

  // Topic catalogue slice
  topicCatalogue: new Map<string, TopicDescriptor>(),

  setTopicCatalogue: (records) =>
    set(() => {
      const map = new Map<string, TopicDescriptor>();
      for (const d of records) {
        map.set(d.topic, d);
      }
      return { topicCatalogue: map };
    }),

  getTopicDescriptor: (topic) =>
    resolveTopicDescriptor(get().topicCatalogue, topic),

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
