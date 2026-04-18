/**
 * ContainableMixin tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContainableMixin } from './Containable';
import { Stuff } from '../stuff/Stuff';

// Concrete test base class
class ConcreteStuff extends Stuff {
  constructor() {
    super();
  }
}

// Test class that uses ContainableMixin
class TestContainable extends ContainableMixin(Stuff) {
  constructor() {
    super();
  }
}

describe('ContainableMixin', () => {
  let containable: TestContainable;
  let environment1: ConcreteStuff;
  let environment2: ConcreteStuff;

  beforeEach(() => {
    containable = new TestContainable();
    environment1 = new ConcreteStuff();
    environment2 = new ConcreteStuff();
  });

  describe('initialization', () => {
    it('should initialize with null environment', () => {
      expect(containable.environment).toBeNull();
      expect(containable.getEnvironment()).toBeNull();
    });
  });

  describe('setEnvironment', () => {
    it('should set environment', () => {
      containable.setEnvironment(environment1);
      expect(containable.environment).toBe(environment1);
      expect(containable.getEnvironment()).toBe(environment1);
    });

    it('should change environment', () => {
      containable.setEnvironment(environment1);
      containable.setEnvironment(environment2);
      expect(containable.environment).toBe(environment2);
    });

    it('should set environment to null', () => {
      containable.setEnvironment(environment1);
      containable.setEnvironment(null);
      expect(containable.environment).toBeNull();
    });
  });

  describe('getEnvironment', () => {
    it('should return null when no environment', () => {
      expect(containable.getEnvironment()).toBeNull();
    });

    it('should return current environment', () => {
      containable.setEnvironment(environment1);
      expect(containable.getEnvironment()).toBe(environment1);
    });
  });

  describe('persistence', () => {
    it('should NOT have persistentFields (complex type)', () => {
      // ContainableMixin does not declare persistentFields
      // because environment is a complex type requiring custom handlers
      const fields = (TestContainable as any).persistentFields;
      expect(fields).toBeUndefined();
    });
  });
});
