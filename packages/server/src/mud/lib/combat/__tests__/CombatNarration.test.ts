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
    const fragments = formatCalls.map((f) => f.vars.fragment);
    expect(fragments).toContain("the keen steel opens a long bright line");
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
      dramatic: true,
    });
    // Three witnesses (attacker, defender, one bystander) → three frames,
    // each rendered from a distinct per-tier template (self / target /
    // bystander voice) or a distinct severity clause.
    const templates = new Set(formatCalls.map((f) => f.tpl));
    expect(formatCalls.length).toBe(3);
    expect(templates.size).toBeGreaterThanOrEqual(2);
    // The combatants read a precise clause; the bystander a hedged one.
    const clauses = new Set(formatCalls.map((f) => f.vars.clause));
    expect(clauses.size).toBeGreaterThanOrEqual(2);
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
});
