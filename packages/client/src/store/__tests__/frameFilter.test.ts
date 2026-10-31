/**
 * What a terminal shows (client-surface D6): one filter over the one
 * frame store — a view's facets and mutes, a channel by its TAG (so a
 * backfilled line with no payload still finds its terminal), and the
 * shared display rules.
 */

import { describe, expect, it } from "vitest";
import { framesFor, type FrameFilterContext } from "../frameFilter";
import type { Frame } from "../index";

const ctx = (over: Partial<FrameFilterContext> = {}): FrameFilterContext => ({
  tabs: [{ name: "Chat", muted: [], facets: { topics: ["speech.channel"] } }],
  describe: () => ({ address: "you", actor: "other", weight: "normal" }) as never,
  resultDisplay: "card",
  cards: {},
  kinds: null,
  alwaysAggregate: false,
  ...over,
});

let n = 0;
const frame = (topic: string, extra: Partial<Frame> = {}): Frame => ({
  id: `f${++n}`,
  topic,
  body: topic,
  timestamp: n,
  ...extra,
});

describe("framesFor", () => {
  const say = frame("speech.vocal");
  const gossip = frame("speech.channel", { channelName: "gossip", tags: ["channel:gossip"] });
  const general = frame("speech.channel", { channelName: "general", tags: ["channel:general"] });
  // ⭐ A backfilled chat line: the record layer kept its tags and nothing else.
  const backfilled = frame("speech.channel", { tags: ["channel:gossip"] });
  const all = [say, gossip, general, backfilled];

  it("`All` is no filter", () => {
    expect(framesFor(all, { view: "All" }, ctx())).toHaveLength(4);
  });

  it("a view applies its saved facets", () => {
    expect(framesFor(all, { view: "Chat" }, ctx()).map((f) => f.id)).toEqual([
      gossip.id,
      general.id,
      backfilled.id,
    ]);
  });

  it("⭐ a channel filters by its TAG — a backfilled line with no payload is kept", () => {
    expect(framesFor(all, { channel: "gossip" }, ctx()).map((f) => f.id)).toEqual([
      gossip.id,
      backfilled.id,
    ]);
  });

  it("extra mutes drop a topic", () => {
    expect(framesFor(all, { muted: ["speech.vocal"] }, ctx())).toHaveLength(3);
  });

  it("a carded frame whose card is on screen is not printed twice", () => {
    const carded = frame("sense.survey", { carded: "card-1" });
    const out = framesFor([carded], {}, ctx({
      cards: { "card-1": { instanceId: "card-1", cardId: "subject", key: "look", live: false, pinned: false, records: [], openedAt: 1 } },
    }));
    expect(out).toEqual([]);
  });
});
