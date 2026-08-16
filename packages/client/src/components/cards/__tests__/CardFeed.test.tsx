/**
 * The card feed — the CLIENT half.
 *
 * ⚠ The lifetime is a **server** fact and is driven server-side
 * (`card-lifetime.test.ts`, `card-sweep.test.ts`); nothing here
 * re-implements a window, because nothing in the client is allowed to.
 *
 * What is worth proving here is the half only the client can get
 * wrong: that a closed card fades and says why instead of vanishing,
 * that the pinned block holds its position, that the pinned count is
 * derived rather than tracked, that the pin sends a real command
 * instead of toggling locally, and — the honesty rule — that a STATIC
 * card shows its timestamp and a refresh while a LIVE one shows
 * neither.
 *
 * ⚠⚠ **The wire shapes here are real envelope types.** A hand-built
 * object typed as the envelope proves the renderer and nothing about
 * the protocol; these are `CardOpenedEnvelope` etc. from
 * `@saxonberg/types`, fed to the handler the hook actually registers.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, fireEvent } from "@testing-library/react";
import type {
  CardClosedEnvelope,
  CardOpenedEnvelope,
  CardPinnedEnvelope,
  CardTouchedEnvelope,
  Envelope,
} from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { CardFeed } from "../CardFeed";
import { Card } from "../Card";
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
  });
}

/** A real `card-opened` envelope, the shape the server actually sends. */
function opened(
  over: Partial<CardOpenedEnvelope> & Pick<CardOpenedEnvelope, "instanceId">,
): CardOpenedEnvelope {
  return {
    type: "card-opened",
    frameId: 1,
    cardId: "who",
    key: "who",
    live: false,
    pinned: false,
    takenAt: 1_700_000_000_000,
    ...over,
  } as CardOpenedEnvelope;
}

/**
 * Land a card through the store the way the envelope handler does.
 *
 * ⚠ `openedAt` is a strictly-increasing counter rather than
 * `Date.now()`: two opens in the same millisecond would tie, and a tie
 * makes the ordering assertion depend on `Object.values` iteration
 * order rather than on the rule under test.
 */
let clock = 1_000;
function landCard(env: CardOpenedEnvelope): void {
  useStore.getState().openCard({
    instanceId: env.instanceId,
    cardId: env.cardId,
    key: env.key,
    live: env.live,
    pinned: env.pinned,
    ...(env.takenAt !== undefined ? { takenAt: env.takenAt } : {}),
    ...(env.title !== undefined ? { title: env.title } : {}),
    records: (env.result ?? []) as never[],
    openedAt: ++clock,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  resetStore();
  vi.spyOn(websocketClient, "subscribeMql").mockReturnValue("sub-x");
  vi.spyOn(websocketClient, "unsubscribe").mockImplementation(() => undefined);
});

const noop = (): void => undefined;

describe("the feed's own header", () => {
  it("says which way this one runs", () => {
    render(<CardFeed onSendCommand={noop} />);
    expect(screen.getByTestId("card-feed").textContent).toMatch(
      /pinned, then newest → oldest/,
    );
  });
});

describe("a card in the feed", () => {
  it("names its subject", () => {
    landCard(opened({ instanceId: "c1", title: "the lounge", cardId: "place" }));
    render(<CardFeed onSendCommand={noop} />);
    expect(screen.getByTestId("card-place").textContent).toContain(
      "the lounge",
    );
  });

  it("⚠ FADES with its reason when closed, rather than vanishing", () => {
    landCard(opened({ instanceId: "c1", title: "the lounge", cardId: "place" }));
    useStore.getState().closeCard("c1", "aged-out");
    render(<CardFeed onSendCommand={noop} />);
    const card = screen.getByTestId("card-place");
    expect(card.getAttribute("data-card-closed")).toBe("aged-out");
    expect(screen.getByTestId("card-hold-reason").textContent).toMatch(
      /went quiet/,
    );
  });

  it("keeps the husk's NAME so a stale card says which place you left", () => {
    landCard(opened({ instanceId: "c1", title: "the lounge", cardId: "place" }));
    useStore.getState().closeCard("c1", "aged-out");
    render(<CardFeed onSendCommand={noop} />);
    expect(screen.getByTestId("card-place").textContent).toContain(
      "the lounge",
    );
  });

  it("drops the body when closed — it must not show stale contents", () => {
    landCard(
      opened({
        instanceId: "c1",
        cardId: "place",
        result: [{ stuffId: "s1", displayName: "the lounge" }] as never,
      }),
    );
    useStore.getState().closeCard("c1", "aged-out");
    expect(useStore.getState().cards["c1"]!.records).toEqual([]);
  });
});

describe("⭐ the honesty rule: a static card looks static", () => {
  it("a STATIC card renders its timestamp AND a refresh", () => {
    landCard(
      opened({ instanceId: "c1", cardId: "who", key: "who", live: false }),
    );
    render(<CardFeed onSendCommand={noop} />);
    expect(screen.getByTestId("card-taken").textContent).toMatch(/^taken \d/);
    expect(screen.getByTestId("card-refresh")).toBeTruthy();
  });

  it("⚠⚠ a LIVE card renders NEITHER", () => {
    landCard(
      opened({
        instanceId: "c1",
        cardId: "place",
        key: "look",
        live: true,
        takenAt: undefined,
      }),
    );
    render(<CardFeed onSendCommand={noop} />);
    expect(screen.queryByTestId("card-taken")).toBeNull();
    expect(screen.queryByTestId("card-refresh")).toBeNull();
  });

  it("⭐ refresh re-issues the card's own KEY, and previews it", () => {
    landCard(
      opened({
        instanceId: "c1",
        cardId: "subject",
        key: "look brass lamp",
        live: false,
      }),
    );
    const sent: string[] = [];
    const previewed: (string | null)[] = [];
    render(
      <CardFeed
        onSendCommand={(t) => sent.push(t)}
        onCommandPreview={(c) => previewed.push(c)}
      />,
    );
    const button = screen.getByTestId("card-refresh");
    expect(button.getAttribute("aria-label")).toBe("look brass lamp");
    fireEvent.mouseEnter(button);
    fireEvent.click(button);
    expect(sent).toEqual(["look brass lamp"]);
    expect(previewed).toEqual(["look brass lamp"]);
  });
});

describe("the pin", () => {
  /**
   * ⚠⚠ **Two cards of one KIND can be open at once**, and this is the
   * regression for the defect driving found: keyed on `cardId`, both
   * `who` cards rendered `cockpit card pin who` and the server acted on
   * whichever it found first — two controls, identical labels, acting
   * on one thing.
   */
  it("⚠⚠ names the card by its KEY, so two of a kind are distinguishable", () => {
    landCard(opened({ instanceId: "a", cardId: "who", key: "who" }));
    landCard(
      opened({ instanceId: "b", cardId: "who", key: "who --here" }),
    );
    render(<CardFeed onSendCommand={noop} />);
    // The one with a space in its key is quoted, or `--here` would bind
    // as an option of `cockpit`.
    expect(screen.getByLabelText('cockpit card pin "who --here"')).toBeTruthy();
    expect(screen.getByLabelText("cockpit card pin who")).toBeTruthy();
    expect(
      screen.getByLabelText('cockpit card dismiss "who --here"'),
    ).toBeTruthy();
  });

  it("⚠ sends a real command; it does not toggle locally", () => {
    landCard(opened({ instanceId: "c1", cardId: "who" }));
    const sent: string[] = [];
    render(<CardFeed onSendCommand={(t) => sent.push(t)} />);
    fireEvent.click(screen.getByLabelText("cockpit card pin who"));
    expect(sent).toEqual(["cockpit card pin who"]);
    // ⚠ NOT flipped locally: the server is the one that answers.
    expect(useStore.getState().cards["c1"]!.pinned).toBe(false);
  });

  it("offers to hand the decision back once the server says it took", () => {
    landCard(opened({ instanceId: "c1", cardId: "who" }));
    useStore.getState().setCardPinnedState("c1", true);
    render(<CardFeed onSendCommand={noop} />);
    expect(screen.getByLabelText("cockpit card auto who")).toBeTruthy();
    expect(screen.getByTestId("card-hold-reason").textContent).toBe(
      "held by you",
    );
  });

  it("is counted from the set, never tracked beside it", () => {
    landCard(opened({ instanceId: "c1", cardId: "who" }));
    landCard(opened({ instanceId: "c2", cardId: "news", pinned: true }));
    render(<CardFeed onSendCommand={noop} />);
    expect(screen.getByTestId("card-pinned-count").textContent).toBe(
      "1 pinned",
    );
  });
});

describe("⭐ the feed's order", () => {
  it("puts the pinned block first, and a pinned card HOLDS its position", () => {
    landCard(opened({ instanceId: "pin", cardId: "place", pinned: true }));
    landCard(opened({ instanceId: "a", cardId: "who" }));
    landCard(opened({ instanceId: "b", cardId: "news" }));

    const order = (): string[] =>
      useStore
        .getState()
        .cardFeed()
        .map((c) => c.instanceId);
    expect(order()).toEqual(["pin", "b", "a"]);

    // Touch the pinned card: it must NOT jump anywhere.
    useStore.getState().touchCard("pin", { key: "look" });
    expect(order()).toEqual(["pin", "b", "a"]);

    // Touch an unpinned one: it comes to the front of its own block.
    useStore.getState().touchCard("a", { key: "who" });
    expect(order()).toEqual(["pin", "a", "b"]);
  });

  it("keeps live cards and prunes only the oldest husks", () => {
    for (const id of ["h1", "h2", "h3", "h4"]) {
      landCard(opened({ instanceId: id, cardId: "who", key: `who ${id}` }));
      useStore.getState().closeCard(id, "aged-out");
    }
    landCard(opened({ instanceId: "live", cardId: "place", key: "look" }));
    const ids = Object.keys(useStore.getState().cards).sort();
    // Three husks (the bound) plus the live one.
    expect(ids).toEqual(["h2", "h3", "h4", "live"]);
  });
});

describe("⚠⚠ the client cannot open a card", () => {
  it("the hook registers the four card envelopes and opens nothing", () => {
    const on = vi.spyOn(websocketClient, "onEnvelope");
    const subscribe = vi.spyOn(websocketClient, "subscribeMql");
    renderHook(() => useCardFeed());
    const registered = on.mock.calls.map((c) => c[0]);
    expect(registered).toEqual([
      "card-opened",
      "card-touched",
      "card-closed",
      "card-pinned",
      "mql-subscription-delta",
    ]);
    /*
     * ⭐ Nothing subscribed, and nothing could: `MqlSubscribeMessage`
     * has no field that names a card. The card feed is a pure consumer.
     */
    expect(subscribe).not.toHaveBeenCalled();
    expect(Object.keys(useStore.getState().cards)).toEqual([]);
  });

  it("a real card-opened envelope lands a card; card-closed fades it", () => {
    const handlers: Record<string, (e: Envelope) => void> = {};
    vi.spyOn(websocketClient, "onEnvelope").mockImplementation(
      (type, fn) => {
        handlers[type] = fn as (e: Envelope) => void;
      },
    );
    renderHook(() => useCardFeed());

    const openEnv: CardOpenedEnvelope = opened({
      instanceId: "c1",
      cardId: "who",
      key: "who",
      title: "who's online",
    });
    handlers["card-opened"]!(openEnv as unknown as Envelope);
    expect(useStore.getState().cards["c1"]!.key).toBe("who");

    const touchEnv: CardTouchedEnvelope = {
      type: "card-touched",
      frameId: 2,
      instanceId: "c1",
      key: "who",
      takenAt: 1_700_000_001_000,
    };
    handlers["card-touched"]!(touchEnv as unknown as Envelope);
    expect(useStore.getState().cards["c1"]!.takenAt).toBe(1_700_000_001_000);

    const pinEnv: CardPinnedEnvelope = {
      type: "card-pinned",
      frameId: 3,
      instanceId: "c1",
      pinned: true,
    };
    handlers["card-pinned"]!(pinEnv as unknown as Envelope);
    expect(useStore.getState().cards["c1"]!.pinned).toBe(true);

    const closeEnv: CardClosedEnvelope = {
      type: "card-closed",
      frameId: 4,
      instanceId: "c1",
      reason: "answered",
    };
    handlers["card-closed"]!(closeEnv as unknown as Envelope);
    expect(useStore.getState().cards["c1"]!.closed).toBe("answered");
  });

  it("⚠ there is no husk timer — the server's window is the only clock", () => {
    const slice = useStore.getState() as unknown as Record<string, unknown>;
    expect(slice["expireHusks"]).toBeUndefined();
  });
});

describe("the card's controls", () => {
  it("carries refresh, pin and close as commands", () => {
    landCard(opened({ instanceId: "c1", cardId: "who", key: "who" }));
    render(<CardFeed onSendCommand={noop} />);
    expect(screen.getByTestId("card-refresh").getAttribute("aria-label")).toBe(
      "who",
    );
    expect(screen.getByLabelText("cockpit card pin who")).toBeTruthy();
    expect(screen.getByTestId("card-close").getAttribute("aria-label")).toBe(
      "cockpit card dismiss who",
    );
  });

  it("⚠ a husk keeps only close", () => {
    landCard(opened({ instanceId: "c1", cardId: "who", key: "who" }));
    useStore.getState().closeCard("c1", "dismissed");
    render(<CardFeed onSendCommand={noop} />);
    expect(screen.queryByTestId("card-refresh")).toBeNull();
    expect(screen.queryByLabelText("cockpit card pin who")).toBeNull();
    expect(screen.getByTestId("card-close")).toBeTruthy();
  });
});

/**
 * ⭐⭐ **The card is named by what it is SHOWING, not by what it was
 * called when it opened.**
 *
 * Found by driving the one live card: walk out of the lounge and the
 * `place` card kept the lounge's name over the new room's body, because
 * `title` is stamped once on `card-opened` and a delta rewrites the
 * records without ever touching it. Two independent sources for one
 * name is one too many, and the stale one was winning.
 */
describe("a LIVE card's name follows its body", () => {
  it("⭐ renders the new subject's name after a delta replaces the body", () => {
    landCard(
      opened({
        instanceId: "c1",
        cardId: "place",
        key: "look",
        live: true,
        title: "the lounge",
        result: [{ stuffId: "s1", displayName: "the lounge" }] as never,
      }),
    );
    // Exactly what `remove` + `replace` leaves behind on the client.
    useStore
      .getState()
      .setCardRecords("c1", [
        { stuffId: "s2", displayName: "Dave's Bar" },
      ] as never);

    render(<CardFeed onSendCommand={noop} />);
    const card = screen.getByTestId("card-place");
    expect(card.textContent).toContain("Dave's Bar");
    expect(card.textContent).not.toContain("the lounge");
  });

  it("⚠ and its husk keeps the CURRENT name, not the birth one", () => {
    landCard(
      opened({
        instanceId: "c1",
        cardId: "place",
        key: "look",
        live: true,
        title: "the lounge",
        result: [{ stuffId: "s1", displayName: "the lounge" }] as never,
      }),
    );
    useStore
      .getState()
      .setCardRecords("c1", [
        { stuffId: "s2", displayName: "Dave's Bar" },
      ] as never);
    useStore.getState().closeCard("c1", "aged-out");

    render(<CardFeed onSendCommand={noop} />);
    expect(screen.getByTestId("card-place").textContent).toContain(
      "Dave's Bar",
    );
  });
});

/**
 * ⚠⚠ **One card's body must never blank the whole app.**
 *
 * The feed renders bodies this build does not own — Monaco, the git
 * panel, the Studio catalogue — and React's default for a throwing
 * component is to unmount the ENTIRE tree. Found by driving: opening a
 * file in the CMS card threw inside Monaco's `defineTheme` and took the
 * whole client to a white screen, server fine and socket still open.
 * There was no error boundary anywhere in the client at all.
 */
describe("a failing card body", () => {
  function Boom(): React.ReactElement {
    throw new Error("body exploded");
  }

  it("⭐ is contained: the card says so and the rest of the feed lives", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    landCard(opened({ instanceId: "c1", cardId: "who", key: "who" }));
    render(
      <>
        <Card card={useStore.getState().cards["c1"]!} onSendCommand={noop}>
          <Boom />
        </Card>
        <div data-testid="the-rest-of-the-page">still here</div>
      </>,
    );
    expect(screen.getByTestId("card-body-failed")).toBeTruthy();
    expect(screen.getByTestId("the-rest-of-the-page")).toBeTruthy();
    spy.mockRestore();
  });

  it("⭐ keeps the head, so a dead card can still be READ and CLOSED", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    landCard(
      opened({ instanceId: "c1", cardId: "who", key: "who", title: "who's online" }),
    );
    render(
      <Card card={useStore.getState().cards["c1"]!} onSendCommand={noop}>
        <Boom />
      </Card>,
    );
    expect(screen.getByText("who's online")).toBeTruthy();
    expect(screen.getByTestId("card-close")).toBeTruthy();
    spy.mockRestore();
  });
});
