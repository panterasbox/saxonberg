/**
 * StreamEmbed + StreamPlayer (stream arrival D3): the stage registers a SLOT
 * and holds no iframe of its own; the ONE player above every screen follows
 * it. `src` is one function of (target, muted) per carrier; the SAME iframe
 * node survives slot → dock → slot and an equal re-render; in-world with no
 * slot and not in watch → nothing; in watch with no slot yet → docked; a new
 * in-world target unmutes; the shared display's caption still shows.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { StreamEmbed } from "../StreamEmbed";
import { StreamPlayer, srcFor } from "../StreamPlayer";
import { useStore } from "../../../store";

afterEach(cleanup);

const HOST = window.location.hostname;

describe("srcFor — one function of (target, muted)", () => {
  it("Twitch: the channel, a host-derived parent, autoplay and the mute flag", () => {
    const src = srcFor({ platform: "twitch", channel: "shroud" }, true);
    expect(src).toContain("player.twitch.tv/?channel=shroud");
    expect(src).toContain(`parent=${HOST}`);
    expect(src).toContain("muted=true");
    expect(srcFor({ platform: "twitch", channel: "shroud" }, false)).toContain("muted=false");
  });

  it("YouTube: a video id, or the channel's live stream; mute=1|0", () => {
    expect(srcFor({ platform: "youtube", videoId: "dQw4w9WgXcQ" }, true)).toContain(
      "youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1",
    );
    const uc = "UC" + "x".repeat(22);
    expect(srcFor({ platform: "youtube", channelId: uc }, false)).toContain(`live_stream?channel=${uc}&autoplay=1&mute=0`);
  });

  it("Kick: the slug, autoplay, muted", () => {
    const src = srcFor({ platform: "kick", channel: "xqc" }, true);
    expect(src).toContain("player.kick.com/xqc");
    expect(src).toContain("autoplay=true");
    expect(src).toContain("muted=true");
  });
});

describe("StreamEmbed — the stage is a slot", () => {
  it("a placeholder and no slot when nothing is watched", () => {
    const { container } = render(<StreamEmbed target={null} />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByTestId("player-slot")).toBeNull();
    expect(screen.getByText(/watch command/i)).toBeTruthy();
  });

  it("a slot and no iframe of its own when something is", () => {
    const { container } = render(<StreamEmbed target={{ platform: "twitch", channel: "shroud" }} />);
    expect(screen.getByTestId("player-slot")).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("the shared display's caption still shows", () => {
    render(
      <StreamEmbed
        target={{ platform: "twitch", channel: "shroud", display: { stuffId: "tv-1", label: "the booth TV" } }}
      />,
    );
    expect(screen.getByTestId("display-caption").textContent).toContain("on the booth TV");
  });
});

describe("StreamPlayer — the one iframe", () => {
  beforeEach(() => {
    useStore.setState({
      connectionPhase: "in-world",
      clientState: { "cockpit.mode": "watch", "cockpit.watch": { platform: "twitch", channel: "shroud" } },
      playerSlot: null,
      playerMuted: true,
      playerClosed: false,
      front: null,
    });
  });

  it("in watch with a target and no slot yet: mounted, docked", () => {
    render(<StreamPlayer />);
    expect(screen.getByTestId("stream-player").getAttribute("data-player-place")).toBe("dock");
  });

  it("in-world, not in watch, no slot: nothing", () => {
    useStore.setState({ clientState: { "cockpit.mode": "explore", "cockpit.watch": { platform: "twitch", channel: "shroud" } } });
    render(<StreamPlayer />);
    expect(screen.queryByTestId("stream-player")).toBeNull();
  });

  it("the SAME iframe node across slot → dock → slot and an equal re-render", () => {
    const { container, rerender } = render(<StreamPlayer />);
    const first = container.querySelector("iframe");
    act(() => useStore.getState().setPlayerSlot({ left: 10, top: 10, width: 320, height: 180 }));
    expect(screen.getByTestId("stream-player").getAttribute("data-player-place")).toBe("slot");
    act(() => useStore.getState().setPlayerSlot(null));
    act(() => useStore.getState().setPlayerSlot({ left: 0, top: 0, width: 640, height: 360 }));
    rerender(<StreamPlayer />);
    expect(container.querySelector("iframe")).toBe(first);
  });

  it("a new in-world target unmutes; our control reloads once", () => {
    const { container } = render(<StreamPlayer />);
    expect(container.querySelector("iframe")!.getAttribute("src")).toContain("muted=true");
    act(() =>
      useStore.setState({ clientState: { "cockpit.mode": "watch", "cockpit.watch": { platform: "kick", channel: "xqc" } } }),
    );
    expect(container.querySelector("iframe")!.getAttribute("src")).toContain("player.kick.com/xqc");
    expect(container.querySelector("iframe")!.getAttribute("src")).toContain("muted=false");
  });
});
