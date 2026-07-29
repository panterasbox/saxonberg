/**
 * StreamEmbed — renders the single `watch`-selected target as one sandboxed
 * iframe (no picker), or a placeholder when nothing is watched.
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StreamEmbed } from "../StreamEmbed";

afterEach(cleanup);

describe("StreamEmbed", () => {
  it("renders a placeholder and no iframe when nothing is watched", () => {
    const { container } = render(<StreamEmbed target={null} />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByText(/watch command/i)).toBeTruthy();
  });

  it("renders a single Twitch iframe with a host-derived parent (no picker)", () => {
    const { container } = render(
      <StreamEmbed target={{ platform: "twitch", channel: "shroud" }} />,
    );
    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    const src = frames[0]!.getAttribute("src") ?? "";
    expect(src).toContain("player.twitch.tv");
    expect(src).toContain("channel=shroud");
    expect(src).toContain(`parent=${window.location.hostname}`);
  });

  it("renders a YouTube videoId embed", () => {
    const { container } = render(
      <StreamEmbed target={{ platform: "youtube", videoId: "dQw4w9WgXcQ" }} />,
    );
    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(frames[0]!.getAttribute("src")).toContain(
      "youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("renders a Kick player embed (muted autoplay)", () => {
    const { container } = render(
      <StreamEmbed target={{ platform: "kick", channel: "xqc" }} />,
    );
    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    const src = frames[0]!.getAttribute("src") ?? "";
    expect(src).toContain("player.kick.com/xqc");
    expect(src).toContain("autoplay=true");
    expect(src).toContain("muted=true");
    expect(frames[0]!.getAttribute("sandbox")).toBeTruthy();
  });

  it("renders a YouTube channelId live_stream embed", () => {
    const uc = "UC" + "x".repeat(22);
    const { container } = render(
      <StreamEmbed target={{ platform: "youtube", channelId: uc }} />,
    );
    expect(container.querySelector("iframe")!.getAttribute("src")).toContain(
      `live_stream?channel=${uc}`,
    );
  });
});
