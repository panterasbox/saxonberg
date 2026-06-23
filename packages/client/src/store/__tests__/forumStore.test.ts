/**
 * Forum store slice (Wave 4) — the live record set fed by
 * `forum-subscription-result` / `-delta`, the mainView axis, and the
 * forum nav target.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../index";
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
    mainView: "terminal",
    forumNav: { boardHandle: null, threadId: null },
    forumRecords: {},
    forumScopes: {},
    inputMode: { terminal: null, forum: null },
  });
});

describe("forum store slice", () => {
  it("mainView toggles terminal ↔ forum (not a phase)", () => {
    expect(useStore.getState().mainView).toBe("terminal");
    expect(useStore.getState().connectionPhase).not.toBe("forum");
    useStore.getState().setMainView("forum");
    expect(useStore.getState().mainView).toBe("forum");
  });

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
    const recs = useStore.getState().forumRecords["s1"]!;
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
      threadId: null,
    });
    useStore.getState().setForumNav({ threadId: "e1" });
    expect(useStore.getState().forumNav).toEqual({
      boardHandle: "gossip",
      threadId: "e1",
    });
  });

  it("inputMode is client-only scoped-input state, held per view", () => {
    useStore.setState({ mainView: "forum" });
    expect(useStore.getState().inputMode.forum).toBeNull();
    useStore.getState().setInputMode({ prefix: "chat devtalk", label: "devtalk" });
    // Set on the active (forum) view only — the terminal bar is untouched.
    expect(useStore.getState().inputMode.forum).toEqual({
      prefix: "chat devtalk",
      label: "devtalk",
    });
    expect(useStore.getState().inputMode.terminal).toBeNull();
    useStore.getState().clearInputMode();
    expect(useStore.getState().inputMode.forum).toBeNull();
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
    const first = useStore.getState().forumRecords["a1"]![0]!;
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
    expect(useStore.getState().forumRecords["a1"]![0]!.openObjection).toBe(false);
  });

  it("clearForumSubscription drops the cache", () => {
    const s = useStore.getState();
    s.applyForumResult("s1", { kind: "board", id: "b1" }, [rec("e1")]);
    s.clearForumSubscription("s1");
    expect(useStore.getState().forumRecords["s1"]).toBeUndefined();
    expect(useStore.getState().forumScopes["s1"]).toBeUndefined();
  });
});
