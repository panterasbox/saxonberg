/**
 * ContainableMixin tests — exercises environment management through
 * `ContainmentApi.move`. Direct `setContainer` calls now require an
 * `mud/api/containment#ContainmentApi` caller frame; the unit-level
 * tests for the chokepoint live above this file in `containment.test.ts`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContainableMixin } from '../Containable';
import { ContainerMixin } from '../Container';
import { ContainmentApi } from '../../../api/containment';
import { Stuff } from '../../stuff/Stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";

// Concrete test environment class — needs ContainerMixin to be an environment
class ConcreteStuff extends ContainerMixin(Idea) {
  constructor() {
    super();
  }
}

// Test class that uses ContainableMixin
class TestContainable extends ContainableMixin(Idea) {
  constructor() {
    super();
  }
}

describe('ContainableMixin', () => {
  let containable: TestContainable;
  let environment1: ConcreteStuff;
  let environment2: ConcreteStuff;

  beforeEach(() => {
    containable = makeStuff(() => new TestContainable());
    environment1 = makeStuff(() => new ConcreteStuff());
    environment2 = makeStuff(() => new ConcreteStuff());
  });

  describe('initialization', () => {
    it('initializes with null environment', () => {
      expect(containable.getContainer()).toBeNull();
    });
  });

  describe('setContainer via ContainmentApi.move', () => {
    it('places into a container', () => {
      ContainmentApi.move(containable, environment1);
      expect(containable.getContainer()).toBe(environment1);
    });

    it('relocates between containers', () => {
      ContainmentApi.move(containable, environment1);
      ContainmentApi.move(containable, environment2);
      expect(containable.getContainer()).toBe(environment2);
    });

    it('detaches via move(item, null)', () => {
      ContainmentApi.move(containable, environment1);
      ContainmentApi.move(containable, null);
      expect(containable.getContainer()).toBeNull();
    });
  });

  describe('getContainer', () => {
    it('returns null when not placed', () => {
      expect(containable.getContainer()).toBeNull();
    });

    it('returns the current environment', () => {
      ContainmentApi.move(containable, environment1);
      expect(containable.getContainer()).toBe(environment1);
    });
  });

  describe('persistence', () => {
    it('does NOT declare persistentFields (complex type)', () => {
      const fields = (TestContainable as { persistentFields?: unknown }).persistentFields;
      expect(fields).toBeUndefined();
    });
  });
});
