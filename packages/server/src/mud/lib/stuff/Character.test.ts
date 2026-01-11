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

    it('should have Mortal mixin properties', () => {
      expect(character).toHaveProperty('hp');
      expect(character).toHaveProperty('maxHp');
      expect(typeof character.isDead).toBe('function');
      expect(typeof character.takeDamage).toBe('function');
      expect(typeof character.heal).toBe('function');
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

  describe('Mortal mixin integration', () => {
    it('should start with 100 hp', () => {
      expect(character.hp).toBe(100);
      expect(character.maxHp).toBe(100);
      expect(character.isDead()).toBe(false);
    });

    it('should take damage correctly', () => {
      character.takeDamage(30);
      expect(character.hp).toBe(70);
      expect(character.isDead()).toBe(false);
    });

    it('should die when hp reaches 0', () => {
      character.takeDamage(100);
      expect(character.isDead()).toBe(true);
    });

    it('should heal correctly', () => {
      character.hp = 50;
      character.heal(20);
      expect(character.hp).toBe(70);
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
