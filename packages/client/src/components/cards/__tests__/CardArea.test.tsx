/**
 * The card area (client-surface D9): one column is a feed, more is a
 * workspace; below one unit it is a glance strip; dragging sends a
 * `cockpit card move`; minimized and medium cards are drawn elsewhere.
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
  useStore.setState({ cards: {} });
});

describe("CardArea", () => {
  it("⭐ one unit is ONE column; three units is three", () => {
    land("a");
    land("b");
    const { rerender } = render(<CardArea units={1} onSendCommand={() => {}} />);
    expect(screen.getAllByTestId("card-column")).toHaveLength(1);
    rerender(<CardArea units={3} onSendCommand={() => {}} />);
    expect(screen.getAllByTestId("card-column")).toHaveLength(3);
  });

  it("below one unit: a glance strip; a chip opens its card at measure", () => {
    land("a");
    const sent: string[] = [];
    render(<CardArea units={0} onSendCommand={(t) => sent.push(t)} />);
    expect(screen.queryAllByTestId("card-column")).toHaveLength(0);
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

  it("⭐ a drop sends `cockpit card move` — the server places it, not the client", () => {
    land("a");
    const sent: string[] = [];
    render(<CardArea units={2} onSendCommand={(t) => sent.push(t)} />);
    const second = screen.getAllByTestId("card-column")[1]!;
    fireEvent.drop(second, {
      dataTransfer: { getData: () => "who", types: ["application/x-saxonberg-card"] },
      clientY: 0,
    });
    expect(sent).toEqual(["cockpit card move who 1 0"]);
  });
});
