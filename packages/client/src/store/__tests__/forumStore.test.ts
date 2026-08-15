/**
 * Forum store slice (Wave 4) — the live record set fed by
 * `forum-subscription-result` / `-delta`, the mainView axis, and the
 * forum nav target.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../index";
import { asEntries } from "../forumActions";
import type { ForumEntryRecord } from "@saxonberg/types";

function rec(id: string, over: Partial<ForumEntryRecord> = {}): ForumEntryRecord {
  return {
    id,
    parent: null,
    board: "b1",
    author: "p1",
    authorName: "Player One",
    title: `t-${id}`,
    body: "body",
    up: 1,
    down: 0,
    score: 1,
    displayScore: 1,
    state: "active",
    subject: null,
    createdAt: 1000,
    ...over,
  };
}

beforeEach(() => {
  useStore.setState({
    forumNav: { boardHandle: null, boardId: null, threadId: null },
    forumRecords: {},
    forumScopes: {},
  });
});

describe("forum store slice", () => {
  it("applyForumResult stores the snapshot under the subscription", () => {
    useStore
      .getState()
      .applyForumResult("s1", { kind: "board", id: "b1" }, [rec("e1"), rec("e2")]);
    expect(useStore.getState().forumRecords["s1"]).toHaveLength(2);
    expect(useStore.getState().forumScopes["s1"]).toEqual({ kind: "board", id: "b1" });
  });

  it("applyForumDelta upserts (add/replace) and removes", () => {
    const s = useStore.getState();
    s.applyForumResult("s1", { kind: "board", id: "b1" }, [rec("e1")]);
    // replace e1 (new score) + add e2.
    s.applyForumDelta("s1", [
      { op: "replace", key: "e1", fields: rec("e1", { score: 5, up: 5 }) },
      { op: "add", key: "e2", fields: rec("e2") },
    ]);
    const recs = asEntries(useStore.getState().forumRecords["s1"]);
    expect(recs).toHaveLength(2);
    expect(recs.find((r) => r.id === "e1")!.score).toBe(5);

    // remove e1.
    useStore.getState().applyForumDelta("s1", [{ op: "remove", key: "e1" }]);
    const after = useStore.getState().forumRecords["s1"]!;
    expect(after.map((r) => r.id)).toEqual(["e2"]);
  });

  it("setForumNav patches board/thread independently", () => {
    useStore.getState().setForumNav({ boardHandle: "gossip" });
    expect(useStore.getState().forumNav).toEqual({
      boardHandle: "gossip",
      boardId: null,
      threadId: null,
    });
    useStore.getState().setForumNav({ threadId: "e1" });
    expect(useStore.getState().forumNav).toEqual({
      boardHandle: "gossip",
      boardId: null,
      threadId: "e1",
    });
  });

  /**
   * ⚠⚠ `boardHandle` and `boardId` are TWO facts, not one.
   *
   * The handle addresses the SUBJECT — it is what commands are composed
   * from. The id addresses the BOARD. A subject that lights both forum
   * surfaces has one handle and two boards, and resolving the handle
   * picks a documented winner ("Popularity wins the rare both-lit
   * case"), which is exactly how the Argument tab came to re-render the
   * popularity board while appearing to do nothing.
   */
  it("⭐ keeps the board id beside the handle, and patches it alone", () => {
    useStore.getState().setForumNav({
      boardHandle: "gossip",
      boardId: "board-pop",
    });
    expect(useStore.getState().forumNav.boardId).toBe("board-pop");

    // Switching surface keeps the handle and changes only the board.
    useStore.getState().setForumNav({ boardId: "board-arg" });
    expect(useStore.getState().forumNav).toEqual({
      boardHandle: "gossip",
      boardId: "board-arg",
      threadId: null,
    });
  });

  it("ghost line: setGhostPreview + flashGhost drive the preview/flash strip", () => {
    expect(useStore.getState().ghostPreview).toBeNull();
    useStore.getState().setGhostPreview("look mirror");
    expect(useStore.getState().ghostPreview).toBe("look mirror");
    useStore.getState().setGhostPreview(null);
    expect(useStore.getState().ghostPreview).toBeNull();
    useStore.getState().flashGhost("copied: look mirror");
    expect(useStore.getState().ghostFlash).toBe("copied: look mirror");
  });

  it("carries argument-mode fields and clears an open-objection via a replace delta", () => {
    const s = useStore.getState();
    const con = rec("c1", {
      parent: "spine",
      organizer: "argument",
      relation: "objects-to",
      openObjection: true,
      inCircle: true,
      up: 0,
      down: 0,
      score: 0,
      displayScore: null,
    });
    s.applyForumResult("a1", { kind: "board", id: "b1" }, [con]);
    const first = asEntries(useStore.getState().forumRecords["a1"])[0]!;
    expect(first.organizer).toBe("argument");
    expect(first.relation).toBe("objects-to");
    expect(first.openObjection).toBe(true);
    expect(first.inCircle).toBe(true);

    // Answered live → the badge clears via a replace delta (no refetch).
    s.applyForumDelta("a1", [
      {
        op: "replace",
        key: "c1",
        fields: rec("c1", {
          parent: "spine",
          organizer: "argument",
          relation: "objects-to",
          openObjection: false,
        }),
      },
    ]);
    expect(
      asEntries(useStore.getState().forumRecords["a1"])[0]!.openObjection,
    ).toBe(false);
  });

  it("clearForumSubscription drops the cache", () => {
    const s = useStore.getState();
    s.applyForumResult("s1", { kind: "board", id: "b1" }, [rec("e1")]);
    s.clearForumSubscription("s1");
    expect(useStore.getState().forumRecords["s1"]).toBeUndefined();
    expect(useStore.getState().forumScopes["s1"]).toBeUndefined();
  });
});
