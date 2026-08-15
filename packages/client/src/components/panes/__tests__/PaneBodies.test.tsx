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

describe("the room's description", () => {
  const long =
    "A low-ceilinged room that has clearly been furnished by whoever " +
    "passed through and left something behind. Mismatched armchairs " +
    "and a sagging couch cluster around a rug worn pale down the middle.";

  it("shows it, clamped, with a way to see the rest", () => {
    render(
      <PaneBody
        card={placeCard({ longDescription: long })}
        onSendCommand={() => undefined}
      />,
    );
    // The text is all present — the clamp is presentational, so the
    // card never silently truncates what it claims to show.
    expect(screen.getByTestId("place-prose").textContent).toContain(
      "Mismatched armchairs",
    );
    expect(screen.getByTestId("place-prose-toggle").textContent).toBe("more");
  });

  it("expands and collapses", () => {
    render(
      <PaneBody
        card={placeCard({ longDescription: long })}
        onSendCommand={() => undefined}
      />,
    );
    const toggle = screen.getByTestId("place-prose-toggle");
    // ⚠ A viewport act — it carries no `Click to send:` promise,
    // because it sends nothing.
    expect(toggle.getAttribute("title")).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByTestId("place-prose-toggle").textContent).toBe("less");
  });

  it("renders nothing when the room has no prose", () => {
    render(
      <PaneBody card={placeCard({})} onSendCommand={() => undefined} />,
    );
    expect(screen.queryByTestId("place-prose")).toBeNull();
  });
});

describe("⚠ density", () => {
  it("caps the HERE list and COUNTS the remainder", () => {
    const contents = Array.from({ length: 9 }, (_, i) => ({
      stuffId: `s${i}`,
      displayName: `thing ${i}`,
    }));
    render(
      <PaneBody
        card={placeCard({ contents } as never)}
        onSendCommand={() => undefined}
      />,
    );
    // Counted, not dropped: a silent truncation would tell the player
    // the room is emptier than it is.
    expect(screen.getByTestId("here-overflow").textContent).toBe("+4 more");
    expect(screen.getByText("thing 0")).toBeTruthy();
    expect(screen.queryByText("thing 8")).toBeNull();
  });

  it("shows no overflow line when everything fits", () => {
    render(
      <PaneBody
        card={placeCard({
          contents: [{ stuffId: "s0", displayName: "a kettle" }],
        } as never)}
        onSendCommand={() => undefined}
      />,
    );
    expect(screen.queryByTestId("here-overflow")).toBeNull();
  });


  it("renders exits as inline links, not 44px buttons", () => {
    render(
      <PaneBody
        card={placeCard({
          exits: [{ direction: "south" }, { direction: "north" }] as never,
        })}
        onSendCommand={() => undefined}
      />,
    );
    /*
     * The 44px touch minimum is right for a primary action and wrong
     * for a list of directions in a 360px rail — five exits cost most
     * of a card's height, and the point of a feed is seeing more than
     * one card at a time.
     */
    const south = screen.getByText("south");
    expect(south.tagName).toBe("BUTTON");
    expect(getComputedStyle(south).minHeight).not.toBe("44px");
    // Still a real command, still previewed.
    expect(south.getAttribute("title")).toBe("Click to send: go south");
  });
});

/**
 * ⭐⭐ **One card, and the subject decides what is in it.**
 *
 * There is no location view and no thing view: the body renders the
 * sections the record HAS. This is the property the whole restructure
 * rests on, so it is asserted from both ends.
 */
describe("⭐⭐ sections appear only when the subject has them", () => {
  it("a room gets exits; a thing does not", () => {
    const { unmount } = render(
      <PaneBody
        card={placeCard({ exits: [{ direction: "north" }] as never })}
        onSendCommand={() => undefined}
      />,
    );
    expect(screen.getByText("Exits")).toBeTruthy();
    unmount();

    render(
      <PaneBody
        card={placeCard({ mass: "0 kg" } as never)}
        onSendCommand={() => undefined}
      />,
    );
    // Not "Exits: none" and not a hatch — absent. A lamp having no
    // exits is not a gap in the lamp.
    expect(screen.queryByText("Exits")).toBeNull();
  });

  it("⚠ a subject with no readings shows NO measured section", () => {
    /*
     * An unwired hatch is right for a figure the surface promised and
     * cannot fill. This section promises nothing, so hatching it put
     * *"nothing about this declares a reading yet"* on every location
     * card — noise claiming to be honesty.
     */
    render(
      <PaneBody
        card={placeCard({ exits: [{ direction: "north" }] as never })}
        onSendCommand={() => undefined}
      />,
    );
    expect(
      screen.queryByText(/declares a reading yet/i),
    ).toBeNull();
  });

  it("every card refreshes the same way, by looking at its subject", () => {
    const sent: string[] = [];
    render(
      <PaneBody
        card={placeCard({ primaryKeyword: "lounge" })}
        onSendCommand={(t) => sent.push(t)}
      />,
    );
    fireEvent.click(screen.getByTestId("card-refresh"));
    expect(sent).toEqual(["look lounge"]);
  });
});
