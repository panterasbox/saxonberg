/**
 * The chat surface is a terminal, and it names its verb.
 *
 * ⭐ It was standing in with `ForumChatSidecar` — a fixed-width RAIL
 * built to sit beside the forum, whose input needed a "Talk here" click
 * to put the GLOBAL command bar into a `chat <handle>` prefix. That is
 * one click and one concept too many: if you are looking at a subject's
 * chat, what you type goes to that chat.
 *
 * ⚠⚠ And the verb is `chat`, not `chan`. This shipped composing `chan`,
 * copied from the reference mock rather than read off
 * `cmd/social/chat.yaml`, and the server answered *"I don't understand
 * 'chan'."* — the same mistake as the reaction sigil, from the same
 * cause. Found by driving, twice.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStore, type Frame } from "../../../store";
import { ChatSurface, chatCommand, chatLines } from "../ChatSurface";

function frame(over: Partial<Frame>): Frame {
  return {
    id: Math.random().toString(36),
    topic: "speech.channel",
    body: "hello",
    timestamp: Date.now(),
    ...over,
  } as Frame;
}

beforeEach(() => {
  useStore.setState({ frames: [] });
});

const noop = () => undefined;

describe("chatCommand", () => {
  it("⚠ uses `chat`, the verb the spec declares — never `chan`", () => {
    const cmd = chatCommand("Gossip", "hello");
    expect(cmd).toBe("chat Gossip hello");
    // `chan` is what the mock draws and what the server rejects.
    expect(cmd.startsWith("chan ")).toBe(false);
  });
});

describe("chatLines", () => {
  it("takes this channel's slice of the ONE shared buffer", () => {
    const frames = [
      frame({ channelName: "Gossip", body: "a" }),
      frame({ channelName: "Trade", body: "b" }),
      frame({ body: "not a chat frame" }),
    ];
    expect(chatLines(frames, "Gossip").map((f) => f.body)).toEqual(["a"]);
  });

  it("matches the handle case-insensitively", () => {
    const frames = [frame({ channelName: "gossip", body: "a" })];
    expect(chatLines(frames, "Gossip")).toHaveLength(1);
  });
});

describe("the surface", () => {
  it("sends on submit, with no mode-setting click first", () => {
    const onSend = vi.fn();
    render(
      <ChatSurface
        handle="Gossip"
        onSendCommand={onSend}
        onCommandPreview={noop}
      />,
    );
    // ⭐ No "Talk here" — the scoping is implied by where you are.
    expect(screen.queryByText(/talk here/i)).toBeNull();

    const input = screen.getByTestId("chat-composer");
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.submit(input.closest("form")!);
    expect(onSend).toHaveBeenCalledWith("chat Gossip hello");
  });

  it("refuses to send an empty message", () => {
    const onSend = vi.fn();
    render(
      <ChatSurface
        handle="Gossip"
        onSendCommand={onSend}
        onCommandPreview={noop}
      />,
    );
    const input = screen.getByTestId("chat-composer");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form")!);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("⭐ states the verb it sends — a chat box is where `chat` is cheapest to learn", () => {
    render(
      <ChatSurface
        handle="Gossip"
        onSendCommand={noop}
        onCommandPreview={noop}
      />,
    );
    expect(screen.getByText(/sends as chat Gossip <msg>/)).toBeTruthy();
  });

  it("⚠ states the held-vs-server boundary rather than implying completeness", () => {
    useStore.setState({ frames: [frame({ channelName: "Gossip" })] });
    render(
      <ChatSurface
        handle="Gossip"
        onSendCommand={noop}
        onCommandPreview={noop}
      />,
    );
    // A log that just started where the buffer starts would read as
    // "this is everything" — the same class of lie as an unwired figure.
    expect(screen.getByText(/lives on the server, not here/)).toBeTruthy();
  });
});
