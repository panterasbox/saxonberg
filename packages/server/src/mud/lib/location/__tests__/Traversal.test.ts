/**
 * Traversal — the skeleton, over synthetic graphs.
 *
 * ⭐ The cases that matter are the ones where a *wrong* skeleton still
 * looks right: the depth gate firing before the visited mark (which is
 * observable as light and sound in the real walks), budget exhaustion
 * being distinguishable from a genuine no-way, and the cheapest-first
 * tie-break being deterministic. The real walks' behaviour is pinned
 * by `scripts/__tests__/golden/perception-characterization.json`; this
 * file pins the machinery those walks borrow.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { Traversal } from '../Traversal';
import type { Leg } from '../Traversal';

/** A node is its own name; a graph is a name → ordered neighbour list. */
type G = Record<string, Array<[string, number?]>>;

const legsOf =
  (g: G) =>
  (node: string): readonly Leg<string>[] =>
    (g[node] ?? []).map(([to, minutes]) => ({
      node: to,
      dir: `to-${to}`,
      ...(minutes === undefined ? {} : { minutes }),
    }));

/** Every node the walk entered, in visit order. */
function reach(
  g: G,
  start: string,
  order: 'breadth-first' | 'cheapest-first',
  bound: { hops?: number; nodes?: number; cost?: number } = {},
): { seen: string[]; expanded: number; exhausted: 'nodes' | null } {
  const seen: string[] = [];
  const t = new Traversal<string, string[], void>({
    order,
    keyOf: (n) => n,
    neighbours: legsOf(g),
    bound,
    cost: (leg) => leg.minutes ?? 1,
    fold: (n) => {
      seen.push(n);
      return seen;
    },
  });
  const r = t.walk(start, { carry: undefined });
  return { seen: r.result, expanded: r.expanded, exhausted: r.exhausted };
}

describe('the three orders', () => {
  const diamond: G = { a: [['b'], ['c']], b: [['d']], c: [['d']], d: [] };

  it('breadth-first visits by level, marking on dequeue', () => {
    expect(reach(diamond, 'a', 'breadth-first').seen).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('depth-first recurses in NEIGHBOUR ORDER and folds post-order', () => {
    const order: string[] = [];
    const t = new Traversal<string, number, void>({
      order: 'depth-first',
      keyOf: (n) => n,
      neighbours: legsOf(diamond),
      bound: {},
      fold: (n, _d, _c, children) => {
        order.push(n);
        return 1 + children.reduce((s, c) => s + c.result, 0);
      },
    });
    const r = t.walk('a', { carry: undefined });
    // `d` is reached through `b` first, so it folds before `b` does,
    // and `c` finds it already visited.
    expect(order).toEqual(['d', 'b', 'c', 'a']);
    expect(r.result).toBe(4);
  });

  it('cheapest-first takes the cheap long way over the dear short one', () => {
    // a→c costs 10 direct; a→b→c costs 2.
    const g: G = { a: [['c', 10], ['b', 1]], b: [['c', 1]], c: [] };
    const cheapestTo = new Map<string, number>();
    const t = new Traversal<string, Map<string, number>, number>({
      order: 'cheapest-first',
      keyOf: (n) => n,
      neighbours: legsOf(g),
      bound: {},
      cost: (leg) => leg.minutes ?? 1,
      descend: (carry, leg) => carry + (leg.minutes ?? 1),
      fold: (n, _d, carry) => {
        cheapestTo.set(n, carry);
        return cheapestTo;
      },
    });
    const r = t.walk('a', { carry: 0 });
    expect(r.result.get('c')).toBe(2);
    expect([...r.result.keys()]).toEqual(['a', 'b', 'c']);
  });

  it('⭐ breaks cheapest-first ties deterministically, both ways round', () => {
    const forward: G = { a: [['m', 5], ['z', 5]], m: [], z: [] };
    const reversed: G = { a: [['z', 5], ['m', 5]], m: [], z: [] };
    // Identical costs; the tie-break is `keyOf`, so authoring order
    // cannot change the answer. "The router picked a different road
    // today" is a bug report nobody can act on.
    expect(reach(forward, 'a', 'cheapest-first').seen).toEqual(['a', 'm', 'z']);
    expect(reach(reversed, 'a', 'cheapest-first').seen).toEqual(['a', 'm', 'z']);
  });

  it('refuses a cheapest-first spec with no cost axis', () => {
    expect(
      () =>
        new Traversal<string, void, void>({
          order: 'cheapest-first',
          keyOf: (n) => n,
          neighbours: () => [],
          bound: {},
          fold: () => undefined,
        }),
    ).toThrow(/no axis to minimise/);
  });
});

describe('⚠⚠ the depth gate fires BEFORE the visited mark', () => {
  it('a node refused at depth 3 is still reachable at depth 2 another way', () => {
    // a→b→c→x (x at depth 3, refused) and a→d→x (x at depth 2, taken).
    const g: G = { a: [['b'], ['d']], b: [['c']], c: [['x']], d: [['x']], x: [] };
    const folded: Array<[string, number]> = [];
    const t = new Traversal<string, number, void>({
      order: 'depth-first',
      keyOf: (n) => n,
      neighbours: legsOf(g),
      bound: { hops: 2 },
      fold: (n, d, _c, children) => {
        folded.push([n, d]);
        return 1 + children.reduce((s, c) => s + c.result, 0);
      },
    });
    t.walk('a', { carry: undefined });
    // `x` folded once, at depth 2 via `d` — NOT missing, which is what
    // marking-before-the-gate would have produced.
    expect(folded.filter(([n]) => n === 'x')).toEqual([['x', 2]]);
    expect(folded.map(([n]) => n)).toEqual(['c', 'b', 'x', 'd', 'a']);
  });
});

describe('bounds: a natural limit is not an exhausted budget', () => {
  const line: G = { a: [['b']], b: [['c']], c: [['d']], d: [['e']], e: [] };

  it('`hops` simply stops expanding, and reports no exhaustion', () => {
    const r = reach(line, 'a', 'breadth-first', { hops: 2 });
    expect(r.seen).toEqual(['a', 'b', 'c']);
    expect(r.exhausted).toBeNull();
  });

  it('`cost` simply stops expanding, and reports no exhaustion', () => {
    const g: G = { a: [['b', 3]], b: [['c', 3]], c: [] };
    const r = reach(g, 'a', 'cheapest-first', { cost: 4 });
    expect(r.seen).toEqual(['a', 'b']);
    expect(r.exhausted).toBeNull();
  });

  it("⭐ `nodes` is the BUDGET — running out says so, and is not a no-way", () => {
    const r = reach(line, 'a', 'breadth-first', { nodes: 3 });
    expect(r.expanded).toBe(3);
    expect(r.exhausted).toBe('nodes');
  });

  it('a genuine dead end reports expanded nodes and NO exhaustion', () => {
    const r = reach({ a: [], b: [] }, 'a', 'breadth-first', { nodes: 50 });
    expect(r.expanded).toBe(1);
    expect(r.exhausted).toBeNull();
  });
});

describe('enter: short-circuit and halt', () => {
  const g: G = { a: [['b'], ['c']], b: [['d']], c: [], d: [] };

  it('a returned value short-circuits the node — children are not walked', () => {
    const walked: string[] = [];
    const t = new Traversal<string, number, void>({
      order: 'depth-first',
      keyOf: (n) => n,
      neighbours: (n) => {
        walked.push(n);
        return legsOf(g)(n);
      },
      bound: {},
      // `b` is a vacuum: it contributes zero and conducts nothing.
      enter: (n) => (n === 'b' ? 0 : undefined),
      fold: (n, _d, _c, children) =>
        1 + children.reduce((s, c) => s + c.result, 0),
    });
    const r = t.walk('a', { carry: undefined });
    expect(walked).not.toContain('b');
    expect(walked).not.toContain('d');
    expect(r.result).toBe(2); // a + c; b short-circuited to 0
  });

  it("'halt' stops the WHOLE walk and names the node that did it", () => {
    const line: G = { a: [['b']], b: [['c']], c: [['d']], d: [] };
    const t = new Traversal<string, number, void>({
      order: 'breadth-first',
      keyOf: (n) => n,
      neighbours: legsOf(line),
      bound: {},
      enter: (n, d) => (n === 'c' ? ('halt' as const) : undefined),
      fold: (_n, d) => d,
    });
    const r = t.walk('a', { carry: undefined });
    expect(r.halted).toBe('c');
    expect(r.result).toBe(2); // the halt depth — mine air's answer
    expect(r.expanded).toBe(3);
  });
});

describe('descend: the carry, and refusing a leg', () => {
  it('multiplies a carry along the legs', () => {
    const g: G = { a: [['b']], b: [['c']], c: [] };
    const got = new Map<string, number>();
    const t = new Traversal<string, Map<string, number>, number>({
      order: 'depth-first',
      keyOf: (n) => n,
      neighbours: legsOf(g),
      bound: {},
      descend: (carry) => carry * 0.01,
      fold: (n, _d, carry) => {
        got.set(n, carry);
        return got;
      },
    });
    t.walk('a', { carry: 1 });
    expect(got.get('a')).toBe(1);
    expect(got.get('b')).toBeCloseTo(0.01, 10);
    expect(got.get('c')).toBeCloseTo(0.0001, 10);
  });

  it('⭐ `null` refuses the LEG — the far node is never entered, nor marked', () => {
    const g: G = { a: [['b'], ['c']], b: [['c']], c: [] };
    const seen: string[] = [];
    const t = new Traversal<string, string[], void>({
      order: 'depth-first',
      keyOf: (n) => n,
      // Refuse a→b (a mode the traveller does not admit); c is still
      // reachable directly, and ALSO would have been through b.
      neighbours: legsOf(g),
      bound: {},
      descend: (carry, leg) => (leg.node === 'b' ? null : carry),
      fold: (n) => {
        seen.push(n);
        return seen;
      },
    });
    expect(t.walk('a', { carry: undefined }).result).toEqual(['c', 'a']);
  });
});

describe('⚠⚠ a `void` result is a valid result, not a sentinel', () => {
  // Found by the forage census: `R = void` means every `fold` returns
  // `undefined`, and a `last ?? fold(start, …)` fallback then folded
  // the START A SECOND TIME. The census read 12 m² of bloom where one
  // cherry tree stands in 6. A sentinel that collides with a legal
  // result is not a sentinel, so the skeleton tracks *did anything
  // fold* as a boolean.
  const g: G = { a: [['b']], b: [] };

  it('folds each node exactly ONCE when fold returns undefined', () => {
    const order: string[] = [];
    const t = new Traversal<string, void, void>({
      order: 'breadth-first',
      keyOf: (n) => n,
      neighbours: legsOf(g),
      bound: {},
      fold: (n) => {
        order.push(n);
      },
    });
    t.walk('a', { carry: undefined });
    expect(order).toEqual(['a', 'b']);
  });

  it('folds the start exactly once depth-first too', () => {
    const order: string[] = [];
    const t = new Traversal<string, void, void>({
      order: 'depth-first',
      keyOf: (n) => n,
      neighbours: legsOf(g),
      bound: {},
      fold: (n) => {
        order.push(n);
      },
    });
    t.walk('a', { carry: undefined });
    expect(order).toEqual(['b', 'a']);
  });

  it('still folds ONCE for the empty answer when the start is refused', () => {
    const order: string[] = [];
    const visited = new Set(['a']); // somebody already walked it
    const t = new Traversal<string, void, void>({
      order: 'breadth-first',
      keyOf: (n) => n,
      neighbours: legsOf(g),
      bound: {},
      visited,
      fold: (n) => {
        order.push(n);
      },
    });
    const r = t.walk('a', { carry: undefined });
    expect(r.expanded).toBe(0);
    expect(order).toEqual(['a']); // the empty-answer fold, and only it
  });
});

describe('a caller-threaded visited set', () => {
  it('is shared across walks, so the second finds the first was here', () => {
    const g: G = { a: [['b']], b: [], x: [['b']] };
    const visited = new Set<string>();
    const make = () =>
      new Traversal<string, string[], void>({
        order: 'breadth-first',
        keyOf: (n) => n,
        neighbours: legsOf(g),
        bound: {},
        visited,
        fold: (n) => [n],
      });
    make().walk('a', { carry: undefined });
    const second = make().walk('x', { carry: undefined });
    // `b` belongs to the first walk; the second only enters `x`.
    expect(second.expanded).toBe(1);
    expect(visited).toEqual(new Set(['a', 'b', 'x']));
  });
});

describe('multi-start walks', () => {
  it('share one visited set — the first start to reach a node owns it', () => {
    const g: G = { a: [['m']], b: [['m']], m: [] };
    const seen: string[] = [];
    const t = new Traversal<string, string[], void>({
      order: 'breadth-first',
      keyOf: (n) => n,
      neighbours: legsOf(g),
      bound: {},
      fold: (n) => {
        seen.push(n);
        return seen;
      },
    });
    expect(t.walkFrom(['a', 'b'], { carry: undefined }).result).toEqual([
      'a',
      'b',
      'm',
    ]);
  });

  it('⭐ are REFUSED depth-first — several roots have no node to fold into', () => {
    const t = new Traversal<string, void, void>({
      order: 'depth-first',
      keyOf: (n) => n,
      neighbours: () => [],
      bound: {},
      fold: () => undefined,
    });
    expect(() => t.walkFrom(['a', 'b'], { carry: undefined })).toThrow(
      /takes ONE start/,
    );
  });

  it('refuses an empty start list rather than answering for nowhere', () => {
    const t = new Traversal<string, void, void>({
      order: 'breadth-first',
      keyOf: (n) => n,
      neighbours: () => [],
      bound: {},
      fold: () => undefined,
    });
    expect(() => t.walkFrom([], { carry: undefined })).toThrow(/no start node/);
  });
});
