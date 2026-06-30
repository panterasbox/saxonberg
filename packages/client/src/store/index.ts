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

import { create } from "zustand";
import type {
  AuthState,
  CharGenRosterEntry,
  CharGenStatePayload,
  ConnectionEstablishedPayload,
  ConnectionState,
  ConsoleTab,
  ForumChange,
  ForumEntryRecord,
  ForumSubscriptionScope,
  MqlMatchSummary,
  PromptChoice,
  ReactionActState,
  ReactionSampleEntry,
  RosterRow,
  StreamSource,
  StuffDetailRecord,
  StuffRefRecord,
  TopicDescriptor,
} from "@saxonberg/types";
import { createCmsSlice, type CmsSlice } from "./cmsSlice";

/**
 * The mutually-exclusive top-level UI phase. Derived from the auth /
 * connection state and the char-gen wire frames:
 *
 *   - `unauthenticated` — no Google session yet; the login takeover.
 *   - `connecting` — authenticated, WebSocket connecting; a neutral
 *     splash while we wait for the first server frame to choose the
 *     real destination. Never shows the roster/character-select screen.
 *   - `character-select` — a `system.charactergen.roster` frame
 *     arrived; the player picks an existing character or creates one.
 *   - `char-gen` — a `system.charactergen.state` frame arrived; the
 *     dedicated character-creation stage owns the screen.
 *   - `in-world` — a `system.connection.established` frame for an
 *     Avatar arrived; the cockpit takes over.
 *
 * App.tsx switches the whole render on this single field. The phases
 * are exclusive — exactly one screen renders at a time.
 */
export type ConnectionPhase =
  | "unauthenticated"
  | "connecting"
  | "character-select"
  | "char-gen"
  | "in-world";

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
      kind: "choice";
      promptId: string;
      label: string;
      choices: PromptChoice[];
      defaultChoice?: string;
      foreground: boolean;
      validationError?: string;
    }
  | {
      kind: "confirm";
      promptId: string;
      label: string;
      defaultAnswer: "yes" | "no";
      foreground: boolean;
      validationError?: string;
    }
  | {
      kind: "text";
      promptId: string;
      label: string;
      placeholder?: string;
      foreground: boolean;
      validationError?: string;
    }
  | {
      kind: "compose";
      promptId: string;
      label: string;
      placeholder?: string;
      allowEditorEscalation?: boolean;
      foreground: boolean;
      validationError?: string;
    }
  | {
      kind: "mql-object";
      promptId: string;
      label: string;
      matches: MqlMatchSummary[];
      foreground: boolean;
      validationError?: string;
    }
  | {
      kind: "mql-many";
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
export const BASE_SLOT = "base" as const;

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
  /**
   * The act key (`meta.commandId`). Carried for reaction render-
   * correlation: an incoming `reaction-delta` keyed by `commandId`
   * finds the displayed message so the counter renders on the right
   * line. NOT used for input (a clicked/typed reaction emits `react
   * --msg <gutter#>`; gutter→commandId stays server-side).
   */
  commandId?: string;
  /**
   * Set on a frame that is itself a reaction (`meta.inReactionTo` =
   * the act's `commandId`). Lets the client group reaction prose lines
   * onto the target message's always-on indicator with no extra wire.
   */
  inReactionTo?: string;
  /**
   * The per-Interactive gutter number (`meta.frameId`). Used as the
   * `react --msg <#>` selector for the per-row quick-react affordance;
   * the server resolves the gutter → commandId.
   */
  frameId?: number;
  /**
   * Chat channel name (`payload.channelName`), when this is a chat frame.
   * Lets a client-side view (the forum chat sidecar) filter the feed to a
   * single channel — a CLIENT filter, like the console tabs; nothing
   * server-side keys on it.
   */
  channelName?: string;
  /**
   * Twitch relay provenance (`world.twitch.message` frames), extracted
   * from `payload` at ingest. Structured so the twitch template renders
   * the distinct treatment and reveals the linked MUD persona on hover
   * without re-parsing the body string. CLIENT-only (not on the wire
   * type). `handle` is the honest-to-origin default name (the Twitch
   * handle, or the local player's name for an `egress` mirror); `persona`
   * is the linked MUD identity surfaced on hover when present.
   */
  twitch?: {
    login: string;
    handle: string;
    persona?: string;
    text: string;
    egress?: boolean;
  };
}


/**
 * Combined store state. Extends {@link CmsSlice} (the CMS editor's
 * state + actions) — composed in via `createCmsSlice` in the store body.
 */
interface StoreState extends CmsSlice {
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
  /**
   * The stuffId of the connected Avatar — used by `MmlRenderer` for
   * self-mention / own-name highlight comparisons.
   */
  selfAvatarId: string | null;
  setConnection: (connection: Partial<ConnectionState>) => void;
  setConnected: (payload: ConnectionEstablishedPayload) => void;
  setDisconnected: (error?: string, link?: "reconnecting" | "dropped") => void;

  // Connection-phase slice — the mutually-exclusive top-level screen.
  /**
   * Which top-level screen renders. Initialised from the auth state
   * (`unauthenticated` until a Google session is confirmed). The
   * char-gen frames and `setConnected` drive the transitions:
   *
   *   - a `system.charactergen.roster` frame → `character-select`
   *   - a `system.charactergen.state` frame  → `char-gen`
   *   - `setConnected` (avatar entered world)  → `in-world`
   *   - disconnect drops back as appropriate.
   */
  connectionPhase: ConnectionPhase;
  /** Set the top-level phase directly (idempotent no-op on no change). */
  setConnectionPhase: (phase: ConnectionPhase) => void;

  /**
   * The ghost command line — the always-on preview/teaching strip beside
   * the primary command bar. `ghostPreview` is the exact command a
   * hovered affordance would run (passive teaching); `ghostFlash` is a
   * transient post-action message (`› <ran>` on click, `copied: …` on
   * copy). Input mode itself is now server-authoritative (the per-bar
   * `cockpit.inputModes` clientState map + the interpreter prepend); the
   * client no longer wraps input.
   */
  ghostPreview: string | null;
  ghostFlash: string | null;
  setGhostPreview: (command: string | null) => void;
  /** Show a transient ghost-line flash (auto-clears in the component). */
  flashGhost: (message: string) => void;

  /**
   * Whether the "Social / Notifications" settings pane (a modal over the
   * `notify` verb) is open. Opened from the account menu; ephemeral
   * client-only UI state, never persisted.
   */
  socialPaneOpen: boolean;
  setSocialPaneOpen: (open: boolean) => void;

  /**
   * The summoned-pane tier — the no-modal replacement for "pop a modal".
   * A transient pane that renders BESIDE the current layout's terminal
   * (never full-screen, never blocks input — the inspection pane is the
   * existing proof). `null` = none summoned. v1 kind: `'settings'`.
   * Opening a pane is client UI state (like the inspection pane), not a
   * layout switch; the controls inside send real commands.
   */
  summonedPane: "settings" | null;
  openPane: (kind: "settings") => void;
  closePane: () => void;

  /**
   * Which right-column cockpit pane the world layout shows —
   * `'inspect'` (the inspection pane) or `'who'` (the "Who's Online"
   * roster). Ephemeral client-only UI state, never persisted. Consulted
   * by the world layout's right-column pane switch.
   */
  rightPane: "inspect" | "who";
  setRightPane: (pane: "inspect" | "who") => void;

  /**
   * The "Who's Online" roster (`world.social.roster` topic). `roster` maps
   * the stable per-target `handle` → the viewer-lensed {@link RosterRow};
   * `rosterOrder` is the display order (recognized first, then by header).
   * The server pushes a full `snapshot` on connect/reconnect and `add` /
   * `remove` deltas as players come and go — the client only renders. See
   * `services/websocket.ts` (the `world.social.roster` handler).
   */
  roster: Record<string, RosterRow>;
  rosterOrder: string[];
  /** Replace the whole roster (a `snapshot` frame). */
  applyRosterSnapshot: (rows: RosterRow[]) => void;
  /** Upsert one row by `handle` (an `add` frame). */
  applyRosterAdd: (row: RosterRow) => void;
  /** Delete one row by `handle` (a `remove` frame). */
  applyRosterRemove: (handle: string) => void;

  /**
   * The forum view's current navigation target. `boardHandle` is the
   * subject-title handle of the open board; `threadId` is the open
   * thread's entry id (null at the board's thread-list level).
   */
  forumNav: { boardHandle: string | null; threadId: string | null };
  setForumNav: (nav: {
    boardHandle?: string | null;
    threadId?: string | null;
  }) => void;

  /**
   * Live forum records keyed by subscriptionId — fed by
   * `forum-subscription-result` (snapshot) + `forum-subscription-delta`
   * (live changes). Mirrors the MQL feed-registry pattern but for forum
   * Documents. See `store/forumActions.ts`.
   */
  forumRecords: Record<string, ForumEntryRecord[]>;
  /** The scope each subscription watches (board/thread + id). */
  forumScopes: Record<string, ForumSubscriptionScope>;
  applyForumResult: (
    subscriptionId: string,
    scope: ForumSubscriptionScope,
    records: ForumEntryRecord[],
  ) => void;
  applyForumDelta: (subscriptionId: string, changes: ForumChange[]) => void;
  clearForumSubscription: (subscriptionId: string) => void;

  /**
   * Dev-only one-shot: set by the dev "Skip to world" button so that,
   * when the roster arrives, `CharacterSelect` auto-plays the first
   * character instead of stopping at the picker. Cleared once consumed.
   * Real players never set it, so the roster behaves normally for them.
   */
  autoEnterPending: boolean;
  setAutoEnterPending: (pending: boolean) => void;

  // Char-gen slices — the pre-world character-creation surfaces.
  /**
   * The character-select roster, populated from the most recent
   * `system.charactergen.roster` frame. Empty until the frame
   * arrives. Setting it flips the phase to `character-select`.
   */
  charGenRoster: CharGenRosterEntry[];
  /** Store the roster and flip to `character-select`. */
  setCharGenRoster: (roster: CharGenRosterEntry[]) => void;
  /**
   * The current char-gen step state, from the most recent
   * `system.charactergen.state` frame. `null` until char-gen begins.
   * Setting a non-`done` state flips the phase to `char-gen`.
   */
  charGenState: CharGenStatePayload | null;
  /** Store the char-gen state and flip to `char-gen` (unless done). */
  setCharGenState: (state: CharGenStatePayload) => void;

  // Client state — server-persisted UI bag.
  /**
   * Cached snapshot of `_clientState` mirrored from the server on
   * session-establish. Keyed by dotted-string (e.g. `'console.tabs'`,
   * `'console.activeTab'`). The shape of each value is feature-defined
   * — components read via typed selectors and cast.
   *
   * Mutations: feature actions (see `consoleActions` exports) call
   * `setLocalClientState` for the optimistic local update and emit
   * the wire write via `websocketClient.sendClientStateWrite`. The
   * store layer stays pure state; the wire layer handles IO.
   */
  clientState: Record<string, unknown>;
  /** Wholesale replace; called from session-establish. */
  setClientStateSnapshot: (snapshot: Record<string, unknown>) => void;
  /**
   * Optimistic local update of one key. Pure state mutation — does
   * NOT emit a wire write. Composed actions (e.g. `addTab`) call
   * this AND `websocketClient.sendClientStateWrite`.
   */
  setLocalClientState: (key: string, value: unknown) => void;

  /**
   * Operator-configured broadcast sources for the livestream-viewer
   * embed. Seeded from the welcome snapshot (`setConnected`) and kept
   * live by the `stream-sources` envelope. Empty when no broadcast is
   * configured.
   */
  broadcastSources: StreamSource[];
  /** Replace the broadcast source list (welcome snapshot + live push). */
  setBroadcastSources: (sources: StreamSource[]) => void;

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

  // Console session-scoped state — not persisted, cleared on disconnect.
  /**
   * Unread counter per tab name. Incremented in `appendFrame` for
   * every frame matching an inactive tab's filter; cleared on tab
   * switch. Keys are tab names; missing keys treated as 0.
   */
  unreadCounts: Record<string, number>;
  /** Bump the counter for one tab by 1. */
  incrementUnread: (tabName: string) => void;
  /** Clear the counter for one tab (called on tab switch). */
  clearUnreadFor: (tabName: string) => void;
  /**
   * Per-tab scroll position. Captured on the active tab's scroll
   * events and restored on tab switch. Keys are tab names.
   */
  scrollPositions: Record<string, number>;
  setScrollPosition: (tabName: string, offset: number) => void;
  /**
   * Per-topic count of frames the ACTIVE tab muted since the start
   * of the session. Drives the filter-drawer badges (Phase 4).
   */
  mutedSinceSessionStart: Record<string, number>;

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

  // Reactions slice ---------------------------------------------------
  /**
   * `Record<commandId, ReactionActState>` — the live aggregate per
   * reactable act, keyed by the act's `commandId`. Replaced (NOT summed)
   * on each `reaction-delta`: counts are authoritative absolute totals.
   */
  reactions: Record<string, ReactionActState>;
  /**
   * `Record<commandId, epochMs>` — a "moved this tick" marker the
   * counter/train widget animates from. Stamped on every delta.
   */
  reactionMoved: Record<string, number>;
  /**
   * `Record<commandId, ReactionSampleEntry[]>` — the FULL reactor set
   * for an expanded act, populated by `reaction-expand-result`.
   */
  reactionExpansions: Record<string, ReactionSampleEntry[]>;
  /**
   * Replace each act's aggregate from a `reaction-delta`. Counts are
   * authoritative — the widget replaces and animates, never sums.
   */
  applyReactionDelta: (acts: ReactionActState[], at?: number) => void;
  /** Store the full reactor set from a `reaction-expand-result`. */
  applyReactionExpandResult: (
    commandId: string,
    reactors: ReactionSampleEntry[],
  ) => void;
  /**
   * The viewer's client-honored reaction render prefs, from the
   * connection-established payload (intensity / alwaysAggregate /
   * muteChannels). Defaults until the payload arrives.
   */
  reactionPrefs: NonNullable<ConnectionEstablishedPayload["reactionPrefs"]>;

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
    result: (StuffRefRecord | StuffDetailRecord)[] | null,
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
    } | null,
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
    ctx: { stuffId: string; direction: string } | null,
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
  setPromptValidationError: (promptId: string, message: string | null) => void;
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
  topic: string,
): TopicDescriptor {
  const authored = cache.get(topic);
  if (authored) return authored;
  const segments = topic.split(".");
  for (let i = segments.length - 1; i >= 1; i--) {
    const ancestorPath = segments.slice(0, i).join(".");
    const ancestor = cache.get(ancestorPath);
    if (ancestor) {
      const leaf = segments[segments.length - 1] ?? "";
      return {
        topic,
        family: ancestorPath,
        label: `${ancestor.label} (${titleCase(leaf)})`,
        description: ancestor.description,
      };
    }
  }
  const leaf = segments[segments.length - 1] ?? topic;
  const family = segments.length > 1 ? segments.slice(0, -1).join(".") : "";
  return {
    topic,
    family,
    label: titleCase(leaf),
    description: "(no description)",
  };
}

function titleCase(segment: string): string {
  if (!segment) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * Stable display order for the "Who's Online" roster: recognized
 * characters first, then case-insensitively by `header`, with `handle` as
 * the final tiebreaker so the order is deterministic.
 */
function orderRoster(roster: Record<string, RosterRow>): string[] {
  return Object.values(roster)
    .sort((a, b) => {
      if (a.recognized !== b.recognized) return a.recognized ? -1 : 1;
      const byHeader = a.header.localeCompare(b.header, undefined, {
        sensitivity: "base",
      });
      if (byHeader !== 0) return byHeader;
      return a.handle.localeCompare(b.handle);
    })
    .map((row) => row.handle);
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
  // 'connected' is the silent default — the indicator only speaks up
  // once an established connection actually drops. `isConnected` is the
  // literal socket boolean (false until the WS opens).
  link: "connected",
  isConnected: false,
  socketId: null,
  sessionId: null,
  error: null,
};

/**
 * Zustand store.
 */
export const useStore = create<StoreState>((set, get) => ({
  // CMS editor slice (state + REST-driven actions). Composed first; it
  // only touches the `cms.*` keys, so the slice's narrower `set`/`get`
  // are structurally compatible with the store's.
  ...createCmsSlice(
    set as Parameters<typeof createCmsSlice>[0],
    get as Parameters<typeof createCmsSlice>[1],
  ),

  // Auth state
  auth: initialAuthState,

  setAuth: (auth) =>
    set((state) => {
      const nextAuth = { ...state.auth, ...auth };
      // Crossing the unauthenticated boundary: once a Google session
      // is confirmed, leave the login takeover. The specific
      // post-login destination (character-select / char-gen / in-world)
      // is chosen by the first server frame after the WebSocket
      // connects; until then we sit in the neutral `connecting` phase (a
      // quiet splash), never the character-select/roster screen and never
      // bouncing back to login. If auth is cleared, return to
      // `unauthenticated`.
      let connectionPhase = state.connectionPhase;
      if (
        nextAuth.isAuthenticated &&
        state.connectionPhase === "unauthenticated"
      ) {
        connectionPhase = "connecting";
      } else if (!nextAuth.isAuthenticated) {
        connectionPhase = "unauthenticated";
      }
      return { auth: nextAuth, connectionPhase };
    }),

  clearAuth: () =>
    set({
      auth: initialAuthState,
      connectionPhase: "unauthenticated",
    }),

  // Connection state
  connection: initialConnectionState,
  selfInteractiveId: null,
  selfAvatarId: null,

  // Connection-phase slice. Initial phase mirrors the initial auth
  // state (unauthenticated until /auth/status confirms a session);
  // setAuth/setConnected/the char-gen frames advance it from there.
  connectionPhase: "unauthenticated",

  setConnectionPhase: (phase) =>
    set((state) =>
      state.connectionPhase === phase ? {} : { connectionPhase: phase },
    ),

  // Ghost command line — preview + transient flash. Input mode is now
  // server-authoritative (the per-bar `cockpit.inputModes` map applied by
  // the command interpreter); the client only displays it.
  ghostPreview: null,
  ghostFlash: null,
  setGhostPreview: (command) => set(() => ({ ghostPreview: command })),
  flashGhost: (message) => set(() => ({ ghostFlash: message })),

  // "Social / Notifications" settings-pane modal toggle (account menu).
  socialPaneOpen: false,
  setSocialPaneOpen: (open) => set(() => ({ socialPaneOpen: open })),

  // Summoned-pane tier (the no-modal side panel).
  summonedPane: null,
  openPane: (kind) => set(() => ({ summonedPane: kind })),
  closePane: () => set(() => ({ summonedPane: null })),

  // Right-column cockpit pane axis (world layout): inspection | who's-online.
  rightPane: "inspect",
  setRightPane: (pane) =>
    set((state) => (state.rightPane === pane ? {} : { rightPane: pane })),

  // "Who's Online" roster (world.social.roster). Keyed by stable handle;
  // ordering recomputed on every mutation (recognized first, then header).
  roster: {},
  rosterOrder: [],
  applyRosterSnapshot: (rows) =>
    set(() => {
      const roster: Record<string, RosterRow> = {};
      for (const row of rows) roster[row.handle] = row;
      return { roster, rosterOrder: orderRoster(roster) };
    }),
  applyRosterAdd: (row) =>
    set((state) => {
      const roster = { ...state.roster, [row.handle]: row };
      return { roster, rosterOrder: orderRoster(roster) };
    }),
  applyRosterRemove: (handle) =>
    set((state) => {
      if (!(handle in state.roster)) return {};
      const { [handle]: _drop, ...roster } = state.roster;
      return { roster, rosterOrder: orderRoster(roster) };
    }),

  forumNav: { boardHandle: null, threadId: null },
  setForumNav: (nav) =>
    set((state) => ({
      forumNav: {
        boardHandle:
          nav.boardHandle !== undefined
            ? nav.boardHandle
            : state.forumNav.boardHandle,
        threadId:
          nav.threadId !== undefined ? nav.threadId : state.forumNav.threadId,
      },
    })),

  forumRecords: {},
  forumScopes: {},
  applyForumResult: (subscriptionId, scope, records) =>
    set((state) => ({
      forumRecords: { ...state.forumRecords, [subscriptionId]: records },
      forumScopes: { ...state.forumScopes, [subscriptionId]: scope },
    })),
  applyForumDelta: (subscriptionId, changes) =>
    set((state) => {
      const current = state.forumRecords[subscriptionId] ?? [];
      const byId = new Map(current.map((r) => [r.id, r]));
      for (const change of changes) {
        if (change.op === "remove") {
          byId.delete(change.key);
        } else if (change.fields) {
          // add / replace both upsert the full record.
          byId.set(change.key, change.fields);
        }
      }
      return {
        forumRecords: {
          ...state.forumRecords,
          [subscriptionId]: [...byId.values()],
        },
      };
    }),
  clearForumSubscription: (subscriptionId) =>
    set((state) => {
      const records = { ...state.forumRecords };
      const scopes = { ...state.forumScopes };
      delete records[subscriptionId];
      delete scopes[subscriptionId];
      return { forumRecords: records, forumScopes: scopes };
    }),

  autoEnterPending: false,
  setAutoEnterPending: (pending) => set({ autoEnterPending: pending }),

  // Char-gen slices (initial cleared state).
  charGenRoster: [],

  setCharGenRoster: (roster) =>
    set(() => ({
      charGenRoster: roster,
      connectionPhase: "character-select",
    })),

  charGenState: null,

  setCharGenState: (charGenState) =>
    set(() => ({
      charGenState,
      // A char-gen state frame means we're mid-creation. The in-world
      // flip rides the `system.connection.established` that `enroll
      // confirm` fires after commit (setConnected), not a state frame.
      connectionPhase: "char-gen" as const,
    })),

  setConnection: (connection) =>
    set((state) => ({
      connection: { ...state.connection, ...connection },
    })),

  setConnected: (payload) => {
    const topicMap = new Map<string, TopicDescriptor>();
    for (const d of payload.topicCatalogue ?? []) {
      topicMap.set(d.topic, d);
    }
    set((state) => ({
      // Entering the world from char-gen or the roster starts a fresh
      // terminal — drop the buffer (and its unread/muted bookkeeping) so
      // the player doesn't carry the `enroll …` command echoes into the
      // world. A reconnect (already in-world) keeps its scrollback.
      ...(state.connectionPhase === "in-world"
        ? {}
        : { frames: [], unreadCounts: {}, mutedSinceSessionStart: {} }),
      connection: {
        link: "connected",
        isConnected: true,
        socketId: payload.socketId,
        sessionId: payload.sessionId,
        error: null,
      },
      // An established frame always carries an Avatar (avatarStuffId),
      // so it is unconditionally the in-world flip — regardless of
      // prior phase (char-gen commit, roster select, or a fresh
      // login that already had a character).
      connectionPhase: "in-world",
      charGenState: null,
      selfInteractiveId: payload.interactiveStuffId,
      selfAvatarId: payload.avatarStuffId,
      topicCatalogue: topicMap,
      clientState: { ...(payload.clientState ?? {}) },
      broadcastSources: payload.broadcastSources ?? [],
      ...(payload.reactionPrefs
        ? { reactionPrefs: payload.reactionPrefs }
        : {}),
      auth: {
        isAuthenticated: true,
        user: {
          id: payload.userId,
          email: "",
          displayName: [
            payload.player.honorific,
            payload.player.name,
            payload.player.surname,
            payload.player.nameSuffix,
          ]
            .filter(Boolean)
            .join(" ")
            .trim(),
        },
        player: payload.player,
      },
    }));
  },

  setDisconnected: (error, link = "reconnecting") =>
    set((state) => {
      // A dropped guest can't resume — the server reaped the avatar on
      // disconnect — so route them to the start screen (their throwaway
      // session is over). Real users stay in-world on a drop; the
      // Reconnect banner handles give-up, and the avatar persists
      // server-side for a seamless resume.
      const droppedGuest =
        link === "dropped" && state.auth.player?.isGuest === true;
      const toStartScreen = !state.auth.isAuthenticated || droppedGuest;
      return {
        connection: {
          link,
          isConnected: false,
          socketId: null,
          sessionId: null,
          error: error || null,
        },
        selfInteractiveId: null,
        selfAvatarId: null,
        // Drop char-gen surfaces on disconnect; the next connection
        // re-issues the roster / char-gen frames.
        charGenRoster: [],
        charGenState: null,
        connectionPhase: toStartScreen
          ? "unauthenticated"
          : state.connectionPhase === "in-world"
            ? "in-world"
            : state.connectionPhase,
        // Clear identity for a dropped guest so the start screen shows
        // the logged-out state, not a stale guest.
        ...(droppedGuest
          ? { auth: { isAuthenticated: false, user: null, player: null } }
          : {}),
      };
    }),

  // Inspection-pane slice (initial cleared state)
  paneFocusName: null,
  paneFocusFragment: "",
  paneBodyPainted: false,
  paneLastResult: null,
  paneBreadcrumbRoot: null,
  paneBreadcrumbTrail: [],
  paneDetailPath: [],
  paneDoorContext: null,
  pendingTrailLabel: null,

  setPendingTrailLabel: (label) =>
    set((state) =>
      state.pendingTrailLabel === label ? {} : { pendingTrailLabel: label },
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
      const head =
        state.paneBreadcrumbTrail[state.paneBreadcrumbTrail.length - 1];
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
  promptDrafts: { [BASE_SLOT]: "" },
  activeSlot: BASE_SLOT,
  basePrompt: ">",
  echoSnapshotQueue: [],

  pushPrompt: (entry) =>
    set((state) => {
      // Dedupe on promptId — if a duplicate id arrives (substrate
      // bug or replay), replace the existing entry so the renderer
      // doesn't double-display it.
      const filtered = state.prompts.filter(
        (p) => p.promptId !== entry.promptId,
      );
      const prompts = [...filtered, entry];
      const drafts =
        state.promptDrafts[entry.promptId] !== undefined
          ? state.promptDrafts
          : { ...state.promptDrafts, [entry.promptId]: "" };
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
        return state.activeSlot === promptId ? { activeSlot: BASE_SLOT } : {};
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
      promptDrafts: { [BASE_SLOT]: "" },
      activeSlot: BASE_SLOT,
      echoSnapshotQueue: [],
    })),

  // Client state slice
  clientState: {},

  setClientStateSnapshot: (snapshot) =>
    set(() => ({ clientState: { ...snapshot } })),

  setLocalClientState: (key, value) =>
    set((state) => ({
      clientState: { ...state.clientState, [key]: value },
    })),

  // Broadcast sources slice (livestream-viewer embed)
  broadcastSources: [],
  setBroadcastSources: (sources) => set(() => ({ broadcastSources: sources })),

  // Frames slice
  frames: [],

  appendFrame: (frame) =>
    set((state) => {
      const tabs =
        (state.clientState["console.tabs"] as ConsoleTab[] | undefined) ?? [];
      const active =
        (state.clientState["console.activeTab"] as string | undefined) ?? "All";
      let unreadCounts = state.unreadCounts;
      let mutedSinceSessionStart = state.mutedSinceSessionStart;
      let unreadChanged = false;
      const nextUnread: Record<string, number> = { ...unreadCounts };
      for (const tab of tabs) {
        if (tab.name === active) continue;
        if (tab.muted.includes(frame.topic)) continue;
        const prev = nextUnread[tab.name] ?? 0;
        nextUnread[tab.name] = prev + 1;
        unreadChanged = true;
      }
      if (unreadChanged) unreadCounts = nextUnread;
      // Track frames suppressed by the active tab's mute set.
      const activeTab = tabs.find((t) => t.name === active);
      if (activeTab && activeTab.muted.includes(frame.topic)) {
        mutedSinceSessionStart = {
          ...mutedSinceSessionStart,
          [frame.topic]: (mutedSinceSessionStart[frame.topic] ?? 0) + 1,
        };
      }
      return {
        frames: [...state.frames, frame],
        ...(unreadChanged ? { unreadCounts } : {}),
        ...(mutedSinceSessionStart !== state.mutedSinceSessionStart
          ? { mutedSinceSessionStart }
          : {}),
      };
    }),

  clearFrames: () =>
    set((state) =>
      state.frames.length === 0 &&
      Object.keys(state.unreadCounts).length === 0 &&
      Object.keys(state.mutedSinceSessionStart).length === 0
        ? {}
        : {
            frames: [],
            unreadCounts: {},
            mutedSinceSessionStart: {},
          },
    ),

  unreadCounts: {},
  incrementUnread: (tabName) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [tabName]: (state.unreadCounts[tabName] ?? 0) + 1,
      },
    })),
  clearUnreadFor: (tabName) =>
    set((state) => {
      if (!(tabName in state.unreadCounts)) return {};
      const { [tabName]: _drop, ...rest } = state.unreadCounts;
      return { unreadCounts: rest };
    }),

  scrollPositions: {},
  setScrollPosition: (tabName, offset) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [tabName]: offset },
    })),

  mutedSinceSessionStart: {},

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
        if (!incoming || typeof incoming.stuffId !== "string") {
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

  // Reactions slice
  reactions: {},
  reactionMoved: {},
  reactionExpansions: {},
  reactionPrefs: {
    intensity: "normal",
    alwaysAggregate: false,
    muteChannels: false,
  },

  applyReactionDelta: (acts, at) =>
    set((state) => {
      if (acts.length === 0) return {};
      const stamp = at ?? Date.now();
      const reactions = { ...state.reactions };
      const reactionMoved = { ...state.reactionMoved };
      for (const act of acts) {
        // Replace, never sum — counts are authoritative absolute totals.
        reactions[act.commandId] = act;
        reactionMoved[act.commandId] = stamp;
      }
      return { reactions, reactionMoved };
    }),

  applyReactionExpandResult: (commandId, reactors) =>
    set((state) => ({
      reactionExpansions: {
        ...state.reactionExpansions,
        [commandId]: reactors,
      },
    })),
}));
