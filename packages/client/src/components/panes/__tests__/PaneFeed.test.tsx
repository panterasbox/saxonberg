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
import { render, renderHook, screen, fireEvent } from "@testing-library/react";
import type { MqlSubscriptionReleasedEnvelope } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { PaneFeed } from "../PaneFeed";
import { usePaneFeed } from "../usePaneFeed";
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

/**
 * ⭐ The three defects driving found in the pane lifecycle. Each was
 * invisible to every test above, because each lives in the WIRING
 * rather than in a card's rendering.
 */
describe("⚠⚠ what only a real session showed", () => {
  it("keeps the husk's NAME so a stale card says which place you left", () => {
    openCard("s-place", "place", "the lounge", "here");
    useStore.getState().releasePane({
      type: "mql-subscription-released",
      frameId: 1,
      subscriptionId: "s-place",
      hold: "here",
      reason: "left",
    });
    render(<PaneFeed onSendCommand={() => undefined} />);

    /*
     * The BODY going with the hold is the point — a husk must not
     * render yesterday's contents as if they were current. The subject
     * NAME is not contents, it is which card this is. Live, the husk
     * read `PLACE where you are · stale · you left`, naming nothing.
     */
    expect(screen.getAllByText("the lounge").length).toBeGreaterThan(0);
    expect(useStore.getState().paneCards["s-place"]!.records).toEqual([]);
  });

  /**
   * Mount the feed with the wire faked, and hand back the release
   * handler plus the live subscription handles.
   *
   * ⚠ Counts are never asserted: React double-mounts an effect in the
   * test renderer, so "subscribed once" is false for a correct
   * implementation. What matters is WHICH handles exist.
   */
  function mountWithWire(): {
    release: (e: MqlSubscriptionReleasedEnvelope) => void;
    handles: string[];
  } {
    const handles: string[] = [];
    let n = 0;
    vi.spyOn(websocketClient, "subscribeMql").mockImplementation(() => {
      n += 1;
      const id = `place-${n}`;
      handles.push(id);
      return id;
    });
    let released: ((e: MqlSubscriptionReleasedEnvelope) => void) | null = null;
    vi.spyOn(websocketClient, "onEnvelope").mockImplementation(
      (kind: string, handler: unknown) => {
        if (kind === "mql-subscription-released") {
          released = handler as (e: MqlSubscriptionReleasedEnvelope) => void;
        }
      },
    );
    /*
     * ⚠ The HOOK, not `PaneFeed`. The hook lives in `WorldLayout` now
     * precisely because `PaneFeed` is the desktop-only right column —
     * rendering the column here would test the wiring on the one form
     * factor where it was never broken.
     */
    renderHook(() => usePaneFeed());
    return {
      release: (e) => (released as unknown as (x: unknown) => void)(e),
      handles,
    };
  }

  it("re-opens the STANDING place card when the world ends the old one", () => {
    /*
     * ⚠⚠ `place` is held by `here`, so walking out releases it — and
     * before this, that was the END of it. The subscription was opened
     * once on mount, so ONE movement cost the player the place card for
     * the rest of the session and the mode's arrangement silently
     * degraded to nothing.
     */
    const { release, handles } = mountWithWire();
    const live = handles[handles.length - 1]!;
    const openBefore = handles.length;

    release({
      type: "mql-subscription-released",
      frameId: 1,
      subscriptionId: live,
      hold: "here",
      reason: "left",
    });

    // A fresh handle, and both cards present: the husk you left and the
    // live one you arrived in.
    expect(handles.length).toBe(openBefore + 1);
    const cards = useStore.getState().paneCards;
    expect(cards[live]!.released).toBe("left");
    expect(cards[handles[handles.length - 1]!]!.released).toBeUndefined();
  });

  it("⚠ does NOT re-open a subject pane the world put out of reach", () => {
    const { release, handles } = mountWithWire();
    const openBefore = handles.length;

    openCard("agent-1", "agent", "Tomas", "present");
    release({
      type: "mql-subscription-released",
      frameId: 2,
      subscriptionId: "agent-1",
      hold: "present",
      reason: "departed",
    });

    // A subject pane is about ONE thing. Re-opening it after that thing
    // left would be a card asserting a condition the world just denied.
    expect(handles.length).toBe(openBefore);
  });
});

/**
 * ⚠⚠ The duplication the user saw on the live screen: *the lounge*,
 * twice, stacked. Nothing guarded it, because each half rendered
 * correctly on its own — which is exactly the shape a component test
 * cannot catch and an assembled screen can.
 */
describe("⚠⚠ the focus card never repeats the PLACE card", () => {
  it("is absent when the focus subject IS the place subject", () => {
    openCard("s-place", "place", "the lounge", "here");
    // Same stuffId the place card is holding — `openCard` stamps
    // `stuff-s-place`.
    useStore.setState({
      paneLastResult: [
        { stuffId: "stuff-s-place", displayName: "the lounge" },
      ] as never,
      paneFocusName: "the lounge",
    });
    render(<PaneFeed onSendCommand={() => undefined} />);

    expect(screen.queryByTestId("pane-focus-card")).toBeNull();
    // The place card is still there — this suppresses the DUPLICATE,
    // never the room itself.
    expect(screen.getAllByText("the lounge").length).toBeGreaterThan(0);
  });

  it("appears as soon as the focus is something else", () => {
    openCard("s-place", "place", "the lounge", "here");
    useStore.setState({
      paneLastResult: [
        { stuffId: "stuff-terminal", displayName: "a Teleport terminal" },
      ] as never,
      paneFocusName: "a Teleport terminal",
    });
    render(<PaneFeed onSendCommand={() => undefined} />);

    const card = screen.getByTestId("pane-focus-card");
    expect(card.textContent).toContain("looking at");
    expect(card.textContent).toContain("a Teleport terminal");
  });

  it("⚠ keys on the SUBJECT, not on whether anything is focused", () => {
    /*
     * After `look` at the room the focus subject IS the room, so a rule
     * written as "hide the focus card when nothing is focused" would
     * let the duplicate straight back in — something *is* focused, and
     * it is the thing already on screen above.
     */
    openCard("s-place", "place", "the lounge", "here");
    useStore.setState({
      paneLastResult: [
        { stuffId: "stuff-s-place", displayName: "the lounge" },
      ] as never,
      paneFocusName: "the lounge",
      paneBodyPainted: true,
    });
    render(<PaneFeed onSendCommand={() => undefined} />);
    expect(screen.queryByTestId("pane-focus-card")).toBeNull();
  });
});
