/**
 * Tests for PerceptibleMixin
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerceptibleMixin } from '../Perceptible';
import { NamedMixin } from '../Named';
import { VisibleMixin } from '../Visible';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";
import {
  MqlSubscriptionApi,
  REF_FIELDS,
} from '../../../api/mql-subscription';
import { MixinApi } from '../../../api/mixin';

// Test class with PerceptibleMixin
const PerceptibleBase = PerceptibleMixin(Idea);
class TestObject extends PerceptibleBase {}

// Composed with NamedMixin so name-token folding fires.
const NamedPerceptibleBase = PerceptibleMixin(NamedMixin(Idea));
class NamedTestObject extends NamedPerceptibleBase {}

// Composed with VisibleMixin so short-description folding fires.
const VisiblePerceptibleBase = VisibleMixin(PerceptibleMixin(Idea));
class VisibleTestObject extends VisiblePerceptibleBase {}

describe('PerceptibleMixin', () => {
  let obj: TestObject;

  beforeEach(() => {
    obj = makeStuff(() => new TestObject());
  });

  describe('getKeywords()', () => {
    it('should return empty array by default', () => {
      expect(obj.getKeywords()).toEqual([]);
    });

    it('should return copy of keywords array', () => {
      obj.addKeyword('flower');
      const keywords1 = obj.getKeywords();
      const keywords2 = obj.getKeywords();

      // Should be equal but different array instances
      expect(keywords1).toEqual(keywords2);
      expect(keywords1).not.toBe(keywords2);
    });

    it('should not allow external modification', () => {
      obj.addKeyword('flower');
      const keywords = obj.getKeywords();

      // Try to modify the returned array
      keywords.push('plant');

      // Should not affect internal keywords
      expect(obj.getKeywords()).toEqual(['flower']);
    });
  });

  describe('addKeyword()', () => {
    it('should add keyword', () => {
      obj.addKeyword('flower');

      expect(obj.getKeywords()).toEqual(['flower']);
    });

    it('should normalize to lowercase', () => {
      obj.addKeyword('FLOWER');

      expect(obj.getKeywords()).toEqual(['flower']);
    });

    it('should trim whitespace', () => {
      obj.addKeyword('  flower  ');

      expect(obj.getKeywords()).toEqual(['flower']);
    });

    it('should prevent duplicates', () => {
      obj.addKeyword('flower');
      obj.addKeyword('flower');
      obj.addKeyword('FLOWER');

      expect(obj.getKeywords()).toEqual(['flower']);
    });

    it('should ignore empty strings', () => {
      obj.addKeyword('');
      obj.addKeyword('   ');

      expect(obj.getKeywords()).toEqual([]);
    });

    it('should allow multiple different keywords', () => {
      obj.addKeyword('flower');
      obj.addKeyword('plant');
      obj.addKeyword('rose');

      expect(obj.getKeywords()).toEqual(['flower', 'plant', 'rose']);
    });
  });

  describe('removeKeyword()', () => {
    beforeEach(() => {
      obj.addKeyword('flower');
      obj.addKeyword('plant');
      obj.addKeyword('rose');
    });

    it('should remove keyword', () => {
      const result = obj.removeKeyword('plant');

      expect(result).toBe(true);
      expect(obj.getKeywords()).toEqual(['flower', 'rose']);
    });

    it('should be case insensitive', () => {
      const result = obj.removeKeyword('FLOWER');

      expect(result).toBe(true);
      expect(obj.getKeywords()).toEqual(['plant', 'rose']);
    });

    it('should trim whitespace', () => {
      const result = obj.removeKeyword('  flower  ');

      expect(result).toBe(true);
      expect(obj.getKeywords()).toEqual(['plant', 'rose']);
    });

    it('should return false if keyword not found', () => {
      const result = obj.removeKeyword('tree');

      expect(result).toBe(false);
      expect(obj.getKeywords()).toEqual(['flower', 'plant', 'rose']);
    });

    it('should return false for empty string', () => {
      const result = obj.removeKeyword('');

      expect(result).toBe(false);
    });
  });

  describe('hasKeyword()', () => {
    beforeEach(() => {
      obj.addKeyword('flower');
      obj.addKeyword('plant');
    });

    it('should return true if keyword exists', () => {
      expect(obj.hasKeyword('flower')).toBe(true);
      expect(obj.hasKeyword('plant')).toBe(true);
    });

    it('should return false if keyword does not exist', () => {
      expect(obj.hasKeyword('tree')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(obj.hasKeyword('FLOWER')).toBe(true);
      expect(obj.hasKeyword('Flower')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(obj.hasKeyword('  flower  ')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(obj.hasKeyword('')).toBe(false);
      expect(obj.hasKeyword('   ')).toBe(false);
    });
  });

  describe('setKeywords()', () => {
    it('should set all keywords at once', () => {
      obj.setKeywords(['flower', 'plant', 'rose']);

      expect(obj.getKeywords()).toEqual(['flower', 'plant', 'rose']);
    });

    it('should normalize to lowercase', () => {
      obj.setKeywords(['FLOWER', 'Plant', 'ROSE']);

      expect(obj.getKeywords()).toEqual(['flower', 'plant', 'rose']);
    });

    it('should trim whitespace', () => {
      obj.setKeywords(['  flower  ', '  plant  ', '  rose  ']);

      expect(obj.getKeywords()).toEqual(['flower', 'plant', 'rose']);
    });

    it('should filter out empty strings', () => {
      obj.setKeywords(['flower', '', '   ', 'plant']);

      expect(obj.getKeywords()).toEqual(['flower', 'plant']);
    });

    it('should replace existing keywords', () => {
      obj.addKeyword('old');
      obj.setKeywords(['flower', 'plant']);

      expect(obj.getKeywords()).toEqual(['flower', 'plant']);
    });

    it('should handle empty array', () => {
      obj.addKeyword('flower');
      obj.setKeywords([]);

      expect(obj.getKeywords()).toEqual([]);
    });
  });

  describe('Integration scenarios', () => {
    it('should work with multiple operations', () => {
      obj.addKeyword('flower');
      obj.addKeyword('plant');
      obj.addKeyword('rose');

      expect(obj.hasKeyword('flower')).toBe(true);
      expect(obj.getKeywords()).toHaveLength(3);

      obj.removeKeyword('plant');
      expect(obj.hasKeyword('plant')).toBe(false);
      expect(obj.getKeywords()).toHaveLength(2);

      obj.addKeyword('tree');
      expect(obj.getKeywords()).toEqual(['flower', 'rose', 'tree']);
    });

    it('should maintain consistency after multiple operations', () => {
      obj.addKeyword('flower');
      obj.addKeyword('FLOWER'); // Duplicate
      obj.addKeyword('plant');
      obj.removeKeyword('nonexistent');
      obj.addKeyword('rose');
      obj.removeKeyword('PLANT');

      expect(obj.getKeywords()).toEqual(['flower', 'rose']);
    });
  });

  describe('Persistent field registration', () => {
    it('should register keywords as persistent field', () => {
      const persistentFields = MixinApi.getAllPersistentFields(TestObject);

      expect(persistentFields).toContain('keywords');
    });
  });

  describe('⭐⭐ keywords are AUTHORED — nothing derives', () => {
    // Removed 2026-09-11, and the census is the argument: 568 of the 646
    // described rows already authored their keywords by hand, so
    // derivation saved nobody any typing — while what it produced was
    // junk. A tailor described as "tailor with pins down one cuff and a
    // tape round her neck" answered to `look with`, `look and`,
    // `look her` and `look neck`.
    it('a name does NOT fold into the pool', () => {
      const named = makeStuff(() => new NamedTestObject());
      named.setName('Oak Door');
      expect(named.getKeywords()).toEqual([]);
    });

    it('a short description does NOT fold into the pool', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('brass thermometer');
      expect(v.getKeywords()).toEqual([]);
    });

    it('⭐ the author\'s list is returned verbatim, order kept', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('brass thermometer');
      v.setKeywords(['thermometer', 'brass']);
      expect(v.getKeywords()).toEqual(['thermometer', 'brass']);
    });

    it('⚠ a name the author wants typeable must be authored', () => {
      // The cost of the change, stated plainly: `look oak` resolves
      // because somebody wrote `oak`, not because a tokenizer guessed.
      const named = makeStuff(() => new NamedTestObject());
      named.setName('Oak Door');
      named.setKeywords(['door', 'oak']);
      expect(named.hasKeyword('oak')).toBe(true);
    });
  });

  describe('primaryKeyword — keywords[0] unless pinned', () => {
    it('⭐ defaults to the FIRST authored keyword', () => {
      obj.addKeyword('plant');
      obj.addKeyword('flower');
      // It used to be the TRAILING token, which was right about English
      // for a pool derived from a description ("brisk clerk" → clerk)
      // and arbitrary for an authored list. An authored list has the
      // author's own answer at the front.
      expect(obj.getPrimaryKeyword()).toBe('plant');
    });

    it('a name alone gives no keyword, so no primary either', () => {
      const named = makeStuff(() => new NamedTestObject());
      named.setName('Oak Door');
      expect(named.getPrimaryKeyword()).toBeUndefined();
    });

    it('an author may pin something other than the first', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setKeywords(['thermometer', 'brass']);
      v.setPrimaryKeyword('brass');
      expect(v.getPrimaryKeyword()).toBe('brass');
    });

    it('⚠ a pinned value out of the pool still wins — and still warns', () => {
      // "Unless otherwise specified" means the author's word is honoured.
      // But a click affordance sends `look <primaryKeyword>`, so a value
      // nothing answers to is a dead click — worth saying out loud at
      // the setter, and gated at build time by lint:presentation.
      const v = makeStuff(() => new VisibleTestObject());
      v.setKeywords(['thermometer']);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      v.setPrimaryKeyword('pony');
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
      expect(v.getPrimaryKeyword()).toBe('pony');
    });

    it('returns undefined when keyword pool is empty', () => {
      // Bare Perceptible host with no keywords / no Named / no Visible.
      expect(obj.getPrimaryKeyword()).toBeUndefined();
    });

    it('normalizes case + whitespace on the authored value', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('a brass thermometer');
      v.setPrimaryKeyword('  BRASS  ');
      expect(v.getPrimaryKeyword()).toBe('brass');
    });

    it('setting undefined clears the pin and falls back to keywords[0]', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setKeywords(['thermometer', 'brass']);
      v.setPrimaryKeyword('brass');
      expect(v.getPrimaryKeyword()).toBe('brass');
      v.setPrimaryKeyword(undefined);
      expect(v.getPrimaryKeyword()).toBe('thermometer');
    });

    it('Stuff.subscribableFields.primaryKeyword projects undefined for non-Perceptible host (substrate omits)', () => {
      // Built-in Idea has no PerceptibleMixin — projecting REF_FIELDS
      // against it must omit `primaryKeyword` (descriptor returns
      // undefined, MqlSubscriptionApi.projectFields skips).
      const plain = makeStuff(() => new Idea());
      const rec = MqlSubscriptionApi.projectFields(
        plain,
        REF_FIELDS,
        plain as unknown as Parameters<typeof MqlSubscriptionApi.projectFields>[2],
      );
      expect(rec.primaryKeyword).toBeUndefined();
      expect('primaryKeyword' in rec).toBe(false);
    });

    it('Perceptible host with empty pool projects no primaryKeyword field', () => {
      const rec = MqlSubscriptionApi.projectFields(
        obj,
        REF_FIELDS,
        obj as unknown as Parameters<typeof MqlSubscriptionApi.projectFields>[2],
      );
      // No keywords → getPrimaryKeyword() returns undefined → omitted.
      expect(rec.primaryKeyword).toBeUndefined();
      expect('primaryKeyword' in rec).toBe(false);
    });

    it('Perceptible host with authored value surfaces it on the ref record', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('a brass thermometer');
      v.setPrimaryKeyword('thermometer');
      const rec = MqlSubscriptionApi.projectFields(
        v,
        REF_FIELDS,
        v as unknown as Parameters<typeof MqlSubscriptionApi.projectFields>[2],
      );
      expect(rec.primaryKeyword).toBe('thermometer');
    });

    it('registers primaryKeyword as a persistent field', () => {
      const persistentFields = MixinApi.getAllPersistentFields(TestObject);
      expect(persistentFields).toContain('primaryKeyword');
    });
  });
});
