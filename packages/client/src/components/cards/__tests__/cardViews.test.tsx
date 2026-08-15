/**
 * ⭐ **Named views over the card feed** (decision 8, AC 11).
 *
 * The terminal's tab strip, for the other column: `All` first and
 * locked, then the player's own views. Views filter on **card kind** —
 * the one axis a player can name.
 *
 * ⚠⚠ **The seeding clobber, and the regression test the original never
 * had.** `console.tabs` shipped a bug where an ABSENT key read as
 * *first run*, so a layout mounting before the connection payload
 * landed wrote ship defaults over the player's saved views. It was
 * fixed by keying the seeding effect on `Array.isArray(...)` — and no
 * test was ever written for it.
 *
 * ⭐ The card views close it one step earlier: they ship **no defaults
 * at all**, so there is no write to race. The tests below assert both
 * halves — that mounting before the payload writes nothing, and that a
 * payload's saved views survive.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CardView } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { websocketClient } from "../../../services/websocket";
import { CardViewStrip } from "../CardViewStrip";
import {
  ALL_CARDS,
  activeCardKinds,
  addCardView,
  deleteCardView,
  getActiveCardView,
  getCardViews,
  readViews,
  renameCardView,
  setActiveCardView,
  setCardViewKinds,
} from "../../../store/cardViewActions";

let writes: Array<{ key: string; value: unknown }>;

beforeEach(() => {
  vi.restoreAllMocks();
  writes = [];
  useStore.setState({ clientState: {}, cards: {} });
  vi.spyOn(websocketClient, "sendClientStateWrite").mockImplementation(
    (key: string, value: unknown) => {
      writes.push({ key, value });
    },
  );
});

describe("⚠⚠ the seeding clobber", () => {
  it("mounting BEFORE the payload writes nothing at all", () => {
    render(<CardViewStrip />);
    /*
     * The whole failure: a strip that mounted first, read "no views",
     * concluded "first run" and wrote defaults over what was still in
     * flight. There is nothing to write, so there is nothing to race.
     */
    expect(writes).toEqual([]);
    expect(readViews()).toBeNull();
    expect(getCardViews()).toEqual([]);
  });

  it("⭐ absent is distinguishable from empty", () => {
    expect(readViews()).toBeNull();
    useStore.setState({ clientState: { "cards.views": [] } });
    expect(readViews()).toEqual([]);
  });

  it("saved views delivered by the payload SURVIVE the mount", () => {
    const saved: CardView[] = [{ name: "Reading", kinds: ["wiki", "help"] }];
    render(<CardViewStrip />);
    // …the payload lands after the mount, which is the racing order.
    useStore.setState({
      clientState: { "cards.views": saved, "cards.activeView": "Reading" },
    });
    expect(getCardViews()).toEqual(saved);
    expect(writes).toEqual([]);
  });
});

describe("⭐ `All` is the absence of a filter", () => {
  it("is active by default and filters nothing", () => {
    expect(getActiveCardView()).toBe(ALL_CARDS);
    expect(activeCardKinds()).toBeNull();
  });

  it("is not stored, so there is nothing to delete", () => {
    useStore.setState({
      clientState: { "cards.views": [{ name: "Reading", kinds: [] }] },
    });
    deleteCardView(ALL_CARDS);
    expect(writes).toEqual([]);
    expect(getCardViews().map((v) => v.name)).toEqual(["Reading"]);
  });

  it("cannot be shadowed by a view of the same name", () => {
    addCardView(ALL_CARDS);
    expect(writes).toEqual([]);
    renameCardView("Reading", ALL_CARDS);
    expect(writes).toEqual([]);
  });

  it("renders first, and without an edit affordance", () => {
    useStore.setState({
      clientState: { "cards.views": [{ name: "Reading", kinds: [] }] },
    });
    render(<CardViewStrip />);
    expect(screen.getByTestId(`card-view-${ALL_CARDS}`).textContent).toBe(
      ALL_CARDS,
    );
    // The `⋯` only appears on the ACTIVE player-made view.
    expect(screen.queryByTestId("card-view-editor")).toBeNull();
  });
});

describe("a player's own views", () => {
  it("create, activate, filter, rename, delete", () => {
    addCardView("Reading", ["wiki"]);
    expect(getCardViews()).toEqual([{ name: "Reading", kinds: ["wiki"] }]);

    setActiveCardView("Reading");
    expect(getActiveCardView()).toBe("Reading");
    expect([...(activeCardKinds() ?? [])]).toEqual(["wiki"]);

    setCardViewKinds("Reading", ["wiki", "help"]);
    expect([...(activeCardKinds() ?? [])]).toEqual(["wiki", "help"]);

    renameCardView("Reading", "Study");
    expect(getCardViews().map((v) => v.name)).toEqual(["Study"]);
    // ⚠ The player was standing in it — they come along.
    expect(getActiveCardView()).toBe("Study");

    deleteCardView("Study");
    expect(getCardViews()).toEqual([]);
    // …and land somewhere that exists.
    expect(getActiveCardView()).toBe(ALL_CARDS);
  });

  it("⚠ every mutation writes THROUGH the wire, never only locally", () => {
    addCardView("Reading", ["wiki"]);
    expect(writes.map((w) => w.key)).toEqual(["cards.views"]);
    setActiveCardView("Reading");
    expect(writes.map((w) => w.key)).toEqual([
      "cards.views",
      "cards.activeView",
    ]);
  });

  it("refuses a duplicate and an empty name", () => {
    addCardView("Reading");
    const before = writes.length;
    addCardView("Reading");
    addCardView("   ");
    expect(writes.length).toBe(before);
  });

  it("switching to a view that does not exist is a no-op", () => {
    setActiveCardView("Nowhere");
    expect(getActiveCardView()).toBe(ALL_CARDS);
    expect(writes).toEqual([]);
  });

  /**
   * ⚠ `null`, not "every kind". A view listing every kind and the
   * absence of a filter look identical until a card kind is ADDED, at
   * which point the enumerated one silently stops showing it.
   */
  it("an empty view shows nothing, and All still shows everything", () => {
    addCardView("Empty", []);
    setActiveCardView("Empty");
    expect([...(activeCardKinds() ?? [])]).toEqual([]);
    setActiveCardView(ALL_CARDS);
    expect(activeCardKinds()).toBeNull();
  });

  it("the strip toggles a kind through the editor", () => {
    useStore.setState({
      clientState: {
        "cards.views": [{ name: "Reading", kinds: [] }],
        "cards.activeView": "Reading",
      },
    });
    render(<CardViewStrip />);
    fireEvent.click(screen.getByTestId("card-view-Reading"));
    fireEvent.click(screen.getByTestId("card-view-kind-wiki"));
    expect(writes.at(-1)).toEqual({
      key: "cards.views",
      value: [{ name: "Reading", kinds: ["wiki"] }],
    });
  });
});
