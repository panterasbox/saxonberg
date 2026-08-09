/**
 * NotifyPolicyMixin tests — the dumb per-character rule store: upsert
 * (replace-in-place vs append), remove, and the --above/--below reorder
 * primitive. Pure storage; resolution lives in SocialLogic.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from "vitest";
import { NotifyPolicyMixin } from "../NotifyPolicy";
import type { NotifyRule } from "../NotifyRule";
import { Idea } from "../../stuff/Idea";
import { makeStuff } from "../../security/__tests__/test-setup";

class NotifyOwner extends NotifyPolicyMixin(Idea) {}

function rule(groupRef: string, over: Partial<NotifyRule> = {}): NotifyRule {
  return {
    groupRef,
    nameRendering: "name",
    boostInDense: false,
    onConnect: "silent",
    onDisconnect: "silent",
    onMessage: "silent",
    color: "neutral",
    ...over,
  };
}

describe("NotifyPolicyMixin", () => {
  it("upsert appends a new rule and replaces in place by groupRef", () => {
    const o = makeStuff(() => new NotifyOwner());
    o.upsertNotifyRule(rule("managed:a"));
    o.upsertNotifyRule(rule("managed:b"));
    expect(o.notifyRules().map((r) => r.groupRef)).toEqual([
      "managed:a",
      "managed:b",
    ]);
    // Replace-in-place keeps position, swaps fields.
    o.upsertNotifyRule(rule("managed:a", { color: "teal" }));
    expect(o.notifyRules()).toHaveLength(2);
    expect(o.notifyRules()[0]).toMatchObject({
      groupRef: "managed:a",
      color: "teal",
    });
  });

  it("upsertNotifyRuleAt inserts a new rule at the position and clamps bounds", () => {
    const o = makeStuff(() => new NotifyOwner());
    o.upsertNotifyRule(rule("a"));
    o.upsertNotifyRule(rule("b"));
    // Insert at the head.
    o.upsertNotifyRuleAt(rule("head"), 0);
    expect(o.notifyRules().map((r) => r.groupRef)).toEqual(["head", "a", "b"]);
    // A position past the end clamps to the tail.
    o.upsertNotifyRuleAt(rule("tail"), 99);
    expect(o.notifyRules().map((r) => r.groupRef)).toEqual([
      "head",
      "a",
      "b",
      "tail",
    ]);
  });

  it("upsertNotifyRuleAt replaces an existing rule in place (never moves it)", () => {
    const o = makeStuff(() => new NotifyOwner());
    o.upsertNotifyRule(rule("a"));
    o.upsertNotifyRule(rule("b"));
    // Same groupRef → in-place replace, position argument ignored.
    o.upsertNotifyRuleAt(rule("b", { color: "rose" }), 0);
    expect(o.notifyRules().map((r) => r.groupRef)).toEqual(["a", "b"]);
    expect(o.notifyRules()[1]).toMatchObject({ groupRef: "b", color: "rose" });
  });

  it("remove drops a rule and reports whether anything changed", () => {
    const o = makeStuff(() => new NotifyOwner());
    o.upsertNotifyRule(rule("managed:a"));
    expect(o.removeNotifyRule("managed:a")).toBe(true);
    expect(o.notifyRules()).toHaveLength(0);
    expect(o.removeNotifyRule("managed:a")).toBe(false);
  });

  it("reorder moves a rule above an anchor", () => {
    const o = makeStuff(() => new NotifyOwner());
    o.upsertNotifyRule(rule("a"));
    o.upsertNotifyRule(rule("b"));
    o.upsertNotifyRule(rule("c"));
    expect(o.reorderNotifyRule("c", "a", "above")).toBe(true);
    expect(o.notifyRules().map((r) => r.groupRef)).toEqual(["c", "a", "b"]);
  });

  it("reorder moves a rule below an anchor", () => {
    const o = makeStuff(() => new NotifyOwner());
    o.upsertNotifyRule(rule("a"));
    o.upsertNotifyRule(rule("b"));
    o.upsertNotifyRule(rule("c"));
    expect(o.reorderNotifyRule("a", "b", "below")).toBe(true);
    expect(o.notifyRules().map((r) => r.groupRef)).toEqual(["b", "a", "c"]);
  });

  it("reorder fails when the rule or anchor is missing or self-referential", () => {
    const o = makeStuff(() => new NotifyOwner());
    o.upsertNotifyRule(rule("a"));
    o.upsertNotifyRule(rule("b"));
    expect(o.reorderNotifyRule("a", "a", "above")).toBe(false); // self
    expect(o.reorderNotifyRule("z", "a", "above")).toBe(false); // no rule
    expect(o.reorderNotifyRule("a", "z", "above")).toBe(false); // no anchor
  });
});
