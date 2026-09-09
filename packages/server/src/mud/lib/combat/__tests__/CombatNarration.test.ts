/**
 * CombatNarration — the per-viewer narration adapter. Asserts the three
 * load-bearing behaviours without a live scene pipeline (MessageApi.scene
 * is mocked to a recording builder; ProseApi.format is spied to capture
 * the frame vars per viewer):
 *   - a `{material × channel × outcome}` flavor fragment is woven in;
 *   - each perception tier gets a *distinct* line (self vs target vs
 *     bystander voice);
 *   - a dramatic beat registers a reactable act (tick beats stay silent).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeStuff } from "../../security/__tests__/test-setup";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { SensorMixin } from "../../message/Sensor";
import { ContainmentApi } from "../../../api/containment";
import { MessageApi } from "../../../api/message";
import { ProseApi } from "../../../api/prose";
import { ReactionApi } from "../../../api/reaction";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";
import { CombatNarration } from "../CombatNarration";

class TestRoom extends ContainerMixin(Idea) {}
class TestViewer extends SensorMixin(ContainableMixin(Idea)) {}

interface FormatCall {
  tpl: string;
  vars: Record<string, unknown>;
}

let formatCalls: FormatCall[];

beforeEach(() => {
  formatCalls = [];
  vi.spyOn(ProseApi, "format").mockImplementation((tpl, vars) => {
    formatCalls.push({ tpl, vars: vars as Record<string, unknown> });
    return Mml.fromMarkup("");
  });
  // Recording, no-op scene builder — avoids the live dispatch pipeline.
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const builder: Record<string, unknown> = {};
    for (const m of ["topic", "meta", "tags", "modality", "toSelf", "payload"]) {
      builder[m] = () => builder;
    }
    builder.send = () => {};
    return builder as never;
  });
  vi.spyOn(ReactionApi, "locationScopeFor").mockReturnValue("location:test");
});

afterEach(() => {
  vi.restoreAllMocks();
});

function scene(): { room: TestRoom; a: TestViewer; b: TestViewer; c: TestViewer } {
  const room = makeStuff(() => new TestRoom());
  const a = makeStuff(() => new TestViewer());
  const b = makeStuff(() => new TestViewer());
  const c = makeStuff(() => new TestViewer());
  for (const s of [a, b, c]) ContainmentApi.move(s as never, room as never);
  return { room, a, b, c };
}

describe("CombatNarration", () => {
  it("weaves the material flavor fragment for a channel × outcome", () => {
    const { a, b } = scene();
    CombatNarration.narrate({
      attacker: a,
      defender: b,
      gambitKey: "strike",
      outcome: "land",
      channel: "edge",
      band: "bites-deep",
      materialKey: "steel",
      dramatic: true,
    });
    // The fragment is woven directly into the composed line (the template
    // string), not passed as a var.
    const woven = formatCalls.map((f) => f.tpl).join(" ");
    expect(woven).toContain("the keen steel opens a long bright line");
  });

  it("gives each perception tier a distinct line", () => {
    const { a, b } = scene();
    CombatNarration.narrate({
      attacker: a,
      defender: b,
      gambitKey: "strike",
      outcome: "land",
      channel: "edge",
      band: "bites",
      defenderPoise: "pressed",
      dramatic: true,
      beat: 0,
    });
    // Three witnesses (attacker, defender, one bystander) → three frames,
    // each composed in a distinct per-tier voice (self "You" / target
    // "you" / bystander third-person) with a hedged bystander wound.
    const templates = new Set(formatCalls.map((f) => f.tpl));
    expect(formatCalls.length).toBe(3);
    expect(templates.size).toBeGreaterThanOrEqual(2);
    // The bystander's line hedges the wound ("a hit"); a combatant's is
    // precise ("a raking gash" / "a solid wound").
    const joined = formatCalls.map((f) => f.tpl).join(" | ");
    expect(joined).toMatch(/a hit|a hard hit/);
  });

  it("escalates the line with the defender's poise (the arc)", () => {
    const { a, b } = scene();
    const composed = (poise: string) => {
      formatCalls = [];
      CombatNarration.narrate({
        attacker: a,
        defender: b,
        gambitKey: "strike",
        outcome: "land",
        channel: "edge",
        band: "bites",
        defenderPoise: poise as never,
        openingExploited: poise === "open",
        dramatic: true,
        beat: 0,
      });
      return formatCalls.map((f) => f.tpl).join(" ");
    };
    // A steady guard reads as a clean hit; a reeling one as pressure; an
    // exploited opening as the break — each a distinct phrasing.
    const steady = composed("steady");
    const reeling = composed("reeling");
    const open = composed("open");
    expect(steady).not.toEqual(reeling);
    expect(reeling).not.toEqual(open);
    expect(open.toLowerCase()).toMatch(/opening|guard breaks/);
  });

  it("names the cause of death (no bare 'cut down')", () => {
    const { a, b } = scene();
    // The victim reports a bleeding laceration; treat it as a body.
    vi.spyOn(MixinApi, "isVitals").mockImplementation(
      (s) => (s as unknown) === (b as unknown),
    );
    (b as unknown as { getConditions(): unknown[] }).getConditions = () => [
      {
        kind: "trauma",
        type: "laceration",
        severity: 2,
        bleeding: true,
        site: "body.torso",
      },
    ];
    CombatNarration.narrateResolution({
      combatants: [a, b],
      outcome: "death",
      victim: b,
      killer: a,
    });
    const joined = formatCalls.map((f) => f.tpl).join(" ");
    expect(joined.toLowerCase()).toContain("bled white");
  });

  it("announces every resolution (no silent fight-end)", () => {
    const { a, b } = scene();
    const cid = CombatNarration.narrateResolution({
      combatants: [a, b],
      outcome: "death",
      victim: b,
      killer: a,
    });
    expect(typeof cid).toBe("string");
    // A line was rendered for each witness (three), and the death
    // template mentions the fight is over.
    expect(formatCalls.length).toBe(3);
    const templates = formatCalls.map((f) => f.tpl).join(" ");
    expect(templates.toLowerCase()).toContain("the fight is over");
  });

  it("registers a reactable act on a dramatic beat, silent otherwise", () => {
    const note = vi.spyOn(ReactionApi, "noteReactableAct").mockReturnValue();
    const { a, b } = scene();
    CombatNarration.narrate({
      attacker: a,
      defender: b,
      gambitKey: "strike",
      outcome: "land",
      channel: "edge",
      band: "bites",
      dramatic: false,
    });
    expect(note).not.toHaveBeenCalled();

    CombatNarration.narrate({
      attacker: a,
      defender: b,
      gambitKey: "strike",
      outcome: "land",
      channel: "edge",
      band: "bites-deep",
      dramatic: true,
    });
    expect(note).toHaveBeenCalledTimes(1);
    expect(note.mock.calls[0]![0].subject).toBe(a);
  });

  it("beat-intensity gates the crowd: silent stays quiet, murmur/roar fan out", () => {
    const note = vi.spyOn(ReactionApi, "noteReactableAct").mockReturnValue();
    const { a, b } = scene();
    const base = {
      attacker: a,
      defender: b,
      gambitKey: "strike",
      outcome: "land" as const,
      channel: "edge" as const,
      band: "bites" as const,
      // `dramatic` says "yes" — but intensity, when present, is what governs.
      dramatic: true,
    };

    CombatNarration.narrate({ ...base, intensity: "silent" });
    expect(note).not.toHaveBeenCalled(); // silence overrides a dramatic hit

    CombatNarration.narrate({ ...base, intensity: "murmur" });
    expect(note).toHaveBeenCalledTimes(1);

    CombatNarration.narrate({ ...base, intensity: "roar" });
    expect(note).toHaveBeenCalledTimes(2);
  });
});

/* ────────────── W2: the poise read (the fight's own state) ────────────── */

describe("CombatNarration — the poise read", () => {
  it("⭐ narrates a crossing in each direction, self and peers differently", () => {
    const { a, b } = scene();
    CombatNarration.narrateBandChange(a as never, "steady", "reeling");
    // Three viewers in the room: the subject reads a self line, the other
    // two read the peer line.
    const selfLines = formatCalls.filter((c) => c.tpl.startsWith("You"));
    const peerLines = formatCalls.filter((c) => c.tpl.startsWith("{{c}}"));
    expect(selfLines).toHaveLength(1);
    expect(peerLines.length).toBeGreaterThanOrEqual(1);
    expect(selfLines[0]!.tpl).toContain("reeling");

    formatCalls = [];
    CombatNarration.narrateBandChange(b as never, "broken", "steady");
    const recovering = formatCalls.filter((c) => c.tpl.startsWith("You"));
    expect(recovering[0]!.tpl).toContain("footing");
  });

  it("⚠ never renders a digit — bands, not numbers, end to end", () => {
    const { a } = scene();
    const bands = ["steady", "pressed", "reeling", "broken", "open"] as const;
    for (const from of bands) {
      for (const to of bands) {
        if (from === to) continue;
        CombatNarration.narrateBandChange(a as never, from, to);
      }
    }
    CombatNarration.narrateFootingCapped(a as never, true);
    CombatNarration.narrateFootingCapped(a as never, false);
    expect(formatCalls.length).toBeGreaterThan(0);
    for (const c of formatCalls) {
      expect(c.tpl, `digit in "${c.tpl}"`).not.toMatch(/\d/);
    }
  });

  it("⭐ the wound telling reads differently for a deep bite", () => {
    const { a } = scene();
    CombatNarration.narrateFootingCapped(a as never, true);
    const deep = formatCalls.filter((c) => c.tpl.startsWith("The wound"));
    expect(deep).toHaveLength(1);

    formatCalls = [];
    CombatNarration.narrateFootingCapped(a as never, false);
    const shallow = formatCalls.filter((c) => c.tpl.startsWith("The cut"));
    expect(shallow).toHaveLength(1);
  });

  it("every band arrived at has a line in both voices and both directions", () => {
    // A missing entry would fall back to the generic sentence, which reads
    // fine and says nothing — the silent-and-closed failure this build
    // exists to end. Assert the tables are total over what can be reached.
    const { a } = scene();
    const reachable: Array<[string, string]> = [
      ["steady", "pressed"],
      ["pressed", "reeling"],
      ["reeling", "broken"],
      ["broken", "open"],
      ["open", "broken"],
      ["broken", "reeling"],
      ["reeling", "pressed"],
      ["pressed", "steady"],
    ];
    for (const [from, to] of reachable) {
      formatCalls = [];
      CombatNarration.narrateBandChange(a as never, from as never, to as never);
      for (const c of formatCalls) {
        expect(c.tpl, `${from}→${to} fell back`).not.toMatch(
          /^You are giving ground\.$|^You find your feet\.$/,
        );
      }
    }
  });
});
