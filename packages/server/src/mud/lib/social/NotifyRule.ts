/**
 * NotifyRule — the value-object family for the attention-management
 * (social-graph Wave 3) policy layer. Pure data: no logic, no Stuff.
 *
 * A `NotifyRule` is one row of a viewer's ordered policy list, keyed on
 * an arbitrary {@link GroupRef} (a managed group, an MQL query, or a
 * contacts label). It carries both the *display* treatment (how the
 * group's members render in a room) and the *notification* surface (how
 * their connect / disconnect / message reaches the viewer), plus a single
 * theme-palette `color` token shared across every place that highlight
 * surfaces.
 *
 * Resolution (strict ordered first-match), the per-character store, and
 * the virtual reserved baseline all live elsewhere — this module is just
 * the shapes. See `docs/subsystems/social-graph.md`.
 */

import type { GroupRef } from "./GroupProvider";

/** How a matched occupant's name renders in a room listing. */
export type NameRendering =
  | "name"
  | "feature-string"
  | "count-only"
  | "hidden";

/**
 * Whether a presence transition (arrival: login / reconnect — or
 * departure: logout / disconnect) surfaces to the viewer. A presence
 * frame renders inline in the message buffer like any other scene frame
 * (there is no separate notification surface), so the choice is binary:
 * `show` it, or stay `silent`. The frame's tint comes from the rule
 * `color`; the specific verb (entered / reconnected / left / dropped)
 * comes from the event, not this field.
 */
export type ConnectSurface = "show" | "silent";

/** How a matched speaker's message is restyled (a notification surface). */
export type MessageSurface = "full" | "summary" | "silent";

/**
 * A named theme-palette token (never raw hex), so a highlight resolves
 * through the existing theme/overlay cascade and stays legible under any
 * theme. `neutral` is the un-set custom default.
 */
export type PaletteToken =
  | "amber"
  | "teal"
  | "rose"
  | "slate"
  | "violet"
  | "emerald"
  | "sky"
  | "neutral";

/** One policy row in a viewer's ordered notify list. */
export interface NotifyRule {
  /**
   * Any `GroupRef`. Bare contacts labels are normalized to
   * `contacts:<viewerPlayerId>:<label>` at the verb boundary; the two
   * reserved pseudo-subjects `everyone-else` / `strangers` are stored as
   * their bare reserved identifier (they are not `GroupApi` refs).
   */
  groupRef: GroupRef;
  nameRendering: NameRendering;
  boostInDense: boolean;
  onConnect: ConnectSurface;
  onDisconnect: ConnectSurface;
  onMessage: MessageSurface;
  color: PaletteToken;
}

/**
 * A {@link NotifyRule} resolved against a `(viewer, person)` pair — the
 * matched rule plus whether it came from the virtual reserved baseline
 * (`reserved: true`) rather than a stored, player-authored row.
 */
export interface ResolvedRule extends NotifyRule {
  reserved: boolean;
}

/** Outcome of a `setRule` mutation — the stored rule + whether it was new. */
export interface SetResult {
  rule: NotifyRule;
  created: boolean;
}

/** Options for {@link ResolvedRule} resolution. */
export interface RuleForOptions {
  /**
   * Skip `mql:` refs (a live membership query is too costly as a
   * notification subject; MQL refs stay valid display subjects). The
   * notification fan-out passes `true`.
   */
  excludeMql?: boolean;
}

/**
 * Reserved baseline identifiers. Virtual until the player edits one
 * (then it materializes into the stored list at its canonical groupRef):
 *   - `foes` / `friends` normalize to `contacts:<me>:<id>`,
 *   - `everyone-else` / `strangers` stay bare pseudo-subjects.
 */
export const RESERVED = {
  foes: "foes",
  friends: "friends",
  everyoneElse: "everyone-else",
  strangers: "strangers",
} as const;

export type ReservedId = (typeof RESERVED)[keyof typeof RESERVED];

/* ── validation vocabularies (the verb checks `k=v` values against these) ── */

export const NAME_RENDERINGS: readonly NameRendering[] = [
  "name",
  "feature-string",
  "count-only",
  "hidden",
];

export const CONNECT_SURFACES: readonly ConnectSurface[] = ["show", "silent"];

export const MESSAGE_SURFACES: readonly MessageSurface[] = [
  "full",
  "summary",
  "silent",
];

export const PALETTE_TOKENS: readonly PaletteToken[] = [
  "amber",
  "teal",
  "rose",
  "slate",
  "violet",
  "emerald",
  "sky",
  "neutral",
];

/**
 * The default Liquid template for a presence line (the `social.presenceFormat`
 * per-character setting). Rendered by the presence relay through
 * `ProseApi.format` against the {@link PRESENCE_VARS} context, then tinted
 * inline by the matched rule's `color`. The `country` guard keeps the
 * "from …" tail off departures and off connections whose origin didn't
 * resolve (localhost / private IPs).
 *
 * Players customize this freely (`settings set social.presenceFormat "…"`
 * or the Social pane); a syntactically broken template falls back to this
 * default at render.
 */
export const PRESENCE_FORMAT_DEFAULT =
  "{{ who }} has {{ action }}{% if country %} from {{ country }}{% endif %}.";

/**
 * The variable context a `social.presenceFormat` template can reference.
 * This is the **extension seam**: future fields (player level, guild,
 * pronouns, time-of-day, …) graft on here in `SocialLogic` with no change
 * to the template plumbing — author a new key, document it below.
 *
 * | Variable | Type | Meaning |
 * |---|---|---|
 * | `who` | Mml name ref | the actor, viewer-aware (recognition-gated — a stranger reads as "a human", clickable to target) |
 * | `action` | string | the default verb phrase: "entered the game" / "reconnected" / "left the game" / "disconnected" |
 * | `event` | string | the raw event key: `loggedIn` / `reconnected` / `loggedOut` / `disconnected` |
 * | `category` | string | `arrival` (login / reconnect) or `departure` (logout / disconnect) |
 * | `is_arrival` | boolean | true for arrivals |
 * | `country` | string \| null | country of origin (arrivals only, when resolved), else null |
 */
export const PRESENCE_VARS = [
  "who",
  "action",
  "event",
  "category",
  "is_arrival",
  "country",
] as const;
