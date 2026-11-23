import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../index";

describe("navSlice — the sections and your map, as the client holds them", () => {
  beforeEach(() => {
    useStore.getState().applyNavSnapshot({});
    useStore.getState().applyMapSnapshot({ documents: [] });
  });

  it("a change replaces one section by name; a remove deletes it", () => {
    useStore.getState().applyNavSnapshot({ place: { v: 1, stuffId: "r", name: "the deck" } });
    useStore.getState().applyNavChanges([
      { op: "replace", key: "ways", fields: { v: 1, ways: [] } },
      { op: "remove", key: "place" },
    ] as never);
    const s = useStore.getState().navSections;
    expect(s.ways).toEqual({ v: 1, ways: [] });
    expect(s.place).toBeUndefined();
  });

  it("the copy is keyed by locality and claim key; a snapshot overwrites it", () => {
    const claim = { key: "k", kind: "place", place: "x", channel: "walked", firstSeen: 1, lastSeen: 1 } as const;
    useStore.getState().applyMapSnapshot({ documents: [{ locality: "terminus", claims: [claim] }] });
    expect(Object.keys(useStore.getState().mapCopy)).toEqual(["terminus|k"]);
    useStore.getState().applyMapSnapshot({ documents: [] });
    expect(useStore.getState().mapCopy).toEqual({});
  });
});
