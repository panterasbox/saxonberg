/**
 * DetailedMixin tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DetailedMixin, type DetailMap } from '../Detailed';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";

// Test class with DetailedMixin.
// Subclass-level test seams: `peekDetails()` / `seedDetails()` expose
// the protected mixin storage so assertions can inspect / replace the
// internal Map directly.
class DetailedThing extends DetailedMixin(Idea) {
  static persistentFields: string[] = [];
  public peekDetails(): DetailMap { return this.details; }
  public seedDetails(map: DetailMap): void { this.details = map; }
}

/**
 * Canonical serialization of a DetailMap — used to compare structural
 * equality regardless of order or whether inner Maps are undefined vs empty.
 *
 * The existing test fixtures populate Details via the legacy
 * string-description overload of `setDetail`, which routes to the
 * `vision` slot. The helper reads `detail.vision` and surfaces it as
 * `description` for assertion back-compat.
 */
type SerializedDetail = {
  description: string;
  children: Record<string, SerializedDetail> | null;
};
function serialize(map: DetailMap): Record<string, SerializedDetail> {
  const out: Record<string, SerializedDetail> = {};
  for (const [id, detail] of map.entries()) {
    out[id] = {
      description: detail.vision ?? '',
      children:
        detail.details && detail.details.size > 0
          ? serialize(detail.details)
          : null,
    };
  }
  return out;
}

describe('DetailedMixin', () => {
  let obj: DetailedThing;

  beforeEach(() => {
    obj = makeStuff(() => new DetailedThing());
  });

  describe('Construction', () => {
    it('should create object with empty details', () => {
      expect(obj.peekDetails()).toBeDefined();
      expect(obj.peekDetails().size).toBe(0);
    });

    it('should have DetailedMixin marker', () => {
      expect(MixinApi.hasMixin(DetailedThing, 'DetailedMixin')).toBe(true);
    });

    it('should declare details as persistent field', () => {
      const fields = MixinApi.getAllPersistentFields(DetailedThing);
      expect(fields).toContain('details');
    });
  });

  describe('setDetail()', () => {
    it('should add a single detail', () => {
      const count = obj.setDetail(['handle'], 'A brass handle.');
      expect(count).toBe(1);
      expect(obj.getDetail('handle')).toBe('A brass handle.');
    });

    it('should add multiple IDs (aliases) for same detail', () => {
      const count = obj.setDetail(
        ['handle', 'doorknob'],
        'A brass handle, tarnished with age.',
      );
      expect(count).toBe(2);

      // Both IDs should return same description
      expect(obj.getDetail('handle')).toBe(
        'A brass handle, tarnished with age.',
      );
      expect(obj.getDetail('doorknob')).toBe(
        'A brass handle, tarnished with age.',
      );
    });

    it('should add nested detail with parent', () => {
      obj.setDetail(['handle'], 'A brass handle.');
      const count = obj.setDetail(
        ['lock'],
        'A small keyhole beneath the handle.',
        'handle',
      );
      expect(count).toBe(1);

      expect(obj.getDetail('lock', 'handle')).toBe(
        'A small keyhole beneath the handle.',
      );
    });

    it('should support deep nesting', () => {
      obj.setDetail(['handle'], 'A brass handle.');
      obj.setDetail(['lock'], 'A keyhole.', 'handle');
      obj.setDetail(['mechanism'], 'Intricate tumblers.', 'handle.lock');

      expect(obj.getDetail('mechanism', 'handle.lock')).toBe(
        'Intricate tumblers.',
      );
    });

    it('should support dot notation in ID', () => {
      obj.setDetail(['handle'], 'A brass handle.');

      // "handle.lock" should resolve to parent="handle", id="lock"
      const count = obj.setDetail(['handle.lock'], 'A keyhole.');
      expect(count).toBe(1);

      expect(obj.getDetail('lock', 'handle')).toBe('A keyhole.');
    });

    it('should not add detail if ID already exists', () => {
      obj.setDetail(['handle'], 'A brass handle.');

      // Trying to add 'handle' again should fail
      const count = obj.setDetail(['handle'], 'Another description.');
      expect(count).toBe(0);

      // Original description preserved
      expect(obj.getDetail('handle')).toBe('A brass handle.');
    });

    it('should return count of IDs added', () => {
      const count = obj.setDetail(['a', 'b', 'c'], 'Multiple aliases.');
      expect(count).toBe(3);
    });

    it('should skip IDs that already exist', () => {
      obj.setDetail(['a'], 'First.');
      const count = obj.setDetail(['a', 'b', 'c'], 'Second.');

      // Only 'b' and 'c' added ('a' skipped)
      expect(count).toBe(2);
    });
  });

  describe('getDetail()', () => {
    beforeEach(() => {
      obj.setDetail(['handle'], 'A brass handle.');
      obj.setDetail(['lock'], 'A keyhole.', 'handle');
    });

    it('should get top-level detail', () => {
      expect(obj.getDetail('handle')).toBe('A brass handle.');
    });

    it('should get nested detail with parent', () => {
      expect(obj.getDetail('lock', 'handle')).toBe('A keyhole.');
    });

    it('should return null for non-existent detail', () => {
      expect(obj.getDetail('nonexistent')).toBeNull();
    });

    it('should return null for non-existent parent', () => {
      expect(obj.getDetail('lock', 'nonexistent')).toBeNull();
    });

    it('should support dot notation in ID', () => {
      // "handle.lock" resolves to parent="handle", id="lock"
      expect(obj.getDetail('handle.lock')).toBe('A keyhole.');
    });
  });

  describe('getDetailIds()', () => {
    beforeEach(() => {
      obj.setDetail(['a', 'b'], 'Description A.');
      obj.setDetail(['c'], 'Description C.');
      obj.setDetail(['d'], 'Child of A.', 'a');
    });

    it('should get all top-level detail IDs', () => {
      const ids = obj.getDetailIds();
      expect(ids).not.toBeNull();
      expect(ids!.sort()).toEqual(['a', 'b', 'c']);
    });

    it('should get detail IDs for nested level', () => {
      const ids = obj.getDetailIds('a');
      expect(ids).not.toBeNull();
      expect(ids!).toEqual(['d']);
    });

    it('should return null for non-existent parent', () => {
      const ids = obj.getDetailIds('nonexistent');
      expect(ids).toBeNull();
    });

    it('should return empty array for detail with no children', () => {
      const ids = obj.getDetailIds('c');
      expect(ids).not.toBeNull();
      expect(ids!.length).toBe(0);
    });
  });

  describe('getDeepDetailIds()', () => {
    beforeEach(() => {
      obj.setDetail(['root'], 'Root detail.');
      obj.setDetail(['child1'], 'Child 1.', 'root');
      obj.setDetail(['child2'], 'Child 2.', 'root');
      obj.setDetail(['grandchild'], 'Grandchild.', 'root.child1');
    });

    it('should get all detail IDs recursively from top', () => {
      const ids = obj.getDeepDetailIds();
      expect(ids).not.toBeNull();
      expect(ids!.sort()).toEqual(['child1', 'child2', 'grandchild', 'root']);
    });

    it('should get all detail IDs recursively from parent', () => {
      const ids = obj.getDeepDetailIds('root');
      expect(ids).not.toBeNull();
      expect(ids!.sort()).toEqual(['child1', 'child2', 'grandchild']);
    });

    it('should return null for non-existent parent', () => {
      const ids = obj.getDeepDetailIds('nonexistent');
      expect(ids).toBeNull();
    });

    it('should return empty array for detail with no children', () => {
      const ids = obj.getDeepDetailIds('root.child2');
      expect(ids).not.toBeNull();
      expect(ids!.length).toBe(0);
    });
  });

  describe('removeDetail()', () => {
    beforeEach(() => {
      obj.setDetail(['handle', 'doorknob'], 'A brass handle.');
      obj.setDetail(['lock'], 'A keyhole.', 'handle');
    });

    it('should remove detail by ID', () => {
      const count = obj.removeDetail(['handle']);
      expect(count).toBe(1);
      expect(obj.getDetail('handle')).toBeNull();
    });

    it('should remove multiple IDs', () => {
      const count = obj.removeDetail(['handle', 'doorknob']);
      expect(count).toBe(2);
      expect(obj.getDetail('handle')).toBeNull();
      expect(obj.getDetail('doorknob')).toBeNull();
    });

    it('should remove nested detail with parent', () => {
      const count = obj.removeDetail(['lock'], 'handle');
      expect(count).toBe(1);
      expect(obj.getDetail('lock', 'handle')).toBeNull();

      // Parent should still exist
      expect(obj.getDetail('handle')).toBe('A brass handle.');
    });

    it('should return count of IDs removed', () => {
      const count = obj.removeDetail(['handle', 'doorknob']);
      expect(count).toBe(2);
    });

    it('should skip non-existent IDs', () => {
      const count = obj.removeDetail(['handle', 'nonexistent', 'doorknob']);

      // Only 'handle' and 'doorknob' removed
      expect(count).toBe(2);
    });

    it('should return 0 if no IDs removed', () => {
      const count = obj.removeDetail(['nonexistent']);
      expect(count).toBe(0);
    });

    it('should support dot notation in ID', () => {
      const count = obj.removeDetail(['handle.lock']);
      expect(count).toBe(1);
      expect(obj.getDetail('lock', 'handle')).toBeNull();
    });
  });

  describe('Detail sharing (multiple IDs, same description)', () => {
    it('should share one Detail object across all aliases in a single call', () => {
      obj.setDetail(['x', 'y', 'z'], 'Shared description.');

      const dx = obj.peekDetails().get('x');
      const dy = obj.peekDetails().get('y');
      const dz = obj.peekDetails().get('z');
      expect(dx).toBeDefined();
      expect(dx).toBe(dy);
      expect(dy).toBe(dz);
    });

    it('should NOT share Detail objects across separate setDetail calls', () => {
      // Each setDetail call produces a fresh Detail, even when descriptions
      // match. Cross-call reuse previously caused a self-reference cycle
      // when a nested description matched a top-level one.
      obj.setDetail(['a'], 'Same description.');
      obj.setDetail(['b'], 'Same description.');

      const detailA = obj.peekDetails().get('a');
      const detailB = obj.peekDetails().get('b');

      expect(detailA).not.toBe(detailB);
      expect(detailA!.description).toBe(detailB!.description);
    });
  });

  describe('Complex hierarchies', () => {
    it('should support multi-level nesting', () => {
      obj.setDetail(['level1'], 'Level 1.');
      obj.setDetail(['level2'], 'Level 2.', 'level1');
      obj.setDetail(['level3'], 'Level 3.', 'level1.level2');
      obj.setDetail(['level4'], 'Level 4.', 'level1.level2.level3');

      expect(obj.getDetail('level4', 'level1.level2.level3')).toBe('Level 4.');
      expect(obj.getDetail('level1.level2.level3.level4')).toBe('Level 4.');
    });

    it('should support multiple children at each level', () => {
      obj.setDetail(['root'], 'Root.');
      obj.setDetail(['child1', 'c1'], 'Child 1.', 'root');
      obj.setDetail(['child2', 'c2'], 'Child 2.', 'root');
      obj.setDetail(['grandchild1'], 'GC1.', 'root.child1');
      obj.setDetail(['grandchild2'], 'GC2.', 'root.child2');

      // Top level should only have 'root'
      const topLevelIds = obj.getDetailIds();
      expect(topLevelIds!).toEqual(['root']);

      // Children of root should have both IDs for each child
      const rootChildIds = obj.getDetailIds('root');
      expect(rootChildIds!.sort()).toEqual(['c1', 'c2', 'child1', 'child2']);

      const child1Ids = obj.getDetailIds('root.child1');
      expect(child1Ids!).toEqual(['grandchild1']);

      const child2Ids = obj.getDetailIds('root.child2');
      expect(child2Ids!).toEqual(['grandchild2']);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty detail array', () => {
      const count = obj.setDetail([], 'Empty array.');
      expect(count).toBe(0);
    });

    it('should handle empty description', () => {
      const count = obj.setDetail(['test'], '');
      expect(count).toBe(1);
      expect(obj.getDetail('test')).toBe('');
    });

    it('should handle whitespace in IDs', () => {
      const count = obj.setDetail(['  trimmed  '], 'Test.');
      expect(count).toBe(1);
      expect(obj.getDetail('  trimmed  ')).toBe('Test.');
    });

    it('should handle special characters in IDs', () => {
      obj.setDetail(['test@#$%'], 'Special chars.');
      expect(obj.getDetail('test@#$%')).toBe('Special chars.');
    });

    it('should handle very long ID strings', () => {
      const longId = 'a'.repeat(1000);
      obj.setDetail([longId], 'Long ID.');
      expect(obj.getDetail(longId)).toBe('Long ID.');
    });

    it('should handle deeply nested structures (10+ levels)', () => {
      // Create a 10-level deep hierarchy
      obj.setDetail(['l0'], 'Level 0');
      obj.setDetail(['l1'], 'Level 1', 'l0');
      obj.setDetail(['l2'], 'Level 2', 'l0.l1');
      obj.setDetail(['l3'], 'Level 3', 'l0.l1.l2');
      obj.setDetail(['l4'], 'Level 4', 'l0.l1.l2.l3');
      obj.setDetail(['l5'], 'Level 5', 'l0.l1.l2.l3.l4');
      obj.setDetail(['l6'], 'Level 6', 'l0.l1.l2.l3.l4.l5');
      obj.setDetail(['l7'], 'Level 7', 'l0.l1.l2.l3.l4.l5.l6');
      obj.setDetail(['l8'], 'Level 8', 'l0.l1.l2.l3.l4.l5.l6.l7');
      obj.setDetail(['l9'], 'Level 9', 'l0.l1.l2.l3.l4.l5.l6.l7.l8');

      expect(obj.getDetail('l9', 'l0.l1.l2.l3.l4.l5.l6.l7.l8')).toBe('Level 9');
      expect(obj.getDetail('l0.l1.l2.l3.l4.l5.l6.l7.l8.l9')).toBe('Level 9');
    });
  });

  describe('Dot notation edge cases', () => {
    beforeEach(() => {
      obj.setDetail(['parent'], 'Parent detail.');
      obj.setDetail(['child'], 'Child detail.', 'parent');
    });

    it('should combine parent parameter with dot notation in ID', () => {
      // Set up hierarchy
      obj.setDetail(['grandchild'], 'Grandchild.', 'parent.child');

      // Use dot notation in ID with parent parameter
      // parent.child + "grandchild.great" → parent.child.grandchild.great
      obj.setDetail(['grandchild.great'], 'Great-grandchild.', 'parent.child');

      expect(obj.getDetail('great', 'parent.child.grandchild')).toBe('Great-grandchild.');
    });

    it('should handle multiple dots in ID', () => {
      obj.setDetail(['a'], 'Level A.');
      obj.setDetail(['b'], 'Level B.', 'a');
      obj.setDetail(['c'], 'Level C.', 'a.b');

      // Use multi-dot notation
      const count = obj.setDetail(['a.b.c.d'], 'Level D via dots.');
      expect(count).toBe(1);
      expect(obj.getDetail('d', 'a.b.c')).toBe('Level D via dots.');
    });
  });

  describe('Alias management', () => {
    it('should remove one alias but keep detail if other aliases remain', () => {
      obj.setDetail(['a', 'b', 'c'], 'Shared detail.');

      // Remove one alias
      const count = obj.removeDetail(['b']);
      expect(count).toBe(1);

      // 'b' should be gone
      expect(obj.getDetail('b')).toBeNull();
      expect(obj.peekDetails().has('b')).toBe(false);

      // 'a' and 'c' should still work and still share the same Detail object
      expect(obj.getDetail('a')).toBe('Shared detail.');
      expect(obj.getDetail('c')).toBe('Shared detail.');
      expect(obj.peekDetails().get('a')).toBe(obj.peekDetails().get('c'));
    });

    it('should remove detail completely when all aliases are removed', () => {
      obj.setDetail(['x', 'y'], 'Two aliases.');

      obj.removeDetail(['x']);
      expect(obj.getDetail('x')).toBeNull();
      expect(obj.getDetail('y')).toBe('Two aliases.');

      obj.removeDetail(['y']);
      expect(obj.getDetail('y')).toBeNull();

      // Map should be empty
      expect(obj.peekDetails().size).toBe(0);
    });

    it('should handle removing non-existent alias from multi-alias detail', () => {
      obj.setDetail(['a', 'b'], 'Two aliases.');
      const count = obj.removeDetail(['a', 'nonexistent', 'b']);

      // Only 'a' and 'b' removed (nonexistent skipped)
      expect(count).toBe(2);
    });
  });

  describe('Parent details Map initialization', () => {
    it('should auto-initialize details Map when adding nested detail', () => {
      obj.setDetail(['parent'], 'Parent.');

      // parent.details should not exist yet
      const parentDetail = obj.peekDetails().get('parent');
      expect(parentDetail?.details).toBeUndefined();

      // Adding child should initialize parent.details
      obj.setDetail(['child'], 'Child.', 'parent');

      expect(parentDetail?.details).toBeDefined();
      expect(parentDetail?.details?.size).toBe(1);
    });

    it('should auto-initialize details Map when querying with getDetailIds', () => {
      obj.setDetail(['parent'], 'Parent.');

      const parentDetail = obj.peekDetails().get('parent');
      expect(parentDetail?.details).toBeUndefined();

      // Query should initialize the Map
      const ids = obj.getDetailIds('parent');
      expect(ids).not.toBeNull();
      expect(ids!.length).toBe(0);
      expect(parentDetail?.details).toBeDefined();
    });

    it('should auto-initialize details Map when querying with getDeepDetailIds', () => {
      obj.setDetail(['parent'], 'Parent.');

      const parentDetail = obj.peekDetails().get('parent');
      expect(parentDetail?.details).toBeUndefined();

      // Query should initialize the Map
      const ids = obj.getDeepDetailIds('parent');
      expect(ids).not.toBeNull();
      expect(ids!.length).toBe(0);
      expect(parentDetail?.details).toBeDefined();
    });
  });

  describe('Persistence and serialization', () => {
    it('should serialize and deserialize simple details', () => {
      obj.setDetail(['test'], 'Test description.');

      // Serialize
      const serialized = JSON.stringify(Array.from(obj.peekDetails().entries()));

      // Deserialize into new object
      const obj2 = makeStuff(() => new DetailedThing());
      obj2.seedDetails(new Map(JSON.parse(serialized)));

      expect(obj2.getDetail('test')).toBe('Test description.');
    });

    it('should serialize and deserialize nested details', () => {
      obj.setDetail(['parent'], 'Parent.');
      obj.setDetail(['child'], 'Child.', 'parent');
      obj.setDetail(['grandchild'], 'Grandchild.', 'parent.child');

      // Serialize (requires custom serialization for nested Maps).
      // Fixtures populate via the legacy string overload, which
      // routes to the `vision` slot — round-trip through `vision`.
      const serialize = (details: Map<string, any>): any => {
        return Array.from(details.entries()).map(([key, detail]) => [
          key,
          {
            vision: detail.vision,
            details: detail.details ? serialize(detail.details) : undefined,
          },
        ]);
      };

      const deserialize = (data: any): Map<string, any> => {
        return new Map(
          data.map(([key, detail]: [string, any]) => [
            key,
            {
              vision: detail.vision,
              details: detail.details ? deserialize(detail.details) : undefined,
            },
          ])
        );
      };

      const serialized = JSON.stringify(serialize(obj.peekDetails()));

      // Deserialize into new object
      const obj2 = makeStuff(() => new DetailedThing());
      obj2.seedDetails(deserialize(JSON.parse(serialized)));

      expect(obj2.getDetail('parent')).toBe('Parent.');
      expect(obj2.getDetail('child', 'parent')).toBe('Child.');
      expect(obj2.getDetail('grandchild', 'parent.child')).toBe('Grandchild.');
    });
  });

  describe('getDetailIds with dot notation', () => {
    it('should support dot notation in parent parameter for getDetailIds', () => {
      obj.setDetail(['a'], 'A');
      obj.setDetail(['b'], 'B', 'a');
      obj.setDetail(['c'], 'C', 'a.b');

      const ids = obj.getDetailIds('a.b');
      expect(ids).not.toBeNull();
      expect(ids!).toEqual(['c']);
    });

    it('should support dot notation in parent parameter for getDeepDetailIds', () => {
      obj.setDetail(['a'], 'A');
      obj.setDetail(['b'], 'B', 'a');
      obj.setDetail(['c'], 'C', 'a.b');
      obj.setDetail(['d'], 'D', 'a.b.c');

      const ids = obj.getDeepDetailIds('a.b');
      expect(ids).not.toBeNull();
      expect(ids!.sort()).toEqual(['c', 'd']);
    });
  });

  describe('Path form equivalence', () => {
    // Every (ids, parent) pair in `forms` addresses the same logical path a.b.c.d.
    // All four forms should produce structurally identical state, and every
    // query should return the same answer regardless of which form was used
    // to set it up or to query.
    const forms: Array<{ label: string; ids: string[]; parent?: string }> = [
      { label: 'all in id',       ids: ['a.b.c.d']              },
      { label: 'split at leaf',   ids: ['d'],        parent: 'a.b.c' },
      { label: 'split mid',       ids: ['c.d'],      parent: 'a.b'   },
      { label: 'split early',     ids: ['b.c.d'],    parent: 'a'     },
    ];

    function makeBaseHierarchy(): DetailedThing {
      const o = makeStuff(() => new DetailedThing());
      o.setDetail(['a'], 'A');
      o.setDetail(['b'], 'B', 'a');
      o.setDetail(['c'], 'C', 'a.b');
      return o;
    }

    // Reference state: use the canonical "split at leaf" form as the truth.
    function makeReferenceState(): Record<string, SerializedDetail> {
      const ref = makeBaseHierarchy();
      ref.setDetail(['d'], 'D', 'a.b.c');
      return serialize(ref.peekDetails());
    }

    it.each(forms)(
      'setDetail via $label produces the same structural state',
      ({ ids, parent }) => {
        const o = makeBaseHierarchy();
        const count = o.setDetail(ids, 'D', parent);
        expect(count).toBe(1);
        expect(serialize(o.peekDetails())).toEqual(makeReferenceState());
      },
    );

    it.each(forms)(
      'getDetail via $label returns the value regardless of insertion form',
      ({ ids, parent }) => {
        // Insert via each form in turn, query via "split at leaf".
        const o = makeBaseHierarchy();
        o.setDetail(ids, 'D', parent);
        expect(o.getDetail('d', 'a.b.c')).toBe('D');
      },
    );

    it.each(forms)(
      'getDetail queried via $label finds the value',
      ({ ids: queryIds, parent: queryParent }) => {
        const o = makeBaseHierarchy();
        o.setDetail(['d'], 'D', 'a.b.c'); // canonical insertion

        // Query forms take a single id string, not an array.
        const queryId = queryIds[0]!;
        expect(o.getDetail(queryId, queryParent)).toBe('D');
      },
    );

    it.each(forms)(
      'removeDetail via $label removes the detail',
      ({ ids, parent }) => {
        const o = makeBaseHierarchy();
        o.setDetail(['d'], 'D', 'a.b.c');

        const count = o.removeDetail(ids, parent);
        expect(count).toBe(1);
        expect(o.getDetail('d', 'a.b.c')).toBeNull();
      },
    );

    it('getDetailIds at a.b.c is consistent across parent forms', () => {
      const o = makeBaseHierarchy();
      o.setDetail(['d'], 'D', 'a.b.c');
      o.setDetail(['e'], 'E', 'a.b.c');

      // getDetailIds accepts only a parent (no split id arg), so test its
      // single path form — but its result should match what the other forms
      // would observe at that level.
      const viaParent = o.getDetailIds('a.b.c')!.sort();
      expect(viaParent).toEqual(['d', 'e']);
    });

    it('getDeepDetailIds at a yields the full subtree regardless of how it was built', () => {
      const viaFull = makeBaseHierarchy();
      viaFull.setDetail(['a.b.c.d'], 'D');

      const viaSplit = makeBaseHierarchy();
      viaSplit.setDetail(['d'], 'D', 'a.b.c');

      expect(viaFull.getDeepDetailIds('a')!.sort()).toEqual(
        viaSplit.getDeepDetailIds('a')!.sort(),
      );
    });
  });

  describe('Malformed paths', () => {
    // These tests pin down current behavior on inputs that are probably user
    // mistakes. If any of these is wrong for your mental model, change the
    // assertion and the algo together.
    it('trailing dot in id is a no-op (returns 0)', () => {
      obj.setDetail(['foo'], 'Foo.');
      const count = obj.setDetail(['foo.'], 'Bar.');
      expect(count).toBe(0);
    });

    it('leading dot in id is treated as top-level id without the dot', () => {
      const count = obj.setDetail(['.foo'], 'Foo.');
      // Parent resolves to '' (length 0) → falls through to top-level.
      // id becomes 'foo' after split.
      expect(count).toBe(1);
      expect(obj.getDetail('foo')).toBe('Foo.');
    });

    it('double dot in id fails cleanly (returns 0)', () => {
      obj.setDetail(['a'], 'A');
      const count = obj.setDetail(['a..b'], 'B');
      expect(count).toBe(0);
    });

    it('empty-string id returns 0 (not stored)', () => {
      const count = obj.setDetail([''], 'Empty.');
      expect(count).toBe(0);
    });

    it('empty-string parent is equivalent to no parent', () => {
      obj.setDetail(['top'], 'Top.');
      expect(obj.getDetail('top', '')).toBe('Top.');
    });

    it('non-existent parent in setDetail returns 0', () => {
      const count = obj.setDetail(['child'], 'Child.', 'nonexistent');
      expect(count).toBe(0);
    });

    it('non-existent parent in getDetail returns null', () => {
      expect(obj.getDetail('child', 'nonexistent')).toBeNull();
    });
  });

  describe('Detail sharing scope (same-description reuse)', () => {
    // newOrExistingDetail reuses a Detail object when the description matches
    // an existing one. The existing top-level search has a failure mode:
    // when adding a NESTED detail whose description happens to match a
    // top-level detail, the nested insertion shares the top-level Detail
    // object and writes a self-reference into its children Map.
    it('does not create a self-referential detail when a nested description matches a top-level one', () => {
      obj.setDetail(['handle'], 'A brass fitting.');
      obj.setDetail(['knob'], 'A brass fitting.', 'handle');

      const handle = obj.peekDetails().get('handle');
      expect(handle).toBeDefined();

      const knob = handle!.details?.get('knob');
      expect(knob).toBeDefined();

      // The nested detail must NOT be the same object as its parent —
      // that would create a cycle (knob.details === handle.details,
      // handle.details.get('knob') === handle, ad infinitum).
      expect(knob).not.toBe(handle);

      // Walking the subtree must terminate.
      expect(obj.getDeepDetailIds()!.sort()).toEqual(['handle', 'knob']);
    });

    it('reuses detail correctly when adding aliases (same level, one call)', () => {
      // This is the intended use of reuse: one setDetail call with multiple ids.
      obj.setDetail(['a', 'b', 'c'], 'Shared.');
      const a = obj.peekDetails().get('a');
      const b = obj.peekDetails().get('b');
      const c = obj.peekDetails().get('c');
      expect(a).toBe(b);
      expect(b).toBe(c);
    });
  });

  describe('Entry enumeration (live-query surface)', () => {
    it('returns [] for a fresh Detailed', () => {
      expect(obj.getDetailEntries()).toEqual([]);
    });

    it('returns one entry per non-aliased detail', () => {
      obj.setDetail(['handle'], 'a brass handle');
      expect(obj.getDetailEntries()).toEqual([
        { ids: ['handle'], description: 'a brass handle', hasChildren: false },
      ]);
    });

    it('aliases bundle into one entry with both ids', () => {
      obj.setDetail(['handle', 'doorknob'], 'a brass handle');
      expect(obj.getDetailEntries()).toEqual([
        {
          ids: ['handle', 'doorknob'],
          description: 'a brass handle',
          hasChildren: false,
        },
      ]);
    });

    it('nested detail flips parent hasChildren to true', () => {
      obj.setDetail(['handle'], 'a brass handle');
      obj.setDetail(['lock'], 'a small lock', 'handle');
      const entries = obj.getDetailEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.ids).toEqual(['handle']);
      expect(entries[0]!.hasChildren).toBe(true);
    });

    it('getDetailEntries(parent) scopes to nested level', () => {
      obj.setDetail(['handle'], 'a brass handle');
      obj.setDetail(['lock'], 'a small lock', 'handle');
      const entries = obj.getDetailEntries('handle');
      expect(entries).toEqual([
        { ids: ['lock'], description: 'a small lock', hasChildren: false },
      ]);
    });

    it('getDetailEntry returns the single alias-grouped entry', () => {
      obj.setDetail(['handle', 'doorknob'], 'a brass handle');
      const entry = obj.getDetailEntry('handle');
      expect(entry).toEqual({
        ids: ['handle', 'doorknob'],
        description: 'a brass handle',
        hasChildren: false,
      });
      // Looking up by either alias returns the same bundled entry.
      expect(obj.getDetailEntry('doorknob')).toEqual(entry);
    });

    it('getDetailEntry returns null for absent keys', () => {
      expect(obj.getDetailEntry('nope')).toBeNull();
    });

    it('getDetailEntry supports dotted paths', () => {
      obj.setDetail(['handle'], 'a brass handle');
      obj.setDetail(['lock'], 'a small lock', 'handle');
      const entry = obj.getDetailEntry('handle.lock');
      expect(entry).toEqual({
        ids: ['lock'],
        description: 'a small lock',
        hasChildren: false,
      });
    });
  });

  describe('Per-sense slot map (senses build)', () => {
    it('round-trips new-shape detail via slot map; AC #1', () => {
      const count = obj.setDetail(['bookcase', 'shelves'], {
        vision: 'Hand-tooled leather spines.',
        touch: 'Smooth walnut, grain runs vertical.',
      });
      expect(count).toBe(2);
      expect(obj.getDetail('bookcase', 'vision')).toBe(
        'Hand-tooled leather spines.',
      );
      expect(obj.getDetail('bookcase', 'touch')).toBe(
        'Smooth walnut, grain runs vertical.',
      );
      expect(obj.getDetail('bookcase', 'smell')).toBeNull();
      expect(obj.getDetail('bookcase', 'hearing')).toBeNull();
      expect(obj.getDetail('bookcase', 'taste')).toBeNull();
    });

    it('legacy string detail populates vision slot; AC #2', () => {
      obj.setDetail(['bookcase'], 'A tall walnut bookcase.');
      // No-arg form returns vision.
      expect(obj.getDetail('bookcase')).toBe('A tall walnut bookcase.');
      // Explicit vision arg returns same value.
      expect(obj.getDetail('bookcase', 'vision')).toBe(
        'A tall walnut bookcase.',
      );
      // Non-vision senses return null.
      expect(obj.getDetail('bookcase', 'touch')).toBeNull();
      expect(obj.getDetail('bookcase', 'smell')).toBeNull();
    });

    it('rejects empty slot map; AC #1 invariant', () => {
      expect(() => obj.setDetail(['x'], {})).toThrow(/at least one/i);
    });

    it('rejects non-string slot value', () => {
      expect(() =>
        obj.setDetail(['x'], {
          // @ts-expect-error deliberately invalid value
          vision: 42,
        }),
      ).toThrow(/must be a string/i);
    });

    it('aliases share one Detail under new shape; AC #4', () => {
      obj.setDetail(['bookcase', 'shelves'], {
        vision: 'Hand-tooled leather spines.',
      });
      expect(obj.getDetail('bookcase', 'vision')).toBe(
        'Hand-tooled leather spines.',
      );
      expect(obj.getDetail('shelves', 'vision')).toBe(
        'Hand-tooled leather spines.',
      );
      expect(obj.peekDetails().get('bookcase')).toBe(
        obj.peekDetails().get('shelves'),
      );
    });

    it('getDetailEntries projects vision slot into description; AC #5', () => {
      obj.setDetail(['bookcase'], {
        vision: 'Visible prose.',
        touch: 'Tactile prose.',
      });
      const entries = obj.getDetailEntries();
      expect(entries).toEqual([
        { ids: ['bookcase'], description: 'Visible prose.', hasChildren: false },
      ]);
      // Touch slot must NOT leak into the wire projection (v1 wire
      // shape stays single-channel for back-compat).
      expect(JSON.stringify(entries)).not.toContain('Tactile prose.');
    });

    it('getDetailEntries surfaces empty description when no vision slot', () => {
      obj.setDetail(['drip'], { hearing: 'a slow drip' });
      const entries = obj.getDetailEntries();
      expect(entries).toEqual([
        { ids: ['drip'], description: '', hasChildren: false },
      ]);
    });

    it('hasDetail returns true when any sense slot is populated; AC #6', () => {
      obj.setDetail(['drip'], { hearing: 'a slow drip' });
      expect(obj.hasDetail('drip')).toBe(true);
      obj.setDetail(['ribbon'], { touch: 'silk' });
      expect(obj.hasDetail('ribbon')).toBe(true);
    });

    it('two-arg getDetail with non-sense string treats arg as legacy parent', () => {
      obj.setDetail(['handle'], 'A brass handle.');
      obj.setDetail(['lock'], { vision: 'A keyhole.' }, 'handle');
      // 'handle' is not a SenseChannel literal → treated as parent.
      expect(obj.getDetail('lock', 'handle')).toBe('A keyhole.');
    });

    it('three-arg getDetail composes sense + parent', () => {
      obj.setDetail(['handle'], 'A brass handle.');
      obj.setDetail(['lock'], { vision: 'A keyhole.', touch: 'cold metal' }, 'handle');
      expect(obj.getDetail('lock', 'vision', 'handle')).toBe('A keyhole.');
      expect(obj.getDetail('lock', 'touch', 'handle')).toBe('cold metal');
      expect(obj.getDetail('lock', 'smell', 'handle')).toBeNull();
    });
  });

  describe('applyDetails (senses build)', () => {
    it('accepts legacy { keywords, description } shape; AC #2', () => {
      obj.applyDetails({
        bookcase: {
          keywords: ['shelves'],
          description: 'A tall walnut bookcase.',
        },
      });
      expect(obj.getDetail('bookcase')).toBe('A tall walnut bookcase.');
      expect(obj.getDetail('shelves', 'vision')).toBe(
        'A tall walnut bookcase.',
      );
      expect(obj.getDetail('bookcase', 'touch')).toBeNull();
    });

    it('accepts new per-sense shape; AC #1', () => {
      obj.applyDetails({
        bookcase: {
          keywords: ['shelves'],
          vision: 'Hand-tooled leather spines.',
          touch: 'Smooth walnut, grain runs vertical.',
        },
      });
      expect(obj.getDetail('bookcase', 'vision')).toBe(
        'Hand-tooled leather spines.',
      );
      expect(obj.getDetail('bookcase', 'touch')).toBe(
        'Smooth walnut, grain runs vertical.',
      );
      expect(obj.getDetail('shelves', 'touch')).toBe(
        'Smooth walnut, grain runs vertical.',
      );
    });

    it('rejects mixed { description, vision } entry; AC #3', () => {
      expect(() =>
        obj.applyDetails({
          bookcase: {
            description: 'legacy',
            vision: 'new',
          },
        }),
      ).toThrow(/mixes legacy 'description' with per-sense/);
    });

    it('persistence migration: legacy { description } round-trips into vision slot; AC #1/#2 (R22)', () => {
      // Simulate the pre-existing persisted shape — applier consumes
      // legacy `description:` and writes the runtime instance with
      // populated `vision` slot. This is the no-script migration
      // path: re-hydration on first load transparently converts.
      obj.applyDetails({
        bookcase: { description: 'Pre-existing legacy text.' },
      });
      const peek = obj.peekDetails().get('bookcase');
      expect(peek?.vision).toBe('Pre-existing legacy text.');
      // Re-serializing for persistence (the wire projection used by
      // the inspection-pane subscription) reads the new-shape slot.
      const entries = obj.getDetailEntries();
      expect(entries[0]?.description).toBe('Pre-existing legacy text.');
    });

    it('skips entries with neither description nor sense slot', () => {
      obj.applyDetails({
        broken: { keywords: ['nope'] },
        good: { vision: 'okay' },
      });
      expect(obj.hasDetail('broken')).toBe(false);
      expect(obj.getDetail('good', 'vision')).toBe('okay');
    });
  });
});
