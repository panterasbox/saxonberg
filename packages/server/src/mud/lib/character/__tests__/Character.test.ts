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
      character.name = 'John';
      character.surname = 'Doe';
      expect(character.fullName).toBe('John Doe');
    });

    it('returns empty string when no names set (no fallback)', () => {
      expect(character.fullName).toBe('');
    });

    it('synthesizes honorific + name + surname + nameSuffix', () => {
      character.honorific = 'Dr.';
      character.name = 'John';
      character.surname = 'Doe';
      character.nameSuffix = 'PhD';
      expect(character.fullName).toBe('Dr. John Doe PhD');
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
