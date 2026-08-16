/**
 * ⭐ **`shell.result` is a FILTER, not a placement** (decision 10, AC 15).
 *
 * The server sends the frame in every mode; this side decides whether
 * to render it. Placement (the server declining to send) would save the
 * wire, but the frame would then never reach the frame store and
 * `recall` could not find it — filtering keeps your `who` history
 * searchable while keeping it out of sight.
 *
 * ⚠ **A plan finding, recorded:** the FRAME half of this filter keys on
 * `meta.carded`, not on the topic `shell.result`. Decision 10 assumed
 * every carded result carries that topic; `look`'s two cards ride
 * `sense.survey`, which twelve other verbs share. The card half below
 * keys on whether the card has prose to fall back to, which is the same
 * fact from the other side.
 *
 * ⚠⚠ **`terminal` must not take an authoring card away.** A card that
 * declares `noProse` — the CMS editor, the git panel, the studio
 * composer — has no terminal rendering at all, so suppressing it would
 * remove the surface on a setting that never claimed to. The absence of
 * `prose` on the wire IS that declaration arriving.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useStore } from "../../../store/index";
import { CardFeed } from "../CardFeed";
import { websocketClient } from "../../../services/websocket";
import type { CardState } from "../../../store/cardFeedSlice";
import { visibleCards, cardedFrameIsCovered } from "../../../store/cardFeedSlice";
import type { CardId } from "@saxonberg/types";

let clock = 1_000;

function card(
  cardId: CardId,
  over: Partial<CardState> = {},
): CardState {
  return {
    instanceId: `i-${cardId}`,
    cardId,
    key: cardId,
    live: false,
    pinned: false,
    openedAt: ++clock,
    records: [],
    ...over,
  };
}

function seed(...cards: CardState[]): void {
  const byId: Record<string, CardState> = {};
  for (const c of cards) byId[c.instanceId] = c;
  useStore.setState({ cards: byId });
}

beforeEach(() => {
  vi.restoreAllMocks();
  useStore.setState({ cards: {} });
  vi.spyOn(websocketClient, "subscribeMql").mockReturnValue("sub-x");
});

const noop = (): void => undefined;

describe("shell.result", () => {
  it("`card` (the default) shows every card", () => {
    seed(
      card("who", { prose: "Alice — the lounge" }),
      card("cms"),
    );
    render(<CardFeed onSendCommand={noop} resultDisplay="card" />);
    expect(screen.getByTestId("card-who")).toBeTruthy();
    expect(screen.getByTestId("card-cms")).toBeTruthy();
  });

  it("`both` shows every card too — the terminal keeps its copy", () => {
    seed(card("who", { prose: "Alice — the lounge" }), card("cms"));
    render(<CardFeed onSendCommand={noop} resultDisplay="both" />);
    expect(screen.getByTestId("card-who")).toBeTruthy();
    expect(screen.getByTestId("card-cms")).toBeTruthy();
  });

  it("⭐ `terminal` suppresses a card that HAS prose", () => {
    seed(card("who", { prose: "Alice — the lounge" }));
    render(<CardFeed onSendCommand={noop} resultDisplay="terminal" />);
    expect(screen.queryByTestId("card-who")).toBeNull();
  });

  it("⚠⚠ `terminal` does NOT suppress an authoring card", () => {
    seed(card("who", { prose: "Alice — the lounge" }), card("cms"));
    render(<CardFeed onSendCommand={noop} resultDisplay="terminal" />);
    expect(screen.queryByTestId("card-who")).toBeNull();
    // The CMS card has no prose to fall back to, so it stays.
    expect(screen.getByTestId("card-cms")).toBeTruthy();
  });

  it("⚠ the card is HIDDEN, never dropped — the set is untouched", () => {
    seed(card("who", { prose: "Alice — the lounge" }));
    render(<CardFeed onSendCommand={noop} resultDisplay="terminal" />);
    /*
     * A filter that deleted would make switching back to `card` a
     * different act from switching away — and would lose the card's
     * server-side lifetime, which this side does not own.
     */
    expect(Object.keys(useStore.getState().cards)).toEqual(["i-who"]);
  });
});

/**
 * ⚠⚠ **The rule lives in ONE place, and this is why.**
 *
 * Both filters lived inside `CardFeed` — the DESKTOP rail — so the
 * phone's inline stack honoured neither. Decision 11's entire payoff is
 * *mobile may default to filtering `shell.result` out of the terminal*,
 * and the mobile path was the one that ignored it. Found by driving at
 * 390px; every component test passed, because they all render the path
 * that HAS the rule.
 *
 * So the rule is a function both render paths call, and it is tested
 * directly — a test through one component would share the blind spot it
 * exists to cover.
 */
describe("⚠⚠ visibleCards — the one rule both render paths call", () => {
  const set = (...cards: CardState[]): Record<string, CardState> => {
    const byId: Record<string, CardState> = {};
    for (const c of cards) byId[c.instanceId] = c;
    return byId;
  };

  it("`terminal` drops a card WITH prose and keeps one without", () => {
    const cards = set(
      card("who", { prose: "Alice" }),
      card("cms"),
    );
    expect(
      visibleCards(cards, { resultDisplay: "terminal" }).map((c) => c.cardId),
    ).toEqual(["cms"]);
  });

  it("`card` and `both` keep everything", () => {
    const cards = set(card("who", { prose: "Alice" }), card("cms"));
    for (const mode of ["card", "both"] as const) {
      expect(
        visibleCards(cards, { resultDisplay: mode }).map((c) => c.cardId).sort(),
      ).toEqual(["cms", "who"]);
    }
  });

  it("a named view narrows to its kinds; `null` narrows nothing", () => {
    const cards = set(card("who"), card("news"), card("wiki"));
    expect(
      visibleCards(cards, { kinds: new Set<CardId>(["wiki"]) }).map(
        (c) => c.cardId,
      ),
    ).toEqual(["wiki"]);
    expect(visibleCards(cards, { kinds: null }).length).toBe(3);
  });

  it("the two filters compose", () => {
    const cards = set(
      card("who", { prose: "Alice" }),
      card("wiki", { prose: "page" }),
      card("cms"),
    );
    expect(
      visibleCards(cards, {
        resultDisplay: "terminal",
        kinds: new Set<CardId>(["wiki", "cms"]),
      }).map((c) => c.cardId),
    ).toEqual(["cms"]);
  });

  it("⚠ the defaults are the permissive ones — an unset filter hides nothing", () => {
    const cards = set(card("who", { prose: "Alice" }), card("cms"));
    expect(visibleCards(cards).length).toBe(2);
  });
});

/**
 * ⭐⭐ **Prose is suppressed only when a card actually replaced it.**
 *
 * `meta.carded` used to be a boolean stamped BEFORE the card opened —
 * a promise, not a fact. Two ways it was cashed for nothing, both found
 * by driving:
 *
 *  - a controller that TOUCHED an already-open card instead of opening
 *    a new one. `look dave` in Dave's Bar resolved to the room, touched
 *    the room card that was already there, and printed **the echo and
 *    nothing else**;
 *  - a named view filtering that card's kind out of the feed, which
 *    silenced the kind's prose along with its card.
 *
 * It carries the card's `instanceId` now, and this is the rule.
 */
describe("a carded frame is only suppressed if its card is on screen", () => {
  const cards: Record<string, CardState> = {
    "i-subject": card("subject", { instanceId: "i-subject" }),
    "i-place": card("place", { instanceId: "i-place" }),
    "i-husk": card("who", { instanceId: "i-husk", closed: "aged-out" }),
  };

  it("⭐ covered when the card exists and no view filters it", () => {
    expect(cardedFrameIsCovered("i-subject", cards, null)).toBe(true);
  });

  it("⚠ NOT covered when no card by that id exists — the open failed", () => {
    expect(cardedFrameIsCovered("i-nothing", cards, null)).toBe(false);
  });

  it("⚠⚠ NOT covered when a named view filters that kind out of the feed", () => {
    const onlyPlaces = new Set<CardId>(["place"]);
    expect(cardedFrameIsCovered("i-subject", cards, onlyPlaces)).toBe(false);
    expect(cardedFrameIsCovered("i-place", cards, onlyPlaces)).toBe(true);
  });

  it("⚠ NOT covered by a HUSK — it shed its body, so the prose is the only copy", () => {
    expect(cardedFrameIsCovered("i-husk", cards, null)).toBe(false);
  });

  it("an unmarked frame is never suppressed", () => {
    expect(cardedFrameIsCovered(undefined, cards, null)).toBe(false);
  });
});
