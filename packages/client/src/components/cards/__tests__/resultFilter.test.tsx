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
