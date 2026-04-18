/**
 * Character tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Character } from './Character';

// Concrete test class that extends Character
class TestCharacter extends Character {
  constructor() {
    super();
  }
}

describe('Character', () => {
  let character: TestCharacter;

  beforeEach(() => {
    character = new TestCharacter();
  });

  describe('mixin composition', () => {
    it('should have Named mixin properties', () => {
      expect(character).toHaveProperty('firstName');
      expect(character).toHaveProperty('lastName');
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
    it('should compute fullName from firstName and lastName', () => {
      character.firstName = 'John';
      character.lastName = 'Doe';
      expect(character.fullName).toBe('John Doe');
    });

    it('should handle empty names', () => {
      expect(character.fullName).toBe('Unnamed');
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
