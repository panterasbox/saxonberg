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

/** Where a connect / disconnect event surfaces. */
export type ConnectSurface = "banner" | "log-only" | "silent";

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

export const CONNECT_SURFACES: readonly ConnectSurface[] = [
  "banner",
  "log-only",
  "silent",
];

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
