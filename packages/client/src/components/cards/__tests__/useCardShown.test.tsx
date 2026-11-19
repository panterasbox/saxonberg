/**
 * ⭐⭐ A card you cannot see pauses (crowded-rooms D4/D5) — the CLIENT half.
 *
 * The client is the one source for *on screen*: a live card is shown while
 * its body is mounted, intersects the viewport and the document is visible.
 * Unseen for half a second, it tells the server to pause; seen again, it
 * resumes at once. A `subscription-result` for a card's id is the
 * resume's snapshot and replaces the card's records.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Envelope, SubscriptionResultEnvelope, CardOpenedEnvelope } from "@saxonberg/types";
import { useCardShown, useCardFeed } from "../useCardFeed";
import { websocketClient } from "../../../services/websocket";
import { useStore } from "../../../store/index";

/** jsdom has no IntersectionObserver: a stub the test drives. */
let observed: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null;
class StubObserver {
  constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
    observed = cb;
  }
  observe(): void {}
  disconnect(): void {}
}

function bodyRef(): { current: HTMLDivElement } {
  return { current: document.createElement("div") };
}

describe("⭐⭐ the client says what is on screen (crowded-rooms D4)", () => {
  let pause: ReturnType<typeof vi.spyOn>;
  let resume: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", StubObserver);
    pause = vi.spyOn(websocketClient, "pauseSubscription").mockImplementation(() => undefined);
    resume = vi.spyOn(websocketClient, "resumeSubscription").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    observed = null;
  });

  it("a card scrolled out pauses after half a second, and resumes the moment it is back", () => {
    renderHook(() => useCardShown("c-scroll", true, bodyRef()));
    observed!([{ isIntersecting: false }]);
    vi.advanceTimersByTime(499);
    expect(pause).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(pause).toHaveBeenCalledWith("c-scroll");
    observed!([{ isIntersecting: true }]);
    expect(resume).toHaveBeenCalledWith("c-scroll");
  });

  it("a glance away shorter than the debounce sends nothing", () => {
    renderHook(() => useCardShown("c-glance", true, bodyRef()));
    observed!([{ isIntersecting: false }]);
    vi.advanceTimersByTime(300);
    observed!([{ isIntersecting: true }]);
    vi.advanceTimersByTime(1000);
    expect(pause).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });

  it("a card minimized or displaced (its body unmounted) pauses; mounted again, it resumes", () => {
    const ref = bodyRef();
    const first = renderHook(() => useCardShown("c-tray", true, ref));
    first.unmount();
    vi.advanceTimersByTime(600);
    expect(pause).toHaveBeenCalledWith("c-tray");
    renderHook(() => useCardShown("c-tray", true, ref));
    expect(resume).toHaveBeenCalledWith("c-tray");
  });

  it("a hidden tab pauses every live card", () => {
    renderHook(() => useCardShown("c-tab", true, bodyRef()));
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(600);
    expect(pause).toHaveBeenCalledWith("c-tab");
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  });

  it("a card that is not live tells the server nothing", () => {
    const r = renderHook(() => useCardShown("c-static", false, bodyRef()));
    r.unmount();
    vi.advanceTimersByTime(600);
    expect(pause).not.toHaveBeenCalled();
  });

  it("a result for a card's id is the resume's snapshot: the card's records are replaced", () => {
    useStore.setState({ cards: {} });
    const handlers: Record<string, (e: Envelope) => void> = {};
    vi.spyOn(websocketClient, "onEnvelope").mockImplementation((type, fn) => {
      handlers[type] = fn as (e: Envelope) => void;
    });
    renderHook(() => useCardFeed());
    const open = {
      type: "card-opened", frameId: 1, instanceId: "room", cardId: "place", key: "place",
      live: true, pinned: false, result: [{ stuffId: "r", displayName: "the square" }],
    } as unknown as CardOpenedEnvelope;
    handlers["card-opened"]!(open as unknown as Envelope);
    const result: SubscriptionResultEnvelope = {
      type: "subscription-result",
      frameId: 2,
      subscriptionId: "room",
      rev: 0,
      snapshot: [{ stuffId: "r", displayName: "the crowded square" }],
    } as SubscriptionResultEnvelope;
    handlers["subscription-result"]!(result as unknown as Envelope);
    expect(useStore.getState().cards["room"]!.records[0]!.displayName).toBe("the crowded square");
  });
});
