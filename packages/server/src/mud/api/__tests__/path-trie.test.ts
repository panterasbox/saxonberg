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
      trie.insert('/obj/Avatar/abc', 'a');
      trie.insert('/obj/Avatar/def', 'b');
      trie.insert('/lib/spatial/Door', 'c');
      trie.remove('/obj/Avatar/abc', 'a');
      trie.remove('/obj/Avatar/def', 'b');
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
      trie.insert('/obj/Avatar/abc', 'avatar-abc');
      trie.insert('/obj/Avatar/def', 'avatar-def');
      trie.insert('/obj/Avatar/sub/nested', 'avatar-sub-nested');
      trie.insert('/obj/NPC/orc', 'npc-orc');
      trie.insert('/obj/NPC/troll', 'npc-troll');
      trie.insert('/lib/spatial/Door', 'door-lib');
      return trie;
    }

    it('exact-pattern glob is equivalent to exact()', () => {
      const trie = makeWorld();
      expect(trie.glob('/obj/Avatar/abc')).toEqual(['avatar-abc']);
    });

    it('* matches a single segment', () => {
      const trie = makeWorld();
      expect(trie.glob('/obj/Avatar/*').sort()).toEqual(
        ['avatar-abc', 'avatar-def'].sort()
      );
    });

    it('* does not cross segment boundaries', () => {
      const trie = makeWorld();
      // /obj/Avatar/* should NOT match /obj/Avatar/sub/nested.
      expect(trie.glob('/obj/Avatar/*')).not.toContain('avatar-sub-nested');
    });

    it('** descends into subtrees', () => {
      const trie = makeWorld();
      expect(trie.glob('/obj/Avatar/**').sort()).toEqual(
        ['avatar-abc', 'avatar-def', 'avatar-sub-nested'].sort()
      );
    });

    it('? matches a single character within a segment', () => {
      const trie = new PathTrie<string>();
      trie.insert('/obj/Avatar/aa', 'aa');
      trie.insert('/obj/Avatar/ab', 'ab');
      trie.insert('/obj/Avatar/abc', 'abc');
      expect(trie.glob('/obj/Avatar/a?').sort()).toEqual(['aa', 'ab']);
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
      trie.insert('/obj/Avatar/dup', 'a');
      trie.insert('/obj/Avatar/dup', 'b');
      expect(trie.glob('/obj/Avatar/*').sort()).toEqual(['a', 'b']);
    });
  });
});
