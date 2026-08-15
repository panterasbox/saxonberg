/**
 * The chat surface scopes the COMMAND LINE; it is not a second input.
 *
 * Three shapes were tried and the differences are the lesson:
 *
 *  1. `ForumChatSidecar` — a rail whose input needed a "Talk here" click
 *     to set the prefix. One click too many: being on a subject's chat
 *     already says where your typing goes.
 *  2. Its own composer — removed the click, and put TWO command bars on
 *     one screen with the channel retyped into every message.
 *  3. ⭐ This: entering the surface sets the forum command line's
 *     server-authoritative prefix, leaving clears it. One bar, no
 *     retyping, and the prefix is visible.
 *
 * ⚠⚠ And the verb is `chat`, not `chan` — an earlier cut composed the
 * mock's `chan` and the server answered "I don't understand 'chan'."
 * The command form must be read off the verb spec, never a mock.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useStore, type Frame } from "../../../store";
import {
  ChatSurface,
  chatPrefix,
  chatLines,
  FORUM_BAR_ID,
} from "../ChatSurface";

function frame(over: Partial<Frame>): Frame {
  return {
    id: Math.random().toString(36),
    topic: "speech.channel",
    body: "hello",
    timestamp: Date.now(),
    ...over,
  } as Frame;
}

function setMode(prefix: string) {
  useStore.setState({
    clientState: { "cockpit.inputModes": { [FORUM_BAR_ID]: prefix } },
  });
}

beforeEach(() => {
  useStore.setState({ frames: [], clientState: {} });
});

const noop = () => undefined;

describe("chatPrefix", () => {
  it("⚠ uses `chat`, the verb the spec declares — never `chan`", () => {
    expect(chatPrefix("Gossip")).toBe("chat Gossip");
    expect(chatPrefix("Gossip").startsWith("chan ")).toBe(false);
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
    expect(chatLines([frame({ channelName: "gossip" })], "Gossip")).toHaveLength(1);
  });
});

describe("⭐ scoping the command line", () => {
  it("sets the prefix on the FORUM bar when it opens", () => {
    const onSend = vi.fn();
    render(
      <ChatSurface handle="Gossip" onSendCommand={onSend} onCommandPreview={noop} />,
    );
    expect(onSend).toHaveBeenCalledWith(
      'cockpit cli --prefix "chat Gossip"',
      FORUM_BAR_ID,
    );
  });

  it("⚠ does NOT re-send when the prefix is already what it wants", () => {
    // The send updates `cockpit.inputModes`, which re-renders this
    // component — an unguarded effect would send forever.
    setMode("chat Gossip");
    const onSend = vi.fn();
    render(
      <ChatSurface handle="Gossip" onSendCommand={onSend} onCommandPreview={noop} />,
    );
    expect(onSend).not.toHaveBeenCalled();
  });

  it("clears the prefix on the way out", () => {
    setMode("chat Gossip");
    const onSend = vi.fn();
    const { unmount } = render(
      <ChatSurface handle="Gossip" onSendCommand={onSend} onCommandPreview={noop} />,
    );
    unmount();
    // A prefix that outlived the screen that set it would silently
    // rewrite the next thing typed.
    expect(onSend).toHaveBeenCalledWith("cockpit cli --clear", FORUM_BAR_ID);
  });

  it("⭐ offers NO input of its own — one command bar per screen", () => {
    render(
      <ChatSurface handle="Gossip" onSendCommand={noop} onCommandPreview={noop} />,
    );
    expect(document.querySelector("input")).toBeNull();
    expect(document.querySelector("form")).toBeNull();
    expect(screen.queryByText(/talk here/i)).toBeNull();
  });

  it("⚠ says what the command line is carrying", () => {
    render(
      <ChatSurface handle="Gossip" onSendCommand={noop} onCommandPreview={noop} />,
    );
    // A prefixed command line that does not announce its prefix
    // silently rewrites what you type.
    expect(screen.getByTestId("chat-scope").textContent).toContain(
      "chat Gossip",
    );
  });

  it("⚠ states the held-vs-server boundary rather than implying completeness", () => {
    useStore.setState({ frames: [frame({ channelName: "Gossip" })] });
    render(
      <ChatSurface handle="Gossip" onSendCommand={noop} onCommandPreview={noop} />,
    );
    expect(screen.getByText(/lives on the server, not here/)).toBeTruthy();
  });
});
