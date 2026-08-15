/**
 * The card feed — the right column stops being one slot.
 *
 * ⚠ These are the CLIENT half. The property that a `present` card
 * releases when its subject leaves is a **server** fact and is driven
 * server-side (`card-holds.drive.test.ts`); nothing here re-implements
 * a hold, because nothing in the client is allowed to.
 *
 * What is worth proving here is the half only the client can get
 * wrong: that a released card fades and says why instead of vanishing,
 * that the pinned count is derived rather than tracked, that the pin
 * sends a real command instead of toggling locally, and that the two
 * feeds announce their opposite directions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, fireEvent } from "@testing-library/react";
import type { MqlSubscriptionReleasedEnvelope } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { CardFeed } from "../CardFeed";
import { useCardFeed } from "../useCardFeed";
import { websocketClient } from "../../../services/websocket";

function resetStore(): void {
  useStore.setState({
    cards: {},
    affordances: {},
    affordancePending: {},
    affordanceUnresolvable: {},
    radialSubject: null,
    stuffRegistry: new Map(),
    cardLastResult: null,
    cardBodyPainted: false,
    cardBreadcrumbRoot: null,
    cardBreadcrumbTrail: [],
    cardDetailPath: [],
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
  store.openCard({ subscriptionId: id, cardId: kind, kind, hold });
  store.setCardRecords(id, [
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
    render(<CardFeed onSendCommand={() => undefined} />);
    // ⭐ The terminal runs oldest→newest and this runs the other way.
    // The header exists BECAUSE of the asymmetry: a reader who is not
    // told reads a card appearing at the top as a bug.
    expect(screen.getByText(/newest → oldest/i)).toBeTruthy();
  });
});

describe("a card", () => {
  it("names its subject and what holds it — but not a 'kind'", () => {
    openCard("s1", "agent", "Tomas", "present");
    render(<CardFeed onSendCommand={() => undefined} />);

    expect(screen.getByText("Tomas")).toBeTruthy();
    /*
     * ⚠ No kind chip. Every card is *what I am looking at*, so a label
     * saying so on each one never varies — and what actually differs
     * between a room and a lamp is which sections the body renders.
     */
    expect(screen.queryByText("agent")).toBeNull();
    // The art's exact words. Never an age — a card's lifetime is a fact
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
    useStore.getState().releaseCard(released);
    render(<CardFeed onSendCommand={() => undefined} />);

    // The requirement says a released card disappears; the art says it
    // fades and the header says which. Both hold: the LIVE card is gone
    // (no body, no pin) and a husk states the reason. A card that
    // vanished silently would read as a bug — which is exactly why the
    // release envelope carries a reason at all.
    expect(screen.getByText("stale · they left")).toBeTruthy();
    /*
     * ⚠ …and it keeps no PIN and no REFRESH. Either would promise to
     * act on a subscription the world has already torn down — a control
     * that cannot do what it says.
     *
     * ⭐ Close survives, deliberately: dismissing a husk is still
     * something you can do to it.
     */
    const husk = screen.getByTestId("card-agent");
    expect(husk.querySelector('[aria-label^="cockpit card pin"]')).toBeNull();
    expect(husk.querySelector('[aria-label^="cockpit card auto"]')).toBeNull();
    expect(husk.querySelector('[data-testid="card-refresh"]')).toBeNull();
    expect(
      husk.querySelector('[aria-label^="cockpit card dismiss"]'),
    ).toBeTruthy();
  });

  it("drops the body when released — it must not show stale contents", () => {
    openCard("s1", "place", "The Yard", "here");
    useStore.getState().releaseCard({
      type: "mql-subscription-released",
      frameId: 1,
      subscriptionId: "s1",
      hold: "here",
      reason: "left",
    });
    expect(useStore.getState().cards.s1!.records).toEqual([]);
  });
});

describe("the pin", () => {
  it("⚠ sends a real command; it does not toggle locally", () => {
    openCard("s1", "agent", "Tomas", "present");
    const sent: string[] = [];
    render(<CardFeed onSendCommand={(t) => sent.push(t)} />);

    fireEvent.click(screen.getByLabelText("cockpit card pin agent"));

    expect(sent).toEqual(["cockpit card pin agent"]);
    // ⭐ And the card is NOT pinned yet. The card set is
    // server-authoritative, so a local toggle would show the player a
    // pin the server had refused.
    expect(useStore.getState().cards.s1!.pinned).toBeNull();
  });

  it("offers to hand the decision back once the server says it took", () => {
    openCard("s1", "agent", "Tomas", "present");
    useStore.getState().setCardPinnedState("s1", true);
    const sent: string[] = [];
    render(<CardFeed onSendCommand={(t) => sent.push(t)} />);

    fireEvent.click(screen.getByLabelText("cockpit card auto agent"));
    expect(sent).toEqual(["cockpit card auto agent"]);
  });

  it("previews exactly what it sends", () => {
    openCard("s1", "agent", "Tomas", "present");
    const previews: (string | null)[] = [];
    render(
      <CardFeed
        onSendCommand={() => undefined}
        onCommandPreview={(c) => previews.push(c)}
      />,
    );

    const pin = screen.getByLabelText("cockpit card pin agent");
    fireEvent.mouseEnter(pin);
    fireEvent.mouseLeave(pin);
    expect(previews).toEqual(["cockpit card pin agent", null]);
  });
});

describe("⚠ the pinned count", () => {
  it("is counted from the set, never tracked beside it", () => {
    openCard("s1", "agent", "Tomas", "present");
    openCard("s2", "instrument", "the forge", "inReach");
    useStore.getState().setCardPinnedState("s1", true);
    render(<CardFeed onSendCommand={() => undefined} />);

    expect(screen.getByTestId("card-pinned-count").textContent).toContain(
      "1 pinned",
    );

    // Unpin through the same path the server's answer takes; the count
    // follows because it is derived. A tracked count is a second source
    // of truth for the list's own size, and the two disagree the first
    // time one path forgets to update.
    useStore.getState().setCardPinnedState("s1", null);
    render(<CardFeed onSendCommand={() => undefined} />);
    const counts = screen.getAllByTestId("card-pinned-count");
    expect(counts[counts.length - 1]!.textContent).toContain("0 pinned");
  });
});

describe("the feed's bound", () => {
  it("keeps live cards and prunes only the oldest husks", () => {
    const store = useStore.getState();
    for (let i = 1; i <= 6; i++) {
      openCard(`h${i}`, "agent", `Ghost ${i}`, "present");
      store.releaseCard({
        type: "mql-subscription-released",
        frameId: i,
        subscriptionId: `h${i}`,
        hold: "present",
        reason: "departed",
      });
    }
    openCard("live", "place", "The Yard", "here");

    const cards = Object.values(useStore.getState().cards);
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
 * ⭐ The three defects driving found in the card lifecycle. Each was
 * invisible to every test above, because each lives in the WIRING
 * rather than in a card's rendering.
 */
describe("⚠⚠ what only a real session showed", () => {
  it("keeps the husk's NAME so a stale card says which place you left", () => {
    openCard("s-place", "place", "the lounge", "here");
    useStore.getState().releaseCard({
      type: "mql-subscription-released",
      frameId: 1,
      subscriptionId: "s-place",
      hold: "here",
      reason: "left",
    });
    render(<CardFeed onSendCommand={() => undefined} />);

    /*
     * The BODY going with the hold is the point — a husk must not
     * render yesterday's contents as if they were current. The subject
     * NAME is not contents, it is which card this is. Live, the husk
     * read `PLACE where you are · stale · you left`, naming nothing.
     */
    expect(screen.getAllByText("the lounge").length).toBeGreaterThan(0);
    expect(useStore.getState().cards["s-place"]!.records).toEqual([]);
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
     * ⚠ The HOOK, not `CardFeed`. The hook lives in `WorldLayout` now
     * precisely because `CardFeed` is the desktop-only right column —
     * rendering the column here would test the wiring on the one form
     * factor where it was never broken.
     */
    renderHook(() => useCardFeed());
    return {
      release: (e) => (released as unknown as (x: unknown) => void)(e),
      handles,
    };
  }

  it("⚠ does NOT re-open a subject card the world put out of reach", () => {
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

    // A subject card is about ONE thing. Re-opening it after that thing
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
/**
 * ⭐⭐ **Attention drives the feed.** Every thing you look at gets its
 * own card; they stack newest-first and age away.
 *
 * This replaced a focus card that had to be deduplicated against a
 * standing place card — two subscriptions racing, which is what produced
 * the flash. There is nothing to deduplicate any more.
 */
describe("⭐⭐ a card per thing you look at", () => {
  function mountWithWire(): { handles: string[] } {
    const handles: string[] = [];
    let n = 0;
    vi.spyOn(websocketClient, "subscribeMql").mockImplementation(() => {
      n += 1;
      const id = `sub-${n}`;
      handles.push(id);
      return id;
    });
    renderHook(() => useCardFeed());
    return { handles };
  }

  it("opens one when the focus resolves to something", () => {
    useStore.setState({
      cardLastResult: [
        { stuffId: "stuff-lamp", displayName: "a lamp" },
      ] as never,
    });
    const { handles } = mountWithWire();

    const card = useStore.getState().cards[handles[handles.length - 1]!];
    expect(card?.cardId).toBe("subject");
    expect(card?.kind).toBe("subject");
  });

  it("⚠ does NOT stack a second card for something already on screen", () => {
    /*
     * Re-looking at a thing brings its card back into view; it does not
     * mint a duplicate. Without this, `look lamp` twice would leave two
     * identical cards and the stack would stop reading as a history.
     */
    useStore.setState({
      cardLastResult: [
        { stuffId: "stuff-lamp", displayName: "a lamp" },
      ] as never,
    });
    const { handles } = mountWithWire();
    const openBefore = handles.length;

    const store = useStore.getState();
    store.setCardRecords(handles[handles.length - 1]!, [
      { stuffId: "stuff-lamp", displayName: "a lamp" } as never,
    ]);
    // Same subject resolves again.
    useStore.setState({
      cardLastResult: [
        { stuffId: "stuff-lamp", displayName: "a lamp" },
      ] as never,
    });

    expect(handles.length).toBe(openBefore);
  });
});

/**
 * ⭐ Husks age out. *"I'm expecting cards to stack and scroll away and
 * then fade off over time."*
 */
describe("⭐ a husk expires; a live card never does", () => {
  it("drops a husk once its time is up", () => {
    vi.useFakeTimers();
    try {
      openCard("s1", "place", "the lounge", "here");
      useStore.getState().releaseCard({
        type: "mql-subscription-released",
        frameId: 1,
        subscriptionId: "s1",
        hold: "here",
        reason: "left",
      });
      expect(useStore.getState().cards["s1"]).toBeDefined();

      vi.setSystemTime(Date.now() + 121_000);
      useStore.getState().expireHusks();

      expect(useStore.getState().cards["s1"]).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("⚠⚠ leaves a LIVE card alone however old it is", () => {
    /*
     * The bound on the live set is the HOLD. If it grew without limit
     * the fault would be a hold that never lapses, and expiring one on
     * age would hide exactly the bug the holds exist to make visible.
     */
    vi.useFakeTimers();
    try {
      openCard("live", "place", "the lounge", "here");
      vi.setSystemTime(Date.now() + 10 * 60_000);
      useStore.getState().expireHusks();
      expect(useStore.getState().cards["live"]).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a husk that is still within its time", () => {
    openCard("s2", "agent", "Tomas", "present");
    useStore.getState().releaseCard({
      type: "mql-subscription-released",
      frameId: 2,
      subscriptionId: "s2",
      hold: "present",
      reason: "departed",
    });
    useStore.getState().expireHusks();
    expect(useStore.getState().cards["s2"]).toBeDefined();
  });
});

/**
 * ⭐ Three controls, top right, on every card: refresh · pin · close.
 */
describe("⭐ the card's controls", () => {
  it("carries all three, as commands", () => {
    openCard("s1", "place", "the lounge", "here");
    useStore
      .getState()
      .setCardRecords("s1", [
        { stuffId: "r", displayName: "the lounge", primaryKeyword: "lounge" },
      ] as never);
    render(<CardFeed onSendCommand={() => undefined} />);

    const card = screen.getByTestId("card-place");
    // Every one previews exactly what it sends.
    expect(
      card.querySelector('[aria-label="look lounge"]'),
    ).toBeTruthy();
    expect(
      card.querySelector('[aria-label="cockpit card pin place"]'),
    ).toBeTruthy();
    expect(
      card.querySelector('[aria-label="cockpit card dismiss place"]'),
    ).toBeTruthy();
  });

  it("⚠ omits refresh when there is nothing to look at yet", () => {
    // A card whose subject has not resolved has no keyword to name, and
    // a control that cannot do what it says is worse than a missing one.
    openCard("s2", "place", "", "here");
    render(<CardFeed onSendCommand={() => undefined} />);
    expect(
      screen.getByTestId("card-place").querySelector('[data-testid="card-refresh"]'),
    ).toBeNull();
  });
});
