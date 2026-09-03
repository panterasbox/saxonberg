/**
 * ReactionRegistry — the act-scoped-emote aggregation substrate.
 *
 * Covers the headline acceptance properties: cross-viewer aggregation,
 * the toggle, the threshold prose↔counter flip, the renown event shape,
 * the scale bound (one delta per recipient per tick regardless of
 * reaction count), the overlay scope-event seam, per-recipient
 * familiar-biased sampling, and TTL GC.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ReactionApi, type ReactionSink } from "../../api/reaction";
import { EventApi } from "../../api/event";
import { StuffApi } from "../../api/stuff";
import { ShadowApi } from "../../api/shadow";
import { ConnectionApi } from "../../api/connection";
import { Stuff } from "../../lib/stuff/Stuff";
import type { Sensor } from "../../lib/message/Sensor";
import {
  ReactionFiredEvent,
  type ReactionFiredPayload,
} from "../../lib/events/ReactionFiredEvent";
import {
  ReactionScopeDeltaEvent,
  type ReactionScopeDeltaPayload,
} from "../../lib/events/ReactionScopeDeltaEvent";
import EventRegistry from "../idea/EventRegistry";
// Import for the module-load side effect: registers the EventSubscriptions
// class so EventApi.#subs() can lazy-create it (listener delivery needs it).
import "../idea/EventSubscriptions";
import Interactive from "../idea/Interactive";
import Avatar from "../agent/Avatar";
import type { ReactionDeltaEnvelope } from "@saxonberg/types";

async function bootEventRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, "/platform/idea/EventRegistry");
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

/** A lightweight reactor — the registry only reads `stuffId` for tally. */
function fakeReactor(id: string): never {
  return { stuffId: id } as unknown as never;
}

const LOC = "location:room-1";

/** A counting test sink that sees one scope. */
function countingSink(
  id: string,
  scope: string,
): ReactionSink & { deltas: ReactionDeltaEnvelope["acts"][] } {
  const deltas: ReactionDeltaEnvelope["acts"][] = [];
  return {
    id,
    viewer: null,
    seesScope: (s: string) => s === scope,
    emitDelta: (env) => deltas.push(env.acts),
    deltas,
  };
}

describe("ReactionRegistry", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    ReactionApi._clearAllForTesting();
    ReactionApi._setTestModeForTesting(true);
    await bootEventRegistry();
  });

  afterEach(() => {
    ReactionApi._clearAllForTesting();
  });

  it("cross-viewer aggregation: two reactors, one act, one tally", () => {
    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("speaker-1"),
      scope: LOC,
    });
    const d1 = ReactionApi.onScopedEmote({
      reactor: fakeReactor("r1"),
      inReactionTo: "cmd-1",
      verb: "nod",
      emoji: "🙂",
      tags: ["approval"],
    });
    const d2 = ReactionApi.onScopedEmote({
      reactor: fakeReactor("r2"),
      inReactionTo: "cmd-1",
      verb: "cheer",
      emoji: "🙂",
      tags: ["approval"],
    });
    expect(d1.reactable).toBe(true);
    expect(d2.reactable).toBe(true);
    const state = ReactionApi._actStateForTesting("cmd-1") as {
      total: number;
      subjectId: string;
    } | null;
    expect(state?.total).toBe(2);
    expect(state?.subjectId).toBe("speaker-1");
    expect(ReactionApi._actCountForTesting()).toBe(1);
  });

  it("an unknown act is not reactable (defence in depth)", () => {
    const d = ReactionApi.onScopedEmote({
      reactor: fakeReactor("r1"),
      inReactionTo: "never-noted",
      verb: "nod",
      emoji: "🙂",
      tags: [],
    });
    expect(d.reactable).toBe(false);
    expect(d.suppressFanOut).toBe(false);
  });

  it("react is add-only/idempotent; removeReaction is the explicit un-react", () => {
    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("s"),
      scope: LOC,
    });
    const react = () =>
      ReactionApi.onScopedEmote({
        reactor: fakeReactor("r1"),
        inReactionTo: "cmd-1",
        verb: "nod",
        emoji: "🙂",
        tags: [],
      });
    react();
    let state = ReactionApi._actStateForTesting("cmd-1") as { total: number };
    expect(state.total).toBe(1);
    // Re-reacting the same emote does NOT toggle it off — idempotent.
    react();
    state = ReactionApi._actStateForTesting("cmd-1") as { total: number };
    expect(state.total).toBe(1);
    // Explicit removal drops it.
    ReactionApi.removeReaction({
      reactor: fakeReactor("r1"),
      inReactionTo: "cmd-1",
      verb: "nod",
      emoji: "🙂",
      tags: [],
    });
    state = ReactionApi._actStateForTesting("cmd-1") as { total: number };
    expect(state.total).toBe(0);
  });

  it("one reactor holds DISTINCT emotes simultaneously (key is reactor+emote)", () => {
    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("s"),
      scope: LOC,
    });
    for (const verb of ["applaud", "smile", "nod"]) {
      ReactionApi.onScopedEmote({
        reactor: fakeReactor("r1"),
        inReactionTo: "cmd-1",
        verb,
        emoji: "🙂",
        tags: [],
      });
    }
    const state = ReactionApi._actStateForTesting("cmd-1") as {
      total: number;
      buckets: { tag: string }[];
    };
    expect(state.total).toBe(3); // three distinct reactions, not overwritten
    expect(state.buckets).toHaveLength(3); // ungrouped → per-verb buckets
    // Removing one emote leaves the others intact.
    ReactionApi.removeReaction({
      reactor: fakeReactor("r1"),
      inReactionTo: "cmd-1",
      verb: "smile",
      emoji: "🙂",
      tags: [],
    });
    const after = ReactionApi._actStateForTesting("cmd-1") as { total: number };
    expect(after.total).toBe(2);
  });

  it("tag-grouping (default pref) collapses shared-tag emotes into one bucket", () => {
    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("s"),
      scope: LOC,
    });
    // Two DISTINCT emotes that share a tag → one bucket under the
    // default tagGroup pref (vs the per-verb buckets when tags differ).
    ReactionApi.onScopedEmote({
      reactor: fakeReactor("r1"),
      inReactionTo: "cmd-1",
      verb: "agree",
      emoji: "👍",
      tags: ["approval"],
    });
    ReactionApi.onScopedEmote({
      reactor: fakeReactor("r2"),
      inReactionTo: "cmd-1",
      verb: "nod",
      emoji: "🙂",
      tags: ["approval"],
    });
    const state = ReactionApi._actStateForTesting("cmd-1") as {
      total: number;
      buckets: { tag: string; count: number }[];
    };
    expect(state.total).toBe(2);
    expect(state.buckets).toHaveLength(1); // grouped under "approval"
    expect(state.buckets[0]!.tag).toBe("approval");
    expect(state.buckets[0]!.count).toBe(2);
  });

  it("delta carries the recipient's own reactions in `mine`", () => {
    const SCOPE = "location:hall";
    const viewer = fakeReactor("viewer-1") as unknown as Stuff & Sensor;
    let captured: ReactionDeltaEnvelope["acts"] | null = null;
    const sink: ReactionSink = {
      id: "v",
      viewer,
      seesScope: (s) => s === SCOPE,
      emitDelta: (env) => {
        captured = env.acts;
      },
    };
    ReactionApi.subscribeScope(sink, SCOPE);
    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("s"),
      scope: SCOPE,
    });
    // The viewer reacts with applaud; a stranger reacts with nod.
    ReactionApi.onScopedEmote({
      reactor: viewer,
      inReactionTo: "cmd-1",
      verb: "applaud",
      emoji: "🙂",
      tags: [],
    });
    ReactionApi.onScopedEmote({
      reactor: fakeReactor("other"),
      inReactionTo: "cmd-1",
      verb: "nod",
      emoji: "🙂",
      tags: [],
    });
    ReactionApi._flushNowForTesting();
    expect(captured).not.toBeNull();
    const mine = captured![0]!.mine ?? [];
    expect(mine).toContain("applaud"); // the viewer's own
    expect(mine).not.toContain("nod"); // the stranger's
  });

  it("a glyph-less reaction is NOT tallied (prose only)", () => {
    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("s"),
      scope: LOC,
    });
    // No `emoji` → not aggregated; it just renders as the diegetic line.
    const d = ReactionApi.onScopedEmote({
      reactor: fakeReactor("r1"),
      inReactionTo: "cmd-1",
      verb: "ponders",
      tags: [],
    });
    expect(d.reactable).toBe(true);
    expect(d.suppressFanOut).toBe(false); // line always fans out
    const state = ReactionApi._actStateForTesting("cmd-1") as {
      total: number;
      buckets: unknown[];
    };
    expect(state.total).toBe(0); // nothing tallied
    expect(state.buckets).toHaveLength(0); // no chip
  });

  it("a small bucket lists its reactors by name for the chip hover", async () => {
    const SCOPE = "location:hall";
    const viewer = await StuffApi.create(() => new Avatar());
    viewer.setName("Viewer");
    const ann = await StuffApi.create(() => new Avatar());
    ann.setName("Annora");
    const bo = await StuffApi.create(() => new Avatar());
    bo.setName("Bofur");
    let captured: ReactionDeltaEnvelope["acts"] | null = null;
    const sink: ReactionSink = {
      id: "v",
      viewer: viewer as never,
      seesScope: (s) => s === SCOPE,
      emitDelta: (env) => {
        captured = env.acts;
      },
    };
    ReactionApi.subscribeScope(sink, SCOPE);
    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("s"),
      scope: SCOPE,
    });
    for (const reactor of [ann, bo]) {
      ReactionApi.onScopedEmote({
        reactor: reactor as never,
        inReactionTo: "cmd-1",
        verb: "applaud",
        emoji: "👏",
        tags: [],
      });
    }
    ReactionApi._flushNowForTesting();
    const bucket = captured![0]!.buckets[0]!;
    expect(bucket.count).toBe(2);
    // Small bucket → both reactors named for the hover tooltip.
    expect(bucket.reactors).toHaveLength(2);
  });

  it("renown event: fires once on flip-on, never on re-react or un-react", async () => {
    const fired: ReactionFiredPayload[] = [];
    EventApi.on<ReactionFiredPayload>(ReactionFiredEvent.KIND, (p) => {
      fired.push(p);
    });
    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("subject-1"),
      scope: LOC,
    });
    const smirk = () =>
      ReactionApi.onScopedEmote({
        reactor: fakeReactor("subject-1"),
        inReactionTo: "cmd-1",
        verb: "smirk",
        emoji: "🙂",
        tags: ["amusement"],
      });
    smirk(); // flip-on → fires
    smirk(); // idempotent re-react → no fire
    ReactionApi.removeReaction({
      reactor: fakeReactor("subject-1"),
      inReactionTo: "cmd-1",
      verb: "smirk",
      emoji: "🙂",
      tags: ["amusement"],
    }); // un-react → no fire
    // Listeners fire on the next microtask; let them drain.
    await new Promise((r) => setTimeout(r, 0));
    expect(fired).toHaveLength(1);
    expect(fired[0]).toMatchObject({
      reactorId: "subject-1",
      subjectId: "subject-1",
      commandId: "cmd-1",
      emote: "smirk",
      tags: ["amusement"],
      scope: LOC,
      selfReaction: true,
    });
  });

  it("threshold flip: below renders a line, the crossing reaction suppresses", () => {
    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("s"),
      scope: LOC,
    });
    // default threshold is 10. Reactions 1..9 render; the 10th suppresses.
    let lastDecision = { suppressFanOut: false, reactable: true };
    for (let i = 1; i <= 9; i++) {
      lastDecision = ReactionApi.onScopedEmote({
        reactor: fakeReactor(`r${i}`),
        inReactionTo: "cmd-1",
        verb: "cheer",
        emoji: "🙂",
        tags: ["approval"],
      });
      expect(lastDecision.suppressFanOut).toBe(false);
    }
    const crossing = ReactionApi.onScopedEmote({
      reactor: fakeReactor("r10"),
      inReactionTo: "cmd-1",
      verb: "cheer",
      emoji: "🙂",
      tags: ["approval"],
    });
    expect(crossing.suppressFanOut).toBe(true);
    const state = ReactionApi._actStateForTesting("cmd-1") as {
      aggregated: boolean;
      total: number;
    };
    expect(state.aggregated).toBe(true);
    expect(state.total).toBe(10);
  });

  it("scale bound: one delta per recipient per tick, independent of reaction count", () => {
    const SCOPE = "location:arena";
    const SINKS = 150;
    const sinks = Array.from({ length: SINKS }, (_, i) =>
      countingSink(`sink-${i}`, SCOPE),
    );
    for (const s of sinks) ReactionApi.subscribeScope(s, SCOPE);

    // 10 acts, 120 reactions across them — many more reactions than the
    // per-tick wire budget. The property is count-independent, so the
    // magnitude only needs to comfortably exceed the sink count to prove
    // the bound; kept modest so the gated-call cost stays test-friendly.
    const ACTS = 10;
    for (let a = 0; a < ACTS; a++) {
      ReactionApi.noteReactableAct({
        commandId: `act-${a}`,
        subject: fakeReactor(`sp-${a}`),
        scope: SCOPE,
      });
    }
    for (let n = 0; n < 120; n++) {
      ReactionApi.onScopedEmote({
        reactor: fakeReactor(`reactor-${n}`),
        inReactionTo: `act-${n % ACTS}`,
        verb: "clap",
        emoji: "🙂",
        tags: ["approval"],
      });
    }

    ReactionApi._flushNowForTesting();

    // Each sink got EXACTLY ONE delta this tick, regardless of the 120
    // reactions across 10 acts — per-tick cost is audience × cadence,
    // not reaction count.
    for (const s of sinks) {
      expect(s.deltas).toHaveLength(1);
    }
  });

  it("overlay seam: flush fires one ReactionScopeDeltaEvent per moved scope", async () => {
    const events: ReactionScopeDeltaPayload[] = [];
    EventApi.on<ReactionScopeDeltaPayload>(
      ReactionScopeDeltaEvent.KIND,
      (p) => {
        events.push(p);
      },
    );
    ReactionApi.noteReactableAct({
      commandId: "cmd-a",
      subject: fakeReactor("sa"),
      scope: "location:r1",
    });
    ReactionApi.noteReactableAct({
      commandId: "cmd-b",
      subject: fakeReactor("sb"),
      scope: "channel:general",
    });
    ReactionApi.onScopedEmote({
      reactor: fakeReactor("x"),
      inReactionTo: "cmd-a",
      verb: "nod",
      emoji: "🙂",
      tags: [],
    });
    ReactionApi.onScopedEmote({
      reactor: fakeReactor("y"),
      inReactionTo: "cmd-b",
      verb: "nod",
      emoji: "🙂",
      tags: [],
    });
    ReactionApi._flushNowForTesting();
    await new Promise((r) => setTimeout(r, 0));
    const scopes = events.map((e) => e.scope).sort();
    expect(scopes).toEqual(["channel:general", "location:r1"]);
  });

  it("GC: an act past its TTL is dropped on a flush pass", () => {
    let now = 1_000_000;
    ReactionApi._setNowForTesting(() => now);
    ReactionApi.noteReactableAct({
      commandId: "old",
      subject: fakeReactor("s"),
      scope: LOC,
    });
    expect(ReactionApi._actCountForTesting()).toBe(1);
    // Advance well past the 5-minute TTL.
    now += 6 * 60_000;
    ReactionApi._flushNowForTesting();
    expect(ReactionApi._actCountForTesting()).toBe(0);
  });

  it("per-recipient sample: a contact is named, a stranger stays counted", async () => {
    const viewer = await StuffApi.create(() => new Avatar());
    viewer.setName("Viewer");
    const reactorA = await StuffApi.create(() => new Avatar());
    reactorA.setName("Aldous");
    const reactorB = await StuffApi.create(() => new Avatar());
    reactorB.setName("Bryn");
    // Viewer knows A (contact), not B.
    (viewer as unknown as Avatar).addContact({
      kind: "avatar",
      playerId: reactorA.stuffId,
      label: "Aldous",
      source: "self",
      addedAt: 0,
    });

    const SCOPE = "location:hall";
    let captured: ReactionDeltaEnvelope["acts"] | null = null;
    const sink: ReactionSink = {
      id: "viewer-sink",
      viewer: viewer as never,
      seesScope: (s) => s === SCOPE,
      emitDelta: (env) => {
        captured = env.acts;
      },
    };
    ReactionApi.subscribeScope(sink, SCOPE);

    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("speaker"),
      scope: SCOPE,
    });
    ReactionApi.onScopedEmote({
      reactor: reactorA as never,
      inReactionTo: "cmd-1",
      verb: "nod",
      emoji: "🙂",
      tags: ["approval"],
    });
    ReactionApi.onScopedEmote({
      reactor: reactorB as never,
      inReactionTo: "cmd-1",
      verb: "nod",
      emoji: "🙂",
      tags: ["approval"],
    });

    ReactionApi._flushNowForTesting();

    expect(captured).not.toBeNull();
    const act = captured![0]!;
    expect(act.total).toBe(2); // both counted
    const sampledIds = act.sample.map((s) => s.reactorId);
    expect(sampledIds).toContain(reactorA.stuffId); // contact: named
    expect(sampledIds).not.toContain(reactorB.stuffId); // stranger: unnamed
  });

  it("disconnect cleanup drops the per-Interactive gutter ring", async () => {
    const avatar = await StuffApi.create(() => new Avatar());
    const interactive = await StuffApi.create(
      () => new Interactive("sock-1", "sess-1", { _id: "u1" } as never),
    );
    interactive.transferTo(avatar);
    ReactionApi.noteReactableAct({
      commandId: "cmd-1",
      subject: fakeReactor("s"),
      scope: LOC,
    });
    interactive.noteDeliveredFrame(42, "cmd-1");
    expect(interactive.resolveGutter(42)).toBe("cmd-1");
    interactive.cancelAllReactions();
    expect(interactive.resolveGutter(42)).toBeNull();
  });
});
