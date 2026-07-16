import { describe, it, expect } from "vitest";
import { CombatGraph } from "../CombatGraph";
import { CombatTerms } from "../CombatTerms";
import type { Stuff } from "../../stuff/Stuff";

// Cheap opaque node identities — the graph only ever compares by
// reference, never dereferences a Stuff, so a plain object stands in.
const node = (label: string): Stuff => ({ label }) as unknown as Stuff;

const terms = (initiator: string): CombatTerms =>
  CombatTerms.agreed(
    initiator,
    { lethality: "lethal", stopCondition: "death", stakes: "" },
    true,
  );

describe("CombatGraph", () => {
  it("adds a directed edge and registers both endpoints as nodes", () => {
    const g = new CombatGraph();
    const a = node("a");
    const b = node("b");
    g.addEdge(a, b, terms("a"));
    expect(g.hasNode(a)).toBe(true);
    expect(g.hasNode(b)).toBe(true);
    expect(g.edgeBetween(a, b)).toBeDefined();
    // Directed: the reverse edge does not exist.
    expect(g.edgeBetween(b, a)).toBeUndefined();
  });

  it("dedups a repeated edge and updates its terms", () => {
    const g = new CombatGraph();
    const a = node("a");
    const b = node("b");
    g.addEdge(a, b, terms("a"));
    const t2 = terms("a2");
    g.addEdge(a, b, t2, "edge");
    expect(g.allEdges()).toHaveLength(1);
    const e = g.edgeBetween(a, b)!;
    expect(e.terms).toBe(t2);
    expect(e.instrument).toBe("edge");
  });

  it("counts incoming edges as the focus-fire signal", () => {
    const g = new CombatGraph();
    const a = node("a");
    const b = node("b");
    const c = node("c");
    const target = node("t");
    g.addEdge(a, target, terms("a"));
    g.addEdge(b, target, terms("b"));
    g.addEdge(c, target, terms("c"));
    expect(g.edgeCount(target)).toBe(3);
    expect(g.incomingEdges(target)).toHaveLength(3);
    expect(g.edgeCount(a)).toBe(0);
    expect(g.targetsOf(a)).toHaveLength(1);
  });

  it("removes a node and every edge touching it", () => {
    const g = new CombatGraph();
    const a = node("a");
    const b = node("b");
    const c = node("c");
    g.addEdge(a, b, terms("a"));
    g.addEdge(b, a, terms("b"));
    g.addEdge(c, b, terms("c"));
    g.removeNode(b);
    expect(g.hasNode(b)).toBe(false);
    expect(g.edgeBetween(a, b)).toBeUndefined();
    expect(g.edgeBetween(b, a)).toBeUndefined();
    expect(g.edgeBetween(c, b)).toBeUndefined();
    expect(g.nodeCount()).toBe(2);
  });

  it("redirects an attacker's edge from an ally onto the interposer", () => {
    const g = new CombatGraph();
    const attacker = node("attacker");
    const ally = node("ally");
    const interposer = node("interposer");
    g.addEdge(attacker, ally, terms("attacker"), "edge");
    const moved = g.redirect(attacker, ally, interposer);
    expect(moved).toBeDefined();
    expect(g.edgeBetween(attacker, ally)).toBeUndefined();
    expect(g.edgeBetween(attacker, interposer)).toBeDefined();
    // Terms + instrument ride along.
    expect(g.edgeBetween(attacker, interposer)!.instrument).toBe("edge");
    expect(g.edgeCount(ally)).toBe(0);
    expect(g.edgeCount(interposer)).toBe(1);
  });

  it("redirect is a no-op when the source edge is absent", () => {
    const g = new CombatGraph();
    const a = node("a");
    const b = node("b");
    const c = node("c");
    expect(g.redirect(a, b, c)).toBeUndefined();
  });

  describe("range (the reach tier)", () => {
    it("a new edge defaults to `close`", () => {
      const g = new CombatGraph();
      const a = node("a");
      const b = node("b");
      g.addEdge(a, b, terms("a"));
      expect(g.edgeBetween(a, b)!.range).toBe("close");
      expect(g.rangeBetween(a, b)).toBe("close");
    });

    it("setRange writes BOTH directed edges (physically symmetric)", () => {
      const g = new CombatGraph();
      const a = node("a");
      const b = node("b");
      g.addEdge(a, b, terms("a"));
      g.addEdge(b, a, terms("b"));
      g.setRange(a, b, "reach");
      expect(g.edgeBetween(a, b)!.range).toBe("reach");
      expect(g.edgeBetween(b, a)!.range).toBe("reach");
      // rangeBetween reads either direction.
      expect(g.rangeBetween(a, b)).toBe("reach");
      expect(g.rangeBetween(b, a)).toBe("reach");
    });

    it("rangeBetween falls back to `close` for an unknown pair", () => {
      const g = new CombatGraph();
      expect(g.rangeBetween(node("x"), node("y"))).toBe("close");
    });

    it("redirect carries the range onto the new edge", () => {
      const g = new CombatGraph();
      const attacker = node("attacker");
      const ally = node("ally");
      const interposer = node("interposer");
      g.addEdge(attacker, ally, terms("attacker"), "edge", "reach");
      g.redirect(attacker, ally, interposer);
      expect(g.edgeBetween(attacker, interposer)!.range).toBe("reach");
    });

    it("addEdge preserves the range on an existing edge unless overridden", () => {
      const g = new CombatGraph();
      const a = node("a");
      const b = node("b");
      g.addEdge(a, b, terms("a"), undefined, "reach");
      // Re-adding without a range keeps the existing one.
      g.addEdge(a, b, terms("a2"));
      expect(g.edgeBetween(a, b)!.range).toBe("reach");
      // Explicitly overriding updates it.
      g.addEdge(a, b, terms("a3"), undefined, "close");
      expect(g.edgeBetween(a, b)!.range).toBe("close");
    });
  });
});
