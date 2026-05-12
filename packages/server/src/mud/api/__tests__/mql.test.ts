/**
 * MQL resolver tests — exercises the lex → desugar → parse → resolve
 * pipeline against a small in-memory world (see `fixtures/mql-world`).
 *
 * Phase 5 scope: direct seeds (pronouns, keywords, paths, ids,
 * literals), scope-promoted seeds (`inventory`, `online`, `world`),
 * `:i` and `:e` transforms, set ops, and detail navigation via the
 * unified chain rule (`:keyword` mid-chain auto-extends with detail
 * names at the current via depth). Predicates and bracket filter
 * expressions arrive in Phase 6.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve, MqlDesugarError } from '../mql/resolver';
import { _MqlAdminFlag, MqlPermissionError } from '../mql/permissions';
import { makeWorld, type MqlWorld } from './fixtures/mql-world';
import { MqlApi } from '../mql';
import type { MqlContext } from '../mql/types';
import type { Stuff } from '../../lib/stuff/Stuff';

function ids(matches: { stuff: Stuff }[]): string[] {
  return matches.map((m) => m.stuff.stuffId);
}

describe('MQL resolver — direct seeds', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'here' };
  });

  it('me resolves to the giver', () => {
    const out = resolve('me', ctx);
    expect(ids(out)).toEqual([world.giver.stuffId]);
  });

  it('here resolves to the giver location', () => {
    const out = resolve('here', ctx);
    expect(ids(out)).toEqual([world.location.stuffId]);
  });

  it('it / him / her / them resolve from the giver pronoun stash', () => {
    // Empty stash → empty match list.
    expect(resolve('it', ctx)).toEqual([]);
    expect(resolve('them', ctx)).toEqual([]);

    // Populate the stash directly (the dispatcher does this in
    // production; here we go through the public stash surface).
    world.giver.getPronounMemory().update(
      { stuff: [world.rose] },
      'rose',
      () => 'it'
    );
    expect(ids(resolve('it', ctx))).toEqual([world.rose.stuffId]);

    world.giver.getPronounMemory().update(
      { stuff: [world.rose, world.daisy] },
      'flowers',
      () => 'it'
    );
    // Multi-stuff routes to `them`.
    expect(ids(resolve('them', ctx))).toEqual([
      world.rose.stuffId,
      world.daisy.stuffId,
    ]);
  });

  it('$$ returns the previous full result, including via', () => {
    expect(resolve('$$', ctx)).toEqual([]);
    world.giver.getPronounMemory().update(
      { stuff: [world.location], via: { detailPath: ['inscription'] } },
      'square.inscription',
      () => 'it'
    );
    const out = resolve('$$', ctx);
    expect(out).toHaveLength(1);
    expect(out[0]!.stuff).toBe(world.location);
    expect(out[0]!.via).toEqual({ detailPath: ['inscription'] });
  });

  describe('admin-tier seeds', () => {
    afterEach(() => {
      _MqlAdminFlag.granter = () => false;
    });

    it('online rejects without admin', () => {
      expect(() => resolve('online', ctx)).toThrow(MqlPermissionError);
    });

    it('world rejects without admin', () => {
      expect(() => resolve('world', ctx)).toThrow(MqlPermissionError);
    });

    it('online resolves to all online holders when admin granted', () => {
      _MqlAdminFlag.granter = () => true;
      // No interactives are connected in tests, so result is empty
      // — still a successful resolve (no permission throw).
      expect(resolve('online', ctx)).toEqual([]);
    });

    it('world resolves all stuff when admin granted', () => {
      _MqlAdminFlag.granter = () => true;
      const out = resolve('world', ctx);
      const idSet = new Set(ids(out));
      expect(idSet.has(world.giver.stuffId)).toBe(true);
      expect(idSet.has(world.rose.stuffId)).toBe(true);
      expect(idSet.has(world.location.stuffId)).toBe(true);
    });
  });

  describe('inventory seed', () => {
    it('resolves to giver as anchor (transforms with :i give contents)', () => {
      // The `inventory` seed alias resolves to the giver itself. The
      // resolver's :i transform on the giver yields contents — but
      // bare `inventory` is the anchor, not its expansion.
      const out = resolve('inventory', ctx);
      expect(ids(out)).toEqual([world.giver.stuffId]);
    });

    it('inventory:i yields giver contents (the apple)', () => {
      const out = resolve('inventory:i', ctx);
      expect(ids(out)).toEqual([world.apple.stuffId]);
    });
  });

  describe('peers seed', () => {
    it('resolves to the location contents excluding the giver', () => {
      const out = resolve('peers', ctx);
      const idSet = new Set(ids(out));
      expect(idSet.has(world.rose.stuffId)).toBe(true);
      expect(idSet.has(world.daisy.stuffId)).toBe(true);
      expect(idSet.has(world.giver.stuffId)).toBe(false);
      expect(idSet.has(world.location.stuffId)).toBe(false);
    });

    it('mid-chain peers:rose filters peers by keyword', () => {
      const out = resolve('peers:rose', ctx);
      expect(ids(out)).toEqual([world.rose.stuffId]);
    });
  });

  describe('reachable seed', () => {
    it('includes peers, the location, and inventory items', () => {
      const out = resolve('reachable', ctx);
      const idSet = new Set(ids(out));
      expect(idSet.has(world.rose.stuffId)).toBe(true);
      expect(idSet.has(world.daisy.stuffId)).toBe(true);
      expect(idSet.has(world.location.stuffId)).toBe(true);
      expect(idSet.has(world.apple.stuffId)).toBe(true);
    });
  });

  describe('path seed', () => {
    afterEach(() => {
      _MqlAdminFlag.granter = () => false;
    });

    it('rejects without authoring tier', () => {
      expect(() => resolve('/obj/Avatar/*', ctx)).toThrow(MqlPermissionError);
    });

    it('returns empty when authoring is granted but nothing matches', () => {
      _MqlAdminFlag.granter = () => true;
      expect(resolve('/obj/Nope/*', ctx)).toEqual([]);
    });
  });
});

describe('MQL resolver — keyword search', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'reachable' };
  });

  it('rose finds the rose in the room', () => {
    const out = resolve('rose', ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });

  it('flower finds both rose and daisy (AND-narrow on shared keyword)', () => {
    const out = resolve('flower', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(true);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  it('honors a multi-source scope fragment', () => {
    ctx = { commandGiver: world.giver, scope: 'inventory, peers' };
    const out = resolve('apple', ctx);
    expect(ids(out)).toContain(world.apple.stuffId);
  });

  it('inventory-only scope does not find room contents', () => {
    ctx = { commandGiver: world.giver, scope: 'inventory' };
    const out = resolve('rose', ctx);
    expect(ids(out)).not.toContain(world.rose.stuffId);
  });

  it('inventory-only scope finds inventory items', () => {
    ctx = { commandGiver: world.giver, scope: 'inventory' };
    const out = resolve('apple', ctx);
    expect(ids(out)).toContain(world.apple.stuffId);
  });

  it('here scope alone matches keywords on the location itself', () => {
    ctx = { commandGiver: world.giver, scope: 'here' };
    const out = resolve('square', ctx);
    expect(ids(out)).toContain(world.location.stuffId);
  });

  it('here scope alone does NOT match peers (post-split)', () => {
    ctx = { commandGiver: world.giver, scope: 'here' };
    const out = resolve('rose', ctx);
    expect(ids(out)).not.toContain(world.rose.stuffId);
  });

  it('falls back to reachable when scope is empty', () => {
    ctx = { commandGiver: world.giver, scope: '' };
    const out = resolve('rose', ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });

  it('peers scope finds peer items', () => {
    ctx = { commandGiver: world.giver, scope: 'peers' };
    const out = resolve('rose', ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });

  it('reachable scope unions peers, here, and inventory', () => {
    ctx = { commandGiver: world.giver, scope: 'reachable' };
    expect(ids(resolve('rose', ctx))).toContain(world.rose.stuffId);
    expect(ids(resolve('apple', ctx))).toContain(world.apple.stuffId);
    expect(ids(resolve('square', ctx))).toContain(world.location.stuffId);
  });

  it('here:inscription navigates to the location detail', () => {
    // The `here` seed (location only) still carries its details; the
    // split removed contents from the candidate pool but kept the
    // location-as-anchor semantics. `:inscription` mid-chain matches
    // the detail name at top-level via depth.
    const out = resolve('here:inscription', ctx);
    expect(out).toHaveLength(1);
    expect(out[0]?.stuff.stuffId).toBe(world.location.stuffId);
  });

  it('peers scope does not include the giver itself', () => {
    ctx = { commandGiver: world.giver, scope: 'peers' };
    const out = resolve('bob', ctx);
    expect(ids(out)).not.toContain(world.giver.stuffId);
  });
});

describe('MQL resolver — transforms', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'here' };
  });

  it(':i lists giver contents (no via — Stuff containment)', () => {
    const out = resolve('me:i', ctx);
    expect(ids(out)).toContain(world.apple.stuffId);
  });

  it(':e gives giver environment (no via — Stuff containment)', () => {
    const out = resolve('me:e', ctx);
    expect(ids(out)).toContain(world.location.stuffId);
  });

  it('chained :e:i goes up then back into siblings', () => {
    // me:e is the location; :i is its contents (rose, daisy, giver)
    const out = resolve('me:e:i', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(true);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  describe('via-aware (inside the detail tree)', () => {
    it('here:bookcase:i lists child details of the bookcase detail', () => {
      // After `here:bookcase` the via.detailPath is ['bookcase'].
      // `:i` then descends one level — the bookcase has one child
      // detail, "book", so the result is a single match still
      // anchored on the location, with via.detailPath = ['bookcase',
      // 'book'].
      const out = resolve('here:bookcase:i', ctx);
      expect(out).toHaveLength(1);
      expect(out[0]?.stuff.stuffId).toBe(world.location.stuffId);
      expect(out[0]?.via?.detailPath).toEqual(['bookcase', 'book']);
    });

    it('here:bookcase:e pops the bookcase detail level', () => {
      // After `here:bookcase` the via is ['bookcase']. `:e` from a
      // detailPath of length 1 pops to no-via (same Stuff, no via).
      const out = resolve('here:bookcase:e', ctx);
      expect(out).toHaveLength(1);
      expect(out[0]?.stuff.stuffId).toBe(world.location.stuffId);
      expect(out[0]?.via?.detailPath).toBeUndefined();
    });

    it('here:bookcase:book:e pops to (location, via=[bookcase])', () => {
      // From detailPath = ['bookcase', 'book'], `:e` pops one level
      // back to ['bookcase'].
      const out = resolve('here:bookcase:book:e', ctx);
      expect(out).toHaveLength(1);
      expect(out[0]?.stuff.stuffId).toBe(world.location.stuffId);
      expect(out[0]?.via?.detailPath).toEqual(['bookcase']);
    });

    it('here:bookcase:i:book is equivalent to here:bookcase:book', () => {
      // The `:i` between detail steps is redundant — `:keyword`
      // already auto-extends with child detail names at the current
      // depth. Both forms should land the same match.
      const a = resolve('here:bookcase:i:book', ctx);
      const b = resolve('here:bookcase:book', ctx);
      expect(a).toHaveLength(1);
      expect(b).toHaveLength(1);
      expect(a[0]?.stuff.stuffId).toBe(b[0]?.stuff.stuffId);
      expect(a[0]?.via?.detailPath).toEqual(b[0]?.via?.detailPath);
    });

    it(':i with via on a non-Detailed stuff yields nothing', () => {
      // The rose isn't Detailed. If it ever shows up with a via.
      // detailPath, `:i` should fall through silently — same as the
      // no-via case for non-Container stuff.
      // (No public way to get a non-Detailed stuff with a via; this
      // is exercised through the negative path where bookcase has
      // no children — `here:inscription:i` should be empty since
      // inscription has no children.)
      const out = resolve('here:inscription:i', ctx);
      expect(out).toEqual([]);
    });
  });

  describe('deep transforms (`:I`, `:E`)', () => {
    it(':I (deep inventory) walks the whole containment subtree', () => {
      // The location's :I covers peers + the giver's contents
      // (apple). With a single non-nested layer and the apple
      // inside the giver, :I from `here` reaches the apple.
      const out = resolve('here:I', ctx);
      const idSet = new Set(ids(out));
      expect(idSet.has(world.rose.stuffId)).toBe(true);
      expect(idSet.has(world.daisy.stuffId)).toBe(true);
      expect(idSet.has(world.giver.stuffId)).toBe(true);
      expect(idSet.has(world.apple.stuffId)).toBe(true);
    });

    it(':I from the giver yields just inventory items (no peer descent)', () => {
      // me:I is the giver's deep contents — the apple (no further
      // nesting because TestThing isn't a Container).
      const out = resolve('me:I', ctx);
      expect(ids(out)).toEqual([world.apple.stuffId]);
    });

    it(':I with via emits every detail descendant from the tip', () => {
      // From here:bookcase (via=[bookcase]), :I walks descendants:
      // 'book' (the only child of bookcase). Result has via=
      // ['bookcase', 'book'].
      const out = resolve('here:bookcase:I', ctx);
      expect(out).toHaveLength(1);
      expect(out[0]?.via?.detailPath).toEqual(['bookcase', 'book']);
    });

    it(':E (root environment) walks the container chain to the topmost', () => {
      // me:E walks giver → location. The location has no container,
      // so it's the root.
      const out = resolve('me:E', ctx);
      expect(ids(out)).toEqual([world.location.stuffId]);
    });

    it(':E from a stuff already at the root yields nothing', () => {
      // here:E — the location has no container; result is empty.
      const out = resolve('here:E', ctx);
      expect(out).toEqual([]);
    });

    it(':E with via drops the entire detail path', () => {
      // From here:bookcase:book (via=['bookcase','book']), :E pops
      // back to (location, no via).
      const out = resolve('here:bookcase:book:E', ctx);
      expect(out).toHaveLength(1);
      expect(out[0]?.stuff.stuffId).toBe(world.location.stuffId);
      expect(out[0]?.via?.detailPath).toBeUndefined();
    });

    it(':E:E from inside a detail tree first pops the via, then walks to root', () => {
      // Asymmetric by design: the first :E drops the detail path
      // (same Stuff, no via); the second :E hits the no-via branch
      // and walks to the root container. So
      // `me:i:sword:engraving:E:E` first pops back to (sword, no via)
      // and then walks to the sword's outermost container.
      //
      // The test fixture's apple is Containable AND Detailed; give
      // it an "engraving" detail inline and walk:
      //   me:i:apple             → (apple, no via)
      //   me:i:apple:engraving   → (apple, via=['engraving'])
      //   me:i:apple:engraving:E → (apple, no via)        — first :E drops via
      //   me:i:apple:engraving:E:E → location             — second :E walks to root
      (world.apple as unknown as {
        setDetail: (ids: string[], desc: string) => void;
      }).setDetail(['engraving'], 'A small heart, scratched into the skin.');

      const oneStep = resolve('me:i:apple:engraving:E', ctx);
      expect(oneStep).toHaveLength(1);
      expect(oneStep[0]?.stuff.stuffId).toBe(world.apple.stuffId);
      expect(oneStep[0]?.via?.detailPath).toBeUndefined();

      const twoStep = resolve('me:i:apple:engraving:E:E', ctx);
      expect(twoStep).toHaveLength(1);
      expect(twoStep[0]?.stuff.stuffId).toBe(world.location.stuffId);
    });
  });
});

describe('MQL resolver — detail-keyword extension on `:`', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'here' };
  });

  it('here:inscription navigates to the inscription detail', () => {
    const out = resolve('here:inscription', ctx);
    expect(out).toHaveLength(1);
    expect(out[0]?.stuff.stuffId).toBe(world.location.stuffId);
    expect(out[0]?.via?.detailPath).toEqual(['inscription']);
  });

  it('here:bookcase navigates to the bookcase detail (top-level)', () => {
    const out = resolve('here:bookcase', ctx);
    expect(out).toHaveLength(1);
    expect(out[0]?.stuff.stuffId).toBe(world.location.stuffId);
    expect(out[0]?.via?.detailPath).toEqual(['bookcase']);
  });

  it('here:bookcase:book navigates to the book child detail', () => {
    const out = resolve('here:bookcase:book', ctx);
    expect(out).toHaveLength(1);
    expect(out[0]?.stuff.stuffId).toBe(world.location.stuffId);
    expect(out[0]?.via?.detailPath).toEqual(['bookcase', 'book']);
  });

  it('here:nope returns no matches (not a detail of the location)', () => {
    const out = resolve('here:nope', ctx);
    expect(out).toEqual([]);
  });

  it('here:rose returns no matches — chain narrows, never broadens', () => {
    // "rose" is a peer keyword, not a top-level detail of the location.
    // Chain `:` is narrow-with-detail-extension, so `:rose` filters
    // the prior set ((location, no via)) and only matches when "rose"
    // is one of the location's keywords or a top-level detail name.
    // Neither holds, so the result is empty.
    const out = resolve('here:rose', ctx);
    expect(out).toEqual([]);
  });

  it('bookcase:rose returns no matches — child of bookcase has no rose', () => {
    // The bareword `bookcase` resolves at the seed via the scope
    // walker, which emits a candidate per top-level detail of the
    // location. `:rose` then narrows: candidates are the host's own
    // keywords plus children of the bookcase detail (`book`). No rose.
    const out = resolve('bookcase:rose', ctx);
    expect(out).toEqual([]);
  });

  it('detail extension is via-aware: top-level when no via', () => {
    // `here` produces (location, no via). Filtering by `bookcase`
    // matches the top-level detail. After this step the via depth is
    // 1, so the next `:` should look for child details, not top-level
    // ones — confirmed by `here:bookcase:book` finding the nested
    // book detail.
    const out = resolve('here:bookcase:book', ctx);
    expect(out[0]?.via?.detailPath).toEqual(['bookcase', 'book']);
  });

  it('detail extension is via-aware: child-of-tip when via set', () => {
    // After `here:bookcase`, via.detailPath = ['bookcase']. A second
    // `:book` step looks for children of "bookcase", not for top-level
    // details. `inscription` is top-level, so `here:bookcase:inscription`
    // misses (inscription is not a child of bookcase).
    const out = resolve('here:bookcase:inscription', ctx);
    expect(out).toEqual([]);
  });

  it("rejects the old '.X' detail-drill form at parse time", () => {
    expect(() => resolve('here.inscription', ctx)).toThrow(
      /'\.X' detail-drill/
    );
  });
});

describe('MQL resolver — scope-as-MQL evaluation', () => {
  let world: MqlWorld;

  beforeEach(() => {
    world = makeWorld();
  });

  it('scope: "rose" walks the rose anchor neighborhood', () => {
    // The rose's neighborhood includes its own keywords (`rose`,
    // `flower`). Searching "flower" in this scope finds the rose.
    const ctx: MqlContext = { commandGiver: world.giver, scope: 'rose' };
    const out = resolve('flower', ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
    expect(ids(out)).not.toContain(world.daisy.stuffId);
  });

  it('scope: "bookcase:book" walks the book detail neighborhood', () => {
    // The book detail has no children; its neighborhood is just the
    // tip name. Searching "book" finds it (the host stuff is the
    // location, with via=[bookcase, book]).
    const ctx: MqlContext = {
      commandGiver: world.giver,
      scope: 'bookcase:book',
    };
    const out = resolve('book', ctx);
    expect(out).toHaveLength(1);
    expect(out[0]?.stuff.stuffId).toBe(world.location.stuffId);
    expect(out[0]?.via?.detailPath).toEqual(['bookcase', 'book']);
  });

  it('scope: "bookcase" walks the bookcase detail neighborhood (children visible)', () => {
    // The bookcase detail has one child, "book". Searching "book" in
    // this scope finds it.
    const ctx: MqlContext = { commandGiver: world.giver, scope: 'bookcase' };
    const out = resolve('book', ctx);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0]?.via?.detailPath).toEqual(['bookcase', 'book']);
  });

  it('scope: "here" still hits the fast path', () => {
    // The fast path predates this work; it still produces the right
    // candidates for keyword search.
    const ctx: MqlContext = { commandGiver: world.giver, scope: 'here' };
    const out = resolve('square', ctx);
    expect(ids(out)).toContain(world.location.stuffId);
  });

  it('scope: "reachable, peers" still hits the fast path (comma-union)', () => {
    const ctx: MqlContext = {
      commandGiver: world.giver,
      scope: 'reachable, peers',
    };
    const out = resolve('rose', ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });

  it('scope: "no_such_thing" falls back to reachable', () => {
    // Unknown bareword: slow path resolves to nothing, last-resort
    // is reachable.
    const ctx: MqlContext = {
      commandGiver: world.giver,
      scope: 'no_such_thing',
    };
    const out = resolve('rose', ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });
});

describe('MQL resolver — mid-chain seed semantics', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'reachable' };
  });

  afterEach(() => {
    _MqlAdminFlag.granter = () => false;
  });

  // Element-derivable seeds (`peers`, `reachable`, `inventory`)
  // flat-map per-element with set-aware exclusion of the prior set.
  // Fixed-pool seeds (`me`, `here`, `online`, `world`, paths,
  // stuff ids, `$$`, groups) intersect.

  it('flat-map: (rose, daisy):peers excludes rose and daisy themselves', () => {
    // rose and daisy share the room with the giver. `peers(rose)` is
    // the room contents minus rose (= giver, daisy); `peers(daisy)`
    // is room minus daisy (= giver, rose). Union, then exclude
    // {rose, daisy} → just the giver.
    const out = resolve('(rose, daisy):peers', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(false);
    expect(idSet.has(world.daisy.stuffId)).toBe(false);
    expect(idSet.has(world.giver.stuffId)).toBe(true);
  });

  it('flat-map: flower:peers — peers of each flower, minus the flowers', () => {
    // The keyword "flower" matches rose and daisy. `:peers`
    // flat-maps over both, unions, then excludes rose and daisy.
    const out = resolve('flower:peers', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(false);
    expect(idSet.has(world.daisy.stuffId)).toBe(false);
    expect(idSet.has(world.giver.stuffId)).toBe(true);
  });

  it('flat-map: peers:reachable expands each peer to its reachable set (includes self-reachable)', () => {
    // Each peer's reachable set includes itself (you can reach
    // yourself), so rose and daisy stay in the result. The room
    // and giver are also in each peer's reachable set.
    const out = resolve('peers:reachable', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(true);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
    expect(idSet.has(world.location.stuffId)).toBe(true);
    expect(idSet.has(world.giver.stuffId)).toBe(true);
  });

  it('flat-map: (rose, daisy):reachable keeps rose and daisy (self-reachable)', () => {
    // `reachable` includes the focal in its per-element definition,
    // so set-aware exclusion does NOT apply. Contrast with
    // `(rose, daisy):peers`, which excludes the prior set.
    const out = resolve('(rose, daisy):reachable', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(true);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  it('flat-map: me:i:peers is empty (peers of inventory items are siblings; all in prior set)', () => {
    // me:i is the giver's inventory (apple). peers(apple) =
    // apple.container.contents - apple = giver.contents - apple,
    // which would be other inventory items if any. With one
    // inventory item, peers(apple) is empty. Either way, set-aware
    // exclusion drops anything that was in the prior set.
    const out = resolve('me:i:peers', ctx);
    expect(out).toEqual([]);
  });

  it('flat-map: me:i:inventory is empty (inventory items are not Containers)', () => {
    // me:i = apple (a TestThing, not a Container).
    // inventory(apple) = ∅ because apple isn't a Container.
    const out = resolve('me:i:inventory', ctx);
    expect(out).toEqual([]);
  });

  it('intersection: reachable:online (online is fixed-pool) is empty when nobody is online', () => {
    _MqlAdminFlag.granter = () => true;
    // No interactives connected → online is empty → intersection is
    // empty.
    expect(resolve('reachable:online', ctx)).toEqual([]);
  });

  it('intersection: peers:me filters peers down to the giver (not in peers, so empty)', () => {
    // `me` is a fixed-pool seed (the giver). Mid-chain `:me`
    // intersects: which peers are the giver? None — peers exclude
    // the giver by definition.
    const out = resolve('peers:me', ctx);
    expect(out).toEqual([]);
  });

  it('intersection: reachable:here filters reachable down to the location', () => {
    // `here` is a fixed-pool seed (the location). Mid-chain `:here`
    // intersects.
    const out = resolve('reachable:here', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.location.stuffId)).toBe(true);
    expect(idSet.size).toBeGreaterThanOrEqual(1);
  });

  it('intersection preserves prior via on fixed-pool seeds', () => {
    // Navigate into the inscription detail (chain narrowing), then
    // intersect with `here` (fixed-pool — the location). The
    // location is one of the matches; its prior via.detailPath is
    // preserved.
    const out = resolve('here:inscription:here', ctx);
    expect(out.length).toBeGreaterThanOrEqual(1);
    const withDetail = out.find((m) => m.via?.detailPath?.[0] === 'inscription');
    expect(withDetail).toBeDefined();
  });

  it('peers:sword (bareword keyword filter) still works', () => {
    // `sword` is not a seed name → falls through to keyword filter.
    const out = resolve('peers:sword', ctx);
    expect(out).toEqual([]);
  });

  it('flower:online from a non-admin throws', () => {
    expect(() => resolve('flower:online', ctx)).toThrow(MqlPermissionError);
  });
});

describe('MQL resolver — set operations', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'reachable' };
  });

  it('comma is union', () => {
    const out = resolve('rose, daisy', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(true);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  it('dash is set difference', () => {
    const out = resolve('flower - rose', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(false);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  it('dedups across union', () => {
    const out = resolve('rose, rose, rose', ctx);
    const matchIds = ids(out);
    expect(matchIds.filter((id) => id === world.rose.stuffId)).toHaveLength(1);
  });
});

describe('MQL resolver — literals', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'reachable' };
  });

  it("'rose' (literal) matches by exact name", () => {
    const out = resolve("'rose'", ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });

  it("'Town Square' (literal) matches case-insensitively on the location", () => {
    const out = resolve("'Town Square'", ctx);
    expect(ids(out)).toContain(world.location.stuffId);
  });

  it("'no such thing' returns empty", () => {
    const out = resolve("'no such thing'", ctx);
    expect(out).toEqual([]);
  });
});

describe('MQL resolver — predicates', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'reachable' };
  });

  afterEach(() => {
    _MqlAdminFlag.granter = () => false;
  });

  it(':here filters to the giver location and contents', () => {
    const out = resolve('flower:here', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(true);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  it(':visible includes the giver itself when it appears', () => {
    // me:visible — the giver is always visible to itself.
    const out = resolve('me:visible', ctx);
    expect(ids(out)).toEqual([world.giver.stuffId]);
  });

  it(':living drops non-mobile things', () => {
    // None of the test fixture stuff composes Mobile, so :living
    // filters everything out.
    const out = resolve('flower:living', ctx);
    expect(out).toEqual([]);
  });

  it(':mine returns empty (owner subsystem stub)', () => {
    const out = resolve('flower:mine', ctx);
    expect(out).toEqual([]);
  });

  it(':online requires admin tier', () => {
    expect(() => resolve('me:online', ctx)).toThrow(MqlPermissionError);
  });

  it(':admin requires admin tier', () => {
    expect(() => resolve('me:admin', ctx)).toThrow(MqlPermissionError);
  });
});

describe('MQL resolver — filter expressions', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'reachable' };
    _MqlAdminFlag.granter = () => true; // admin so authoring tier passes
  });

  afterEach(() => {
    _MqlAdminFlag.granter = () => false;
  });

  it("filters by name comparison", () => {
    const out = resolve("flower:[name = 'rose']", ctx);
    expect(ids(out)).toEqual([world.rose.stuffId]);
  });

  it('filters by != comparison', () => {
    const out = resolve("flower:[name != 'rose']", ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(false);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  it('filters by keyword presence', () => {
    const out = resolve('flower:[keyword.daisy]', ctx);
    expect(ids(out)).toEqual([world.daisy.stuffId]);
  });

  it('filters by mixin composition', () => {
    const out = resolve('flower:[mixin.NamedMixin]', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(true);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  it('boolean composition (and)', () => {
    const out = resolve(
      "flower:[keyword.flower and name = 'rose']",
      ctx
    );
    expect(ids(out)).toEqual([world.rose.stuffId]);
  });

  it('boolean composition (or)', () => {
    const out = resolve(
      "flower:[name = 'rose' or name = 'daisy']",
      ctx
    );
    expect(ids(out)).toHaveLength(2);
  });

  it('not-expression', () => {
    const out = resolve("flower:[not name = 'rose']", ctx);
    expect(ids(out)).toEqual([world.daisy.stuffId]);
  });

  it("comparison against a missing property is always false", () => {
    const out = resolve('flower:[prop.gold > 0]', ctx);
    expect(out).toEqual([]);
  });

  it('rejects authoring filters without privilege', () => {
    _MqlAdminFlag.granter = () => false;
    expect(() => resolve('flower:[mixin.NamedMixin]', ctx)).toThrow(
      MqlPermissionError
    );
  });
});

describe('MQL resolver — bracket ordinals and ranges', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'reachable' };
  });

  it('[1] picks the first match', () => {
    const out = resolve('flower:[1]', ctx);
    expect(out).toHaveLength(1);
  });

  it('[-1] picks the last match', () => {
    const out = resolve('flower:[-1]', ctx);
    expect(out).toHaveLength(1);
  });

  it('[1..3] picks the inclusive range', () => {
    const out = resolve('flower:[1..3]', ctx);
    expect(out.length).toBeLessThanOrEqual(2);
  });

  it('[N..] picks to the end', () => {
    const out = resolve('flower:[1..]', ctx);
    expect(out.length).toBeGreaterThanOrEqual(1);
  });
});

describe('MQL resolver — desugar integration', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'reachable' };
  });

  it('strips leading articles', () => {
    const out = resolve('the rose', ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });

  it('rewrites ordinal-prefix queries', () => {
    // `first flower` → `flower:[1]`
    const out = resolve('first flower', ctx);
    expect(out).toHaveLength(1);
  });

  it("'last' resolves to the last match", () => {
    const out = resolve('last flower', ctx);
    expect(out).toHaveLength(1);
  });
});

describe('MQL resolver — quantity threading', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'reachable' };
  });

  it('threads a natural-language count onto MqlApi.resolveMany as lenient', () => {
const out = MqlApi.resolveMany('2 flower', ctx);
    expect(out.quantity).toEqual({
      value: { kind: 'count', n: 2 },
      mode: 'lenient',
    });
    expect(out.stuff.length).toBeGreaterThan(0);
  });

  it('threads a natural-language "all" onto MqlApi.resolveMany as lenient', () => {
const out = MqlApi.resolveMany('all flower', ctx);
    expect(out.quantity).toEqual({
      value: { kind: 'all' },
      mode: 'lenient',
    });
  });

  it('threads a formal :{N} onto MqlApi.resolveMany as strict', () => {
const out = MqlApi.resolveMany('flower:{2}', ctx);
    expect(out.quantity).toEqual({
      value: { kind: 'count', n: 2 },
      mode: 'strict',
    });
  });

  it('threads a formal :{*} onto MqlApi.resolveMany as strict', () => {
const out = MqlApi.resolveMany('flower:{*}', ctx);
    expect(out.quantity).toEqual({
      value: { kind: 'all' },
      mode: 'strict',
    });
  });

  it('threads quantity onto resolveOne even when stuff is null', () => {
// Use a key that won't match anything but carry a strict count
    // through the formal syntax.
    const out = MqlApi.resolveOne('zzznomatch:{3}', ctx);
    expect(out.stuff).toBeNull();
    expect(out.quantity).toEqual({
      value: { kind: 'count', n: 3 },
      mode: 'strict',
    });
  });

  it('omits quantity when the query carried no hint', () => {
const out = MqlApi.resolveMany('flower', ctx);
    expect(out.quantity).toBeUndefined();
  });

  it('surfaces a quantity+ordinal collision as a desugar error', () => {
    expect(() => resolve('2nd 3 flower', ctx)).toThrow(MqlDesugarError);
    expect(() => resolve('2nd 3 flower', ctx)).toThrow(/ambiguous/);
  });
});
