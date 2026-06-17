import { beforeEach, describe, expect, it } from "vitest";
import type { ReactionActState, ReactionSampleEntry } from "@saxonberg/types";
import { useStore } from "../index";

function resetReactions(): void {
  useStore.setState({ reactions: {}, reactionMoved: {}, reactionExpansions: {} });
}

function makeAct(overrides: Partial<ReactionActState> = {}): ReactionActState {
  return {
    commandId: "cmd-1",
    subjectId: "speaker-1",
    scope: "location:room-1",
    buckets: [{ tag: "approval", emote: "cheer", count: 3 }],
    sample: [],
    total: 3,
    aggregated: false,
    ...overrides,
  };
}

describe("reactions slice", () => {
  beforeEach(() => {
    resetReactions();
  });

  it("applyReactionDelta replaces counts (never sums) and marks moved", () => {
    useStore.getState().applyReactionDelta([makeAct()], 1000);
    expect(useStore.getState().reactions["cmd-1"]?.total).toBe(3);
    expect(useStore.getState().reactionMoved["cmd-1"]).toBe(1000);

    // A later delta with absolute total 5 REPLACES — it does not add to 3.
    useStore.getState().applyReactionDelta(
      [makeAct({ total: 5, buckets: [{ tag: "approval", emote: "cheer", count: 5 }] })],
      2000,
    );
    expect(useStore.getState().reactions["cmd-1"]?.total).toBe(5);
    expect(useStore.getState().reactions["cmd-1"]?.buckets[0]?.count).toBe(5);
    expect(useStore.getState().reactionMoved["cmd-1"]).toBe(2000);
  });

  it("applyReactionDelta keys multiple acts independently", () => {
    useStore
      .getState()
      .applyReactionDelta([makeAct(), makeAct({ commandId: "cmd-2", total: 1 })]);
    expect(Object.keys(useStore.getState().reactions).sort()).toEqual([
      "cmd-1",
      "cmd-2",
    ]);
  });

  it("applyReactionExpandResult stores the full reactor set", () => {
    const reactors: ReactionSampleEntry[] = [
      { reactorId: "r1", reactorName: "Aldous", emote: "nod" },
      { reactorId: "r2", reactorName: "Bryn", emote: "cheer" },
    ];
    useStore.getState().applyReactionExpandResult("cmd-1", reactors);
    expect(useStore.getState().reactionExpansions["cmd-1"]).toHaveLength(2);
    expect(useStore.getState().reactionExpansions["cmd-1"]?.[0]?.reactorName).toBe(
      "Aldous",
    );
  });
});
