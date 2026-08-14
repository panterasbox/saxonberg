/**
 * paneFeedSlice — the right column stops being one slot and becomes a
 * **feed**.
 *
 * ⭐⭐ **A pane is held by a condition, not by recency.** The server
 * decides whether a pane is still relevant — *is that person still in
 * the room, is that thing still in reach, does that question still owe
 * a reply* — and says so on the wire. Nothing here guesses at any of
 * it. A client evaluating a hold would be the same category error as a
 * client deciding its own affordances, and it would be wrong the
 * moment the world moved without telling this tab.
 *
 * ⭐ **Nothing still actionable ever leaves.** That is the property
 * that makes a pane *feed* tractable where a pane *list* would not be:
 * the only panes that go are ones you can no longer act on, so the room,
 * a drilled object and an open form stop racing for one slot.
 *
 * ## Where a card comes from
 *
 * Two sources, and the difference is structural rather than cosmetic:
 *
 * - **MQL panes** (`place`, `agent`, `instrument`, `manifest`,
 *   `inspect`) resolve a server-owned query to Stuff and project
 *   fields off it. Opened by NAME; the client sends no MQL.
 * - **FORM panes** are not MQL at all. A form's subject is a pending
 *   *prompt* — a question, a set of reply commands, and an answer that
 *   ends it — and MQL only speaks Stuff. The pane feasibility survey
 *   (mql-subscription.md) found this and the conclusion was to build
 *   FORM off the prompt channel rather than widen MQL, because the
 *   alternative is two prompt models with the weaker one in the way.
 *
 * This slice holds only the first kind. Form cards are projected from
 * the prompt queue at render time, so there is exactly one prompt
 * model and the feed reads it rather than mirroring it.
 *
 * ## ⚠ Release is a fade, not a vanishing
 *
 * The requirements say a released pane *disappears*; the reference art
 * says it *fades, and the header says which*. Both are honoured: the
 * pane leaves the LIVE set (its body goes, it stops being interactive)
 * and leaves a bounded faded husk carrying the release reason. A pane
 * that vanished with no trace would read as a bug — which is precisely
 * why `mql-subscription-released` carries a reason at all.
 */

import type {
  MqlSubscriptionReleasedEnvelope,
  PaneHold,
  PaneId,
  PaneReleaseReason,
  StuffDetailRecord,
  StuffRefRecord,
} from "@saxonberg/types";

/** A pane's records, whichever projection they came back as. */
export type PaneRecord = StuffRefRecord | StuffDetailRecord;

/**
 * Which body a card renders.
 *
 * ⚠ **Client-side, deliberately.** The server owns what a pane *is* —
 * its query, cardinality, field set, hold. Which React component draws
 * the answer is the one thing only the client observes, and modelling
 * it server-side would be a second source of truth for something the
 * server cannot check. Same reasoning as `PANE_IDS`' note about the
 * shelf's labels and hatched-ness.
 */
export type PaneKind =
  | "form"
  | "agent"
  | "instrument"
  | "place"
  | "manifest"
  | "inspect";

/** One card in the feed. */
export interface PaneCardState {
  /** The wire correlation key — a client-minted subscription handle. */
  subscriptionId: string;
  /** The catalogue name it was opened by. Absent = opened by shape. */
  paneId?: PaneId;
  kind: PaneKind;
  /** What holds it open, when it has a lifetime at all. */
  hold?: PaneHold;
  /**
   * Manual override. `null` = the condition decides; `true` keeps a
   * lapsed pane; `false` drops a held one.
   *
   * ⚠ Mirrored from the server's answer, never set optimistically. Pin
   * is a real command (`cockpit pane pin <id>`), and a local toggle
   * would show a pin the server had refused.
   */
  pinned: boolean | null;
  records: PaneRecord[];
  /** Arrival order. The feed sorts newest→oldest on this. */
  openedAt: number;
  /** Set once the hold lapsed: the card is a faded husk from here on. */
  released?: PaneReleaseReason;
}

/**
 * How many released husks the feed keeps.
 *
 * ⚠ A bound, not a policy about relevance. Without one the feed grows
 * without limit for a player who walks around, and the whole reason a
 * pane feed works is that it is bounded by *what you can still act on*.
 */
const MAX_RELEASED = 3;

/** How each release reason reads in the header. */
const RELEASE_WORDS: Readonly<Record<PaneReleaseReason, string>> = {
  answered: "answered · settled",
  left: "stale · you left",
  departed: "stale · they left",
  "out-of-reach": "stale · out of reach",
  dropped: "stale · not carried",
  dismissed: "dismissed by you",
};

/** How each live hold reads in the header — the art's exact words. */
const HOLD_WORDS: Readonly<Record<PaneHold, string>> = {
  unanswered: "held · owes a reply",
  here: "held · you are here",
  present: "held · still in the room",
  inReach: "held · in reach",
  carried: "held · on you",
};

/**
 * The words under a card's title: what is keeping it, or what ended it.
 *
 * ⚠ A manual override outranks both, because it is the player's own
 * decision and describing it as a world fact would be a lie about who
 * decided.
 */
export function holdReason(card: PaneCardState): string {
  if (card.released) return RELEASE_WORDS[card.released];
  if (card.pinned === true) return "held by you";
  if (card.pinned === false) return "dismissed by you";
  if (card.hold) return HOLD_WORDS[card.hold];
  return "open";
}

export interface PaneFeedSlice {
  /** Every card, keyed by subscription handle. */
  paneCards: Record<string, PaneCardState>;
  /**
   * ⚠ Named `openPaneCard`, not `openPane` — the store already has an
   * `openPane` for the summoned settings overlay, and two things called
   * "open a pane" on one flat store is how a call site reaches the
   * wrong one silently.
   *
   * Register a pane the client just opened, before any result lands.
   * Called with what the CLIENT knows: the handle, the catalogue name,
   * and which body to draw.
   */
  openPaneCard: (card: {
    subscriptionId: string;
    paneId?: PaneId;
    kind: PaneKind;
    hold?: PaneHold;
  }) => void;
  /** A subscription result (or delta) landed. */
  setPaneRecords: (subscriptionId: string, records: PaneRecord[]) => void;
  /** The server's answer to a pin/dismiss/auto. */
  setPanePinnedState: (subscriptionId: string, pinned: boolean | null) => void;
  /** The hold lapsed: fade the card and say why. */
  releasePane: (envelope: MqlSubscriptionReleasedEnvelope) => void;
  /** Drop a card entirely (unsubscribed, or the surface unmounted). */
  closePaneCard: (subscriptionId: string) => void;
  /** Every card, newest first — what the feed renders. */
  paneFeed: () => PaneCardState[];
  /**
   * How many cards the player is holding open.
   *
   * ⚠ Counted from the set, never tracked alongside it. A count kept
   * beside a list is a second source of truth for the list's own size,
   * and the two disagree the first time one path forgets to update.
   */
  pinnedPaneCount: () => number;
  /** Forget everything (disconnect / character switch). */
  clearPanes: () => void;
}

/**
 * Prune released husks past the bound, oldest first.
 *
 * ⚠ Live cards are never pruned — that is the whole invariant. If the
 * live set grows unboundedly, the fault is a hold that never lapses,
 * and hiding it here would hide exactly the bug the holds exist to
 * make visible.
 */
function pruneReleased(
  cards: Record<string, PaneCardState>,
): Record<string, PaneCardState> {
  const husks = Object.values(cards)
    .filter((c) => c.released !== undefined)
    .sort((a, b) => a.openedAt - b.openedAt);
  if (husks.length <= MAX_RELEASED) return cards;
  const doomed = new Set(
    husks.slice(0, husks.length - MAX_RELEASED).map((c) => c.subscriptionId),
  );
  const next: Record<string, PaneCardState> = {};
  for (const [id, card] of Object.entries(cards)) {
    if (!doomed.has(id)) next[id] = card;
  }
  return next;
}

export const createPaneFeedSlice = (
  set: (
    partial:
      | Partial<PaneFeedSlice>
      | ((state: PaneFeedSlice) => Partial<PaneFeedSlice>),
  ) => void,
  get: () => PaneFeedSlice,
): PaneFeedSlice => ({
  paneCards: {},

  openPaneCard: (card) =>
    set((s) => {
      if (s.paneCards[card.subscriptionId]) return {};
      return {
        paneCards: {
          ...s.paneCards,
          [card.subscriptionId]: {
            subscriptionId: card.subscriptionId,
            ...(card.paneId ? { paneId: card.paneId } : {}),
            kind: card.kind,
            ...(card.hold ? { hold: card.hold } : {}),
            pinned: null,
            records: [],
            openedAt: Date.now(),
          },
        },
      };
    }),

  setPaneRecords: (subscriptionId, records) =>
    set((s) => {
      const card = s.paneCards[subscriptionId];
      if (!card) return {};
      return {
        paneCards: {
          ...s.paneCards,
          [subscriptionId]: { ...card, records },
        },
      };
    }),

  setPanePinnedState: (subscriptionId, pinned) =>
    set((s) => {
      const card = s.paneCards[subscriptionId];
      if (!card) return {};
      return {
        paneCards: {
          ...s.paneCards,
          [subscriptionId]: { ...card, pinned },
        },
      };
    }),

  releasePane: (envelope) =>
    set((s) => {
      const card = s.paneCards[envelope.subscriptionId];
      if (!card) return {};
      const next = {
        ...s.paneCards,
        [envelope.subscriptionId]: {
          ...card,
          released: envelope.reason,
          // ⚠ The body goes with the hold. What is left is a statement
          // about the past, and rendering yesterday's contents as if
          // they were current is the failure the fade exists to avoid.
          records: [],
        },
      };
      return { paneCards: pruneReleased(next) };
    }),

  closePaneCard: (subscriptionId) =>
    set((s) => {
      if (!s.paneCards[subscriptionId]) return {};
      const next = { ...s.paneCards };
      delete next[subscriptionId];
      return { paneCards: next };
    }),

  paneFeed: () =>
    Object.values(get().paneCards).sort((a, b) => b.openedAt - a.openedAt),

  pinnedPaneCount: () =>
    Object.values(get().paneCards).filter((c) => c.pinned === true).length,

  clearPanes: () => set(() => ({ paneCards: {} })),
});
