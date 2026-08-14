/**
 * The pane feed — the right column stops being one slot.
 *
 * ⚠ These are the CLIENT half. The property that a `present` pane
 * releases when its subject leaves is a **server** fact and is driven
 * server-side (`pane-holds.drive.test.ts`); nothing here re-implements
 * a hold, because nothing in the client is allowed to.
 *
 * What is worth proving here is the half only the client can get
 * wrong: that a released pane fades and says why instead of vanishing,
 * that the pinned count is derived rather than tracked, that the pin
 * sends a real command instead of toggling locally, and that the two
 * feeds announce their opposite directions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { MqlSubscriptionReleasedEnvelope } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { PaneFeed } from "../PaneFeed";
import { websocketClient } from "../../../services/websocket";

function resetStore(): void {
  useStore.setState({
    paneCards: {},
    affordances: {},
    affordancePending: {},
    affordanceUnresolvable: {},
    radialSubject: null,
    stuffRegistry: new Map(),
    paneLastResult: null,
    paneBodyPainted: false,
    paneBreadcrumbRoot: null,
    paneBreadcrumbTrail: [],
    paneDetailPath: [],
  });
}

/** Open a card the way the wire would, then give it a subject. */
function openCard(
  id: string,
  kind: "place" | "agent" | "instrument" | "manifest",
  displayName: string,
  hold: "here" | "present" | "inReach" | "carried",
): void {
  const store = useStore.getState();
  store.openPaneCard({ subscriptionId: id, paneId: kind, kind, hold });
  store.setPaneRecords(id, [
    { stuffId: `stuff-${id}`, displayName } as never,
  ]);
}

beforeEach(() => {
  vi.restoreAllMocks();
  resetStore();
  // The feed opens its `place` subscription on mount; keep the socket
  // out of it so these stay pure store→DOM assertions.
  vi.spyOn(websocketClient, "subscribeMql").mockReturnValue("sub-place");
  vi.spyOn(websocketClient, "unsubscribe").mockImplementation(() => undefined);
  vi.spyOn(websocketClient, "onEnvelope").mockImplementation(() => undefined);
  vi.spyOn(websocketClient, "offEnvelope").mockImplementation(() => undefined);
  vi.spyOn(websocketClient, "resolveAffordances").mockImplementation(
    () => undefined,
  );
});

describe("the two feeds", () => {
  it("says which way this one runs", () => {
    render(<PaneFeed onSendCommand={() => undefined} />);
    // ⭐ The terminal runs oldest→newest and this runs the other way.
    // The header exists BECAUSE of the asymmetry: a reader who is not
    // told reads a card appearing at the top as a bug.
    expect(screen.getByText(/newest → oldest/i)).toBeTruthy();
  });
});

describe("a card", () => {
  it("names its kind, its subject and what holds it", () => {
    openCard("s1", "agent", "Tomas", "present");
    render(<PaneFeed onSendCommand={() => undefined} />);

    expect(screen.getByText("Tomas")).toBeTruthy();
    expect(screen.getByText("agent")).toBeTruthy();
    // The art's exact words. Never an age — a pane's lifetime is a fact
    // about the world, and a duration in that slot would invite the
    // reader to believe recency had something to do with it.
    expect(screen.getByText("held · still in the room")).toBeTruthy();
  });

  it("⚠ FADES with its reason when released, rather than vanishing", () => {
    openCard("s1", "agent", "Tomas", "present");
    const released: MqlSubscriptionReleasedEnvelope = {
      type: "mql-subscription-released",
      frameId: 1,
      subscriptionId: "s1",
      hold: "present",
      reason: "departed",
    };
    useStore.getState().releasePane(released);
    render(<PaneFeed onSendCommand={() => undefined} />);

    // The requirement says a released pane disappears; the art says it
    // fades and the header says which. Both hold: the LIVE pane is gone
    // (no body, no pin) and a husk states the reason. A pane that
    // vanished silently would read as a bug — which is exactly why the
    // release envelope carries a reason at all.
    expect(screen.getByText("stale · they left")).toBeTruthy();
    // ⚠ …and it keeps no pin. Pinning something the world has already
    // ended would promise to hold open a card whose subscription no
    // longer exists — a control that cannot do what it says. Scoped to
    // THIS card: the feed's own `place` card is live and keeps its pin.
    const husk = screen.getByTestId("pane-agent");
    expect(
      husk.querySelector('[aria-label^="cockpit pane"]'),
    ).toBeNull();
  });

  it("drops the body when released — it must not show stale contents", () => {
    openCard("s1", "place", "The Yard", "here");
    useStore.getState().releasePane({
      type: "mql-subscription-released",
      frameId: 1,
      subscriptionId: "s1",
      hold: "here",
      reason: "left",
    });
    expect(useStore.getState().paneCards.s1!.records).toEqual([]);
  });
});

describe("the pin", () => {
  it("⚠ sends a real command; it does not toggle locally", () => {
    openCard("s1", "agent", "Tomas", "present");
    const sent: string[] = [];
    render(<PaneFeed onSendCommand={(t) => sent.push(t)} />);

    fireEvent.click(screen.getByLabelText("cockpit pane pin agent"));

    expect(sent).toEqual(["cockpit pane pin agent"]);
    // ⭐ And the card is NOT pinned yet. The pane set is
    // server-authoritative, so a local toggle would show the player a
    // pin the server had refused.
    expect(useStore.getState().paneCards.s1!.pinned).toBeNull();
  });

  it("offers to hand the decision back once the server says it took", () => {
    openCard("s1", "agent", "Tomas", "present");
    useStore.getState().setPanePinnedState("s1", true);
    const sent: string[] = [];
    render(<PaneFeed onSendCommand={(t) => sent.push(t)} />);

    fireEvent.click(screen.getByLabelText("cockpit pane auto agent"));
    expect(sent).toEqual(["cockpit pane auto agent"]);
  });

  it("previews exactly what it sends", () => {
    openCard("s1", "agent", "Tomas", "present");
    const previews: (string | null)[] = [];
    render(
      <PaneFeed
        onSendCommand={() => undefined}
        onCommandPreview={(c) => previews.push(c)}
      />,
    );

    const pin = screen.getByLabelText("cockpit pane pin agent");
    fireEvent.mouseEnter(pin);
    fireEvent.mouseLeave(pin);
    expect(previews).toEqual(["cockpit pane pin agent", null]);
  });
});

describe("⚠ the pinned count", () => {
  it("is counted from the set, never tracked beside it", () => {
    openCard("s1", "agent", "Tomas", "present");
    openCard("s2", "instrument", "the forge", "inReach");
    useStore.getState().setPanePinnedState("s1", true);
    render(<PaneFeed onSendCommand={() => undefined} />);

    expect(screen.getByTestId("pane-pinned-count").textContent).toContain(
      "1 pinned",
    );

    // Unpin through the same path the server's answer takes; the count
    // follows because it is derived. A tracked count is a second source
    // of truth for the list's own size, and the two disagree the first
    // time one path forgets to update.
    useStore.getState().setPanePinnedState("s1", null);
    render(<PaneFeed onSendCommand={() => undefined} />);
    const counts = screen.getAllByTestId("pane-pinned-count");
    expect(counts[counts.length - 1]!.textContent).toContain("0 pinned");
  });
});

describe("the feed's bound", () => {
  it("keeps live cards and prunes only the oldest husks", () => {
    const store = useStore.getState();
    for (let i = 1; i <= 6; i++) {
      openCard(`h${i}`, "agent", `Ghost ${i}`, "present");
      store.releasePane({
        type: "mql-subscription-released",
        frameId: i,
        subscriptionId: `h${i}`,
        hold: "present",
        reason: "departed",
      });
    }
    openCard("live", "place", "The Yard", "here");

    const cards = Object.values(useStore.getState().paneCards);
    const husks = cards.filter((c) => c.released !== undefined);
    // ⚠ Bounded, but only the husks. A live card is never pruned: if
    // the live set grew without limit the fault would be a hold that
    // never lapses, and hiding it here would hide the very bug the
    // holds exist to make visible.
    expect(husks.length).toBeLessThanOrEqual(3);
    expect(cards.some((c) => c.subscriptionId === "live")).toBe(true);
  });
});
