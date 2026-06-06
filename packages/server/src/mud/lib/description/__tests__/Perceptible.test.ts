/**
 * Tests for PerceptibleMixin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerceptibleMixin } from '../Perceptible';
import { NamedMixin } from '../Named';
import { VisibleMixin } from '../Visible';
import { Stuff } from '../../stuff/Stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";
import {
  projectFields,
  REF_FIELDS,
} from '../../../api/mql-subscription';

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
      const persistentFields = (TestObject as any).persistentFields;

      expect(persistentFields).toContain('keywords');
    });
  });

  describe('name folding (Phase 7)', () => {
    it('does NOT fold name tokens when host omits NamedMixin', () => {
      // The bare TestObject doesn't compose NamedMixin, so the
      // name-derived token branch is skipped.
      obj.addKeyword('explicit');
      expect(obj.getKeywords()).toEqual(['explicit']);
    });

    it('folds tokenized name into the keyword pool when Named is composed', () => {
      const named = makeStuff(() => new NamedTestObject());
      named.setName('Oak Door');
      named.addKeyword('door');
      // 'door' is authored, 'oak' comes from the name; duplicates
      // are deduped (the authored 'door' is preserved).
      const kws = named.getKeywords();
      expect(kws).toContain('door');
      expect(kws).toContain('oak');
      expect(kws.filter((k) => k === 'door')).toHaveLength(1);
    });

    it('lowercases name tokens during folding', () => {
      const named = makeStuff(() => new NamedTestObject());
      named.setName('CRYSTAL ROSE');
      const kws = named.getKeywords();
      expect(kws).toContain('crystal');
      expect(kws).toContain('rose');
    });

    it('returns just authored keywords when name is empty', () => {
      const named = makeStuff(() => new NamedTestObject());
      // No setName — Named.name defaults to ''.
      named.addKeyword('flower');
      expect(named.getKeywords()).toEqual(['flower']);
    });
  });

  describe('short-description folding (Phase 8)', () => {
    it('folds tokenized short description into the keyword pool when Visible is composed', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('a brass thermometer');
      const kws = v.getKeywords();
      // 'brass' and 'thermometer' come from the short description.
      // 'a' is a stop word and gets dropped.
      expect(kws).toContain('brass');
      expect(kws).toContain('thermometer');
      expect(kws).not.toContain('a');
    });

    it('does NOT fold raw `shortDescription` fallback prose', () => {
      // `getShort()` returns "You see nothing special." when no
      // description is set; the derive must read the raw field, not
      // the with-fallback accessor, or empty objects pollute the
      // keyword pool.
      const v = makeStuff(() => new VisibleTestObject());
      expect(v.getKeywords()).toEqual([]);
    });

    it('drops common stop words (a, an, the)', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('an oak door');
      const kws = v.getKeywords();
      expect(kws).toEqual(['oak', 'door']);
    });

    it('preserves explicitly authored stop words', () => {
      // The stop-word filter applies to auto-derived tokens only —
      // an author who explicitly adds 'a' as a keyword keeps it.
      const v = makeStuff(() => new VisibleTestObject());
      v.addKeyword('a');
      v.setShortDescription('a brass thermometer');
      const kws = v.getKeywords();
      expect(kws).toContain('a'); // authored
      expect(kws).toContain('brass'); // derived
    });

    it('autoDeriveKeywords=false suppresses both Named and Visible derivation', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('a brass thermometer');
      v.addKeyword('explicit');
      (v as unknown as { autoDeriveKeywords: boolean }).autoDeriveKeywords = false;
      // Only the authored keyword remains.
      expect(v.getKeywords()).toEqual(['explicit']);
    });
  });

  describe('primaryKeyword (Wave 1)', () => {
    it('defaults to the last pool token when no explicit value set (Named pool)', () => {
      const named = makeStuff(() => new NamedTestObject());
      named.setName('Oak Door');
      // Derived pool from name: ['oak', 'door']. Last token is the
      // head noun — what a player would type for the canonical
      // `look <X>` reference.
      expect(named.getPrimaryKeyword()).toBe('door');
    });

    it('defaults to the last pool token when no explicit value set (authored pool)', () => {
      obj.addKeyword('flower');
      obj.addKeyword('plant');
      // Authored keywords land in the pool in insertion order;
      // the trailing one is the default canonical.
      expect(obj.getPrimaryKeyword()).toBe('plant');
    });

    it('returns the authored value when valid', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('a brass thermometer');
      v.setPrimaryKeyword('brass');
      expect(v.getPrimaryKeyword()).toBe('brass');
    });

    it('ignores an invalid value (not in pool) and warns', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('a brass thermometer');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      v.setPrimaryKeyword('pony');
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
      // Stored anyway (cross-field invariant; setter is informational).
      // Getter falls back to the trailing pool entry: 'thermometer'.
      expect(v.getPrimaryKeyword()).toBe('thermometer');
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

    it('setting undefined clears the authored override', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('a brass thermometer');
      v.setPrimaryKeyword('brass');
      expect(v.getPrimaryKeyword()).toBe('brass');
      v.setPrimaryKeyword(undefined);
      // Falls back to derived-pool default: the last token.
      expect(v.getPrimaryKeyword()).toBe('thermometer');
    });

    it('Stuff.subscribableFields.primaryKeyword projects undefined for non-Perceptible host (substrate omits)', () => {
      // Built-in Idea has no PerceptibleMixin — projecting REF_FIELDS
      // against it must omit `primaryKeyword` (descriptor returns
      // undefined, projectFields skips).
      const plain = makeStuff(() => new Idea());
      const rec = projectFields(
        plain,
        REF_FIELDS,
        plain as unknown as Parameters<typeof projectFields>[2],
      );
      expect(rec.primaryKeyword).toBeUndefined();
      expect('primaryKeyword' in rec).toBe(false);
    });

    it('Perceptible host with empty pool projects no primaryKeyword field', () => {
      const rec = projectFields(
        obj,
        REF_FIELDS,
        obj as unknown as Parameters<typeof projectFields>[2],
      );
      // No keywords → getPrimaryKeyword() returns undefined → omitted.
      expect(rec.primaryKeyword).toBeUndefined();
      expect('primaryKeyword' in rec).toBe(false);
    });

    it('Perceptible host with authored value surfaces it on the ref record', () => {
      const v = makeStuff(() => new VisibleTestObject());
      v.setShortDescription('a brass thermometer');
      v.setPrimaryKeyword('thermometer');
      const rec = projectFields(
        v,
        REF_FIELDS,
        v as unknown as Parameters<typeof projectFields>[2],
      );
      expect(rec.primaryKeyword).toBe('thermometer');
    });

    it('registers primaryKeyword as a persistent field', () => {
      const persistentFields = (TestObject as unknown as { persistentFields: string[] }).persistentFields;
      expect(persistentFields).toContain('primaryKeyword');
    });
  });
});
