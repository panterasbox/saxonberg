import { beforeEach, describe, expect, it } from "vitest";
import type { ReleaseRow } from "@saxonberg/types";
import { useStore } from "../index";

function resetFeed(): void {
  useStore.setState({ feed: {}, feedOrder: [] });
}

function release(overrides: Partial<ReleaseRow> = {}): ReleaseRow {
  return {
    releaseId: "b1",
    publisher: "/compact/press",
    realm: "ooc",
    kind: "notice",
    headline: "Headline",
    body: "Body",
    publishedAt: 1000,
    pinned: false,
    ...overrides,
  };
}

describe("release slice", () => {
  beforeEach(() => {
    resetFeed();
  });

  it("applyReleaseSnapshot replaces the whole feed, keyed by releaseId", () => {
    useStore.getState().applyReleaseSnapshot([
      release({ releaseId: "b1", publishedAt: 1000 }),
      release({ releaseId: "b2", publishedAt: 2000 }),
    ]);
    expect(Object.keys(useStore.getState().feed).sort()).toEqual(["b1", "b2"]);

    // A second snapshot REPLACES — the old rows are gone.
    useStore
      .getState()
      .applyReleaseSnapshot([release({ releaseId: "b3", publishedAt: 500 })]);
    expect(Object.keys(useStore.getState().feed)).toEqual(["b3"]);
    expect(useStore.getState().feedOrder).toEqual(["b3"]);
  });

  it("applyReleaseUpsert upserts by releaseId (no duplicate rows)", () => {
    useStore
      .getState()
      .applyReleaseSnapshot([release({ releaseId: "b1", publishedAt: 1000 })]);
    useStore
      .getState()
      .applyReleaseUpsert(release({ releaseId: "b2", publishedAt: 2000 }));
    // Newest first (b2 @2000 before b1 @1000).
    expect(useStore.getState().feedOrder).toEqual(["b2", "b1"]);

    // Re-upserting the same id updates in place, never appends.
    useStore.getState().applyReleaseUpsert(
      release({ releaseId: "b2", publishedAt: 2000, headline: "Edited" }),
    );
    expect(useStore.getState().feedOrder).toEqual(["b2", "b1"]);
    expect(useStore.getState().feed["b2"]?.headline).toBe("Edited");
  });

  it("applyReleaseRemove deletes by releaseId", () => {
    useStore.getState().applyReleaseSnapshot([
      release({ releaseId: "b1", publishedAt: 1000 }),
      release({ releaseId: "b2", publishedAt: 2000 }),
    ]);
    useStore.getState().applyReleaseRemove("b1");
    expect(Object.keys(useStore.getState().feed)).toEqual(["b2"]);
    expect(useStore.getState().feedOrder).toEqual(["b2"]);

    // Removing an unknown id is a no-op.
    useStore.getState().applyReleaseRemove("nope");
    expect(useStore.getState().feedOrder).toEqual(["b2"]);
  });

  it("appendReleases folds older rows into the existing order", () => {
    useStore
      .getState()
      .applyReleaseSnapshot([release({ releaseId: "b2", publishedAt: 2000 })]);
    useStore.getState().appendReleases([
      release({ releaseId: "b1", publishedAt: 1000 }),
      release({ releaseId: "b0", publishedAt: 500 }),
    ]);
    // Newest first across the merged set.
    expect(useStore.getState().feedOrder).toEqual(["b2", "b1", "b0"]);

    // Empty append is a no-op.
    useStore.getState().appendReleases([]);
    expect(useStore.getState().feedOrder).toEqual(["b2", "b1", "b0"]);
  });

  it("orders pinned releases first, then by publishedAt desc", () => {
    useStore.getState().applyReleaseSnapshot([
      release({ releaseId: "old", publishedAt: 100, pinned: false }),
      release({ releaseId: "newest", publishedAt: 3000, pinned: false }),
      release({ releaseId: "pinOld", publishedAt: 200, pinned: true }),
      release({ releaseId: "pinNew", publishedAt: 2000, pinned: true }),
    ]);
    // pinned (by publishedAt desc) first, then unpinned (by publishedAt desc)
    expect(useStore.getState().feedOrder).toEqual([
      "pinNew",
      "pinOld",
      "newest",
      "old",
    ]);
  });
});
