/**
 * DetailedMixin tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DetailedMixin } from './Detailed';
import { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';

// Test class with DetailedMixin
class DetailedThing extends DetailedMixin(Stuff) {
  static persistentFields: string[] = [];
}

describe('DetailedMixin', () => {
  let obj: DetailedThing;

  beforeEach(() => {
    obj = new DetailedThing();
    StuffApi.register(obj);
  });

  describe('Construction', () => {
    it('should create object with empty details', () => {
      expect(obj.details).toBeDefined();
      expect(obj.details.size).toBe(0);
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
    it('should reuse Detail object for same description', () => {
      obj.setDetail(['a'], 'Same description.');
      obj.setDetail(['b'], 'Same description.');

      // Both IDs should point to the same Detail object
      const detailA = obj.details.get('a');
      const detailB = obj.details.get('b');

      expect(detailA).toBe(detailB);
    });

    it('should track all IDs in Detail.ids Set', () => {
      obj.setDetail(['x', 'y', 'z'], 'Shared description.');

      const detail = obj.details.get('x');
      expect(detail).toBeDefined();
      expect(detail!.ids.has('x')).toBe(true);
      expect(detail!.ids.has('y')).toBe(true);
      expect(detail!.ids.has('z')).toBe(true);
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

      // 'a' and 'c' should still work
      expect(obj.getDetail('a')).toBe('Shared detail.');
      expect(obj.getDetail('c')).toBe('Shared detail.');

      // The Detail object should still have all IDs tracked
      const detail = obj.details.get('a');
      expect(detail?.ids.has('a')).toBe(true);
      expect(detail?.ids.has('b')).toBe(false); // Removed from Set
      expect(detail?.ids.has('c')).toBe(true);
    });

    it('should remove detail completely when all aliases are removed', () => {
      obj.setDetail(['x', 'y'], 'Two aliases.');

      obj.removeDetail(['x']);
      expect(obj.getDetail('x')).toBeNull();
      expect(obj.getDetail('y')).toBe('Two aliases.');

      obj.removeDetail(['y']);
      expect(obj.getDetail('y')).toBeNull();

      // Map should be empty
      expect(obj.details.size).toBe(0);
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
      const parentDetail = obj.details.get('parent');
      expect(parentDetail?.details).toBeUndefined();

      // Adding child should initialize parent.details
      obj.setDetail(['child'], 'Child.', 'parent');

      expect(parentDetail?.details).toBeDefined();
      expect(parentDetail?.details?.size).toBe(1);
    });

    it('should auto-initialize details Map when querying with getDetailIds', () => {
      obj.setDetail(['parent'], 'Parent.');

      const parentDetail = obj.details.get('parent');
      expect(parentDetail?.details).toBeUndefined();

      // Query should initialize the Map
      const ids = obj.getDetailIds('parent');
      expect(ids).not.toBeNull();
      expect(ids!.length).toBe(0);
      expect(parentDetail?.details).toBeDefined();
    });

    it('should auto-initialize details Map when querying with getDeepDetailIds', () => {
      obj.setDetail(['parent'], 'Parent.');

      const parentDetail = obj.details.get('parent');
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
      const serialized = JSON.stringify(Array.from(obj.details.entries()));

      // Deserialize into new object
      const obj2 = new DetailedThing();
      StuffApi.register(obj2);
      obj2.details = new Map(JSON.parse(serialized));

      expect(obj2.getDetail('test')).toBe('Test description.');
    });

    it('should serialize and deserialize nested details', () => {
      obj.setDetail(['parent'], 'Parent.');
      obj.setDetail(['child'], 'Child.', 'parent');
      obj.setDetail(['grandchild'], 'Grandchild.', 'parent.child');

      // Serialize (requires custom serialization for nested Maps)
      const serialize = (details: Map<string, any>): any => {
        return Array.from(details.entries()).map(([key, detail]) => [
          key,
          {
            ids: Array.from(detail.ids),
            description: detail.description,
            details: detail.details ? serialize(detail.details) : undefined,
          },
        ]);
      };

      const deserialize = (data: any): Map<string, any> => {
        return new Map(
          data.map(([key, detail]: [string, any]) => [
            key,
            {
              ids: new Set(detail.ids),
              description: detail.description,
              details: detail.details ? deserialize(detail.details) : undefined,
            },
          ])
        );
      };

      const serialized = JSON.stringify(serialize(obj.details));

      // Deserialize into new object
      const obj2 = new DetailedThing();
      StuffApi.register(obj2);
      obj2.details = deserialize(JSON.parse(serialized));

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
});
