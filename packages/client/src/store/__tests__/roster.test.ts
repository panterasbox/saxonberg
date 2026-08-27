import { beforeEach, describe, expect, it } from "vitest";
import type { RosterRow } from "@saxonberg/types";
import { useStore } from "../index";

function resetRoster(): void {
  useStore.setState({ roster: {}, rosterOrder: [] });
}

function row(overrides: Partial<RosterRow> = {}): RosterRow {
  return {
    handle: "/platform/agent/Avatar/p1",
    header: "Alice",
    recognized: true,
    ...overrides,
  };
}

describe("roster slice", () => {
  beforeEach(() => {
    resetRoster();
  });

  it("applyRosterSnapshot replaces the whole roster, keyed by handle", () => {
    useStore.getState().applyRosterSnapshot([
      row({ handle: "h1", header: "Alice" }),
      row({ handle: "h2", header: "Bob" }),
    ]);
    expect(Object.keys(useStore.getState().roster).sort()).toEqual([
      "h1",
      "h2",
    ]);

    // A second snapshot REPLACES — the old rows are gone.
    useStore
      .getState()
      .applyRosterSnapshot([row({ handle: "h3", header: "Cara" })]);
    expect(Object.keys(useStore.getState().roster)).toEqual(["h3"]);
    expect(useStore.getState().rosterOrder).toEqual(["h3"]);
  });

  it("applyRosterAdd upserts by handle (no duplicate rows)", () => {
    useStore.getState().applyRosterSnapshot([row({ handle: "h1" })]);
    useStore
      .getState()
      .applyRosterAdd(row({ handle: "h2", header: "Bob" }));
    expect(useStore.getState().rosterOrder).toEqual(["h1", "h2"]);

    // Re-adding the same handle updates in place, never appends.
    useStore
      .getState()
      .applyRosterAdd(row({ handle: "h2", header: "Bobby", status: "idle" }));
    expect(useStore.getState().rosterOrder).toEqual(["h1", "h2"]);
    expect(useStore.getState().roster["h2"]?.header).toBe("Bobby");
    expect(useStore.getState().roster["h2"]?.status).toBe("idle");
  });

  it("applyRosterRemove deletes by handle", () => {
    useStore.getState().applyRosterSnapshot([
      row({ handle: "h1", header: "Alice" }),
      row({ handle: "h2", header: "Bob" }),
    ]);
    useStore.getState().applyRosterRemove("h1");
    expect(Object.keys(useStore.getState().roster)).toEqual(["h2"]);
    expect(useStore.getState().rosterOrder).toEqual(["h2"]);

    // Removing an unknown handle is a no-op.
    useStore.getState().applyRosterRemove("nope");
    expect(useStore.getState().rosterOrder).toEqual(["h2"]);
  });

  it("orders recognized characters first, then by header", () => {
    useStore.getState().applyRosterSnapshot([
      row({ handle: "s1", header: "Zed stranger", recognized: false }),
      row({ handle: "r2", header: "Bob", recognized: true }),
      row({ handle: "s2", header: "Ana stranger", recognized: false }),
      row({ handle: "r1", header: "Alice", recognized: true }),
    ]);
    // recognized (Alice, Bob) before strangers (Ana, Zed), each alpha by header
    expect(useStore.getState().rosterOrder).toEqual(["r1", "r2", "s2", "s1"]);
  });
});
