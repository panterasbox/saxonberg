/**
 * The card area: a grid that fills the width, in the player's own order
 * (drag one card onto another and it moves before it, client-side);
 * below one unit it is a glance strip; minimized and medium cards are
 * drawn elsewhere.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../../store/index";
import { CardArea } from "../CardArea";
import type { CardState } from "../../../store/cardFeedSlice";

let clock = 0;
function land(id: string, extra: Partial<CardState> = {}): void {
  useStore.getState().openCard({
    instanceId: id,
    cardId: "who",
    key: `who ${id}`,
    live: false,
    pinned: false,
    records: [],
    openedAt: ++clock,
    ...extra,
  });
}

beforeEach(() => {
  useStore.setState({ cards: {}, cardOrder: [] });
});

const order = (): string[] =>
  Array.from(document.querySelectorAll("[data-card-key]")).map((e) => e.getAttribute("data-card-key")!);

function drag(fromId: string, onto: Element): void {
  fireEvent.drop(onto, {
    dataTransfer: {
      getData: (t: string) => (t === "application/x-saxonberg-card-id" ? fromId : ""),
    },
  });
}

describe("CardArea", () => {
  it("⭐ one grid, in arrival order, whatever the width", () => {
    land("a");
    land("b");
    land("c");
    render(<CardArea units={3} onSendCommand={() => {}} />);
    expect(screen.getAllByTestId("card-grid")).toHaveLength(1);
    expect(order()).toEqual(["who a", "who b", "who c"]);
  });

  it("below one unit: a glance strip; a chip opens its card at measure", () => {
    land("a");
    const sent: string[] = [];
    render(<CardArea units={0} onSendCommand={(t) => sent.push(t)} />);
    expect(screen.queryAllByTestId("card-grid")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("glance-chip"));
    expect(sent).toEqual(['cockpit card grow "who a"']);
  });

  it("minimized and medium cards are not in the area (the tray and the terminal column hold them)", () => {
    land("tray", { minimized: true });
    land("mid", { size: "medium" });
    land("here");
    render(<CardArea units={1} onSendCommand={() => {}} />);
    const keys = Array.from(document.querySelectorAll("[data-card-key]")).map((e) =>
      e.getAttribute("data-card-key"),
    );
    expect(keys).toEqual(["who here"]);
  });

  it("⭐ drag a card onto another and it moves before it — in the client, nothing sent", () => {
    land("a");
    land("b");
    land("c");
    const sent: string[] = [];
    render(<CardArea units={3} onSendCommand={(t) => sent.push(t)} />);
    const slotOf = (id: string) => document.querySelector(`[data-card-slot="${id}"]`)!;
    drag("c", slotOf("a"));
    expect(order()).toEqual(["who c", "who a", "who b"]);
    // Dropped on the grid's empty space, it goes last.
    drag("c", screen.getByTestId("card-grid"));
    expect(order()).toEqual(["who a", "who b", "who c"]);
    expect(sent).toEqual([]);
  });
});
