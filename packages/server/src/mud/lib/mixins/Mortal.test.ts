/**
 * MortalMixin tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MortalMixin } from './MortalMixin';
import { Stuff } from '../stuff/Stuff';

// Test class that uses MortalMixin
class TestMortal extends MortalMixin(Stuff) {
  constructor() {
    super();
  }
}

describe('MortalMixin', () => {
  let mortal: TestMortal;

  beforeEach(() => {
    mortal = new TestMortal();
  });

  describe('initialization', () => {
    it('should initialize with default hp and maxHp', () => {
      expect(mortal.hp).toBe(100);
      expect(mortal.maxHp).toBe(100);
    });

    it('should not be dead initially', () => {
      expect(mortal.isDead()).toBe(false);
    });
  });

  describe('takeDamage', () => {
    it('should reduce hp when taking damage', () => {
      mortal.takeDamage(30);
      expect(mortal.hp).toBe(70);
    });

    it('should not reduce hp below 0', () => {
      mortal.takeDamage(150);
      expect(mortal.hp).toBe(0);
    });

    it('should mark as dead when hp reaches 0', () => {
      mortal.takeDamage(100);
      expect(mortal.isDead()).toBe(true);
    });

    it('should handle multiple damage instances', () => {
      mortal.takeDamage(20);
      mortal.takeDamage(30);
      mortal.takeDamage(10);
      expect(mortal.hp).toBe(40);
    });
  });

  describe('heal', () => {
    it('should increase hp when healing', () => {
      mortal.hp = 50;
      mortal.heal(20);
      expect(mortal.hp).toBe(70);
    });

    it('should not increase hp above maxHp', () => {
      mortal.hp = 90;
      mortal.heal(20);
      expect(mortal.hp).toBe(100);
    });

    it('should heal from 0 hp', () => {
      mortal.hp = 0;
      mortal.heal(50);
      expect(mortal.hp).toBe(50);
      expect(mortal.isDead()).toBe(false);
    });

    it('should handle multiple heal instances', () => {
      mortal.hp = 30;
      mortal.heal(10);
      mortal.heal(15);
      mortal.heal(5);
      expect(mortal.hp).toBe(60);
    });
  });

  describe('isDead', () => {
    it('should return false when hp > 0', () => {
      mortal.hp = 1;
      expect(mortal.isDead()).toBe(false);
    });

    it('should return true when hp === 0', () => {
      mortal.hp = 0;
      expect(mortal.isDead()).toBe(true);
    });

    it('should return true when hp < 0', () => {
      mortal.hp = -10;
      expect(mortal.isDead()).toBe(true);
    });
  });

  describe('persistent fields', () => {
    it('should declare hp and maxHp as persistent fields', () => {
      const fields = (TestMortal as any).persistentFields;
      expect(fields).toContain('hp');
      expect(fields).toContain('maxHp');
    });
  });
});
