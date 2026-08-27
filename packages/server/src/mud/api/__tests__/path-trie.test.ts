/**
 * PathTrie tests — exact lookup, glob walk, and prune-on-empty
 * invariants. The prune invariant is the load-bearing one: an
 * insert/remove pair must leave the trie identical to its
 * never-inserted state.
 */

import { describe, it, expect } from 'vitest';
import { PathTrie } from '../../lib/collections/PathTrie';

describe('PathTrie', () => {
  describe('exact lookup', () => {
    it('returns empty array for paths that were never inserted', () => {
      const trie = new PathTrie<string>();
      expect(trie.exact('/obj/Foo')).toEqual([]);
    });

    it('returns the bucket for a stored path', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Foo', 'a');
      expect(trie.exact('/obj/Foo')).toEqual(['a']);
    });

    it('supports multiple values at the same path', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Foo', 'a');
      trie.insert('/obj/Foo', 'b');
      trie.insert('/obj/Foo', 'c');
      expect(trie.exact('/obj/Foo').sort()).toEqual(['a', 'b', 'c']);
    });

    it('insert is idempotent for an existing (path, value) pair', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Foo', 'a');
      trie.insert('/obj/Foo', 'a');
      expect(trie.exact('/obj/Foo')).toEqual(['a']);
      expect(trie.size).toBe(1);
    });

    it('treats sibling paths independently', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Foo', 'a');
      trie.insert('/obj/Bar', 'b');
      expect(trie.exact('/obj/Foo')).toEqual(['a']);
      expect(trie.exact('/obj/Bar')).toEqual(['b']);
    });
  });

  describe('remove and prune', () => {
    it('remove drops a single value', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Foo', 'a');
      trie.insert('/obj/Foo', 'b');
      trie.remove('/obj/Foo', 'a');
      expect(trie.exact('/obj/Foo')).toEqual(['b']);
    });

    it('remove of an unknown value is a no-op', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Foo', 'a');
      trie.remove('/obj/Foo', 'b');
      expect(trie.exact('/obj/Foo')).toEqual(['a']);
      expect(trie.size).toBe(1);
    });

    it('remove of an unknown path is a no-op', () => {
      const trie = new PathTrie<string>();
      trie.remove('/obj/Foo', 'a');
      expect(trie.isEmpty()).toBe(true);
    });

    it('insert then remove leaves the trie empty', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Foo', 'a');
      trie.remove('/obj/Foo', 'a');
      expect(trie.isEmpty()).toBe(true);
      expect(trie.size).toBe(0);
    });

    it('a series of inserts and matching removes leaves the trie empty', () => {
      const trie = new PathTrie<string>();
      trie.insert('/platform/agent/Avatar/abc', 'a');
      trie.insert('/platform/agent/Avatar/def', 'b');
      trie.insert('/lib/spatial/Door', 'c');
      trie.remove('/platform/agent/Avatar/abc', 'a');
      trie.remove('/platform/agent/Avatar/def', 'b');
      trie.remove('/lib/spatial/Door', 'c');
      expect(trie.isEmpty()).toBe(true);
      expect(trie.size).toBe(0);
    });

    it('removing one of several values at a path prunes only when the bucket empties', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Foo', 'a');
      trie.insert('/obj/Foo', 'b');
      trie.remove('/obj/Foo', 'a');
      expect(trie.exact('/obj/Foo')).toEqual(['b']);
      trie.remove('/obj/Foo', 'b');
      expect(trie.isEmpty()).toBe(true);
    });

    it('decrements size on remove of a present value', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Foo', 'a');
      trie.insert('/obj/Foo', 'b');
      expect(trie.size).toBe(2);
      trie.remove('/obj/Foo', 'a');
      expect(trie.size).toBe(1);
    });
  });

  describe('clear', () => {
    it('drops every entry and restores empty state', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Foo', 'a');
      trie.insert('/obj/Bar', 'b');
      trie.clear();
      expect(trie.isEmpty()).toBe(true);
      expect(trie.exact('/obj/Foo')).toEqual([]);
      expect(trie.size).toBe(0);
    });
  });

  describe('glob walk', () => {
    function makeWorld(): PathTrie<string> {
      const trie = new PathTrie<string>();
      trie.insert('/platform/agent/Avatar/abc', 'avatar-abc');
      trie.insert('/platform/agent/Avatar/def', 'avatar-def');
      trie.insert('/platform/agent/Avatar/sub/nested', 'avatar-sub-nested');
      trie.insert('/obj/NPC/orc', 'npc-orc');
      trie.insert('/obj/NPC/troll', 'npc-troll');
      trie.insert('/lib/spatial/Door', 'door-lib');
      return trie;
    }

    it('exact-pattern glob is equivalent to exact()', () => {
      const trie = makeWorld();
      expect(trie.glob('/platform/agent/Avatar/abc')).toEqual(['avatar-abc']);
    });

    it('* matches a single segment', () => {
      const trie = makeWorld();
      expect(trie.glob('/platform/agent/Avatar/*').sort()).toEqual(
        ['avatar-abc', 'avatar-def'].sort()
      );
    });

    it('* does not cross segment boundaries', () => {
      const trie = makeWorld();
      // /platform/agent/Avatar/* should NOT match /platform/agent/Avatar/sub/nested.
      expect(trie.glob('/platform/agent/Avatar/*')).not.toContain('avatar-sub-nested');
    });

    it('** descends into subtrees', () => {
      const trie = makeWorld();
      expect(trie.glob('/platform/agent/Avatar/**').sort()).toEqual(
        ['avatar-abc', 'avatar-def', 'avatar-sub-nested'].sort()
      );
    });

    it('? matches a single character within a segment', () => {
      const trie = new PathTrie<string>();
      trie.insert('/platform/agent/Avatar/aa', 'aa');
      trie.insert('/platform/agent/Avatar/ab', 'ab');
      trie.insert('/platform/agent/Avatar/abc', 'abc');
      expect(trie.glob('/platform/agent/Avatar/a?').sort()).toEqual(['aa', 'ab']);
    });

    it('** at root yields every value', () => {
      const trie = makeWorld();
      const all = trie.glob('/**');
      expect(all.sort()).toEqual(
        [
          'avatar-abc',
          'avatar-def',
          'avatar-sub-nested',
          'npc-orc',
          'npc-troll',
          'door-lib',
        ].sort()
      );
    });

    it('returns an empty array when no paths match', () => {
      const trie = makeWorld();
      expect(trie.glob('/obj/Missing/*')).toEqual([]);
    });

    it('multi-value bucket is enumerated under glob', () => {
      const trie = new PathTrie<string>();
      trie.insert('/platform/agent/Avatar/dup', 'a');
      trie.insert('/platform/agent/Avatar/dup', 'b');
      expect(trie.glob('/platform/agent/Avatar/*').sort()).toEqual(['a', 'b']);
    });
  });

  describe('longestPrefix (nearest-ancestor match)', () => {
    function makeCoverage(): PathTrie<string> {
      // Address-namespace convention: no leading slash.
      const trie = new PathTrie<string>();
      trie.insert('narnia', 'narnia');
      trie.insert('narnia/castle', 'cair-paravel');
      trie.insert('narnia/wild', 'lantern-waste');
      return trie;
    }

    it('returns the exact bucket when the path is itself a stored prefix', () => {
      const trie = makeCoverage();
      expect(trie.longestPrefix('narnia/castle')).toEqual(['cair-paravel']);
    });

    it('returns the deepest ancestor prefix (more-specific wins)', () => {
      const trie = makeCoverage();
      // A scope deeper than any stored prefix resolves to the longest.
      expect(trie.longestPrefix('narnia/castle/closet')).toEqual([
        'cair-paravel',
      ]);
    });

    it('falls back to a shallower prefix when no deeper one is stored', () => {
      const trie = makeCoverage();
      // narnia/other is not stored, so the nearest ancestor is narnia.
      expect(trie.longestPrefix('narnia/other/room')).toEqual(['narnia']);
    });

    it('distinguishes siblings', () => {
      const trie = makeCoverage();
      expect(trie.longestPrefix('narnia/wild/glade')).toEqual([
        'lantern-waste',
      ]);
    });

    it('returns [] when no prefix is stored (outside the tree)', () => {
      const trie = makeCoverage();
      expect(trie.longestPrefix('elsewhere/void')).toEqual([]);
    });

    it('returns [] on an empty trie', () => {
      const trie = new PathTrie<string>();
      expect(trie.longestPrefix('narnia/castle')).toEqual([]);
    });

    it('enumerates a multi-value bucket at the winning prefix', () => {
      const trie = new PathTrie<string>();
      trie.insert('narnia/castle', 'a');
      trie.insert('narnia/castle', 'b');
      expect(trie.longestPrefix('narnia/castle/closet').sort()).toEqual([
        'a',
        'b',
      ]);
    });

    it('longestPrefixPath reports the matched prefix string', () => {
      const trie = makeCoverage();
      expect(trie.longestPrefixPath('narnia/castle/closet')).toBe(
        'narnia/castle'
      );
      expect(trie.longestPrefixPath('narnia/other/room')).toBe('narnia');
      expect(trie.longestPrefixPath('elsewhere/void')).toBeNull();
    });
  });
});
