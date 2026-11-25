/**
 * The front page's real bands (stream arrival W5, D7, D14): each origin ×
 * live / off air / no show; the button order; the came-from line; the guest
 * as a small link outside the show tile; no band without a source.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StartScreen } from "../../StartScreen";
import { useStore } from "../../../store";
import type { FrontResponse } from "@saxonberg/types";

const LIVE: FrontResponse = {
  show: {
    name: "cafe-hour",
    title: "The Cafe Hour",
    ownerName: "Ada",
    live: true,
    feeds: { twitch: "adaplays", kick: "adakick" },
    nextShow: "Saturdays 10am ET",
  },
};

function load(search: string, front: FrontResponse): void {
  window.sessionStorage.clear();
  window.history.replaceState({}, "", `/${search}`);
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => front,
  } as unknown as Response);
  useStore.setState({
    serverFacts: {},
    configuredProviders: ["google", "twitch", "kick"],
    front,
    playerClosed: false,
  });
}

const order = (): string[] =>
  screen.getAllByTestId(/^provider-/).map((el) => el.getAttribute("data-testid")!.slice("provider-".length));

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the front page", () => {
  it("from Twitch, on air: the slot plays, Twitch first, *You came from Twitch.*", () => {
    load("?from=twitch", LIVE);
    render(<StartScreen />);
    expect(screen.getByTestId("player-dock").getAttribute("data-show-playing")).toBe("true");
    expect(screen.getByTestId("player-slot")).toBeTruthy();
    expect(screen.getByTestId("came-from").textContent).toBe("You came from Twitch.");
    expect(order()[0]).toBe("twitch");
  });

  it("from YouTube, where the program has no YouTube feed: the tile, not a slot; Google first", () => {
    load("?from=youtube", LIVE);
    render(<StartScreen />);
    expect(screen.getByTestId("show-tile").getAttribute("data-show-playing")).toBeNull();
    expect(screen.getByTestId("came-from").textContent).toMatch(/Google account you watch on/);
    expect(order()[0]).toBe("google");
  });

  it("Rodney's link: Twitch, and *You came from the stream.*", () => {
    load("?from=stream", LIVE);
    render(<StartScreen />);
    expect(screen.getByTestId("came-from").textContent).toBe("You came from the stream.");
    expect(order()[0]).toBe("twitch");
  });

  it("untagged: no video, no came-from line, Google · Twitch · Kick", () => {
    load("", LIVE);
    render(<StartScreen />);
    expect(screen.queryByTestId("player-slot")).toBeNull();
    expect(screen.queryByTestId("came-from")).toBeNull();
    expect(order()).toEqual(["google", "twitch", "kick"]);
  });

  it("off air: the offline tile with the next show; Coming up says it too", () => {
    load("?from=twitch", { show: { ...LIVE.show!, live: false } });
    render(<StartScreen />);
    expect(screen.getByTestId("show-offline").textContent).toMatch(/Saturdays 10am ET/);
    expect(screen.queryByTestId("player-slot")).toBeNull();
    expect(screen.getByTestId("coming-up").textContent).toMatch(/Saturdays 10am ET/);
  });

  it("nothing featured: no show band, no Coming up, no footer links — and no fallback string", () => {
    load("?from=twitch", {});
    render(<StartScreen />);
    expect(screen.queryByTestId("show-tile")).toBeNull();
    expect(screen.queryByTestId("show-offline")).toBeNull();
    expect(screen.queryByTestId("coming-up")).toBeNull();
    // The footer stays (the host, the source); it links no show.
    expect(screen.getByTestId("front-footer").textContent).not.toMatch(/the show on/);
  });

  it("the footer links only the carriers the program is on", () => {
    load("", LIVE);
    render(<StartScreen />);
    const links = [...screen.getByTestId("front-footer").querySelectorAll("a")]
      .map((a) => a.textContent)
      .filter((t) => t?.startsWith("the show on"));
    expect(links).toEqual(["the show on Twitch", "the show on Kick"]);
  });

  it("the guest is a plain row outside the show", () => {
    load("?from=twitch", LIVE);
    render(<StartScreen />);
    const guest = screen.getByTestId("guest-button");
    expect(screen.getByTestId("show-band").contains(guest)).toBe(false);
    expect(screen.getByTestId("guest-warning").textContent).toMatch(/keeps nothing/);
  });
});
