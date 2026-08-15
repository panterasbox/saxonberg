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
    /**
     * ⭐⭐ **Which feeds this frame belongs in, decided server-side.**
     *
     * Routing is a predicate over the frame's topic FACETS, and the
     * facets live on the server's topic catalogue — so the frame
     * arrives already knowing where it goes and the client never
     * re-derives a rule. A client that evaluated the table would be
     * holding a server semantic, and two evaluators disagree the first
     * time one of them is changed.
     *
     * Stamped per-RECIPIENT (the table is per-player), which is why it
     * lands at the Avatar's delivery seam rather than at compose time.
     * Absent on frames delivered before a player has a table — the
     * client treats absence as `world`, the same answer the catch-all
     * gives.
     */
    feeds?: FeedDestination[];
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
 * A NOTABLE presence status on a `world.social.roster` row. Mirrors the
 * server `PresenceApi.PresenceStatus`. A bare `active` (online, nothing
 * notable) is represented by the **absence** of `RosterRow.status`, so the
 * "Who's Online" card only badges the exceptional states.
 */
export type PresenceStatus = 'active' | 'idle' | 'engaged' | 'reconnecting';

/**
 * One row of the `world.social.roster` projection — the viewer-lensed
 * "who's online" record the server composes per-viewer (mirrors the server
 * `ProfileApi.RosterRow`). The header is already lensed server-side
 * (recognized → a name; stranger → a salient-feature description), so the
 * client only renders — it owns zero naming/recognition semantics.
 *
 * - `handle` is the stable per-target key (the Avatar template path); the
 *   client keys the roster map on it for stable add/remove/upsert.
 * - `header` is the display string AND the targeting token the row's
 *   `profile <header>` command uses.
 * - `country` is the resolved country of origin (display name), present
 *   when the server could resolve it.
 * - `status` is a notable status only (idle/engaged/reconnecting); absent
 *   means plain online.
 * - `recognized` drives styling — known characters render emphasized,
 *   strangers muted.
 */
export interface RosterRow {
  handle: string;
  header: string;
  country?: string;
  status?: PresenceStatus;
  recognized: boolean;
}

/**
 * Payload of a `world.social.roster` frame (mirrors the server
 * `PresenceApi.RosterFrame`). Rides the ordinary `MessageFrame` channel
 * (empty body, structured payload). The client routes by `action`:
 * `snapshot` replaces the whole roster, `add` upserts one row by `handle`,
 * `remove` deletes by `handle`. A full `snapshot` arrives automatically on
 * connect/reconnect — there is no request RPC.
 */
export type RosterFrame =
  | { kind: 'roster'; action: 'add'; handle: string; row: RosterRow }
  | { kind: 'roster'; action: 'remove'; handle: string }
  | { kind: 'roster'; action: 'snapshot'; rows: RosterRow[] };

/**
 * Which broadcast realm a release belongs to — `ooc` (out-of-character /
 * operator) vs `world` (in-fiction). Mirrors the server `ReleaseRealm`.
 */
export type ReleaseRealm = 'ooc' | 'world';

/**
 * The editorial classification of a release. Mirrors the server
 * `ReleaseKind`.
 */
export type ReleaseKind =
  | 'changelog'
  | 'decision'
  | 'event'
  | 'notice'
  | 'repost';

/**
 * The client-facing projection of one release (the news-ticker row). The
 * server owns all semantics (ordering, pin-cap, expiry, soft-retract) — a
 * **retracted** release is never projected to the client. MML `headline` /
 * `body` render through the existing parse path; the client owns zero
 * ordering/recognition semantics.
 */
export interface ReleaseRow {
  releaseId: string;
  /** The publisher organization's durable path. */
  publisher: string;
  realm: ReleaseRealm;
  kind: ReleaseKind;
  headline: string;
  body: string;
  /** The acting author's durable identity string, when present. */
  author?: string;
  /** Where a `repost`'s substance came from; absent on an original. */
  source?: string;
  /** Publish time, epoch-ms. */
  publishedAt: number;
  pinned: boolean;
  /** Expiry, epoch-ms; absent / `0` = never expires. */
  expiresAt?: number;
}

/**
 * The **anonymous** projection of one release — what an unauthenticated
 * visitor reads on the start screen's press room.
 *
 * ⚠ **A standalone interface, deliberately.** Not a `Pick<ReleaseRow>` and
 * not an extension of it: structural sharing is how a field added to the
 * authenticated row later leaks to the open internet without anyone
 * noticing. The key set is frozen and asserted as frozen.
 *
 * ⚠ **No `author` and no `expiresAt`.** An expiry is operational metadata,
 * not press-room content, and the person who typed a release is not part
 * of what a publisher published — the organization is the speaker.
 */
export interface PublicReleaseRow {
  releaseId: string;
  /** The publisher organization's durable path. */
  publisher: string;
  /** The publisher's display name. */
  publisherLabel: string;
  realm: ReleaseRealm;
  kind: ReleaseKind;
  /** Where a `repost`'s substance came from; absent on an original. */
  source?: string;
  headline: string;
  body: string;
  publishedAt: number;
  pinned: boolean;
}

/**
 * Payload of a `world.press.feed` frame (the news-ticker fan-out;
 * mirrors the server-side fan). Rides the ordinary `MessageFrame` channel
 * (empty body, structured payload). The client routes by `action`:
 * `snapshot` replaces the whole feed, `upsert` inserts/replaces one row by
 * `releaseId`, `remove` deletes by `releaseId`. The initial `snapshot`
 * arrives on connect via `ConnectionEstablishedPayload.releaseWindow`
 * (the welcome payload, not a frame) — there is no request RPC.
 */
/**
 * One heading in an article, as the wiki card's outline shows it.
 * `anchor` is the **sticky** anchor — the durable citation target, not
 * a slug re-derived from the title, so a reworded heading keeps it.
 */
export interface WikiSectionSummary {
  level: 1 | 2 | 3;
  anchor: string;
  title: string;
}

/**
 * `world.wiki.page` payload — the article the wiki card is showing.
 *
 * The **same rendered body** the terminal received, which is the
 * point: it has already been through the render pipeline's gate, so
 * over-capability content is absent from this payload for the same
 * reason it is absent from the scroll. The card never re-renders and
 * never sees a source it was not sent.
 *
 * Everything the card can act on is a **command** it composes and
 * emits (`wiki edit <handle>`, `wiki history <handle>`) — bus-primacy;
 * there is no private wiki channel from the client.
 *
 * `mayEdit` is the server's answer, sent so the card can hide an
 * affordance that would be refused. It is a display hint and nothing
 * more — the verb re-checks on arrival, which is where the decision
 * actually lives.
 */
export interface WikiPageFrame {
  kind: 'wiki-page';
  /** `namespace:slug` — what every command the card emits addresses. */
  handle: string;
  title: string;
  rev: number;
  /** Rendered, gated MML. */
  body: string;
  tags: string[];
  related: string[];
  sections: WikiSectionSummary[];
  subject: { kind: string; ref: string } | null;
  updatedBy: string;
  updatedAt: number;
  mayEdit: boolean;
  /**
   * True when this is an unsaved `wiki preview`. The card says so, or
   * a preview is indistinguishable from the saved page it is not.
   */
  preview?: boolean;
}

export type ReleaseFeedFrame =
  | { kind: 'release'; action: 'upsert'; row: ReleaseRow }
  | { kind: 'release'; action: 'remove'; releaseId: string }
  | { kind: 'release'; action: 'snapshot'; rows: ReleaseRow[] };

/**
 * One row of the `social.rules` client-state projection — a flattened,
 * wire-safe view of a `NotifyRule` for the "Social / Notifications"
 * settings card. The server pushes the viewer's effective ordered list
 * (stored rules spliced into the virtual reserved baseline) via
 * `host.pushClientStateUpdate('social.rules', SocialRulesState)` after
 * every `notify` mutation; the card reads it as a **read-only cache** —
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
 *   into the stored list (the card styles it as a default that
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
 * (and on a bare `notify` list) so the settings card re-renders without a
 * reconnect snapshot. Not a persisted client-state key — a pure push
 * cache.
 */
export interface SocialRulesState {
  rules: SocialRuleProjection[];
  /**
   * The viewer's current `social.presenceFormat` Liquid template (the
   * per-character presence-line format). The card shows + edits it; writes
   * go back through `settings set social.presenceFormat "…"`. A pure push
   * cache like `rules` — the setting store is the source of truth.
   */
  presenceFormat: string;
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
    | 'door'
    | 'terrain'
    | 'breakaway';
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
    /**
     * The verb EXISTS but nothing here affords it — *"there is nothing
     * to drink"*, never *"unknown command"*. Distinct from
     * `unknown-verb` on purpose: conferral controls the affordance
     * list, never the parser, and the two answers teach opposite
     * things about whether the verb is real.
     */
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
/**
 * ⭐⭐ **A prompt remembers who asked, and that is what makes an
 * abandoned one judgeable.**
 *
 * Every prompt is pushed from inside a running command, so the verb,
 * its one-line description, and when it started waiting are facts the
 * server already has. Carrying them turns two otherwise-impossible
 * surfaces into ordinary ones:
 *
 * - the WAITING strip can say *what* is waiting rather than just *that*
 *   something is;
 * - ⚠⚠ **cancel can name the command it kills.** Cancelling is not
 *   dismissing a dialog — it rejects the awaiting command with
 *   `PromptCancelledError` — so a button that says only *"cancel"* is a
 *   lie about what it does.
 *
 * Every field is optional: a prompt pushed outside a command frame
 * (engine-initiated, a future scheduled ask) genuinely has no answer,
 * and inventing one would be worse than the absence. The client hatches
 * rather than guessing.
 */
export interface PromptProvenance {
  /** The command that is waiting on this answer, as it was dispatched. */
  askedBy?: string;
  /** That verb's one-line description, from its own spec. */
  askedByDescription?: string;
  /** Epoch ms the prompt was pushed — the elapsed clock's origin. */
  askedAt?: number;
}

export interface ChoicePromptNote extends PromptProvenance {
  kind: 'prompt-choice';
  label: string;
  choices: PromptChoice[];
  defaultChoice?: string;
  foreground: boolean;
}

export interface ConfirmPromptNote extends PromptProvenance {
  kind: 'prompt-confirm';
  label: string;
  defaultAnswer: 'yes' | 'no';
  foreground: boolean;
}

export interface TextPromptNote extends PromptProvenance {
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
export interface ComposePromptNote extends PromptProvenance {
  kind: 'prompt-compose';
  label: string;
  placeholder?: string;
  /**
   * Text the composer opens with — the **current** body when the
   * prompt is an edit rather than a creation.
   *
   * ⚠ Without it "edit" means "retype": the box opens empty and
   * whatever is posted replaces the whole article. The server sends
   * what the author is editing; the client seeds the draft with it.
   */
  initial?: string;
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

export interface MqlObjectPromptNote extends PromptProvenance {
  kind: 'prompt-mql-object';
  label: string;
  matches: MqlMatchSummary[];
  foreground: boolean;
}

export interface MqlManyPromptNote extends PromptProvenance {
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

/* ---- Wiki ------------------------------------------------------- */

/**
 * A wiki edit was rejected because the page moved under it — the
 * compare-and-swap on `rev` (A3).
 *
 * ⭐ **No auto-merge, deliberately.** A wiki edit is prose, and a
 * machine-merged paragraph is worse than an honest conflict: it reads
 * as somebody's writing and is nobody's. So the server returns the
 * three bodies and lets a person decide.
 *
 * ⚠ **All three bodies are filtered through the same reveal gate as a
 * reading.** A conflict response is a revision-facing surface, so
 * without that it is a hole in the wall the renderer built: a reader
 * who cannot see a level-3 section could read it by provoking a
 * conflict. Above the reader's ceiling a fragment is *absent* — not
 * redacted, not counted (criteria 67, 68).
 *
 * A new `Note` kind is the sanctioned extension here: the union is
 * explicitly append-only, and the alternative (a bespoke error shape)
 * would not ride the dispatch-response envelope at all.
 */
export interface WikiEditConflictNote {
  kind: 'wiki-edit-conflict';
  /** The page's `namespace:slug` handle. */
  page: string;
  /** The section anchor, when the edit was section-scoped. */
  section?: string;
  /** The revision the submitted edit was based on. */
  baseRev: number;
  /** The revision the page is actually at now. */
  currentRev: number;
  /** The body as it stood at `baseRev` — gated. */
  base: string;
  /** The body as it stands now — gated. */
  current: string;
  /** What the author tried to save — gated. */
  submitted: string;
}

export type Note =
  | WikiEditConflictNote
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
 * fields (e.g., a focus-card query like `$focus` or a current-room
 * query like `here`).
 */
/**
 * A **card** the server knows by name.
 *
 * ⭐⭐ **The server owns this vocabulary, and that is the whole point.**
 * A subscription's `subscriptionId` is a client-minted `nanoid` — a
 * transport handle that dies on reconnect — so it can name a card for
 * the length of one socket and nothing longer. Anything durable that
 * refers to a card (a saved arrangement, a pin, a future authored
 * layout) needs an identity the server issues and can still recognise
 * tomorrow. That is this.
 *
 * ⚠ **Naming a card is not the same as describing one.** The client
 * sends `card: 'inspect'` and NOTHING else — the server supplies the
 * query, the cardinality, the field set, the dependency flags and the
 * hold. Before this, `InspectionCard.tsx` hardcoded `query: "$focus"`,
 * which is the client holding a server semantic: the same category
 * error as a client deciding its own affordances, and the reason a
 * wrong figure on the wire becomes a wrong figure on screen.
 *
 * ⚠ The vocabulary is deliberately SMALL and grows with real consumers.
 * It is not a menu of hypothetical cards — every entry here is one a
 * COMMAND actually opens. The server-side definitions live in
 * `lib/connection/Cards.ts`.
 *
 * ⚠⚠ **`self` is not here, and that is structural.** The widget shelf's
 * subscription has no pinned-ness and no lifetime; forcing it to declare
 * them would make the catalogue's required-fields gate meaningless. It
 * lives beside the catalogue as `SHELF_SUBSCRIPTION`, explicitly not a
 * card, and the client names it on the wire as `chrome: 'self'`.
 *
 * ⚠ `inspect` and `location` are gone with the focus signal: `inspect`
 * was the client-side inference this build retires, and `location`'s
 * detail trail already lives on the card body.
 */
export type CardId =
  | "subject"
  | "place"
  | "who"
  | "news"
  | "wiki"
  | "help"
  | "prompt"
  | "cms"
  | "git"
  | "studio";

/** Every {@link CardId}. The server validates against this; the client picks from it. */
export const CARD_IDS: readonly CardId[] = [
  "subject",
  "place",
  "who",
  "news",
  "wiki",
  "help",
  "prompt",
  "cms",
  "git",
  "studio",
];

/**
 * A row on the **widget shelf** — the pinnable figures in the top bar.
 *
 * Shaped exactly like {@link CardId}, and for the same reason: pinning
 * is a real command persisting to the `cockpit.shelf` clientState key,
 * so the server validates a row name against this list and the client
 * picks from it. A shelf the client owned would falsify the one claim
 * the status bar exists to make — *every click sends a command, and the
 * interface shows which*.
 *
 * ⚠ **What is here is the ID vocabulary and nothing else.** Each row's
 * label, description, and — critically — whether it is live or hatched
 * and why, are CLIENT-side, in `components/frame/Shelf.tsx`.
 * Hatched-ness is a property of the client's wiring, not of the
 * server's capability: the server cannot know that the client declined
 * to paint `COIN`, only the client knows which of the fields it
 * receives it actually renders. Modelling that here would be a second
 * source of truth for something only one side observes.
 *
 * ⚠⚠ **`trait` is not in this union, and must never be added.** It is
 * in the reference art's catalogue and it is a permanent non-goal: the
 * psychology vocation rests on self-other asymmetry, and a pinned
 * always-on readout of your own personality is the stat sheet that
 * makes the therapist unnecessary. The server-side guard forbidding
 * subscribable field names matching `trait|disposition|personality`
 * stands unmodified; this is its client-vocabulary twin, placed here
 * because this is where a future contributor would add the row.
 */
export type ShelfRowId =
  | "play"
  | "renown"
  | "skill"
  | "make"
  | "coin"
  | "status"
  | "time"
  | "online"
  | "docket";

/** Every {@link ShelfRowId}, in catalogue order. */
export const SHELF_ROW_IDS: readonly ShelfRowId[] = [
  "play",
  "renown",
  "skill",
  "make",
  "coin",
  "status",
  "time",
  "online",
  "docket",
];

/**
 * What `cockpit.shelf` holds for a player who has never touched it:
 * **the rows that are actually wired**, and nothing else.
 *
 * ⭐ **Never default-pin a widget that does not do anything yet.** An
 * earlier cut defaulted to all nine, reasoning that the shelf being
 * mostly hatched *is* the honesty convention working and should
 * therefore be visible on first login. That mistook a principle for a
 * product: a new player's first impression should not be six dead
 * boxes, however truthfully each one explains itself.
 *
 * The convention is not lost by this — it moves to where it is
 * actually useful. The `＋ widget` menu lists the whole catalogue with
 * every row's reason in visible text, which is the moment a player is
 * asking "why can't I have COIN?" A reason shown at the point of the
 * question beats a reason shown on a bar nobody asked about.
 *
 * ⚠ So the nine-row assertion is about the **catalogue**, not the
 * default shelf. A row joins this list when it starts answering.
 */
export const DEFAULT_SHELF: readonly ShelfRowId[] = [
  "play",
  "renown",
  "skill",
];

export interface MqlSubscribeMessage {
  type: 'mql-subscribe';
  subscriptionId: string;
  /**
   * ⭐⭐ **The client can no longer name a CARD at the wire level.**
   *
   * A card exists because a command caused the server to push it, so
   * there is nothing for a client to ask for. What remains is exactly
   * one **chrome** subscription — the widget shelf's `self` figures,
   * which is not a card (no pinned-ness, no lifetime) and is the only
   * standing query the client legitimately opens for itself.
   *
   * ⚠ This is acceptance criterion 1 enforced by the PROTOCOL rather
   * than by a source grep: a client cannot mint a card even if its code
   * tried to, because the message has no field that would say which.
   */
  chrome?: 'self';
  query?: string;
  cardinality?: 'one' | 'many';
  fields?: string[] | 'ref' | 'detail';
  detailKey?: string;
  focusDependent?: boolean;
  locationDependent?: boolean;
}

/**
 * Why a card closed. A card that vanishes without a reason reads as a
 * bug and the player cannot tell a rule from a defect — so the reason
 * is on the wire rather than inferred.
 *
 * ⚠⚠ **The five HOLDS are gone and this is not their replacement.**
 * The four spatial holds (`here`, `present`, `inReach`, `carried`) were
 * world-condition lifetimes, each costing a wake to fire; they are
 * retired for one relevance window plus `pinned`. `unanswered` was the
 * one the design leaned on — *nothing still actionable ever leaves* —
 * and its guarantee moves onto the pinned axis: a prompt card opens
 * PINNED and auto-releases with `answered` when the prompt settles.
 */
export type CardCloseReason =
  /** A prompt card's prompt settled. */
  | "answered"
  /** The relevance window lapsed. States its reason (AC 4). */
  | "aged-out"
  /** The player dropped it. */
  | "dismissed"
  /**
   * ⭐ The workspace changed, not the world. A mode switch resolves its
   * arrangement server-side and pushes the card set, so cards the new
   * arrangement does not name are closed — and they need a reason that
   * does not claim somebody walked out.
   */
  | "rearranged"
  /** A live card's subject stopped existing. */
  | "gone";

/** Which viewport a per-form-factor setting override addresses. */
export type FormFactor = 'desktop' | 'mobile';

/**
 * What a `payload`-source card carries instead of MQL records.
 *
 * ⭐ **The catalogue cannot be MQL-only, and this is why.** MQL speaks
 * **Stuff**. The roster is `RosterRow[]`, releases are `Release`
 * documents, a wiki page is a rendered payload and a help topic is a
 * `HelpTopic` — none of them is a Stuff, so three of the ten shipped
 * rows would be unbuildable if a card's only content source were a
 * query. The producer forwards to the Api that already owns the read;
 * no new read Apis exist for this.
 */
export type CardPayload =
  | { kind: 'roster'; rows: RosterRow[] }
  | { kind: 'releases'; rows: ReleaseRow[] }
  | { kind: 'wikiPage'; page: WikiPageFrame }
  | { kind: 'helpTopic'; topic: HelpTopic };

/**
 * A card opened (or re-opened after being closed). **Every** card
 * arrives this way: there is exactly one birth path and the server owns
 * it, so there is no `pushed` flag to distinguish a server push from a
 * client one — the client never opens a card at all.
 */
export interface CardOpenedEnvelope {
  type: 'card-opened';
  frameId: number;
  /**
   * Server-minted, and **IS the subscription id when the card is
   * live** — which is what lets a live card's deltas keep riding
   * `mql-subscription-delta` with no new envelope and no join table.
   */
  instanceId: string;
  cardId: CardId;
  /**
   * ⭐ The normalized command that produced this card. It is the card's
   * IDENTITY (the dedup key) and it is exactly what a refresh control
   * re-issues — so the control previews what it sends, per the
   * every-clickable-previews-its-command rule.
   */
  key: string;
  live: boolean;
  pinned: boolean;
  /**
   * When the content was resolved. **Static cards only** — a live card
   * has no stale answer to stamp, and a timestamp on one would invite
   * the refresh control that hides a wake that never fires (AC 6).
   */
  takenAt?: number;
  title?: string;
  subjectId?: string;
  promptId?: string;
  /**
   * ⭐ The MML the controller already emitted to the terminal, carried
   * so `shell.result: terminal` is a real rendering rather than a
   * second one. Absent when the card declares `noProse` — a Monaco
   * editor cannot degrade to prose.
   */
  prose?: string;
  /** `mql`-source cards. */
  result?: (StuffRefRecord | StuffDetailRecord | StuffDetailFocusRecord)[];
  /** `payload`-source cards. */
  payload?: CardPayload;
}

/**
 * The same command was re-issued: bring the card forward, reset its
 * relevance window, and — for a static card — re-resolve it.
 */
export interface CardTouchedEnvelope {
  type: 'card-touched';
  frameId: number;
  instanceId: string;
  key: string;
  takenAt?: number;
  title?: string;
  prose?: string;
  result?: (StuffRefRecord | StuffDetailRecord | StuffDetailFocusRecord)[];
  payload?: CardPayload;
}

/** The card went away, and why. */
export interface CardClosedEnvelope {
  type: 'card-closed';
  frameId: number;
  instanceId: string;
  reason: CardCloseReason;
}

/**
 * The pin override took. Mirrored from the server, never set
 * optimistically: `cockpit card pin` is a real command the server may
 * refuse, and a local toggle would show a pin that is not there.
 */
export interface CardPinnedEnvelope {
  type: 'card-pinned';
  frameId: number;
  instanceId: string;
  pinned: boolean;
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
 * Ask the server what a viewer can do with one object, right now —
 * the request behind the radial menu. Correlated by `requestId`; the
 * subject is named by `stuffId`, the same token every identity tag
 * already carries on the wire.
 *
 * One-shot request/response, deliberately not a subscription: a menu
 * is open for a second or two. Keeping an open radial live as the
 * world changes is possible on the subscription substrate and is
 * deferred until something needs it.
 */
export interface AffordanceResolveMessage {
  type: 'affordance-resolve';
  requestId: string;
  stuffId: string;
}

/**
 * Whether a verb can be run on the subject right now.
 *
 * `pending-operand` is the state that keeps a radial honest: `put`
 * passes every check a menu can evaluate, but still needs a container
 * the menu cannot know. Reporting it plainly `enabled` would promise
 * a click that then stalls on a prompt.
 */
export type AffordanceState = 'enabled' | 'disabled' | 'pending-operand';

/** One verb in an {@link AffordanceResultEnvelope}. */
export interface AffordanceEntry {
  verb: string;
  /** Authored one-line description — the menu's label text. */
  description: string;
  state: AffordanceState;
  /**
   * Why it is unavailable — **the validator's own words**, verbatim.
   * Present only on `disabled`. The strings are already written in
   * player-facing prose, because a validator's return value is what
   * the player would have been shown had they typed the verb.
   */
  reason?: string;
  /**
   * The field still needing a value, on `pending-operand` — so the
   * client can open the right prompt rather than guessing.
   */
  operand?: string;
  /**
   * ⭐ Which category the verb belongs to — the directory its spec
   * lives in (`perception`, `movement`, `social`, `inventory`, …), or
   * `'domain'` for a locality's own verb.
   *
   * ⚠⚠ **The radial's geometry is FIXED per category and must never
   * reflow to fit the verbs a particular object affords.** Muscle
   * memory across objects is the entire point of a radial menu; one
   * that rearranges itself has none. Which quadrant a category sits in
   * is a client rendering decision — several categories share a slot —
   * but WHICH category a verb is in is a server fact, so it rides here
   * rather than being pattern-matched off the verb's name.
   */
  category?: string;
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
 * What the `self` card puts on the wire — the viewer's own figures, as
 * the widget shelf reads them.
 *
 * ⚠ **Every field is optional, and an absent key is the honest
 * answer.** `projectFields` omits any field whose descriptor `read`
 * returns `undefined`, and the standing descriptors return `undefined`
 * for anyone but the subject — so a record with no `playStanding` is
 * not an error, it is "not resolved for you". The shelf renders each
 * absence as the not-wired state with its own reason rather than
 * substituting a zero.
 *
 * ⭐ **`makeStanding` joined this record when the account roll-up
 * landed.** It had been kept off the wire entirely — not
 * sent-and-declined — because *Make* is an account-level stock whose
 * arithmetic was unbuilt, so the figure's LEVEL was wrong, and a figure
 * whose level is wrong cannot be rendered. What made it safe was the
 * arithmetic PLUS an honest absence: the descriptor returns `undefined`
 * when the account cannot be resolved, so the shelf hatches rather than
 * showing a per-character number under an account-level label.
 *
 * ⭐ `renown` is absent — not `0` — for a scope that was never
 * materialized. `RenownApi.measuredRenownOf` preserves that
 * distinction, so a `{ value: 0 }` that arrives here genuinely means
 * *measured, and the answer is zero*, and renders as a live figure.
 */
export interface SelfFigureRecord {
  stuffId: string;
  /** Influence earned by living in the world. Band NAME, not a value object. */
  playStanding?: { band: string };
  /**
   * Influence earned by building — the ACCOUNT's band, summed across
   * its characters. Absent when the account could not be resolved.
   */
  makeStanding?: { band: string };
  /** Signed standing. Present only when the scope is materialized. */
  renown?: { value: number };
  /**
   * The competence currently being practised. `null` — as distinct from
   * absent — means the transcript answered and nothing is being
   * practised.
   */
  practisingCompetence?: { discipline: string; band: string } | null;
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
 *   - `subjects` — the Subjects the viewer can see, each with the
 *     surfaces it lights up; `id` is unused. This is the rail.
 *   - `index` — the set of boards the viewer can see (the forum landing
 *     list); `id` is unused.
 *   - `board` — a board's thread-list; `id` is the board `_id` or its flat
 *     title handle.
 *   - `thread` — a thread's post-tree; `id` is the thread-root entry `_id`.
 *
 * ⭐ `subjects` and `index` are not the same question. A board is one
 * SURFACE of a subject; the rail is a list of subjects, and a subject may
 * light up as many as four. Watching boards can only ever produce a flat
 * list of boards, which is the shape the client was stuck in.
 */
export interface ForumSubscriptionScope {
  kind: ForumScopeKind;
  id: string;
}

/**
 * Every forum subscription scope kind.
 *
 * ⚠⚠ **Exported because the vocabulary had a second copy, and it
 * drifted.** The inbound WS handler listed the kinds literally as a
 * shape-check; adding `subjects` to the type and to the registry left
 * that list stale, and it **returned silently** — the client subscribed,
 * the server dropped the message with no error envelope, and the rail
 * rendered its honest empty state over a subject that existed. Nothing
 * failed, because the failure was the silence. Both sides read this now.
 */
export const FORUM_SCOPE_KINDS = [
  'subjects',
  'index',
  'board',
  'thread',
] as const;

export type ForumScopeKind = (typeof FORUM_SCOPE_KINDS)[number];

/** The audience a subject binds, projected for display. */
export interface SubjectAudience {
  /**
   * `open` — every player. `bound` — an existing group ref the subject
   * consumes and did not mint. `curated` — a managed group minted
   * alongside the subject, carrying owner/admin/member roles.
   */
  kind: 'open' | 'bound' | 'curated';
  /** What to show beside the title: the ref, or a word for the kind. */
  label: string;
}

/**
 * One Subject projected for the rail.
 *
 * ⭐ **A subject is ONE record: identity + audience + the surfaces it
 * lights up.** It is not a board — a board is one of the four surfaces a
 * subject can light. Which is why switching surfaces changes the
 * rendering and not the room: one audience, one membership, one invite
 * list, whichever surface you are looking at.
 */
export interface ForumSubjectRecord {
  id: string;
  title: string;
  /**
   * `venue` — board-grain, addressed by a flat-global handle.
   * `topic` — a promoted thread, addressed by the board-scoped
   * `parent/name` handle and inheriting the parent's audience.
   */
  grain: 'venue' | 'topic';
  /** How every command addressing this subject names it. */
  handle: string;
  /** For a topic-grain subject, its parent subject's id. */
  parent: string | null;
  audience: SubjectAudience;
  /** The surfaces this subject has lit, in vocabulary order. */
  surfaces: SubjectSurfaceName[];
  /**
   * The backing document id per lit surface — a `Board` for the forum
   * surfaces, a `Channel` for the chat ones.
   *
   * ⚠⚠ **Without this the two forum surfaces are indistinguishable to a
   * client.** A subject's handle addresses the SUBJECT, and
   * `resolveBoardByHandle` resolves it to a board with a documented
   * tie-break — *"Popularity wins the rare both-lit case."* That
   * assumption held while no surface let you light both; the subject
   * tabs invite exactly that, and switching to Argument then silently
   * re-rendered the popularity board. Found by driving.
   */
  surfaceRefs: Partial<Record<SubjectSurfaceName, string>>;
  /**
   * Objections on this subject's argument board that nothing answers.
   * Zero when there is no argument surface. ⚠ Derived from the SAME
   * `openObjection` computation the entry projection uses — the badge and
   * the rows must never be able to disagree.
   */
  openObjections: number;
}

/**
 * The four surfaces a subject can light up, at most one of each.
 *
 * ⚠ `rules-chat` is **parked** server-side, not merely unbuilt in the
 * client: `chat on --rules` describes itself as deferred. It is in the
 * vocabulary so the client can show it as unavailable rather than
 * offering a control that reliably refuses.
 */
export type SubjectSurfaceName =
  | 'open-forum'
  | 'ordered-forum'
  | 'open-chat'
  | 'ordered-chat';

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
   * absent (or `'open'`) for the open view.
   */
  organizer?: 'open' | 'ordered';
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

/**
 * ⚠ `records` is discriminated by `scope.kind`, not by a second tag: a
 * `subjects` subscription carries {@link ForumSubjectRecord}s, every
 * other scope carries {@link ForumEntryRecord}s. The client already knows
 * its own scope — it asked for it — so a tag here would be a second copy
 * of a fact that cannot get out of step.
 */
export interface ForumSubscriptionResultEnvelope {
  type: 'forum-subscription-result';
  frameId: number;
  subscriptionId: string;
  scope: ForumSubscriptionScope;
  records: (ForumEntryRecord | ForumSubjectRecord)[];
}

export interface ForumChange {
  op: 'add' | 'replace' | 'remove';
  key: string;
  /** Same discrimination as the result envelope's `records`. */
  fields?: ForumEntryRecord | ForumSubjectRecord;
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
// The emote catalogue (what the picker draws)
// ============================================================================

/**
 * One declared slot of an emote's grammar, projected for the picker.
 *
 * The picker offers one control per slot, in declaration order, because
 * an emote with grammar (`;wave <at> <manner>`) cannot be reached from a
 * flat grid otherwise. `stuff` slots resolve by MQL; `free` slots take
 * arbitrary text and render in the free treatment.
 */
export interface EmoteSlotSpec {
  name: string;
  kind: 'stuff' | 'free';
  required: boolean;
  /** MQL resolution scope for a `stuff` slot; absent for `free`. */
  scope?: string;
}

/**
 * One canonical emote, projected for the client's picker.
 *
 * Rides {@link ConnectionEstablishedPayload.emoteCatalogue}. Aliases are
 * carried on their canonical entry rather than appearing as entries of
 * their own — the grid shows verbs you can send, and an alias is the
 * same verb by another name.
 */
export interface EmoteCatalogueEntry {
  verb: string;
  /** Present only for emoji-bearing emotes; glyph-less emotes render as
   *  prose and never as a chip, so the grid skips them. */
  emoji?: string;
  aliases: string[];
  tags: string[];
  /** Declaration order — the order the picker offers the controls in. */
  slots: EmoteSlotSpec[];
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
 * Result of an {@link AffordanceResolveMessage}: what this viewer can
 * do with this object, at this instant.
 *
 * ⚠ **Both lists are filtered, and filtering means DELETION.** A verb
 * the viewer is not entitled to know about is absent — never present
 * and flagged — because a response that admits a hidden verb exists
 * leaks the fact that it exists. Same for a concealed mixin. The
 * honest-fog rule; see docs/subsystems/concealment.md.
 */
export interface AffordanceResultEnvelope {
  type: 'affordance-result';
  frameId: number;
  requestId: string;
  stuffId: string;
  verbs: AffordanceEntry[];
  /**
   * The subject's active mixin composition, so the menu can label and
   * group without a second round trip. **Active**, not declared:
   * augments, implants, species innates and on-shift conferral all
   * change it at runtime.
   */
  composition: string[];
  /**
   * What the subject IS, to this viewer — the centre chip's middle
   * term (*"cast-iron anvil · thing · 6 mixins"*).
   *
   * ⚠ Viewer-aware, via the same `RecognitionApi.kindOf` gates the
   * prose path uses: a viewer who cannot see, or who is looking at a
   * mask, is told `npc` rather than `player`. A third "unknown" value
   * would announce *that* something is being withheld, which is the
   * honest-fog failure the whole face is built to avoid.
   */
  kind: 'player' | 'npc' | 'thing';
}

/**
 * The subject could not be resolved for this viewer.
 *
 * ⚠ One reason code, and that is deliberate: distinguishing "no such
 * object" from "you may not see that object" would answer the
 * question the gate exists to refuse.
 */
export interface AffordanceErrorEnvelope {
  type: 'affordance-error';
  frameId: number;
  requestId: string;
  stuffId: string;
  reason: 'unresolvable';
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

/**
 * Server→broadcast push of one relay-chat line from the overlay owner's
 * OWN active stream (Twitch or YouTube, unified + provenance-tagged),
 * forwarded onto the `service:broadcast` overlay feed while live. Filtered
 * server-side to the `OVERLAY_*`-configured channels — a viewer tuning a
 * DIFFERENT channel never reaches this envelope. Escaped plain text,
 * never MML (untrusted external input). The overlay *render* lives in the
 * sibling `pbox-stream` repo; this is the wire contract it consumes.
 */
export interface RelayChatEnvelope {
  type: 'relay-chat';
  frameId: number;
  service: 'twitch' | 'youtube' | 'kick';
  channelHandle: string;
  speaker: RelaySpeaker;
  text: string;
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
  | AffordanceResultEnvelope
  | AffordanceErrorEnvelope
  | StreamStateEnvelope
  | RelayChatEnvelope
  | CardOpenedEnvelope
  | CardTouchedEnvelope
  | CardClosedEnvelope
  | CardPinnedEnvelope;

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
  | Omit<AffordanceResultEnvelope, 'frameId'>
  | Omit<AffordanceErrorEnvelope, 'frameId'>
  | Omit<StreamStateEnvelope, 'frameId'>
  | Omit<RelayChatEnvelope, 'frameId'>
  | Omit<CardOpenedEnvelope, 'frameId'>
  | Omit<CardTouchedEnvelope, 'frameId'>
  | Omit<CardClosedEnvelope, 'frameId'>
  | Omit<CardPinnedEnvelope, 'frameId'>;

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
   * holds across the provider FK fields.
   */
  googleProfileId?: string;
  /** Associated Twitch profile ID (the credential-bearing provider). */
  twitchProfileId?: string;
  /** Associated Kick profile ID (the third co-equal provider FK). */
  kickProfileId?: string;
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

/**
 * Kick OAuth profile data (persistent), credential-bearing. The
 * {@link TwitchProfile} shape on the third provider: identity + the OAuth
 * tokens (encrypted at rest), plus the owner's channel (`slug` +
 * `broadcasterUserId`) that character-form `tune` and the reverse
 * speaker-link resolve through. A user with no Kick channel links fine
 * with an empty `slug`.
 */
export interface KickProfile {
  /** MongoDB ObjectId */
  _id?: string;
  /** Kick user id (unique, stable identifier). */
  kickUserId: string;
  /** Kick channel slug (lowercased; empty when the user has no channel). */
  slug: string;
  /** Display name from Kick. */
  displayName: string;
  /** Email address (when granted). */
  email?: string;
  /** Kick broadcaster user id (empty when the user has no channel). */
  broadcasterUserId: string;
  /** Raw identity payload (for future use). */
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
 * The login providers the auth spine is parameterized over — co-equal:
 * every provider gets the full login + link flow (one unified interface,
 * never a link-only tier). Adding a provider is a procedure argument, not
 * a code fork. YouTube grows `GoogleProfile` (it's Google OAuth), not a
 * fourth value.
 */
export type AuthProvider = 'google' | 'twitch' | 'kick';

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
 * Normalized Kick identity the verify callback produces from the
 * `/public/v1/users` (+ owner-channel) fetch, parallel to
 * {@link PassportTwitchProfile}. `slug`/`broadcasterUserId` are empty
 * when the account has no channel.
 */
export interface PassportKickProfile {
  id: string;
  slug: string;
  displayName: string;
  email?: string;
  broadcasterUserId: string;
  _json: Record<string, unknown>;
}

/**
 * {@link PassportKickProfile} plus the OAuth credentials harvested in
 * the verify callback — what the find-or-create / link paths persist
 * into a `KickProfile`.
 */
export interface PassportKickProfileWithTokens extends PassportKickProfile {
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
  /** Who the frame is aimed at — drives badging and notification. */
  address: TopicAddress;
  /** Whose voice it is — drives gutter colour. */
  actor: TopicActor;
  /** How much it matters — drives default filter levels. */
  weight: TopicWeight;
  /** Which surface it belongs to. */
  audience: TopicAudience;
  /** Keep in scrollback and transcripts, or let it age out. */
  durable: boolean;
  /** Whether affordances in this frame survive the frame aging. */
  affordance: TopicAffordance;
}

/**
 * ⭐ **The facets — five cross-cutting answers the client used to have
 * to guess.**
 *
 * The dotted topic tree expresses exactly one hierarchy, so anything
 * that cuts across it — *everything addressed to me*, *everything that
 * matters* — had to become a client-side lookup table keyed on ~90
 * topic strings, drifting silently from the seeds every time a topic
 * was added. These five fields put those answers in the data, where
 * they are authored once and shipped on the existing
 * `topicCatalogue` snapshot.
 *
 * The tree still does the job facets cannot: muting a *subtree*
 * ("everything about the air in here") is a prefix operation. Both
 * halves are needed; neither replaces the other.
 */

/**
 * Who a frame is aimed at. `direct` earns a push notification;
 * `ambient` never does.
 */
export type TopicAddress = 'direct' | 'personal' | 'ambient' | 'broadcast';

/**
 * Whose voice a frame speaks in. Replaces colour-by-family, which
 * encoded which subsystem emitted the frame rather than who is
 * talking.
 */
export type TopicActor = 'self' | 'person' | 'world' | 'system';

/**
 * How much a frame matters. Turns "quiet mode" into one rule —
 * `weight ≤ activity` — instead of a list of sixty topic paths.
 */
export type TopicWeight =
  | 'consequence'
  | 'activity'
  | 'chatter'
  | 'diagnostic';

/** Which surface a frame belongs to. */
export type TopicAudience = 'player' | 'author' | 'all';

/**
 * Whether the affordances inside a frame stay usable as the frame ages
 * in scrollback.
 *
 * Without this the client cannot tell a live link from a dead one, so
 * every affordance in history looks equally clickable — a door tagged
 * `unlock` ten minutes ago is a lie the UI tells confidently. `decays`
 * is the floor because a wrongly-`permanent` affordance is exactly that
 * lie, while a wrongly-`decays` one only costs a re-resolve.
 */
export type TopicAffordance =
  /** Still valid; re-resolve on use and expect it to work. */
  | 'live'
  /** Was valid when emitted; grey it once the frame is not current. */
  | 'decays'
  /** Never goes stale — a wiki link, a press archive entry. */
  | 'permanent';

/**
 * ⭐ **The seven topic roots — a closed set.**
 *
 * The tree carries *subject matter* and nothing else; every
 * cross-cutting axis (who it is aimed at, whose voice, how much it
 * matters, which surface) lives in the facets above. That is why seven
 * roots suffice where the pre-facet vocabulary needed eighty-nine
 * paths: it was five facets flattened into a string.
 *
 * ⚠ **Content packs may add leaves, never roots.** A pack-minted root
 * would mean a player's mute of `sense` no longer catches everything
 * sense-shaped, and subtree-mute integrity is the entire reason this is
 * a tree instead of flat tags. Enforced at install time by pack
 * reconcile and at build time by `pnpm lint:topics`.
 *
 * Exported from `@saxonberg/types` for the same reason as
 * {@link LAYOUT_NAMES}: the server's gate and the client's filter
 * surface must never drift.
 */
export type TopicRoot =
  /** Words from a person. */
  | 'speech'
  /** Something was done — by a person or by the world. */
  | 'act'
  /** The world reaching your senses, solicited or not. */
  | 'sense'
  /** Your own person — body, standing, holdings, affiliations. */
  | 'self'
  /** Authored durable content. */
  | 'publication'
  /** The client↔server relationship. */
  | 'shell'
  /** The connection itself. */
  | 'session';

/** Every {@link TopicRoot}. `lint:topics` and pack reconcile both
 *  validate against this; nothing may emit outside it. */
export const TOPIC_ROOTS: readonly TopicRoot[] = [
  'speech',
  'act',
  'sense',
  'self',
  'publication',
  'shell',
  'session',
];

/**
 * Shape of a single console tab in the cockpit's tabbed terminal.
 * Wire transport is `Record<string, unknown>` inside `clientState`;
 * this type keeps client + server aligned on the structure.
 */
export interface ConsoleTab {
  name: string;
  /** Leaf topic strings the tab suppresses. */
  muted: string[];
  /**
   * ⭐⭐ The tab's standing **facet predicate** — its filter set.
   *
   * A tab IS a saved filter set, which is why this upgraded the
   * existing primitive rather than adding a third. `muted` stays
   * beside it and neither replaces the other: facets fix cross-cutting
   * questions (*everything that matters*), and only the topic TREE
   * fixes subtree mutes (*everything about the air in here*), which is
   * a prefix operation no facet can express.
   */
  facets?: FacetFilter;
}

/**
 * ⭐ A standing predicate over topic FACETS.
 *
 * **Within an axis, OR; across axes, AND; an absent axis means any.**
 * That is the whole grammar, and it is enough: *"quiet"* is
 * `weight: ['consequence','activity']` — **one rule**, where the same
 * filter as topic strings is a list of sixty paths that drifts every
 * time a topic is added, silently.
 *
 * This is the payoff the S2 facet taxonomy was built for. The facet
 * names here are the shipped ones, verified against the corpus rather
 * than taken from the reference art (which predates it) — they agree.
 */
export interface FacetFilter {
  address?: TopicAddress[];
  actor?: TopicActor[];
  weight?: TopicWeight[];
  /**
   * Topic-prefix ALLOWLIST — `['speech.channel']` passes
   * `speech.channel` and anything under it.
   *
   * ⚠⚠ **Facets cannot express every filter worth having, and the
   * `Aether` preset is the proof.** *Talking out loud in a room* and
   * *talking on a channel* carry **identical facets** — both
   * `address: broadcast, actor: person` — so no combination of the
   * three axes separates the room from the network. A preset that
   * means "the electronic layer" has to name topics.
   *
   * This is the include direction of the tree half the model already
   * had: `ConsoleTab.muted` is the same operation pointed the other
   * way. Facets stay the default because they do not drift when a
   * topic is added; this is for the cases where the facet space is
   * genuinely not fine-grained enough.
   */
  topics?: string[];
}

/**
 * A named view — a predicate over the frame buffer, with a label.
 *
 * ⚠⚠ **There is no such thing as a "preset" here, and that is the
 * point.** `DEFAULT_VIEWS` below is the set a player STARTS with;
 * the moment it is seeded into `console.tabs` it is ordinary player
 * data, editable and deletable like anything they compose themselves.
 * A shipped view the player could not touch, sitting in the same strip
 * as one they could, is two mechanisms wearing one costume — which is
 * exactly how it was reported: *"'forge watch' I can edit but aether
 * and diag I can't? I thought a filter was a filter."*
 */
export interface ViewDefinition {
  name: string;
  filter: FacetFilter;
  /** One line saying what it does, shown beside the chip. */
  note: string;
}

/**
 * The four presets.
 *
 * ⚠ Exported from here so the panel and any future server-side reader
 * (a `filter` verb) cannot drift — the `DEFAULT_SHELF` precedent.
 */
export const DEFAULT_VIEWS: readonly ViewDefinition[] = [
  {
    name: 'Aether',
    /*
     * ⚠ Topics, not facets, and not by choice — see `FacetFilter.topics`.
     * `speech.vocal` is facet-identical to `speech.channel`, so a facet
     * rule for "the electronic layer" would drag the room in with it,
     * which is the exact opposite of what the word means.
     *
     * `speech.relay` is in because stream chat forwarded into the world
     * is chat: it arrives over the network and nobody in the room hears
     * it.
     */
    filter: { topics: ['speech.comms', 'speech.channel', 'speech.relay'] },
    note: 'dms and chat — what reaches you over the network',
  },
];

/**
 * The unfiltered view, and it is **not** one of the above.
 *
 * ⚠⚠ `All` is the ABSENCE of a filter, not a filter that happens to
 * pass everything — which is why it is locked rather than merely
 * privileged. There is nothing in it to edit (the predicate is empty by
 * definition), and it is what guarantees the player can always get back
 * to seeing everything, so there is nothing to delete either.
 *
 * It is therefore not stored in `console.tabs` at all. A locked ROW in
 * a list of editable rows would be a special case; a structural first
 * entry that is simply a different thing is not.
 */
export const ALL_VIEW = 'All';

// ============================================================================
// Feed routing — one stream, several destinations
// ============================================================================

/**
 * Where a frame can land.
 *
 * A closed set, exported so the server's evaluator and the client's tab
 * strip cannot drift — the `TOPIC_ROOTS` precedent. A fifth destination
 * is a deliberate edit here, not something a rule can invent.
 */
export type FeedDestination =
  | 'world'
  | 'attention'
  | 'channels'
  | 'diagnostics';

export const FEED_DESTINATIONS: readonly FeedDestination[] = [
  'world',
  'attention',
  'channels',
  'diagnostics',
];

/**
 * What a rule does once it matches.
 *
 * - `move` — routes here and **stops**; later rules never see the frame.
 * - `copy` — routes here and **keeps going**, which is how a tell
 *   reaches Attention *and* still lands in World.
 */
export type FeedDisposition = 'move' | 'copy';

/**
 * ⭐ **A predicate over the frame's FACETS, not over topic strings.**
 *
 * This is why the S2 facet work exists. `weight = diagnostic` is one
 * rule; the same rule expressed as topic paths is a list of sixty that
 * drifts every time a topic is added, and the drift is silent.
 *
 * Every field present must match (AND). `topic` is the one tree
 * operation — an exact leaf, or a `*`-suffixed prefix, because subtree
 * containment is what the tree is FOR and no facet can express it.
 *
 * An empty predicate matches everything: that is the catch-all.
 */
export interface FeedPredicate {
  address?: TopicAddress;
  actor?: TopicActor;
  weight?: TopicWeight;
  /** `'speech.channel'` or `'speech.*'`. */
  topic?: string;
}

/** One ordered routing rule. */
export interface RoutingRule {
  when: FeedPredicate;
  to: FeedDestination;
  disposition: FeedDisposition;
}

/**
 * ⚠⚠ **The last rule is a catch-all and cannot be deleted.**
 *
 * Every frame must land somewhere. Without one, a mistyped predicate
 * silently drops output — and *in a world where a frame can be "you are
 * on fire", a lost message is not a cosmetic bug.* The client states
 * that reason where the rule is, rather than in a doc nobody reading
 * the table will open.
 *
 * It is appended by the evaluator rather than stored, so it cannot be
 * edited away by writing the clientState key directly.
 */
export const CATCH_ALL_RULE: RoutingRule = {
  when: {},
  to: 'world',
  disposition: 'move',
};

/**
 * The routing table a player starts with.
 *
 * ⚠⚠ **Copy-to-Attention ships ON.** On a desktop it is a convenience —
 * the frame is visible in World anyway. On a phone World may not be the
 * feed you are looking at, so it stops being a convenience and becomes
 * the safety net; turning it off has to state what it costs.
 */
export const DEFAULT_ROUTING: readonly RoutingRule[] = [
  { when: { weight: 'diagnostic' }, to: 'diagnostics', disposition: 'move' },
  { when: { topic: 'speech.channel' }, to: 'channels', disposition: 'move' },
  { when: { address: 'direct' }, to: 'attention', disposition: 'copy' },
];

/**
 * The cockpit layout vocabulary — the server-authoritative axis on the
 * `cockpit.layout` clientState key. The client holds a `layout →
 * component` registry keyed by these names and swaps the whole cockpit
 * on a `cockpit.layout` change. Both ends import this one list so the
 * `layout` verb's validator and the client registry can never drift.
 *
 *   - `world`             — the classic terminal cockpit (default).
 *   - `forum`             — the forum board view.
 *   - `livestream-viewer` — a video embed + chat/game terminals.
 *   - `streamer`          — the viewer layout minus the embed.
 *   - `builder`           — the CMS tree + editor, re-homed in-session.
 */
export type LayoutName =
  | "world"
  | "forum"
  | "livestream-viewer"
  | "streamer"
  | "builder";

/** Every {@link LayoutName}, in menu order. The `layout` verb validates
 *  against this; the client `LAYOUT_REGISTRY` is keyed by it. */
export const LAYOUT_NAMES: readonly LayoutName[] = [
  "world",
  "forum",
  "livestream-viewer",
  "streamer",
  "builder",
];

/**
 * The cockpit's **activity axis** — the front doors, answering *what am
 * I here to do*. Held server-authoritative on the `cockpit.mode`
 * clientState key and set by `cockpit mode <name>`.
 *
 * This is the axis that used to be conflated with {@link LayoutName}:
 * the five old layout values were really a mode plus that mode's
 * arrangement, flattened into one string (see
 * {@link LEGACY_LAYOUT_MIGRATION}).
 *
 * ⚠ **A mode is a view, never a gate.** Everything runnable in `play`
 * is runnable in `build`. A mode that forbade a verb would be a
 * permission system wearing a UI costume, with its checks in the wrong
 * layer entirely. A mode owns which arrangements ship, which one you
 * land in, and which card kinds may be summoned — nothing else.
 *
 * ⚠ `govern` ships as a peer of `build` rather than a tier inside it.
 * The seeding slate writes the pair as "the Build / Govern ascent",
 * which reads as one progression; they are two values here because a
 * front door is a front door. If `govern` turns out to belong *within*
 * `build`, that is a one-line edit to this list, not a redesign —
 * flagged deliberately rather than silently resolved.
 */
export type CockpitMode =
  /** Talking to people — channels, boards, the social surface. */
  | "chat"
  /** Living in the world. The default. */
  | "play"
  /** Watching a stream, as viewer or broadcaster. */
  | "watch"
  /** Making things — the content editor. */
  | "build"
  /** The offices and the polity. */
  | "govern";

/** Every {@link CockpitMode}, in menu order. The `cockpit mode`
 *  validator and the client's mode registry both read this one list. */
export const COCKPIT_MODES: readonly CockpitMode[] = [
  "chat",
  "play",
  "watch",
  "build",
  "govern",
];

/** The mode a player lands in with nothing stored. */
export const DEFAULT_COCKPIT_MODE: CockpitMode = "play";

/**
 * The **arrangement axis** — savable card arrangements *inside* a mode.
 * These are the shipped defaults; a player composes and names their own
 * with `cockpit layout save <name>`, so this is a floor, not a closed
 * vocabulary. The first entry of each list is that mode's default
 * arrangement, the one you land in on entry.
 *
 * `watch` ships two because the two legacy livestream layouts are
 * genuinely different arrangements of one activity — which is exactly
 * why {@link LEGACY_LAYOUT_MIGRATION} is a mapping and not a rename.
 */
export const COCKPIT_ARRANGEMENTS: Readonly<
  Record<CockpitMode, readonly string[]>
> = {
  chat: ["default"],
  play: ["default"],
  watch: ["viewer", "streamer"],
  build: ["default"],
  govern: ["default"],
};

/**
 * ⭐ The cards a SHIPPED arrangement opens, keyed **(mode, arrangement)**.
 *
 * A saved arrangement carries its own `cards` (that is what `cockpit
 * layout save` records). A shipped one has no stored spec, so this is
 * what it resolves to.
 *
 * ⚠ **Keyed by mode AND arrangement, not by mode alone.** The mode-only
 * shape was left in place because "re-keying an empty map is churn";
 * filling it expires that argument — `watch` ships two arrangements
 * (`viewer`, `streamer`) and one flat list cannot express them.
 *
 * ⚠ A mode's entry need not be total over
 * {@link SHIPPED_ARRANGEMENTS}: an arrangement with no row here simply
 * opens nothing, which is what `govern` still does.
 */
export const SHIPPED_ARRANGEMENT_CARDS: Readonly<
  Record<CockpitMode, Readonly<Record<string, readonly CardId[]>>>
> = {
  chat: { default: ['who'] },
  play: { default: ['place'] },
  watch: { viewer: [], streamer: [] },
  build: { default: ['cms', 'git', 'studio'] },
  govern: { default: [] },
};

/**
 * Legacy `cockpit.layout` → the (mode, arrangement) pair it always
 * really meant.
 *
 * ⚠ **A mapping, not a rename.** Every player who ever ran `layout
 * builder` has that string persisted, and the read path resolves it
 * through this table. `livestream-viewer` and `streamer` are the row
 * that matters: two legacy values collapse into ONE mode carrying
 * *different* arrangements, so the collapse is lossy in the mode column
 * and only the arrangement column keeps them apart.
 */
export const LEGACY_LAYOUT_MIGRATION: Readonly<
  Record<LayoutName, { mode: CockpitMode; arrangement: string }>
> = {
  world: { mode: "play", arrangement: "default" },
  forum: { mode: "chat", arrangement: "default" },
  "livestream-viewer": { mode: "watch", arrangement: "viewer" },
  streamer: { mode: "watch", arrangement: "streamer" },
  builder: { mode: "build", arrangement: "default" },
};

/**
 * The inverse of {@link LEGACY_LAYOUT_MIGRATION}: (mode, arrangement)
 * → the legacy {@link LayoutName} that best represents it.
 *
 * ⚠ **This is a compatibility projection, and it is meant to die.** The
 * cockpit's real axes are now mode + arrangement, but the shipped
 * client still swaps its whole frame off `cockpit.layout` keyed by
 * `LayoutName`, and repainting the client is a separate cycle. So the
 * server keeps `cockpit.layout` populated with the closest legacy name
 * while the two real axes carry the truth. When the client reads mode +
 * arrangement directly, this table and the `cockpit.layout` key go
 * together.
 *
 * Not total, and cannot be: `govern` has no legacy layout at all, and a
 * player-saved arrangement has no legacy name by construction. Both
 * fall back to the mode's first entry here — see
 * `legacyLayoutFor` on the server.
 */
export const LEGACY_LAYOUT_FOR: Readonly<
  Record<CockpitMode, Readonly<Record<string, LayoutName>>>
> = {
  chat: { default: "forum" },
  play: { default: "world" },
  watch: { viewer: "livestream-viewer", streamer: "streamer" },
  // No legacy layout ever meant "govern" — the builder frame is the
  // closest thing the current client can paint for it.
  build: { default: "builder" },
  govern: { default: "builder" },
};

/**
 * A saved card arrangement. `cards` is the ordered list of card kinds
 * the arrangement opens with; it is empty until the card set exists to
 * capture, which is deliberate — naming an arrangement and populating
 * it are separate acts.
 */
export interface ArrangementSpec {
  cards: string[];
}

/**
 * Cap on a player-supplied arrangement name. These are player INPUT
 * that become keys in a persisted map and get rendered back, so they
 * are bounded at the boundary rather than trusted.
 */
export const MAX_ARRANGEMENT_NAME_LENGTH = 32;

/**
 * Cap on how many arrangements one player may save **per mode**.
 *
 * ⚠ Saving writes a player-chosen KEY into a persisted map, so without
 * a cap a player can grow their own stored document without bound. It
 * is self-inflicted rather than an attack on anyone else — which is
 * exactly why it is easy to leave uncapped and easy to regret: the cost
 * lands on storage and on every read of that document, not on the
 * player doing it.
 *
 * The number is deliberately generous. This is a guard against
 * unbounded growth, not a design statement about how many layouts a
 * person ought to want.
 */
export const MAX_SAVED_ARRANGEMENTS_PER_MODE = 32;

/**
/**
 * The per-viewer focal-embed target held as server-authoritative
 * `cockpit.watch` clientState (set by the `watch` verb, pushed to the
 * client, which renders the platform's public-player iframe). Embed-shaped:
 * a Twitch channel, a YouTube videoId or channelId (the `@handle`/`UC…`
 * durable form, rendered `live_stream?channel=<channelId>` so it tracks
 * the channel's live status across streams), or a Kick channel slug
 * (`player.kick.com/<slug>`, which renders offline channels gracefully).
 * `null` = nothing watched. Replaces the retired operator-curated
 * broadcast-source list.
 */
export type WatchTarget =
  | { platform: "twitch"; channel: string }
  | { platform: "youtube"; videoId: string }
  | { platform: "youtube"; channelId: string }
  | { platform: "kick"; channel: string };

/**
 * One channel the viewer is tuned to, as the rail needs it.
 *
 * ⭐ `canPost` is a SERVER fact, not a client guess: posting outbound
 * needs a linked identity with chat authorized, and only Twitch has that
 * path this cycle. The rail's composer branches on the same flag its
 * copy describes — a live input over a read-only channel would refuse
 * after the player had typed.
 *
 * Distinct from {@link WatchTarget}, and deliberately: `watch` picks the
 * ONE focal embed, `tune` follows as many chats as you like. Conflating
 * them would make watching a stream imply reading its chat and vice
 * versa, which is not how either verb behaves.
 */
export interface TunedTarget {
  platform: "twitch" | "youtube" | "kick";
  /** The channel's display handle — what `tune off <handle>` names. */
  handle: string;
  canPost: boolean;
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
   * The topics whose frames denote a reactable act, as the server
   * defines them.
   *
   * Sent so the client cannot hold its own copy of the answer. It held
   * one (`REACTABLE_PREFIXES`), the S2 topic collapse moved the server
   * set underneath it, and combat frames stopped offering the
   * affordance without anything failing.
   *
   * ⚠ This STAYS on the payload while the emote catalogue moved off it
   * to `GET /api/emotes`. Four strings, and they gate whether the `＋`
   * exists at all — a client that had to fetch before it could decide
   * whether to offer anything would flash the affordance in and out.
   */
  reactableTopics: string[];
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
  /**
   * The live news-ticker window at connect time — the pins-first,
   * recency-ordered, retract/expiry-filtered slice the client seeds its
   * feed card from (consumed as a `snapshot`, exactly as `topicCatalogue`
   * is). Live deltas thereafter ride `world.press.feed` frames. Empty
   * when nothing is published.
   */
  releaseWindow: ReleaseRow[];
  /**
   * ⭐⭐ **The record layer's backfill — the frames the server retained
   * for this player, oldest→newest.**
   *
   * Before this existed the client buffer was the ONLY copy of your
   * scrollback: clearing site data destroyed it and a second device
   * started empty. After it, the buffer is a **cache** over a
   * server-side rolling window.
   *
   * ⚠ **This changes the meaning of an existing behaviour** rather than
   * adding one — `clearFrames` on disconnect stops being a data
   * question. The old path is deliberately left in place until the
   * backfill has been driven live.
   *
   * Absent when the store is empty or unreachable; the client renders
   * whatever arrives and never invents a frame.
   */
  frameBackfill?: StoredFrameRecord[];
}

// ============================================================================
// The record layer — what the server remembers for you
// ============================================================================

/**
 * One retained frame in a player's record.
 *
 * ⚠ **Deliberately a projection of `MessageFrame`, not the frame
 * itself.** `meta.frameId` is stamped per-Interactive at send time, so
 * the same logical frame multiplexed to two devices carries two of
 * them; storing one would make the record a statement about a socket
 * rather than about the player. `payload` is likewise absent — it is
 * per-topic structured data whose consumers are live surfaces
 * (subscriptions, rosters, feeds) that re-resolve on connect anyway,
 * and carrying it would make the highest-volume write in the system
 * unbounded in row size.
 */
export interface StoredFrameRecord {
  /** The frame's own id, as delivered. */
  id: string;
  topic: string;
  /** The MML body, verbatim — the client re-renders it unchanged. */
  body: string;
  tags?: string[];
  /** `meta.timestamp` of the delivered frame. */
  at: number;
  /**
   * Per-owner monotonic order key.
   *
   * ⚠ Ordering is NOT by `at`: two frames composed in the same
   * millisecond are common (a scene fans several at once) and a
   * timestamp sort would shuffle them. `seq` is also what eviction
   * deletes on, so the window bound is one indexed range delete.
   */
  seq: number;
}

/** The corpora `recall` searches. Scope is an argument, not a verb. */
export type RecallScope = 'frames' | 'wiki' | 'forums';

/**
 * The closed scope list, exported for the same reason `TOPIC_ROOTS` is:
 * the verb's validator and any client affordance must not drift.
 */
export const RECALL_SCOPES: readonly RecallScope[] = [
  'frames',
  'wiki',
  'forums',
];

/** One `recall` hit, already shaped for display. */
export interface RecallHit {
  scope: RecallScope;
  /** What the hit is called — a topic label, a page title, a thread title. */
  title: string;
  /** The matching text, plain (never MML — `recall` output is quoted). */
  excerpt: string;
  /**
   * The command that opens the hit, when one exists. Absent for a frame
   * (scrollback has no address); present for a wiki page or a thread.
   */
  command?: string;
  /** When it happened / was last edited. */
  at?: number;
}

/**
 * Char-gen — the pre-world character-creation phase. Both payloads ride
 * as `MessageFrame.payload` on system-family topics (no new envelope
 * type): the roster on `system.charactergen.roster`, the per-step state
 * on `system.charactergen.state`. Delivered to the connected `Login`
 * (a Sensor) and read by the cockpit's char-gen layout.
 */

/**
 * How a char-gen field is rendered. The **renderer discriminator** — the
 * thing that lets the payload be a generic list instead of one option
 * array per field.
 *
 * ⭐ A new interaction is a new member here plus one client renderer.
 * Nothing about the shell, the gating or the flow changes, which is the
 * property the lineage model needs (see char-gen.md).
 *
 * - `choose-one` — pick one of `options`.
 * - `text` — free text. When the field carries a `suggestion` whose
 *   `surname` is set, the renderer shows two inputs; that shape is the
 *   one/two-input discriminator and there is deliberately no second
 *   mechanism for it.
 */
export type CharGenFieldKind = 'choose-one' | 'text';

/**
 * One settable char-gen field, as the server describes it.
 *
 * ⭐⭐ `field` is a **plain string, not a closed union** — deliberately.
 * The predecessor named every field twice (a `CharGenField` union *and*
 * a `<field>Options` array per member), so every new char-gen concept
 * was a `types` change plus a client change. The field key vocabulary
 * now lives in exactly one place: the server's `FIELDS` table, which
 * this list is projected from.
 *
 * The client must therefore render a field it does not recognize rather
 * than dropping it — an unrendered field can still gate `enroll confirm`
 * through `missing`, which is a dead end the player cannot diagnose.
 */
export interface CharGenFieldState {
  /** The token the client sends as `enroll <field> <value>`. */
  field: string;
  /** Which renderer to dispatch to. */
  kind: CharGenFieldKind;
  /** Human-facing heading. Server-supplied so the client holds no copy. */
  label: string;
  /**
   * Whether this field currently applies — e.g. `sex` does not, for a
   * non-sexed species. Replaces the predecessor's implicit
   * "`sexOptions` is empty ⇒ N/A", which conflated *no options* with
   * *not applicable*.
   */
  applicable: boolean;
  /** The closed choice set, for `choose-one`. */
  options?: CharGenOption[];
  /** The current value as a display string, when set. */
  value?: string;
  /** Current suggestion for a `text` field (drives pre-fill + reroll). */
  suggestion?: { name: string; surname?: string };
  /** Optional one-line note under the field. */
  hint?: string;
}

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
   * detail card (3:4 portrait). A bucket-relative media key (e.g.
   * `species/khazadicus.png`), or `null` when no asset exists (the
   * client renders a framed placeholder). The client prepends its
   * configured `MEDIA_BASE_URL` to resolve it — same key contract as
   * `StuffDetailRecord.illustration`.
   */
  image?: string | null;
  /**
   * Optional structured dossier shown in the detail card — the
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
  rows: DossierRow[];
}

/**
 * One dossier row.
 *
 * ⭐ `spoiler` carries the field's **reveal level** across the char-gen
 * boundary. It is declared on `fieldMeta` precisely so it travels
 * "wherever it surfaces — a wiki panel, the Studio, help, a future
 * codex", and it used to be dropped here, so char-gen rendered expanded
 * what every other surface renders collapsed.
 *
 * ⚠ Level 1 means **collapsed by default, not forbidden** — a renderer
 * puts the row behind a disclosure, it does not withhold it. This is an
 * *appetite* axis ("does this reader want to be spoiled"), not an
 * epistemic one ("does this character know it"); the latter has no
 * substrate. A collapse toggle is not a lock.
 */
export interface DossierRow {
  label: string;
  value: string;
  /** Reveal level from `fieldMeta`; absent or 0 = show expanded. */
  spoiler?: number;
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

/**
 * `system.charactergen.state` payload — the complete live draft state.
 * The server re-emits the whole thing after every `enroll <field>
 * <value>`; the client renders whatever layout it wants from it. No
 * notion of a "current step" — flow/layout is entirely client-side.
 *
 * ⭐ The payload is **projected from the server's `FIELDS` table**, not
 * assembled beside it. Adding a char-gen concept is one table entry; it
 * used to be a `types` change plus a payload change plus a client
 * change.
 */
export interface CharGenStatePayload {
  /**
   * Every settable field, in canonical order, each carrying its own
   * options and current value.
   *
   * ⚠ Replaced `picks` + four `<field>Options` arrays. Two sources of
   * truth for one fact is what forced the client's `optionsFor(field)`
   * adapter switch; a field now describes itself.
   */
  fields: CharGenFieldState[];
  /**
   * Required fields still unset — gates `enroll confirm` and lets the
   * client show what's left. A `sex` entry appears only when applicable.
   *
   * ⚠ The client must gate on THIS and never on a field list of its
   * own, or it re-encodes which fields exist and in what order they are
   * required — the coupling this payload shape exists to remove.
   */
  missing: string[];
  /** Current name suggestion (also mirrored on the `name` field). */
  suggestion?: { name: string; surname?: string };
  /**
   * The player's real account display name (Google `displayName`; Twitch
   * later), shown on the name field for reference. Absent if unavailable.
   */
  accountName?: string;
  /** Last validation rejection, scoped to the field it concerns. */
  error?: { field: string; message: string };
}

/** One character in the post-login roster. */
export interface CharGenRosterEntry {
  playerId: string;
  name: string;
  species: string;
  description: string;
  /**
   * ⭐ **At Login you are not embodied**, and that is the structural
   * fact this block exists for. Every figure below is readable in
   * session through a subscription — but the character-select screen
   * has no character, so no subscription is available to it. The roster
   * is therefore the one payload that must CARRY what is elsewhere
   * subscribed to.
   */
  /** Epoch ms of this character's last logout. Absent = never played. */
  lastSeen?: number;
  /** Play standing band — per-character, unlike make standing. */
  playStanding?: string;
  /** Where you left them, as a display name. */
  lastLocation?: string;
  /** The practice record: every discipline with evidence, and its band. */
  practice?: { discipline: string; band: string }[];
  /**
   * The scientific binomial (`Homo sapiens`). The roster names a
   * character by species the way the dossier does — the world models
   * species properly, and the one screen listing your characters is a
   * good place to show it.
   */
  binomial?: string;
  /**
   * Portrait, as a **bucket-relative media key** — same contract as
   * `CharGenOption.image`; the client prepends `MEDIA_BASE_URL`.
   *
   * ⚠ This is the character's SPECIES portrait, not a bespoke likeness:
   * no per-character art exists, and inventing a URL for one would be a
   * fabricated asset. Rendering the species plate is the honest
   * available answer, and a real per-character portrait would replace
   * this field's source without changing its shape.
   */
  portrait?: string;
}

/**
 * The account's own standing — the figures that belong to the PERSON,
 * not to any one character.
 *
 * ⭐ Character select is the one screen where the account is the
 * subject, so this rides beside the roster rather than on an entry.
 *
 * ⚠ Every member is optional and an absent one means **the server
 * cannot answer**, never zero. `fund` has no faucet at all today and is
 * therefore always absent; `make` is absent when the account could not
 * be resolved. The client hatches either with its own reason.
 */
export interface AccountStandingPayload {
  /** Make (creation) band — summed across the account's characters. */
  make?: string;
  /** Fund (capital) band. No faucet exists, so this never arrives yet. */
  fund?: string;
}

/** `system.charactergen.roster` payload — the character-select list. */
export interface CharGenRosterPayload {
  characters: CharGenRosterEntry[];
  /**
   * The signed-in account's display name. The roster header names the
   * PERSON, because this is the one screen whose subject is the account
   * rather than any character on it.
   */
  accountName?: string;
  /** The account-level figures. Absent when none could be derived. */
  account?: AccountStandingPayload;
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
 *   - `theme`             — `'ink' | 'marble' | 'high-contrast'`
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
   * How many live sessions the server currently holds — an **aggregate
   * only**, never names or identities.
   *
   * ⭐ The front door's "it is usually quiet · you may be the only
   * person on" note was static apologetic copy nobody maintained. This
   * replaces it with the fact. The websocket opens only after auth, so
   * this counts signed-in sessions rather than page views.
   */
  online?: number;
  /**
   * How often the world is reset, in words, when it is reset at all.
   *
   * ⚠⚠ **Absent means the server makes no such promise, and the client
   * must then say nothing.** The handoff art shipped "the world resets
   * nightly · nothing survives to tomorrow yet" as fixed copy while no
   * cron, CI job or script implemented a wipe, and three design
   * documents went on to reason *from* it. A claim about whether the
   * player's own work survives the night is the most expensive kind to
   * get wrong, so it is reported by the server that would do the
   * resetting or it is not rendered.
   */
  resetPolicy?: string;
  /**
   * The login providers this server has configured (env-gated strategy
   * registration). Drives start-screen button *enablement* only — the
   * OAuth routes independently guard-and-redirect when a provider is
   * unconfigured, so this is UX, never authorization.
   */
  providers?: AuthProvider[];
  /**
   * Non-authoritative wizard-tier hint: true iff the session's loaded
   * Avatar is a wizard (`AccessApi.isWizard`). The client uses it
   * only to hide the CMS launcher for non-wizards; the REST CMS gates
   * remain the server-side authority. Absent/false when no in-world Avatar
   * is loaded for the session.
   */
  isWizard?: boolean;
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
   * Non-authoritative wizard-tier hint, mirrored from the
   * {@link AuthStatusResponse.isWizard} field of `/auth/status`. The
   * client uses it only to decide whether to show the CMS launcher; the
   * REST CMS gates remain the server-side authority. Absent/false when no
   * wizard Avatar is loaded for the session.
   */
  isWizard?: boolean;
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
  /**
   * Epoch ms this socket was established — what the connection
   * popover's live duration row is derived from.
   *
   * ⚠ **Optional, and the optionality is load-bearing twice over.**
   * Practically: `store/__tests__/connectionLink.test.ts` builds a
   * complete `ConnectionState` literal, and the client's `tsc` includes
   * its tests, so a REQUIRED field would break a frozen reconnect test
   * under `build:types` while still passing `vitest` (esbuild strips
   * types without checking them) — the worst possible failure shape.
   * Honestly: before the first connection and after a drop there is no
   * duration to report, and a `0` or `null` sentinel would be a value
   * standing in for an absence.
   *
   * ⭐ It measures THIS CONNECTION, not the session: a successful
   * reconnect issues a fresh `connection-established` and the timestamp
   * resets. The popover's label says "this connection" rather than
   * papering over that with a fake continuous session clock — the same
   * move as hatching `MAKE`, where the honest fix for a figure at the
   * wrong level is to correct the claim rather than the number.
   */
  connectedAt?: number;
  /**
   * Round-trip milliseconds from the last completed ping/pong.
   *
   * ⭐ **Measured, not estimated.** `WebSocketClient` runs a heartbeat
   * and `backend/inbound/ping.ts` echoes the client's own send stamp
   * back, so this is a real observation of this socket. It was hatched
   * in the honest-chrome build with the reason *"needs a ping/pong"* —
   * which was inaccurate: the protocol existed end to end and nothing
   * called it.
   *
   * ⚠ Absent until the first pong lands, and cleared on a drop. There
   * is no round trip before one has completed, and a `0` would be a
   * fabricated figure standing in for an absence — the same rule
   * `connectedAt` follows, and the same reason its optionality is
   * load-bearing (`connectionLink.test.ts` builds a complete literal).
   */
  roundTripMs?: number;
  /**
   * Epoch ms at which the next automatic reconnect attempt fires.
   *
   * ⭐ **Exposed, not invented.** `attemptReconnect()` already computes
   * an exponential backoff (1·2·4·8·16·30·30s) and then discards it
   * into a bare `setTimeout` — the store only ever learned
   * `link: 'reconnecting'`. This is the same shape as the renown
   * measurement: the information exists and is thrown away one line
   * before it leaves. Surfacing it is not new measurement, and the
   * backoff schedule itself is unchanged.
   *
   * ⚠ Absent while connected, and after the final attempt — there is no
   * *next* attempt to count down to once the machine has given up, and
   * a countdown still ticking against a link that will never retry
   * would be the most misleading figure on the screen.
   */
  retryAt?: number;
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

// ============================================================================
// Git workflow / in-runtime VCS (the GitApi call-shape closure)
// ============================================================================

/**
 * One dirty file in `git status` porcelain terms. `path` is
 * repo-relative (`packages/server/src/mud/obj/Foo.ts`); `index` /
 * `workingDir` are the porcelain XY status codes (`M`, `A`, `?`, ' ',
 * …) for the staged and working-tree halves.
 */
export interface GitFileStatus {
  path: string;
  index: string;
  workingDir: string;
}

/** Result of `status` — branch/tracking summary + the dirty set + warnings. */
export interface GitStatusResult {
  branch: string;
  tracking: string | null;
  ahead: number;
  behind: number;
  diverged: boolean;
  files: GitFileStatus[];
  /** Non-blocking advisories (e.g. local diverges from its remote). */
  warnings: string[];
}

/** One commit in `log`. */
export interface GitLogEntry {
  sha: string;
  author: string;
  date: string;
  message: string;
}

/** Result of `diff` — a unified patch, optionally scoped to one path. */
export interface GitDiffResult {
  path?: string;
  patch: string;
}

/**
 * Result of `publish` — the permission-filtered snapshot-and-push. Only
 * files in zones the actor can write are committed (`committedPaths`);
 * the rest are left dirty (`skippedPaths`). `pushed` is false when the
 * commit is durable locally but the push was rejected (protected branch
 * / non-fast-forward) — the commit is retained, re-pushable.
 */
export interface GitPublishResult {
  committed: boolean;
  sha?: string;
  committedPaths: string[];
  skippedPaths: string[];
  pushed: boolean;
  branch: string;
  detail: string;
}

/** Result of `revert` — an additive revert commit (or a no-op). */
export interface GitRevertResult {
  reverted: boolean;
  sha?: string;
  detail: string;
}

/**
 * The machine error codes `GitApi` throws, mapped by the REST layer to
 * HTTP status: `denied` → 403, `bad-ref`/`nothing-to-do` → 400,
 * `conflict`/`push-rejected` → 409, `not-a-repo` → 404.
 */
export type GitErrorCode =
  | 'not-a-repo'
  | 'denied'
  | 'nothing-to-do'
  | 'push-rejected'
  | 'conflict'
  | 'bad-ref';

/** Uniform REST error body for the git surface. */
export interface GitErrorBody {
  error: string; // a GitErrorCode, or 'internal'
  message: string;
}

// ---- Author diagnostics (the diagnostics subsystem) --------------------

/** Which producer emitted a structured diagnostic. */
export type DiagnosticSource = "runtime" | "compile" | "console";

/** Severity of a structured diagnostic. */
export type DiagnosticSeverity = "error" | "warning" | "info";

/**
 * One persisted row in the `diagnostics` collection — the shared shape
 * every producer (runtime guard / compile watcher / console promote)
 * writes and both readers (the `errors` verb, the CMS panel) read. Plain
 * scalars only (no marshalled value-objects), so the store is a raw
 * `getCollection` read/write, not a `Document` subclass.
 */
export interface DiagnosticDoc {
  /** Stringified Mongo `_id` (present on reads). */
  _id?: string;
  source: DiagnosticSource;
  severity: DiagnosticSeverity;
  /** Routing key, a pure function of `path` (`zone.<x>`, `lib.<x>`, `command`, `api`, `global`). */
  channel: string;
  /** The content/source path that produced it; `null` when unresolved. */
  path: string | null;
  /** `ProvenanceApi.authorOf(path)` at write time — the "my items" index. */
  author: string | null;
  /** sha256[:16] of the file bytes (compile/source only). */
  versionId: string | null;
  /** TS diagnostic code (compile only). */
  code: number | null;
  line: number | null;
  col: number | null;
  message: string;
  /** Runtime throws only. */
  stack: string | null;
  /** Epoch ms the row was recorded. */
  ts: number;
  /** TTL anchor — Mongo evicts at this instant. */
  expiresAt: Date;
}

/** One raw diagnostic as a producer hands it in (pre-channel/author derivation). */
export interface RawDiagnostic {
  severity: DiagnosticSeverity;
  line?: number | null;
  col?: number | null;
  code?: number | null;
  message: string;
}

/** A single captured runtime throw (the runRoot guard / command-path capture). */
export interface RuntimeDiagnostic {
  path: string | null;
  severity?: DiagnosticSeverity; // defaults to 'error'
  message: string;
  stack?: string | null;
  /**
   * Explicit channel override. When absent the channel derives from
   * `path`. Used by producers whose rows classify by mechanism rather
   * than by content path (e.g. the sandbox boundary's
   * `sandbox.boundary` denial receipts).
   */
  channel?: string;
}

/** One raw line held in the console ring (unattributed). */
export interface RawConsoleLine {
  level: "log" | "info" | "warn" | "error";
  text: string;
  ts: number;
}

/** Reader filter for `DiagnosticApi.list` (the `errors` verb + CMS panel). */
export interface DiagnosticListFilter {
  channels?: readonly string[];
  pathPrefix?: string;
  severity?: DiagnosticSeverity;
  source?: DiagnosticSource;
  /** Restrict to rows whose `author` equals this explicit value. */
  author?: string;
  /**
   * The "my content" lens: restrict to rows the *acting* author owns. The
   * author is resolved server-side from the execution context (never
   * client-supplied), so this is the spoof-safe form of `author`.
   */
  mine?: boolean;
  since?: number; // epoch ms
  limit?: number; // default 50
}

/** Filter for the raw console ring tail (`errors raw` / the panel raw view). */
export interface RawConsoleFilter {
  grep?: string;
  limit?: number;
}

/** The event fired on each structured recording (delivery listener seam). */
export interface DiagnosticEvent {
  source: DiagnosticSource;
  channel: string;
  path: string | null;
  author: string | null;
  severity: DiagnosticSeverity;
  message: string;
  ts: number;
}

// ---- Authorable-fields artifact (Studio / composition surface) ---------

/**
 * One author-facing field of a mixin, as projected from the TypeDoc
 * model by the `@authorable` projector (see
 * `packages/server/scripts/project-author-surface.ts`). The composer
 * form generator reads these to pick a widget per field.
 *
 * `typeShape` is the **projected** readable type string (`string`,
 * `number`, `Quantity<Mass>`, `"a" | "b"`, …) — it is derived from the
 * signature, never a hand-authored enum. That keeps the artifact a
 * single source of truth (the code) rather than a second one.
 */
export interface AuthorableFieldDescriptor {
  /** The declaring mixin's `_mixinName` (e.g. `'NamedMixin'`). */
  mixin: string;
  /** The persistent- / instruction-field name (e.g. `'name'`). */
  field: string;
  /**
   * `property` — a stored field whose runtime type is `typeShape`.
   * `instruction` — a declarative field applied by an `apply<Field>`
   * method; `typeShape` is the applier's **payload** shape, not the
   * runtime field type.
   */
  kind: 'property' | 'instruction';
  /** Projected readable type string (the widget-selection key). */
  typeShape: string;
  /** First-paragraph TSDoc summary; `''` when absent. */
  description: string;
  /** For a union-of-string-literals field: the allowed values. */
  enumValues?: string[];
  /** Present when the field points at other Stuff by path (Pattern A). */
  refShape?: 'path';
  /** The referenced Stuff/type name for a `ref:` field. */
  refType?: string;
}

/**
 * The emitted `authorable-fields.json` — the field descriptors keyed by
 * mixin name, plus the coverage audit. `coverage.unclassified` holds
 * `"<mixin>.<field>"` strings for persistent/instruction fields carrying
 * neither `@authorable` nor `@runtimeState`; `doubleClassified` holds
 * those carrying both. Both are the audit worklist the coverage-guard
 * test asserts empty.
 */
export interface AuthorableFieldsArtifact {
  fields: Record<string, AuthorableFieldDescriptor[]>;
  coverage: {
    unclassified: string[];
    doubleClassified: string[];
  };
}

// ---- Studio composition surface (describeClass) -------------------------

/**
 * Where an effective field value was read from when describing a class:
 *   - `instance` — the value the representative live instance holds itself.
 *   - `resolution-chain` — the instance had no own value; the value came
 *     from the engine's `Zone.lookupField` → biome resolution chain.
 *   - `class-default` — no live instance existed; the value is the class
 *     field initializer read off a throwaway construction.
 */
export type StudioValueSource =
  | 'instance'
  | 'resolution-chain'
  | 'class-default';

/**
 * One author-facing field of a described class, joined from the runtime
 * mixin/field introspection to its projected shape and effective value.
 * The composer form generator reads these to pick a widget per field.
 */
export interface StudioFieldDescriptor {
  /** The persistent- / instruction-field name (e.g. `'name'`). */
  name: string;
  /** The declaring mixin's `_mixinName` (e.g. `'NamedMixin'`). */
  mixin: string;
  /**
   * `property` — a stored field whose runtime type is `typeShape`.
   * `instruction` — a declarative field applied by an `apply<Field>`
   * method.
   */
  kind: 'property' | 'instruction';
  /**
   * Projected/inferred readable type string (the widget-selection key):
   * `string`, `number`, `boolean`, `array`, `Quantity`, a union of string
   * literals, … or `json` when the shape can't be determined (the
   * raw-JSON fallback widget).
   */
  typeShape: string;
  /** First-paragraph TSDoc summary; omitted when absent. */
  description?: string;
  /** For a union-of-string-literals field: the allowed values. */
  enumValues?: string[];
  /** Present when the field points at other Stuff by path (Pattern A). */
  refShape?: 'path';
  /** The referenced Stuff/type name for a `ref:` field. */
  refType?: string;
  /** The effective value read for the field; omitted when undefined. */
  defaultValue?: unknown;
  /** Where {@link defaultValue} was read from. */
  valueSource: StudioValueSource;
}

/**
 * The result of `StudioApi.describeClass` — a backing class's effective
 * authorable field list joined to shapes + effective value + source.
 */
export interface ClassDescription {
  classPath: string;
  /** The effective mixin set (each layer's `_mixinName`). */
  mixins: string[];
  fields: StudioFieldDescriptor[];
}

/** Uniform error body for the Studio REST surface. */
export interface StudioErrorBody {
  code: string; // machine code: 'denied' | 'not-found' | 'invalid'
  message: string; // human detail
}

// ---- Blueprint catalogue (Studio / composition surface) -----------------

/**
 * The disposition of a Studio write (name/publish/commit). `committed` — the
 * write landed; `denied` — the trust gate refused it (a graceful refusal, not
 * a throw). The `proposed` slot is reserved for the future propose →
 * wizard-review workflow (not implemented this build).
 */
export type StudioDisposition = 'committed' | 'denied'; // 'proposed' reserved

/**
 * A blueprint's structural kind:
 *   - `composition` — a pure mixin-over-base composition (no custom
 *     methods/own fields); recomposable, the palette's building blocks.
 *   - `concrete` — a logic-bearing backing class (owns methods/state);
 *     catalogued as a whole `kind` pointing at its `classPath`, NOT a
 *     recomposable particle set.
 */
export type BlueprintKind = 'composition' | 'concrete';

/**
 * A catalogued blueprint — a structural composition (derived from a backing
 * class or authored in the curated overlay). `blueprintId`/`signature` are
 * the durable keys; `name` is a mutable display label. The `signature` is
 * `<baseClass>|<sorted-mixin-names>` — two authors composing the same
 * particles collide to one blueprint (the dedup key).
 */
export interface BlueprintSummary {
  /** Durable id; stable across rename. The catalogue's primary key. */
  blueprintId: string;
  /** Mutable display label (never a key). */
  name: string;
  kind: BlueprintKind;
  /** The composition base class name (`Idea`, `Thing`, `Character`, …). */
  baseClass: string;
  /** The effective mixin set's `_mixinName`s, sorted. */
  mixinNames: string[];
  /** Concrete kinds only: the backing class path (`/obj/Campfire`). */
  classPath?: string;
  /** Hierarchy grouping — a parent blueprintId or category key. */
  parent?: string;
  /** Curated + endorsed; blessed blueprints surface first in the picker. */
  blessed: boolean;
  /** Optional author-facing description. */
  description?: string;
  /**
   * `<baseClass>|<sorted-mixin-names>` — the structural dedup key. Carried on
   * the summary (not just the detail) so a client can compute exact-match
   * (`signature` equality) and superset (`mixinNames ⊇ selected`) filters
   * locally without a per-row detail fetch.
   */
  signature: string;
}

/**
 * A blueprint detail — the summary (which already carries `signature`). A
 * distinct type is retained for API symmetry (`getBlueprint` returns a
 * detail).
 */
export interface BlueprintDetail extends BlueprintSummary {
  /** `<baseClass>|<sorted-mixin-names>` — the dedup key. */
  signature: string;
}

/**
 * The `StudioApi.publishBlueprint` call shape — name/publish a composition of
 * already-approved classes (author-tier, no wizard). The **actor is derived
 * from context, never a parameter** (anti-spoof). Dedup is on the computed
 * `signature` (`baseClass` + `mixinNames`): a collision reuses the existing
 * `blueprintId`, so a rename attaches to the derived entry rather than
 * duplicating it.
 */
export interface PublishBlueprintInput {
  name: string;
  kind: BlueprintKind;
  baseClass: string;
  mixinNames: string[];
  classPath?: string;
  parent?: string;
  blessed?: boolean;
  description?: string;
}

/** The result of a `publishBlueprint` — the disposition + the durable id. */
export interface BlueprintWriteResult {
  disposition: StudioDisposition;
  /** The blueprint's durable id when `committed`; absent on `denied`. */
  blueprintId?: string;
  /** Human detail on `denied`. */
  message?: string;
}

/**
 * The `StudioApi.createTemplate` call shape — save a NEW content template
 * pointing at an already-approved backing class (creation act #1: "instantiate
 * a template"). CREATE-only: an existing path is refused (updates go through
 * `CmsApi.write('content', …)`). The **actor is derived from context, never a
 * parameter** (anti-spoof); the wizard-lockdown code-field gate inside
 * `TemplateApi.saveTemplate` still applies to the `classPath` being set.
 */
export interface CreateTemplateInput {
  /** The new template path (`/domain/<zone>/<leaf>`). Must not already exist. */
  path: string;
  /** The backing class the template points at (`/obj/Coin`). */
  classPath: string;
  /** The template's initial `data` block. */
  data: Record<string, unknown>;
}

/**
 * The result of `StudioApi.createTemplate` — a graceful disposition, never a
 * throw for the trust/existence gates. `denied` — a template already exists
 * at the path, OR the code-field gate refused the `class` set (a non-wizard
 * naming a class); the message says which. `committed` — the template was
 * written at `path`.
 */
export interface TemplateWriteResult {
  disposition: StudioDisposition;
  /** The written template path when `committed`; absent on `denied`. */
  path?: string;
  /** Human detail on `denied`. */
  message?: string;
}

// ---- New-class scaffold + commit (Studio) -------------------------------

/**
 * One entry of the composition palette — a mixin (or an instantiable base
 * class) the author can pick when scaffolding a new backing class. `name`
 * is the exported identifier used verbatim in the generated `extends`
 * clause (`GlobbableMixin`, `Idea`, …).
 */
export interface MixinPaletteEntry {
  /** The exported identifier (a mixin factory name or a base class name). */
  name: string;
  /**
   * `mixin` — a class-factory mixin (`FooMixin`), applied over the base.
   * `base` — an instantiable base class (`Idea`/`Thing`/…) the mixins wrap.
   */
  kind: 'mixin' | 'base';
  /**
   * A one-line summary — the first sentence of the mixin's TSDoc doc
   * comment (or its companion interface's), from the server source scan.
   * Absent when the mixin carries no doc comment. Always available (source-
   * sourced, no docs-build dependency); surfaced inline in the composer as
   * per-chip help so a 100-mixin palette is legible.
   */
  summary?: string;
}

/**
 * One composition base class the palette offers, with the mixin set the base
 * *already* implies (its own prototype chain's `_mixinName`s, in composition
 * order). Lets a client pre-seed a base's composition instead of starting
 * from an empty mixin set (e.g. picking `Character` should not re-offer the
 * mixins it already composes).
 */
export interface BaseClassEntry {
  /** The base class name (`Idea`, `Thing`, `Character`, …). */
  name: string;
  /** The base's backing class path (mud-rooted source path). */
  classPath: string;
  /** The `_mixinName`s the base already composes, deduped, composition order. */
  impliedMixins: string[];
}

/**
 * The `StudioApi.listMixins` return — the palette vocabulary split into the
 * pickable mixin/base entries (`mixins`, unchanged) and the base classes with
 * their implied mixin sets (`bases`, for composition pre-seeding).
 */
export interface MixinPalette {
  /** The full palette entry list (base entries + every registry mixin). */
  mixins: MixinPaletteEntry[];
  /** Each offered base class with its implied mixin set. */
  bases: BaseClassEntry[];
}

/**
 * The `StudioApi.scaffoldClass` call shape — compose a new backing class
 * from a base plus an ordered mixin set. The **actor is derived from
 * context, never a parameter** (anti-spoof). Scaffolding is author-tier and
 * open to all: the generated module is inert text until a wizard commits it.
 */
export interface ScaffoldClassInput {
  /** The new class name (PascalCase identifier). */
  name: string;
  /** The base class the mixins are applied over (`Idea`, `Thing`, …). */
  baseClass: string;
  /** The mixin factories to compose, outermost-first. */
  mixinNames: string[];
}

/**
 * The result of `StudioApi.scaffoldClass` — the generated TS source module
 * plus the stable paths the commit / draft workflows write into.
 */
export interface ScaffoldResult {
  /** The generated static TS source module (imports + `extends` clause). */
  source: string;
  /** The wizard-commit target: `/obj/<Name>.ts` (a CMS-relative source path). */
  targetPath: string;
  /**
   * The reserved non-wizard draft path (`/home/<self>/drafts/<Name>.ts`).
   * Present only for a non-wizard scaffolder; v1 does NOT persist here — it
   * is the stable seam the future review workflow fills in.
   */
  draftPath?: string;
}

/**
 * The `StudioApi.commitClass` call shape — write a scaffolded backing class
 * to source (creation act #3, wizard-gated). The **actor is derived from
 * context, never a parameter** (anti-spoof).
 */
export interface CommitClassInput {
  /** The source path to write (`/obj/<Name>.ts`, from `scaffoldClass`). */
  targetPath: string;
  /** The (possibly wizard-edited) TS source module body. */
  source: string;
}

/**
 * The result of `StudioApi.commitClass` — a graceful disposition, never a
 * throw for the trust gate. `denied` — a non-wizard tried to publish (the
 * banner warned first). `committed` — the source was written; `reloaded`
 * reports whether the module went live (a compile failure leaves it
 * persisted-but-not-live, `reloaded: false` + `reloadDetail`, NOT a 500).
 */
export interface ClassCommitResult {
  disposition: StudioDisposition;
  /** The committed source path (`/obj/<Name>.ts`); absent on `denied`. */
  classPath?: string;
  /** True when the written module compiled + went live. */
  reloaded?: boolean;
  /** The reload outcome detail (the compile error on `reloaded: false`). */
  reloadDetail?: string;
  /** Human detail on `denied`. */
  message?: string;
}

// ---- Mixin inspector (Studio composer) ----------------------------------

/**
 * One field a mixin contributes, for the Studio inspector card. `kind`
 * mirrors {@link StudioFieldDescriptor.kind}; `typeShape` is best-effort
 * (the same inference `describeClass` uses), degrading to `json` when the
 * mixin can't be composed for a live read.
 */
export interface MixinFieldDetail {
  /** The persistent- / instruction-field name (e.g. `'quantity'`). */
  name: string;
  /** Projected/inferred readable type string, or `json` when unknown. */
  typeShape: string;
  /**
   * `property` — a stored field; `instruction` — a declarative field
   * applied by an `apply<Field>` method.
   */
  kind: 'property' | 'instruction';
}

/**
 * The rich detail for a single mixin — the Studio composer's inspector
 * card reads this. Assembled from multiple sources with graceful
 * degradation: `description` + `authorableFields` + `runtimeState` come
 * from the always-available server source scan; `relations` + `methods`
 * are optional HelpApi enrichment (empty when the help artifact is
 * absent — the card never throws on a missing topic).
 */
export interface MixinDetail {
  /** The mixin's `_mixinName` (e.g. `'GlobbableMixin'`). */
  name: string;
  /**
   * The mixin file's FULL top TSDoc concept comment as clean text —
   * paragraph breaks and numbered/bulleted list structure preserved,
   * `{@link}` wrappers and `**bold**` markdown stripped. `''` when the
   * mixin carries no doc comment. The substance of the card.
   */
  description: string;
  /** The authorable fields the mixin contributes (name + best-effort type). */
  authorableFields: MixinFieldDetail[];
  /** The runtime-state (`@runtimeState`) field names the mixin declares. */
  runtimeState: string[];
  /**
   * Typed help relations (requires/composes/confers/consumed-by/see-also
   * /method-of) — from the boot-warmed help index. Empty when the help
   * artifact is absent.
   */
  relations: HelpRelation[];
  /**
   * Conferred method names the mixin adds to its host — from the help
   * index's `confers` edges. Empty when the help artifact is absent.
   */
  methods: string[];
  /** A `docs/…` reference named in the concept comment, when present. */
  docRef?: string;
}

// ---- Help system --------------------------------------------------------

/**
 * The four graded subdivisions a help topic can belong to. `command`
 * and `api`/`mixin`/`type` are the two Wave 1 subdivisions (the latter
 * three are the API projector's graded kinds).
 */
export type HelpKind = 'command' | 'api' | 'mixin' | 'type';

/** The typed edges between help topics — see {@link HelpRelation}. */
export type HelpRelationKind =
  | 'method-of'
  | 'confers'
  | 'composes'
  | 'requires'
  | 'consumed-by'
  | 'see-also';

/** One typed edge between topics, denormalized for one-fetch render. */
export interface HelpRelation {
  kind: HelpRelationKind;
  targetId: string;
  targetTitle: string;
}

/** Provenance: which subdivision/source a topic was harvested from. */
export interface HelpSource {
  subdivision: 'commands' | 'api';
  /** command → primary verb; api/mixin/type → qualified `module#Face.member`. */
  ref: string;
}

/** The single uniform shape the index/search/REST/verb all traffic in. */
export interface HelpTopic {
  /** 'command.look' | 'api.ContainmentApi.move' | 'mixin.Container' | 'type.Grade'. */
  id: string;
  kind: HelpKind;
  title: string;
  /** One line; '' when none. */
  summary: string;
  /** Typeahead corpus: verbs/aliases, member name, mixin concept, kind. */
  keywords: string[];
  /** MML markup string (the rulebook entry). */
  body: string;
  relations: HelpRelation[];
  /** Capability flag; false at the anonymous floor this cycle. */
  spoiler: boolean;
  source: HelpSource;
}

/** Light index entry — instant card render + client-local typeahead. */
export interface HelpIndexEntry {
  id: string;
  kind: HelpKind;
  title: string;
  summary: string;
  keywords: string[];
}

export interface HelpCategory {
  kind: HelpKind;
  title: string;
  count: number;
}

// REST request/response DTOs.
export interface HelpIndexResult {
  entries: HelpIndexEntry[];
  categories: HelpCategory[];
}
export interface HelpKindListResult {
  kind: HelpKind;
  topics: HelpIndexEntry[];
}
export interface HelpTopicResult {
  topic: HelpTopic;
}
export interface HelpSearchGroup {
  kind: HelpKind;
  hits: HelpIndexEntry[];
}
export interface HelpSearchResult {
  query: string;
  groups: HelpSearchGroup[];
}
export interface HelpErrorBody {
  error: 'not-found' | 'invalid';
  message: string;
}

// ---- Twitch relay -------------------------------------------------------

/**
 * Twitch OAuth scope names the relay spends. Identity scope
 * (`user:read:email`) lives in the auth spine; these two are the
 * incremental chat scopes acquired on demand: the reader account holds
 * `user:read:chat`, a posting player holds `user:write:chat`.
 */
export const TWITCH_SCOPE_READ_CHAT = 'user:read:chat';
export const TWITCH_SCOPE_WRITE_CHAT = 'user:write:chat';

/**
 * Kick OAuth scopes the provider spends: both the login and link flows
 * request identity + own-channel read (the owner-channel fetch needs
 * `channel:read`; it feeds the relay's character-form resolve). The
 * posting scope (`chat:write`) is the deferred phase-2 seam.
 */
export const KICK_SCOPE_USER_READ = 'user:read';
export const KICK_SCOPE_CHANNEL_READ = 'channel:read';

/**
 * The speaker on a relay frame. Honest-to-origin: an external line carries an
 * `external` (or `external-linked`) speaker; an outbound mirror of a local
 * player's post carries `in-game`. `external-linked` carries BOTH the
 * external handle and a {@link StuffRef} to the linked Avatar, so the client
 * can show the handle by default and reveal the MUD persona on hover. The
 * `service` axis spans the relay transports
 * (`'twitch' | 'youtube' | 'kick'`); `external-linked` spans twitch + kick
 * (no YouTube reverse link).
 */
export type RelaySpeaker =
  | { kind: 'in-game'; ref: StuffRef }
  | {
      kind: 'external';
      service: 'twitch' | 'youtube' | 'kick';
      externalName: string;
    }
  | {
      kind: 'external-linked';
      service: 'twitch' | 'youtube' | 'kick';
      externalName: string;
      ref: StuffRef;
    };

/**
 * Payload of a relay chat frame (`world.twitch.message` /
 * `world.youtube.message` / `world.kick.message`). Platform-agnostic:
 * `service` names the transport, `channelKey` is the transport's stable
 * channel key (Twitch broadcasterId / YouTube liveChatId / Kick
 * broadcasterId), `channelHandle` the display handle. `egress` marks the
 * outbound mirror of a local player's post (rendered with the `⊳ …→`
 * marker; Twitch-only this cycle).
 */
export interface RelayMessagePayload {
  service: 'twitch' | 'youtube' | 'kick';
  channelKey: string;
  channelHandle: string;
  speaker: RelaySpeaker;
  text: string;
  egress?: boolean;
}
