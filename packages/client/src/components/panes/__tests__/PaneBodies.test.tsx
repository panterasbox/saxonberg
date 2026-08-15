/**
 * The PLACE card's body — the half a player actually reads.
 *
 * ⚠ These exist because the card shipped as a bare list of `go <dir>`
 * chips with no picture, and the report was blunt: *"it needs to be
 * more like the old one with the image and a list of exits, just say
 * 'south' you don't need to say 'go south' that's implied."*
 */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { StuffDetailRecord } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { PaneBody } from "../PaneBodies";
import type { PaneCardState } from "../../../store/paneFeedSlice";
import { websocketClient } from "../../../services/websocket";

function placeCard(record: Partial<StuffDetailRecord>): PaneCardState {
  return {
    subscriptionId: "s1",
    paneId: "place",
    kind: "place",
    hold: "here",
    pinned: null,
    openedAt: 1,
    records: [
      { stuffId: "room", displayName: "the lounge", ...record },
    ] as never,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  useStore.setState({ affordances: {}, affordancePending: {} });
  vi.spyOn(websocketClient, "resolveAffordances").mockImplementation(
    () => undefined,
  );
});

describe("ways out", () => {
  it("⚠ labels a chip with the bare direction, not the verb", () => {
    render(
      <PaneBody
        card={placeCard({ exits: [{ direction: "south" }] as never })}
        onSendCommand={() => undefined}
      />,
    );
    // Under a heading that already says WAYS OUT the verb is implied,
    // and printing it on every chip made a row of exits read as a row
    // of sentences.
    expect(screen.getByText("south")).toBeTruthy();
    expect(screen.queryByText("go south")).toBeNull();
  });

  it("⭐ still SENDS the command, and still previews it", () => {
    /*
     * The bare label is not a break with *every clickable previews
     * exactly what it sends* — the preview is the contract, not the
     * label. The transcript has always done this: `Obvious exits:
     * north` sends `go north`.
     */
    const sent: string[] = [];
    render(
      <PaneBody
        card={placeCard({ exits: [{ direction: "south" }] as never })}
        onSendCommand={(t) => sent.push(t)}
      />,
    );
    const chip = screen.getByText("south");
    expect(chip.getAttribute("title")).toBe("Click to send: go south");
    fireEvent.click(chip);
    expect(sent).toEqual(["go south"]);
  });
});

describe("the picture", () => {
  it("renders the room's illustration", () => {
    render(
      <PaneBody
        card={placeCard({ illustration: "rooms/lounge.png" })}
        onSendCommand={() => undefined}
      />,
    );
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("src")).toContain("rooms/lounge.png");
  });

  it("⚠ renders nothing at all when there is no illustration", () => {
    // Not a placeholder and not a broken-image icon: a missing asset is
    // not information, and an icon claims something failed.
    render(
      <PaneBody
        card={placeCard({})}
        onSendCommand={() => undefined}
      />,
    );
    expect(document.querySelector("img")).toBeNull();
  });
});
