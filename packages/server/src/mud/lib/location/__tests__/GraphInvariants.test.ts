/**
 * The seven graph invariants, each fired on a synthetic graph.
 *
 * ⭐ One implementation, two callers (the file lint and the runtime
 * check), so this is where the rules are pinned — and the severities
 * with them, because the split between *the world is broken* and *a
 * question for the author* is the design, not a detail.
 */

import { describe, it, expect } from 'vitest';
import {
  GRAPH_RULES,
  GraphInvariants,
  type GraphFinding,
  type GraphNode,
} from '../GraphInvariants';

const Z = '/test/graph/zone/town';
const Z2 = '/test/graph/zone/campus';

function node(
  identity: string,
  edges: GraphNode['edges'] = [],
  extra: Partial<GraphNode> = {},
): GraphNode {
  return { identity, template: identity, zone: Z, edges, ...extra };
}

function rules(findings: GraphFinding[]): string[] {
  return findings.map((f) => f.rule);
}

describe('the world is broken — the error rules', () => {
  it('⭐ a destination that does not exist is an ERROR naming row and direction', () => {
    const a = node('/test/graph/a', [
      { dir: 'north', to: null, toPath: '/test/graph/nowhere' },
    ], { entrance: true });
    const found = new GraphInvariants([a]).findings();
    const dangling = found.filter((f) => f.rule === 'dangling-destination');
    expect(dangling).toHaveLength(1);
    expect(dangling[0]!.severity).toBe('error');
    expect(dangling[0]!.path).toBe('/test/graph/a');
    expect(dangling[0]!.dir).toBe('north');
    expect(dangling[0]!.detail).toContain('/test/graph/nowhere');
  });

  it("⭐⭐ `bidirectional` is reciprocal BY CONSTRUCTION — one side is right", () => {
    // ⚠ This test ran the other way round first, and its first pass over
    // shipped content flagged Duncan Hall's front doors — whose row says
    // in a comment exactly why one declaration is correct: *"authored
    // once with `bidirectional: true` … the steps' back-exit is
    // installed from here rather than duplicated."*
    // `Exitable._applyExitSpec` calls `addBidirectionalExit`, which
    // installs the reverse. So the far side declaring nothing is the
    // right authoring, and the requirements' phrase "a non-reciprocal
    // bidirectional edge" has no referent in the real content format.
    const a = node('/test/graph/a', [
      { dir: 'north', to: '/test/graph/b', bidirectional: true },
    ], { entrance: true });
    const b = node('/test/graph/b');
    expect(rules(new GraphInvariants([a, b]).findings())).toEqual([]);
  });

  it('BOTH sides declaring the same pair bidirectional is an ERROR', () => {
    // The conflict that genuinely exists: two declarations ask the
    // engine to install the pair twice.
    const a = node('/test/graph/a', [
      { dir: 'north', to: '/test/graph/b', bidirectional: true },
    ], { entrance: true });
    const b = node('/test/graph/b', [
      { dir: 'south', to: '/test/graph/a', bidirectional: true },
    ]);
    const found = new GraphInvariants([a, b]).findings();
    const f = found.filter((x) => x.rule === 'bidirectional-both-sides');
    expect(f).toHaveLength(2); // each side is told
    expect(f[0]!.severity).toBe('error');
    expect(f[0]!.detail).toContain('install the pair twice');
  });

  it('a bidirectional CROSS-ZONE edge satisfies the both-sides rule', () => {
    const a = node('/test/graph/crossing', [
      { dir: 'north', to: '/test/graph/gate', bidirectional: true },
    ], { entrance: true });
    const gate = node('/test/graph/gate', [], { zone: Z2, entrance: true });
    expect(
      rules(new GraphInvariants([a, gate]).findings()),
    ).not.toContain('cross-zone-one-sided');
  });

  it('⭐ published → unpublished is an ERROR; the REVERSE is not', () => {
    const live = node('/test/graph/live', [
      { dir: 'north', to: '/test/graph/draft' },
    ], { entrance: true, published: true });
    const draft = node('/test/graph/draft', [
      { dir: 'south', to: '/test/graph/live' },
    ], { published: false });

    const found = new GraphInvariants([live, draft]).findings();
    const wall = found.filter((f) => f.rule === 'published-into-unpublished');
    // Exactly one, and it is the live room's — a draft pointing OUT at
    // the live world is how it attaches when it lands.
    expect(wall).toHaveLength(1);
    expect(wall[0]!.path).toBe('/test/graph/live');
    expect(wall[0]!.severity).toBe('error');
  });
});

describe('a question for the author — the censused rules', () => {
  it('plain asymmetry is INFO and says how to declare it deliberate', () => {
    const a = node('/test/graph/a', [{ dir: 'down', to: '/test/graph/b' }], {
      entrance: true,
    });
    const b = node('/test/graph/b');
    const found = new GraphInvariants([a, b]).findings();
    const f = found.find((x) => x.rule === 'asymmetric-edge');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('info');
    expect(f!.detail).toMatch(/oneWay/);
  });

  it('⭐ an edge marked oneWay is SILENT — a chute is legitimate content', () => {
    const a = node('/test/graph/a', [
      { dir: 'down', to: '/test/graph/b', oneWay: true },
    ], { entrance: true });
    const b = node('/test/graph/b');
    const found = new GraphInvariants([a, b]).findings();
    expect(rules(found)).not.toContain('asymmetric-edge');
    expect(rules(found)).not.toContain('bidirectional-both-sides');
  });

  it('a cross-zone edge declared on one side only is a WARNING', () => {
    const a = node('/test/graph/crossing', [
      { dir: 'north', to: '/test/graph/gate' },
    ], { entrance: true });
    const gate = node('/test/graph/gate', [], { zone: Z2, entrance: true });
    const found = new GraphInvariants([a, gate]).findings();
    const f = found.find((x) => x.rule === 'cross-zone-one-sided');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('warning');
    expect(f!.detail).toContain(Z2);
  });

  it('a cross-zone edge answered on BOTH sides is silent', () => {
    const a = node('/test/graph/crossing', [
      { dir: 'north', to: '/test/graph/gate' },
    ], { entrance: true });
    const gate = node('/test/graph/gate', [
      { dir: 'south', to: '/test/graph/crossing' },
    ], { zone: Z2, entrance: true });
    const found = new GraphInvariants([a, gate]).findings();
    expect(rules(found)).not.toContain('cross-zone-one-sided');
  });

  it('a destination that is a KIND row is a WARNING — it would mint a stray', () => {
    const a = node('/test/graph/a', [
      { dir: 'in', to: null, toPath: '/test/graph/kind/lounge' },
    ], { entrance: true });
    const kind = node('/test/graph/kind/lounge');
    const found = new GraphInvariants(
      [a, kind],
      new Set(['/test/graph/kind/lounge']),
    ).findings();
    const f = found.find((x) => x.rule === 'destination-is-a-kind');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('warning');
    expect(f!.detail).toContain('stray instance');
  });
});

describe('reachability — a place nothing leads to', () => {
  it('a room no entrance reaches is reported', () => {
    const gate = node('/test/graph/gate', [
      { dir: 'north', to: '/test/graph/hall' },
    ], { entrance: true });
    const hall = node('/test/graph/hall', [
      { dir: 'south', to: '/test/graph/gate' },
    ]);
    const orphan = node('/test/graph/orphan');
    const found = new GraphInvariants([gate, hall, orphan]).findings();
    const f = found.filter((x) => x.rule === 'unreachable-from-entrance');
    expect(f).toHaveLength(1);
    expect(f[0]!.path).toBe('/test/graph/orphan');
  });

  it('⭐⭐ a zone with NO entrance is ONE finding, not one per room', () => {
    // Reporting it forty times is how a census becomes noise nobody
    // reads.
    const rooms = [1, 2, 3, 4, 5].map((n) => node(`/test/graph/r${n}`));
    const found = new GraphInvariants(rooms).findings();
    const f = found.filter((x) => x.rule === 'unreachable-from-entrance');
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain('Nothing leads here');
  });

  it('a room reached only through another room is reachable', () => {
    const gate = node('/test/graph/gate', [
      { dir: 'north', to: '/test/graph/hall' },
    ], { entrance: true });
    const hall = node('/test/graph/hall', [
      { dir: 'north', to: '/test/graph/attic' },
    ]);
    const attic = node('/test/graph/attic');
    const found = new GraphInvariants([gate, hall, attic]).findings();
    expect(rules(found)).not.toContain('unreachable-from-entrance');
  });

  it('a zoneless node is not held to reachability', () => {
    const loose = node('/test/graph/offstage', [], { zone: null });
    const found = new GraphInvariants([loose]).findings();
    expect(rules(found)).not.toContain('unreachable-from-entrance');
  });
});

describe('the shape of the report', () => {
  it('a frontage STUB is held to nothing — the holding is not a node', () => {
    // A gate stub points at somebody's house, a warren one level down,
    // perceived live and never stored. Every rule skips it.
    const lane = node('/test/graph/lane', [
      { dir: 'north', to: null, slot: 'lot-3' },
    ], { entrance: true });
    expect(new GraphInvariants([lane]).findings()).toEqual([]);
  });

  it('an exit with no destination authored at all is not a dangling edge', () => {
    // A `DeferredDestinationExit` is a door onto a space that has not
    // been decided yet — a shipped shape, not a defect.
    const a = node('/test/graph/a', [{ dir: 'in', to: null }], {
      entrance: true,
    });
    expect(rules(new GraphInvariants([a]).findings())).toEqual([]);
  });

  it('a scoped pass reports that row only, and skips reachability', () => {
    const a = node('/test/graph/a', [
      { dir: 'north', to: null, toPath: '/test/graph/nowhere' },
    ], { entrance: true });
    const orphan = node('/test/graph/orphan');
    const scoped = new GraphInvariants([a, orphan]).findings('/test/graph/a');
    expect(rules(scoped)).toEqual(['dangling-destination']);
  });

  it('findings come back in rule order, then path', () => {
    const a = node('/test/graph/b', [
      { dir: 'north', to: null, toPath: '/test/graph/nowhere' },
      { dir: 'east', to: '/test/graph/c' },
    ], { entrance: true });
    const c = node('/test/graph/c');
    const found = new GraphInvariants([a, c]).findings();
    const order = rules(found).map((r) =>
      GRAPH_RULES.indexOf(r as (typeof GRAPH_RULES)[number]),
    );
    expect(order).toEqual([...order].sort((x, y) => x - y));
  });

  it('every finding names the ROW an author would edit, never an identity', () => {
    const keyed: GraphNode = {
      identity: '/test/graph/row#extent-a/kitchen',
      template: '/test/graph/row',
      zone: Z,
      entrance: true,
      edges: [{ dir: 'north', to: null, toPath: '/test/graph/nowhere' }],
    };
    const found = new GraphInvariants([keyed]).findings();
    expect(found[0]!.path).toBe('/test/graph/row');
  });
});
