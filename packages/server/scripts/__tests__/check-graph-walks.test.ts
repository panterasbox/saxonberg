/**
 * check-graph-walks' decision core — what counts as a hand-written
 * graph walk.
 *
 * ⚠⚠ The load-bearing cases here are the three FALSE POSITIVES the
 * first run over the tree produced, because each made the census read
 * HIGH and a ratchet set above the real count is a ceiling that lets
 * a new walk in. They are pinned so a later sharpening cannot quietly
 * un-sharpen the detector:
 *
 *   - a dedupe `Set` in a loop over a FIXED list (MQL's two scope
 *     builders iterate one room's own doors and never leave it);
 *   - an adjacency probe matching inside a DOC COMMENT
 *     (`ParcelLogic`'s `{'edges.to': 1}`, explaining the index);
 *   - and the positive control, so the sharpening did not blind it.
 */

import "../../src/test-bootstrap";
import { describe, it, expect } from "vitest";
import { scanSource, WALK_CEILING } from "../check-graph-walks";

const scan = (src: string) => scanSource("t.ts", src, "t.ts");

describe("the three evidence tests together", () => {
  it("finds a queue-drain BFS with a visited set and an adjacency read", () => {
    const src = [
      "class X {",
      "  go(start: Room): void {",
      "    const queue = [start];",
      "    const seen = new Set<string>();",
      "    while (queue.length) {",
      "      const n = queue.shift()!;",
      "      if (seen.has(n.id)) continue;",
      "      seen.add(n.id);",
      "      for (const e of n.getObviousExits()) queue.push(e.far());",
      "    }",
      "  }",
      "}",
    ].join("\n");
    const [walk] = scan(src);
    expect(walk?.fn).toBe("go");
    expect(walk?.frontier).toBe("while over queue");
    expect(walk?.visited).toBe("seen");
    expect(walk?.adjacency).toBe("getObviousExits()");
  });

  it("finds a recursive DFS — the three modalities and the gather", () => {
    const src = [
      "function walkAt(loc: Room, depth: number, visited: Set<string>): number {",
      "  if (visited.has(loc.id)) return 0;",
      "  visited.add(loc.id);",
      "  let acc = 0;",
      "  for (const e of loc.getObviousExits()) {",
      "    acc += walkAt(e.far(), depth + 1, visited);",
      "  }",
      "  return acc;",
      "}",
    ].join("\n");
    const [walk] = scan(src);
    expect(walk?.frontier).toBe("recursion (walkAt)");
  });

  it("finds the level-BFS `frontier = next` shape — mine air", () => {
    const src = [
      "class W {",
      "  air(start: Room): number {",
      "    let frontier = [start];",
      "    const seen = new Set<string>();",
      "    for (let d = 0; d < 12; d++) {",
      "      const next: Room[] = [];",
      "      for (const n of frontier) {",
      "        if (seen.has(n.id)) continue;",
      "        seen.add(n.id);",
      "        for (const f of this.neighboursOf(n)) next.push(f);",
      "      }",
      "      frontier = next;",
      "    }",
      "    return 0;",
      "  }",
      "}",
    ].join("\n");
    const [walk] = scan(src);
    expect(walk?.frontier).toBe("for over frontier ← next");
    expect(walk?.adjacency).toBe("neighboursOf()");
  });
});

describe("⚠ the false positives that cost the first run three sites", () => {
  it("a dedupe Set over a FIXED list is not a walk — the frontier never grows", () => {
    // MQL's `candidatesForHere`: one room's own doors, deduped.
    const src = [
      "function candidatesForHere(location: Room): Out[] {",
      "  const out: Out[] = [];",
      "  const seenDoors = new Set<string>();",
      "  for (const door of location.getExitDoors()) {",
      "    if (seenDoors.has(door.id)) continue;",
      "    seenDoors.add(door.id);",
      "    out.push(door);",
      "  }",
      "  for (const exit of location.getObviousExits()) out.push(exit);",
      "  return out;",
      "}",
    ].join("\n");
    expect(scan(src)).toEqual([]);
  });

  it("an adjacency probe inside a DOC COMMENT is prose, not a read", () => {
    // ParcelLogic.offlineExtent: the comment explains `{'edges.to': 1}`.
    const src = [
      "/**",
      " * ⚠ The reverse-edge query is why `{'edges.to': 1}` is an index.",
      " */",
      "function offlineExtent(nodes: Node[]): void {",
      "  const told = new Set<string>();",
      "  for (const node of nodes) {",
      "    if (told.has(node.identity)) continue;",
      "    told.add(node.identity);",
      "  }",
      "}",
    ].join("\n");
    expect(scan(src)).toEqual([]);
  });

  it("a loop that feeds a collection the loop does not CONSUME is not a frontier", () => {
    const src = [
      "function collect(ids: string[]): Out[] {",
      "  const out: Out[] = [];",
      "  const seen = new Set<string>();",
      "  for (const id of ids) {",
      "    if (seen.has(id)) continue;",
      "    seen.add(id);",
      "    out.push({ id, edges: [] });",
      "  }",
      "  return out;",
      "}",
    ].join("\n");
    expect(scan(src)).toEqual([]);
  });

  it("a walk with no visited set is not one either — two of three is ordinary code", () => {
    const src = [
      "function sum(start: Room): number {",
      "  const queue = [start];",
      "  let n = 0;",
      "  while (queue.length) {",
      "    const r = queue.shift()!;",
      "    n += 1;",
      "    for (const e of r.getObviousExits()) queue.push(e.far());",
      "  }",
      "  return n;",
      "}",
    ].join("\n");
    expect(scan(src)).toEqual([]);
  });
});

describe("the ceiling", () => {
  it("⭐ is a ratchet — this pins the number so a RISE is a visible diff", () => {
    // It may FALL freely; editing this expectation UPWARD is the
    // conversation the gate exists to force.
    expect(WALK_CEILING).toBeLessThanOrEqual(11);
  });
});
