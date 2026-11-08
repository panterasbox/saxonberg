/**
 * Cards belong to the server's session. A reconnect that resumes the same
 * session keeps them; a new session (fresh login, server restart) starts
 * empty — the cards the client still held would be orphans.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../index";

function connect(interactiveStuffId: string): void {
  useStore.getState().setConnected({
    userId: "u",
    socketId: "s",
    sessionId: "sess",
    interactiveStuffId,
    avatarStuffId: "a",
    player: { _id: "p", name: "Bartleby", pronouns: "they" as never, portraitUrl: "" },
    topicCatalogue: [],
    reactableTopics: [],
    releaseWindow: [],
    clientState: {},
  });
}

function land(id: string): void {
  useStore.getState().openCard({
    instanceId: id,
    cardId: "who",
    key: "who",
    live: false,
    pinned: false,
    records: [],
    openedAt: 1,
  });
}

beforeEach(() => {
  useStore.setState({ cards: {}, cardOrder: [], selfInteractiveId: null } as never);
});

describe("cards across sessions", () => {
  it("a reconnect to the SAME session keeps its cards", () => {
    connect("i-1");
    land("c1");
    connect("i-1");
    expect(Object.keys(useStore.getState().cards)).toEqual(["c1"]);
  });

  it("⭐ a NEW session drops the old one's cards — no orphaned second room card", () => {
    connect("i-1");
    land("c1");
    useStore.getState().reorderCard("c1", null);
    connect("i-2");
    expect(useStore.getState().cards).toEqual({});
    expect(useStore.getState().cardOrder).toEqual([]);
  });
});
