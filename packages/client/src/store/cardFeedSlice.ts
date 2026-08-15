/**
 * cardFeedSlice — the right column is a **feed of cards**, and nothing
 * else.
 *
 * ⭐⭐ **A card exists because a command caused the server to push it.**
 * Nothing in this file opens a card, decides a lifetime or guesses at
 * relevance. The client's job is disclosure: how a card is laid out,
 * which form-factor override applies. Everything about *whether* a card
 * exists is a fact about a world this tab is not authoritative over —
 * the same category as a client deciding its own affordances.
 *
 * ⭐ **Two independent axes.** *Pinned* is the whole lifetime rule
 * (unpinned cards age out of a server-owned relevance window; pinned
 * cards stay until dismissed). *Live* is orthogonal: a static card
 * shows **when it was taken** and carries a refresh; a live card shows
 * neither, because a refresh button on a live card is a bandage over a
 * wake that does not fire — and, worse, it is how nobody finds out.
 *
 * ## Where a card's body comes from
 *
 * Three sources, and the difference is structural:
 *
 * - **mql** — a server-owned query resolved to Stuff and projected into
 *   `records`. The client sends no MQL.
 * - **payload** — a `CardPayload` the producing controller already
 *   computed (the roster it rendered, the releases it listed, the wiki
 *   frame it pushed). One computation, two renderings.
 * - **client** — the body is the client's own transport (Monaco, the
 *   git panel, the studio catalogue). The SERVER still owns the card's
 *   existence, identity, lifetime and pinned-ness.
 *
 * A **prompt** card has no body here at all: the client already holds
 * one prompt model (the prompt queue) and the card joins it by
 * `promptId`. One prompt model, and the feed reads it.
 *
 * ## ⚠ Closing is a fade, not a vanishing
 *
 * A card that vanished with no trace would read as a bug, and the
 * player could not tell a rule from a defect. So a closed card leaves
 * the live set (its body goes, it stops being interactive) and leaves a
 * bounded faded husk carrying the reason — which is precisely why
 * `card-closed` carries one.
 *
 * ⚠ **There is no husk timer here.** The relevance window is the
 * server's, and it is the only clock: two clocks disagree, and the one
 * the player cannot see is the one that wins arguments.
 */

import type {
  CardCloseReason,
  CardId,
  CardPayload,
  StuffDetailRecord,
  StuffRefRecord,
} from "@saxonberg/types";

/** A card's records, whichever projection they came back as. */
export type CardRecord = StuffRefRecord | StuffDetailRecord;

/** One card in the feed. */
export interface CardState {
  /**
   * Server-minted, and the wire correlation key. For a LIVE card it is
   * also the MQL subscription id, which is what lets a live card's
   * updates keep riding `mql-subscription-delta`.
   */
  instanceId: string;
  cardId: CardId;
  /**
   * ⭐ The normalized command that produced it: the card's identity,
   * and exactly what its refresh control re-issues. Every clickable
   * previews what it sends, and here the two are the same string.
   */
  key: string;
  live: boolean;
  /**
   * ⚠ Mirrored from the server's answer, never set optimistically. Pin
   * is a real command (`cockpit card pin <id>`), and a local toggle
   * would show a pin the server had refused.
   */
  pinned: boolean;
  /** When the content was resolved. Static cards only — the honesty stamp. */
  takenAt?: number;
  title?: string;
  subjectId?: string;
  promptId?: string;
  /**
   * The MML the producing controller emitted; absent when the card
   * declares `noProse`.
   *
   * ⭐ **It is the SAME payload the terminal rendered**, materialized
   * once server-side against this viewer — not a second rendering. That
   * is what makes `terminal` a first-class mode rather than a fallback,
   * and what makes the equality assertion literal rather than
   * aspirational.
   *
   * ⚠ Its ABSENCE is also load-bearing: a card with no prose cannot
   * degrade to the terminal, so the `terminal` filter must leave it on
   * screen. A Monaco editor silently disappearing because a setting
   * said "prose only" is the failure `noProse` exists to prevent.
   */
  prose?: string;
  records: CardRecord[];
  payload?: CardPayload;
  /** Arrival / last-touch order. The unpinned block sorts on this. */
  openedAt: number;
  /** Set once the card closed: it is a faded husk from here on. */
  closed?: CardCloseReason;
  /**
   * The card's title as it stood when it closed.
   *
   * ⚠ Not a cached body — the records are cleared on close
   * deliberately. This is only the card's IDENTITY, kept so a husk can
   * still say *which* place you left. Found by driving: teleporting out
   * of the lounge left a card reading `where you are · stale`, which
   * names nothing at all.
   */
  lastTitle?: string;
}

/**
 * How many closed husks the feed keeps.
 *
 * ⚠ A bound, not a policy about relevance. Without one the feed grows
 * without limit for a player who walks around, and the whole reason a
 * card feed works is that it is bounded.
 */
const MAX_CLOSED = 3;

/** How each close reason reads in the header. */
const CLOSE_WORDS: Readonly<Record<CardCloseReason, string>> = {
  answered: "answered · settled",
  // ⚠ The window lapsed, and it SAYS SO. Timing out is a reason, and a
  // card that timed out silently is indistinguishable from a defect.
  "aged-out": "closed · went quiet",
  dismissed: "dismissed by you",
  // ⚠ The WORKSPACE changed, not the world — a mode switch resolved a
  // different arrangement. Wording it like a world event would tell the
  // player something happened in the fiction.
  rearranged: "closed · you changed layout",
  gone: "closed · it is no longer there",
};

/**
 * The words under a card's title: why it is still here, or what ended
 * it.
 *
 * ⚠ A manual pin outranks everything, because it is the player's own
 * decision and describing it as a world fact would be a lie about who
 * decided.
 */
export function cardReason(card: CardState): string {
  if (card.closed) return CLOSE_WORDS[card.closed];
  if (card.pinned) return "held by you";
  /*
   * ⚠ Nothing, not "open". An unpinned card is not held by anything —
   * it is a record of what you asked for, and it ages away. A word in
   * this slot would be describing a condition that does not exist.
   */
  return "";
}

export interface CardFeedSlice {
  /** Every card, keyed by instance id. */
  cards: Record<string, CardState>;
  /**
   * ⚠ Named `openCard`, not `openPanel` — the store already has an
   * `openPanel` for the summoned settings overlay, and two things
   * called "open" on one flat store is how a call site reaches the
   * wrong one silently.
   *
   * ⚠⚠ **Called from exactly one place: the `card-opened` envelope
   * handler.** A source guard asserts it, because a second caller would
   * be the client inventing a card — the inference this build retires.
   */
  openCard: (card: CardState) => void;
  /** A `card-touched` landed: bring forward, restamp, re-body. */
  touchCard: (
    instanceId: string,
    patch: Partial<
      Pick<
        CardState,
        "takenAt" | "title" | "prose" | "records" | "payload" | "key"
      >
    >,
  ) => void;
  /** A subscription delta landed for a live card. */
  setCardRecords: (instanceId: string, records: CardRecord[]) => void;
  /** The server's answer to a pin/dismiss/auto. */
  setCardPinnedState: (instanceId: string, pinned: boolean) => void;
  /** The card closed: fade it and say why. */
  closeCard: (instanceId: string, reason: CardCloseReason) => void;
  /** Drop a husk entirely (the player dismissed it). */
  dropCard: (instanceId: string) => void;
  /**
   * ⭐ The feed order: the **pinned block first**, stable by arrival,
   * then the unpinned block newest-touched-first.
   *
   * ⚠ A pinned card holds its position. One that jumped to the front
   * every time you touched something else would be worse than one that
   * sits still — the whole reason to pin is that you want it where you
   * left it.
   */
  cardFeed: () => CardState[];
  /**
   * How many cards the player is holding open.
   *
   * ⚠ Counted from the set, never tracked alongside it. A count kept
   * beside a list is a second source of truth for the list's own size.
   */
  pinnedCardCount: () => number;
  /** Forget everything (disconnect / character switch). */
  clearCards: () => void;
}

/**
 * Prune closed husks past the bound, oldest first.
 *
 * ⚠ Live cards are never pruned — that is the whole invariant. If the
 * open set grows unboundedly the fault is the server's window, and
 * hiding it here would hide exactly the bug the window exists to make
 * visible.
 */
function pruneClosed(
  cards: Record<string, CardState>,
): Record<string, CardState> {
  const husks = Object.values(cards)
    .filter((c) => c.closed !== undefined)
    .sort((a, b) => a.openedAt - b.openedAt);
  if (husks.length <= MAX_CLOSED) return cards;
  const doomed = new Set(
    husks.slice(0, husks.length - MAX_CLOSED).map((c) => c.instanceId),
  );
  const next: Record<string, CardState> = {};
  for (const [id, card] of Object.entries(cards)) {
    if (!doomed.has(id)) next[id] = card;
  }
  return next;
}

export const createCardFeedSlice = (
  set: (
    partial:
      | Partial<CardFeedSlice>
      | ((state: CardFeedSlice) => Partial<CardFeedSlice>),
  ) => void,
  get: () => CardFeedSlice,
): CardFeedSlice => ({
  cards: {},

  openCard: (card) =>
    set((s) => ({
      cards: { ...s.cards, [card.instanceId]: card },
    })),

  touchCard: (instanceId, patch) =>
    set((s) => {
      const card = s.cards[instanceId];
      if (!card) return {};
      return {
        cards: {
          ...s.cards,
          [instanceId]: {
            ...card,
            ...patch,
            // ⚠ Only an UNPINNED card moves. See `cardFeed`.
            openedAt: card.pinned ? card.openedAt : Date.now(),
            // A touch un-husks: the server re-opened it, so it is live
            // content again and the husk's reason no longer applies.
            closed: undefined,
          },
        },
      };
    }),

  setCardRecords: (instanceId, records) =>
    set((s) => {
      const card = s.cards[instanceId];
      if (!card) return {};
      return {
        cards: {
          ...s.cards,
          [instanceId]: {
            ...card,
            records,
            title: (records[0]?.displayName as string | undefined) ?? card.title,
          },
        },
      };
    }),

  setCardPinnedState: (instanceId, pinned) =>
    set((s) => {
      const card = s.cards[instanceId];
      if (!card) return {};
      return { cards: { ...s.cards, [instanceId]: { ...card, pinned } } };
    }),

  closeCard: (instanceId, reason) =>
    set((s) => {
      const card = s.cards[instanceId];
      if (!card) return {};
      const next = {
        ...s.cards,
        [instanceId]: {
          ...card,
          closed: reason,
          /*
           * ⚠ The NAME survives; the body does not. Rendering
           * yesterday's contents as if they were current is the failure
           * the fade exists to avoid — but the title is not contents,
           * it is which card this is, and a husk that cannot say what
           * it was about is less honest rather than more.
           */
          lastTitle: card.title ?? card.lastTitle,
          records: [],
          payload: undefined,
        },
      };
      return { cards: pruneClosed(next) };
    }),

  dropCard: (instanceId) =>
    set((s) => {
      if (!s.cards[instanceId]) return {};
      const next = { ...s.cards };
      delete next[instanceId];
      return { cards: next };
    }),

  cardFeed: () => {
    const all = Object.values(get().cards);
    const pinned = all
      .filter((c) => c.pinned)
      .sort((a, b) => a.openedAt - b.openedAt);
    const rest = all
      .filter((c) => !c.pinned)
      .sort((a, b) => b.openedAt - a.openedAt);
    return [...pinned, ...rest];
  },

  pinnedCardCount: () =>
    Object.values(get().cards).filter((c) => c.pinned).length,

  clearCards: () => set(() => ({ cards: {} })),
});
