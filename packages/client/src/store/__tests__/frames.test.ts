import { beforeEach, describe, expect, it } from "vitest";
import { useStore, type Frame } from "../index";

function resetFrames(): void {
  useStore.setState({ frames: [] });
}

function makeFrame(overrides: Partial<Frame> = {}): Frame {
  return {
    id: "f1",
    topic: "speech.vocal",
    body: "hi",
    timestamp: 100,
    ...overrides,
  };
}

describe("frames slice", () => {
  beforeEach(() => {
    resetFrames();
  });

  it("appendFrame pushes a new frame", () => {
    useStore.getState().appendFrame(makeFrame());
    expect(useStore.getState().frames).toHaveLength(1);
    expect(useStore.getState().frames[0]?.body).toBe("hi");
  });

  it("appendFrame preserves arrival order", () => {
    useStore.getState().appendFrame(makeFrame({ id: "a" }));
    useStore.getState().appendFrame(makeFrame({ id: "b" }));
    useStore.getState().appendFrame(makeFrame({ id: "c" }));
    expect(
      useStore.getState().frames.map((f) => f.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("appendFrame preserves the sigil when present", () => {
    useStore.getState().appendFrame(makeFrame({ sigil: "Foo>" }));
    expect(useStore.getState().frames[0]?.sigil).toBe("Foo>");
  });

  it("appendFrame preserves frame shape (id, topic, body, sigil, timestamp)", () => {
    const frame = makeFrame({
      id: "f-shape",
      topic: "shell.result",
      body: "ls output",
      sigil: "> ",
      timestamp: 12345,
    });
    useStore.getState().appendFrame(frame);
    expect(useStore.getState().frames[0]).toEqual(frame);
  });

  it("clearFrames empties the buffer", () => {
    useStore.getState().appendFrame(makeFrame({ id: "a" }));
    useStore.getState().appendFrame(makeFrame({ id: "b" }));
    expect(useStore.getState().frames).toHaveLength(2);
    useStore.getState().clearFrames();
    expect(useStore.getState().frames).toHaveLength(0);
  });

  describe("unread + mute-count side effects", () => {
    beforeEach(() => {
      useStore.setState({
        clientState: {
          "console.tabs": [
            { name: "All", muted: [] },
            { name: "Quiet", muted: ["speech.vocal"] },
          ],
          "console.activeTab": "All",
        },
        unreadCounts: {},
        mutedSinceSessionStart: {},
      });
    });

    it("increments unread count for inactive tabs whose filter allows the frame", () => {
      useStore.getState().appendFrame(makeFrame({ topic: "speech.comms" }));
      // 'All' is active — only 'Quiet' is inactive, and its mute list
      // does NOT include this topic.
      expect(useStore.getState().unreadCounts).toEqual({ Quiet: 1 });
    });

    it("does NOT bump unread for inactive tabs whose filter mutes the frame", () => {
      useStore.getState().appendFrame(makeFrame({ topic: "speech.vocal" }));
      // 'Quiet' mutes this topic, so its unread stays at 0.
      expect(useStore.getState().unreadCounts).toEqual({});
    });

    it("does NOT bump unread for the active tab", () => {
      // Switch active to Quiet.
      useStore.setState({
        clientState: {
          "console.tabs": [
            { name: "All", muted: [] },
            { name: "Quiet", muted: ["speech.vocal"] },
          ],
          "console.activeTab": "Quiet",
        },
      });
      useStore.getState().appendFrame(makeFrame({ topic: "speech.comms" }));
      // 'All' is inactive and unmuted → bump it; 'Quiet' is active → skip.
      expect(useStore.getState().unreadCounts).toEqual({ All: 1 });
    });

    it("clearUnreadFor drops the counter for one tab", () => {
      useStore.getState().incrementUnread("Quiet");
      useStore.getState().incrementUnread("Quiet");
      expect(useStore.getState().unreadCounts.Quiet).toBe(2);
      useStore.getState().clearUnreadFor("Quiet");
      expect(useStore.getState().unreadCounts.Quiet).toBeUndefined();
    });

    it("tracks mutedSinceSessionStart for frames the ACTIVE tab suppresses", () => {
      // Switch active to Quiet so it suppresses speech.vocal.
      useStore.setState({
        clientState: {
          "console.tabs": [
            { name: "All", muted: [] },
            { name: "Quiet", muted: ["speech.vocal"] },
          ],
          "console.activeTab": "Quiet",
        },
      });
      useStore.getState().appendFrame(makeFrame({ topic: "speech.vocal" }));
      useStore.getState().appendFrame(makeFrame({ topic: "speech.vocal" }));
      expect(useStore.getState().mutedSinceSessionStart).toEqual({
        "speech.vocal": 2,
      });
    });

    it("setScrollPosition stores per-tab scroll offset", () => {
      useStore.getState().setScrollPosition("All", 240);
      useStore.getState().setScrollPosition("Quiet", 0);
      expect(useStore.getState().scrollPositions).toEqual({
        All: 240,
        Quiet: 0,
      });
    });
  });
});
