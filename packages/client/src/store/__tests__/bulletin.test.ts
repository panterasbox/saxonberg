import { beforeEach, describe, expect, it } from "vitest";
import type { BulletinRow } from "@saxonberg/types";
import { useStore } from "../index";

function resetFeed(): void {
  useStore.setState({ feed: {}, feedOrder: [] });
}

function bulletin(overrides: Partial<BulletinRow> = {}): BulletinRow {
  return {
    bulletinId: "b1",
    realm: "ooc",
    kind: "notice",
    headline: "Headline",
    body: "Body",
    publishedAt: 1000,
    pinned: false,
    ...overrides,
  };
}

describe("bulletin slice", () => {
  beforeEach(() => {
    resetFeed();
  });

  it("applyBulletinSnapshot replaces the whole feed, keyed by bulletinId", () => {
    useStore.getState().applyBulletinSnapshot([
      bulletin({ bulletinId: "b1", publishedAt: 1000 }),
      bulletin({ bulletinId: "b2", publishedAt: 2000 }),
    ]);
    expect(Object.keys(useStore.getState().feed).sort()).toEqual(["b1", "b2"]);

    // A second snapshot REPLACES — the old rows are gone.
    useStore
      .getState()
      .applyBulletinSnapshot([bulletin({ bulletinId: "b3", publishedAt: 500 })]);
    expect(Object.keys(useStore.getState().feed)).toEqual(["b3"]);
    expect(useStore.getState().feedOrder).toEqual(["b3"]);
  });

  it("applyBulletinUpsert upserts by bulletinId (no duplicate rows)", () => {
    useStore
      .getState()
      .applyBulletinSnapshot([bulletin({ bulletinId: "b1", publishedAt: 1000 })]);
    useStore
      .getState()
      .applyBulletinUpsert(bulletin({ bulletinId: "b2", publishedAt: 2000 }));
    // Newest first (b2 @2000 before b1 @1000).
    expect(useStore.getState().feedOrder).toEqual(["b2", "b1"]);

    // Re-upserting the same id updates in place, never appends.
    useStore.getState().applyBulletinUpsert(
      bulletin({ bulletinId: "b2", publishedAt: 2000, headline: "Edited" }),
    );
    expect(useStore.getState().feedOrder).toEqual(["b2", "b1"]);
    expect(useStore.getState().feed["b2"]?.headline).toBe("Edited");
  });

  it("applyBulletinRemove deletes by bulletinId", () => {
    useStore.getState().applyBulletinSnapshot([
      bulletin({ bulletinId: "b1", publishedAt: 1000 }),
      bulletin({ bulletinId: "b2", publishedAt: 2000 }),
    ]);
    useStore.getState().applyBulletinRemove("b1");
    expect(Object.keys(useStore.getState().feed)).toEqual(["b2"]);
    expect(useStore.getState().feedOrder).toEqual(["b2"]);

    // Removing an unknown id is a no-op.
    useStore.getState().applyBulletinRemove("nope");
    expect(useStore.getState().feedOrder).toEqual(["b2"]);
  });

  it("appendBulletins folds older rows into the existing order", () => {
    useStore
      .getState()
      .applyBulletinSnapshot([bulletin({ bulletinId: "b2", publishedAt: 2000 })]);
    useStore.getState().appendBulletins([
      bulletin({ bulletinId: "b1", publishedAt: 1000 }),
      bulletin({ bulletinId: "b0", publishedAt: 500 }),
    ]);
    // Newest first across the merged set.
    expect(useStore.getState().feedOrder).toEqual(["b2", "b1", "b0"]);

    // Empty append is a no-op.
    useStore.getState().appendBulletins([]);
    expect(useStore.getState().feedOrder).toEqual(["b2", "b1", "b0"]);
  });

  it("orders pinned bulletins first, then by publishedAt desc", () => {
    useStore.getState().applyBulletinSnapshot([
      bulletin({ bulletinId: "old", publishedAt: 100, pinned: false }),
      bulletin({ bulletinId: "newest", publishedAt: 3000, pinned: false }),
      bulletin({ bulletinId: "pinOld", publishedAt: 200, pinned: true }),
      bulletin({ bulletinId: "pinNew", publishedAt: 2000, pinned: true }),
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
