/**
 * Tests for PerceptibleMixin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerceptibleMixin } from '../Perceptible';
import { Stuff } from '../../stuff/Stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";

// Test class with PerceptibleMixin
const PerceptibleBase = PerceptibleMixin(Idea);
class TestObject extends PerceptibleBase {}

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
});
