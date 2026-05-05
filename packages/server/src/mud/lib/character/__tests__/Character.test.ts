/**
 * Character tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Character } from '../Character';
import { makeStuff } from '../../security/__tests__/test-setup';

// Concrete test class that extends Character
class TestCharacter extends Character {
  constructor() {
    super();
  }
}

describe('Character', () => {
  let character: TestCharacter;

  beforeEach(() => {
    character = makeStuff(() => new TestCharacter());
  });

  describe('mixin composition', () => {
    it('should have Named mixin properties', () => {
      expect(character).toHaveProperty('name');
      expect(character).toHaveProperty('surname');
      expect(character).toHaveProperty('fullName');
    });

    it('should have Gendered mixin properties', () => {
      expect(character).toHaveProperty('pronouns');
    });

    it('should have Sensor mixin methods (stub)', () => {
      expect(typeof character.onMessage).toBe('function');
    });

    it('should have Vocal mixin methods (stub)', () => {
      expect(typeof character.say).toBe('function');
    });
  });

  describe('Named mixin integration', () => {
    it('should compute fullName from name and surname', () => {
      character.setName('John');
      character.setSurname('Doe');
      expect(character.getFullName()).toBe('John Doe');
    });

    it('returns empty string when no names set (no fallback)', () => {
      expect(character.getFullName()).toBe('');
    });

    it('synthesizes honorific + name + surname + nameSuffix with a comma before the suffix', () => {
      character.setHonorific('Dr.');
      character.setName('John');
      character.setSurname('Doe');
      character.setNameSuffix('PhD');
      expect(character.getFullName()).toBe('Dr. John Doe, PhD');
    });

    it('renders generational suffixes with the older-style comma', () => {
      character.setName('John');
      character.setSurname('Smith');
      character.setNameSuffix('Jr.');
      expect(character.getFullName()).toBe('John Smith, Jr.');
    });

    it('omits the comma when there is no preceding head', () => {
      character.setNameSuffix('Esq.');
      expect(character.getFullName()).toBe('Esq.');
    });
  });

  describe('type checking', () => {
    it('should be instance of Character', () => {
      expect(character instanceof Character).toBe(true);
    });

    it('should be instance of TestCharacter', () => {
      expect(character instanceof TestCharacter).toBe(true);
    });
  });
});
