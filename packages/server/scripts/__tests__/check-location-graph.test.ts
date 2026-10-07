/**
 * check-location-graph unit tests — the derivation (what counts as a
 * PLACE), the published read, and the live-tree census sitting on its
 * ceilings.
 *
 * ⭐ The rules themselves are pinned beside the value class
 * (`lib/location/__tests__/GraphInvariants.test.ts`); this file tests
 * the half that reads the world — which is where a gate usually goes
 * wrong, by enumerating what it should derive.
 */

import "../../src/test-bootstrap";
import { describe, expect, it } from "vitest";
import { CEILINGS, scanLocationGraph } from "../check-location-graph";
import { GRAPH_RULES, type GraphRule } from "../../src/mud/lib/location/GraphInvariants";

const scan = scanLocationGraph();

function count(rule: GraphRule): number {
  return scan.findings.filter((f) => f.rule === rule).length;
}

describe("the derivation — a place, a kind, a zone", () => {
  /*
   * ⚠ These assertions are deliberately STRUCTURAL rather than naming
   * shipped rooms. Two reasons, and the second is the better one:
   * `lint:test-content` refuses a kernel-side test that names shipped
   * locality paths (a kernel test proves the kernel over synthetic
   * fixtures; a content test lives beside its content) — and
   * a test that hard-codes four locality paths breaks every time
   * content moves, while asserting the PROPERTY the derivation is for
   * does not.
   */

  it("⭐⭐ finds places whose path has NO `/location/` segment", () => {
    // The property the by-class walk exists for. Several shipped place
    // rows predate the `<root>/<branch>/` pattern, so a gate
    // enumerating by path infix would skip them silently — which is how
    // a gate becomes a gate-shaped comment.
    const offPattern = scan.nodes.filter(
      (n) => !n.identity.includes("/location/"),
    );
    expect(offPattern.length).toBeGreaterThan(0);
  });

  it("⭐ places and kinds PARTITION — one row is one place, or it is a kind", () => {
    expect(scan.kinds.size).toBeGreaterThan(0);
    for (const node of scan.nodes) {
      expect(scan.kinds.has(node.identity), node.identity).toBe(false);
    }
  });

  it("a zone is neither a place nor a kind", () => {
    const zones = new Set(
      scan.nodes.map((n) => n.zone).filter((z): z is string => z !== null),
    );
    expect(zones.size).toBeGreaterThan(0);
    const identities = new Set(scan.nodes.map((n) => n.identity));
    for (const zone of zones) {
      expect(identities.has(zone), zone).toBe(false);
      expect(scan.kinds.has(zone), zone).toBe(false);
    }
  });

  it("every node names the row it came from, as its own path", () => {
    for (const node of scan.nodes) {
      expect(node.template).toBe(node.identity);
      expect(node.template.startsWith("/")).toBe(true);
    }
  });

  it("authored exits are projected with distinct directions per node", () => {
    const withEdges = scan.nodes.filter((n) => n.edges.length > 0);
    expect(withEdges.length).toBeGreaterThan(0);
    for (const node of withEdges) {
      const dirs = node.edges.map((e) => e.dir);
      expect(new Set(dirs).size, node.identity).toBe(dirs.length);
    }
  });

  it("a cross-zone edge exists and both ends resolve a zone", () => {
    const byIdentity = new Map(scan.nodes.map((n) => [n.identity, n]));
    const crossing = scan.nodes.flatMap((n) =>
      n.edges
        .map((e) => (e.to ? byIdentity.get(e.to) : undefined))
        .filter((far) => far && far.zone && n.zone && far.zone !== n.zone),
    );
    expect(crossing.length).toBeGreaterThan(0);
  });

  it("⭐ everything ships PUBLISHED — an absent claim is live content", () => {
    // `lint:untitled` already forbids shipping an untitled path, so a
    // claim that says nothing about publication is live.
    expect(scan.nodes.every((n) => n.published !== false)).toBe(true);
  });
});

describe("the census sits on its ceilings", () => {
  it("⭐⭐ the three ERROR rules are at zero and have no ceiling", () => {
    for (const rule of [
      "dangling-destination",
      "bidirectional-both-sides",
      "published-into-unpublished",
    ] as const) {
      expect(CEILINGS[rule]).toBeNull();
      expect(count(rule)).toBe(0);
    }
  });

  it("every question rule is at or under its measured ceiling", () => {
    for (const rule of GRAPH_RULES) {
      const ceiling = CEILINGS[rule];
      if (ceiling === null) continue;
      expect(count(rule), rule).toBeLessThanOrEqual(ceiling);
    }
  });

  it("⚠ the ceilings are MEASURED, not padded — each sits exactly on today", () => {
    // A ceiling above the real number is a hole in the ratchet, which is
    // this family's documented failure mode. If a build lowers content
    // noise, it lowers the ceiling in the same commit.
    for (const rule of GRAPH_RULES) {
      const ceiling = CEILINGS[rule];
      if (ceiling === null) continue;
      expect(ceiling, rule).toBe(count(rule));
    }
  });

  it("every ceiling key is a real rule, and every rule has a key", () => {
    expect(Object.keys(CEILINGS).sort()).toEqual([...GRAPH_RULES].sort());
  });
});
