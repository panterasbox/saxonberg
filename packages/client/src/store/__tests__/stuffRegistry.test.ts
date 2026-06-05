import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../index";

/**
 * Reset the registry to a fresh Map between test cases so each test
 * starts from a known-empty state. The store is a module-level
 * singleton; without this, ordering matters.
 */
function resetRegistry(): void {
  useStore.setState({ stuffRegistry: new Map() });
}

describe("stuff registry slice", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("upserts a single record into an empty registry", () => {
    useStore
      .getState()
      .upsertStuffMetadata([{ stuffId: "a", displayName: "Alice" }]);

    const reg = useStore.getState().stuffRegistry;
    expect(reg.get("a")).toEqual({ stuffId: "a", displayName: "Alice" });
  });

  it("merges a partial upsert: fields-present overwrite, fields-absent leave intact", () => {
    useStore
      .getState()
      .upsertStuffMetadata([
        { stuffId: "a", displayName: "Alice", primaryKeyword: "alice" },
      ]);
    // A subsequent ref-only delta arrives with only a stuffId +
    // displayName — primaryKeyword must NOT be cleared.
    useStore
      .getState()
      .upsertStuffMetadata([{ stuffId: "a", displayName: "Alice the Bold" }]);

    const reg = useStore.getState().stuffRegistry;
    expect(reg.get("a")).toEqual({
      stuffId: "a",
      displayName: "Alice the Bold",
      primaryKeyword: "alice",
    });
  });

  it("adds new fields incrementally without disturbing existing keys", () => {
    useStore
      .getState()
      .upsertStuffMetadata([{ stuffId: "a", displayName: "Alice" }]);
    useStore
      .getState()
      .upsertStuffMetadata([{ stuffId: "a", primaryKeyword: "alice" }]);

    const reg = useStore.getState().stuffRegistry;
    expect(reg.get("a")).toEqual({
      stuffId: "a",
      displayName: "Alice",
      primaryKeyword: "alice",
    });
  });

  it("upserts multiple records in one batch", () => {
    useStore.getState().upsertStuffMetadata([
      { stuffId: "a", displayName: "Alice" },
      { stuffId: "b", displayName: "Bob" },
      { stuffId: "c", displayName: "Carol" },
    ]);

    const reg = useStore.getState().stuffRegistry;
    expect(reg.size).toBe(3);
    expect(reg.get("a")?.displayName).toBe("Alice");
    expect(reg.get("b")?.displayName).toBe("Bob");
    expect(reg.get("c")?.displayName).toBe("Carol");
  });

  it("no-ops on an empty batch", () => {
    useStore
      .getState()
      .upsertStuffMetadata([{ stuffId: "a", displayName: "Alice" }]);
    useStore.getState().upsertStuffMetadata([]);

    const reg = useStore.getState().stuffRegistry;
    expect(reg.size).toBe(1);
    expect(reg.get("a")?.displayName).toBe("Alice");
  });

  it("never evicts — 10000 records all live in the map", () => {
    const batch = [];
    for (let i = 0; i < 10000; i++) {
      batch.push({ stuffId: `s${i}`, displayName: `Stuff ${i}` });
    }
    useStore.getState().upsertStuffMetadata(batch);

    const reg = useStore.getState().stuffRegistry;
    expect(reg.size).toBe(10000);
    expect(reg.get("s0")?.displayName).toBe("Stuff 0");
    expect(reg.get("s9999")?.displayName).toBe("Stuff 9999");
  });

  it("ignores malformed entries (missing stuffId)", () => {
    useStore.getState().upsertStuffMetadata([
      { stuffId: "a", displayName: "Alice" },
      // @ts-expect-error — intentional malformed entry
      { displayName: "Anonymous" },
      { stuffId: "b", displayName: "Bob" },
    ]);

    const reg = useStore.getState().stuffRegistry;
    expect(reg.size).toBe(2);
    expect(reg.get("a")?.displayName).toBe("Alice");
    expect(reg.get("b")?.displayName).toBe("Bob");
  });
});
