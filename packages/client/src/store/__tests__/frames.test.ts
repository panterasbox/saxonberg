import { beforeEach, describe, expect, it } from "vitest";
import { useStore, type Frame } from "../index";

function resetFrames(): void {
  useStore.setState({ frames: [] });
}

function makeFrame(overrides: Partial<Frame> = {}): Frame {
  return {
    id: "f1",
    topic: "world.speech.say",
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
      topic: "system.shell.fs",
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
});
