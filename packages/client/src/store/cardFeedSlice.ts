/**
 * cardFeedSlice — the right column stops being one slot and becomes a
 * **feed**.
 *
 * ⭐⭐ **A card is held by a condition, not by recency.** The server
 * decides whether a card is still relevant — *is that person still in
 * the room, is that thing still in reach, does that question still owe
 * a reply* — and says so on the wire. Nothing here guesses at any of
 * it. A client evaluating a hold would be the same category error as a
 * client deciding its own affordances, and it would be wrong the
 * moment the world moved without telling this tab.
 *
 * ⭐ **Nothing still actionable ever leaves.** That is the property
 * that makes a card *feed* tractable where a card *list* would not be:
 * the only cards that go are ones you can no longer act on, so the room,
 * a drilled object and an open form stop racing for one slot.
 *
 * ## Where a card comes from
 *
 * Two sources, and the difference is structural rather than cosmetic:
 *
 * - **MQL cards** (`place`, `agent`, `instrument`, `manifest`,
 *   `inspect`) resolve a server-owned query to Stuff and project
 *   fields off it. Opened by NAME; the client sends no MQL.
 * - **FORM cards** are not MQL at all. A form's subject is a pending
 *   *prompt* — a question, a set of reply commands, and an answer that
 *   ends it — and MQL only speaks Stuff. The card feasibility survey
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
 * The requirements say a released card *disappears*; the reference art
 * says it *fades, and the header says which*. Both are honoured: the
 * card leaves the LIVE set (its body goes, it stops being interactive)
 * and leaves a bounded faded husk carrying the release reason. A card
 * that vanished with no trace would read as a bug — which is precisely
 * why `mql-subscription-released` carries a reason at all.
 */

import type {
  MqlSubscriptionReleasedEnvelope,
  CardHold,
  CardId,
  CardReleaseReason,
  StuffDetailRecord,
  StuffRefRecord,
} from "@saxonberg/types";

/** A card's records, whichever projection they came back as. */
export type CardRecord = StuffRefRecord | StuffDetailRecord;

/**
 * Which body a card renders.
 *
 * ⚠ **Client-side, deliberately.** The server owns what a card *is* —
 * its query, cardinality, field set, hold. Which React component draws
 * the answer is the one thing only the client observes, and modelling
 * it server-side would be a second source of truth for something the
 * server cannot check. Same reasoning as `CARD_IDS`' note about the
 * shelf's labels and hatched-ness.
 */
export type CardKind =
  | "form"
  /**
   * ⭐⭐ **The one card.** A location, a person, yourself, a thing — one
   * body, showing the sections the subject HAS. It replaced a switch
   * over `place` / `agent` / `instrument` / `manifest`, which made a
   * room and a lamp two different components with two different sets of
   * controls for no reason the player could see.
   */
  | "subject"
  | "agent"
  | "instrument"
  | "place"
  | "manifest"
  | "inspect";

/** One card in the feed. */
export interface CardState {
  /** The wire correlation key — a client-minted subscription handle. */
  subscriptionId: string;
  /** The catalogue name it was opened by. Absent = opened by shape. */
  cardId?: CardId;
  kind: CardKind;
  /** What holds it open, when it has a lifetime at all. */
  hold?: CardHold;
  /**
   * Manual override. `null` = the condition decides; `true` keeps a
   * lapsed card; `false` drops a held one.
   *
   * ⚠ Mirrored from the server's answer, never set optimistically. Pin
   * is a real command (`cockpit card pin <id>`), and a local toggle
   * would show a pin the server had refused.
   */
  pinned: boolean | null;
  records: CardRecord[];
  /** Arrival order. The feed sorts newest→oldest on this. */
  openedAt: number;
  /** Set once the hold lapsed: the card is a faded husk from here on. */
  released?: CardReleaseReason;
  /** When the hold lapsed — the husk ages out from here. */
  releasedAt?: number;
  /**
   * The subject's name as it stood when the hold lapsed.
   *
   * ⚠ Not a cached record — the records are cleared on release
   * deliberately. This is only the card's IDENTITY, kept so a husk can
   * still say *which* place you left.
   */
  lastTitle?: string;
}

/**
 * How many released husks the feed keeps.
 *
 * ⚠ A bound, not a policy about relevance. Without one the feed grows
 * without limit for a player who walks around, and the whole reason a
 * card feed works is that it is bounded by *what you can still act on*.
 */
const MAX_RELEASED = 3;

/**
 * How long a husk lingers before it removes itself.
 *
 * ⭐ **This is a duration, and it is the ONE place a duration is
 * legitimate.** A live card's lifetime is a fact about the world — is
 * that person still here — and putting a clock on it would end
 * something still actionable. A husk is already dead: it is a note
 * saying *what you last saw*, whose value decays, and how long the
 * corpse lingers is purely presentational.
 *
 * Two minutes: long enough to glance back at the room you just left,
 * short enough that the feed does not silt up on a walk.
 */
const HUSK_TTL_MS = 120_000;

/** How each release reason reads in the header. */
const RELEASE_WORDS: Readonly<Record<CardReleaseReason, string>> = {
  answered: "answered · settled",
  left: "stale · you left",
  departed: "stale · they left",
  "out-of-reach": "stale · out of reach",
  dropped: "stale · not carried",
  dismissed: "dismissed by you",
  // ⚠ The WORKSPACE changed, not the world — a mode switch resolved a
  // different arrangement. Wording it like the spatial reasons would
  // tell the player somebody walked out.
  rearranged: "closed · you changed layout",
};

/** How each live hold reads in the header — the art's exact words. */
const HOLD_WORDS: Readonly<Record<CardHold, string>> = {
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
export function holdReason(card: CardState): string {
  if (card.released) return RELEASE_WORDS[card.released];
  if (card.pinned === true) return "held by you";
  if (card.pinned === false) return "dismissed by you";
  if (card.hold) return HOLD_WORDS[card.hold];
  /*
   * ⚠ Nothing, not "open". An attention card is not held by anything —
   * it is a record of what you looked at, and it ages away. A word in
   * this slot would be describing a condition that does not exist, and
   * the slot is for saying WHY a card is still here.
   */
  return "";
}

export interface CardFeedSlice {
  /** Every card, keyed by subscription handle. */
  cards: Record<string, CardState>;
  /**
   * ⚠ Named `openCard`, not `openPanel` — the store already has an
   * `openPanel` for the summoned settings overlay, and two things called
   * "open a card" on one flat store is how a call site reaches the
   * wrong one silently.
   *
   * Register a card the client just opened, before any result lands.
   * Called with what the CLIENT knows: the handle, the catalogue name,
   * and which body to draw.
   */
  openCard: (card: {
    subscriptionId: string;
    cardId?: CardId;
    kind: CardKind;
    hold?: CardHold;
  }) => void;
  /** A subscription result (or delta) landed. */
  setCardRecords: (subscriptionId: string, records: CardRecord[]) => void;
  /** The server's answer to a pin/dismiss/auto. */
  setCardPinnedState: (subscriptionId: string, pinned: boolean | null) => void;
  /** The hold lapsed: fade the card and say why. */
  releaseCard: (envelope: MqlSubscriptionReleasedEnvelope) => void;
  /** Drop a card entirely (unsubscribed, or the surface unmounted). */
  closeCard: (subscriptionId: string) => void;
  /** Every card, newest first — what the feed renders. */
  cardFeed: () => CardState[];
  /**
   * How many cards the player is holding open.
   *
   * ⚠ Counted from the set, never tracked alongside it. A count kept
   * beside a list is a second source of truth for the list's own size,
   * and the two disagree the first time one path forgets to update.
   */
  pinnedCardCount: () => number;
  /** Forget everything (disconnect / character switch). */
  clearCards: () => void;
  /**
   * Drop husks older than {@link HUSK_TTL_MS}. Live cards are never
   * touched — see `pruneReleased`.
   */
  expireHusks: () => void;
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
  cards: Record<string, CardState>,
): Record<string, CardState> {
  const husks = Object.values(cards)
    .filter((c) => c.released !== undefined)
    .sort((a, b) => a.openedAt - b.openedAt);
  if (husks.length <= MAX_RELEASED) return cards;
  const doomed = new Set(
    husks.slice(0, husks.length - MAX_RELEASED).map((c) => c.subscriptionId),
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
    set((s) => {
      if (s.cards[card.subscriptionId]) return {};
      return {
        cards: {
          ...s.cards,
          [card.subscriptionId]: {
            subscriptionId: card.subscriptionId,
            ...(card.cardId ? { cardId: card.cardId } : {}),
            kind: card.kind,
            ...(card.hold ? { hold: card.hold } : {}),
            pinned: null,
            records: [],
            openedAt: Date.now(),
          },
        },
      };
    }),

  setCardRecords: (subscriptionId, records) =>
    set((s) => {
      const card = s.cards[subscriptionId];
      if (!card) return {};
      return {
        cards: {
          ...s.cards,
          [subscriptionId]: { ...card, records },
        },
      };
    }),

  setCardPinnedState: (subscriptionId, pinned) =>
    set((s) => {
      const card = s.cards[subscriptionId];
      if (!card) return {};
      return {
        cards: {
          ...s.cards,
          [subscriptionId]: { ...card, pinned },
        },
      };
    }),

  releaseCard: (envelope) =>
    set((s) => {
      const card = s.cards[envelope.subscriptionId];
      if (!card) return {};
      const next = {
        ...s.cards,
        [envelope.subscriptionId]: {
          ...card,
          released: envelope.reason,
          releasedAt: Date.now(),
          /*
           * ⚠ The NAME survives; the body does not.
           *
           * The body going with the hold is the point — rendering
           * yesterday's contents as if they were current is the failure
           * the fade exists to avoid. But the subject's name is not
           * contents, it is which card this is, and a husk that cannot
           * say what it was about is less honest rather than more.
           * Found by driving: teleporting out of the lounge left a card
           * reading `PLACE where you are · stale · you left`, which
           * names nothing at all.
           */
          lastTitle: card.records[0]?.displayName ?? card.lastTitle,
          records: [],
        },
      };
      return { cards: pruneReleased(next) };
    }),

  closeCard: (subscriptionId) =>
    set((s) => {
      if (!s.cards[subscriptionId]) return {};
      const next = { ...s.cards };
      delete next[subscriptionId];
      return { cards: next };
    }),

  cardFeed: () =>
    Object.values(get().cards).sort((a, b) => b.openedAt - a.openedAt),

  pinnedCardCount: () =>
    Object.values(get().cards).filter((c) => c.pinned === true).length,

  clearCards: () => set(() => ({ cards: {} })),

  expireHusks: () =>
    set((s) => {
      const now = Date.now();
      const next: Record<string, CardState> = {};
      let dropped = false;
      for (const [id, card] of Object.entries(s.cards)) {
        /*
         * ⚠ Live cards are untouched, whatever their age. The bound on
         * the live set is the HOLD — if it grows without limit the
         * fault is a hold that never lapses, and expiring one here
         * would hide exactly the bug the holds exist to make visible.
         */
        const expired =
          card.released !== undefined &&
          card.releasedAt !== undefined &&
          now - card.releasedAt >= HUSK_TTL_MS;
        if (expired) dropped = true;
        else next[id] = card;
      }
      return dropped ? { cards: next } : {};
    }),
});
