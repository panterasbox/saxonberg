/**
 * ContainerMixin tests — exercises the Container surface through
 * `ContainmentApi.move` (the public path). Direct calls to
 * `addContainable` / `removeContainable` are blocked by the
 * `@CallSecurity` lockdown introduced in Phase 5; only
 * `Containable.setEnvironment` (itself reachable only from
 * ContainmentApi) may invoke them.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContainerMixin } from '../Container';
import { ContainableMixin } from '../Containable';
import { ContainmentApi } from '../../../api/containment';
import { Stuff } from '../../stuff/Stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

// Concrete test item class — needs ContainableMixin to live in a Container.
class ConcreteStuff extends ContainableMixin(Stuff) {
  constructor() {
    super();
  }
}

// Test class that uses ContainerMixin.
class TestContainer extends ContainerMixin(Stuff) {
  constructor() {
    super();
  }
}

describe('ContainerMixin (via ContainmentApi.move)', () => {
  let container: TestContainer;
  let item1: ConcreteStuff;
  let item2: ConcreteStuff;
  let item3: ConcreteStuff;

  beforeEach(() => {
    container = makeStuff(() => new TestContainer());
    item1 = makeStuff(() => new ConcreteStuff());
    item2 = makeStuff(() => new ConcreteStuff());
    item3 = makeStuff(() => new ConcreteStuff());
  });

  describe('initialization', () => {
    it('starts with an empty inventory', () => {
      expect(container.inventory.size).toBe(0);
      expect(container.getContents()).toEqual([]);
    });
  });

  describe('add via ContainmentApi.move', () => {
    it('places an item in the container', () => {
      ContainmentApi.move(item1, container);
      expect(container.inventory.size).toBe(1);
      expect(container.hasContainable(item1)).toBe(true);
    });

    it('places multiple items', () => {
      ContainmentApi.move(item1, container);
      ContainmentApi.move(item2, container);
      ContainmentApi.move(item3, container);
      expect(container.inventory.size).toBe(3);
    });

    it('moving an item already in the container is a no-op', () => {
      ContainmentApi.move(item1, container);
      ContainmentApi.move(item1, container);
      expect(container.inventory.size).toBe(1);
    });
  });

  describe('remove via ContainmentApi.move(item, null)', () => {
    beforeEach(() => {
      ContainmentApi.move(item1, container);
      ContainmentApi.move(item2, container);
    });

    it('detaches an item back to no-environment', () => {
      ContainmentApi.move(item1, null);
      expect(container.hasContainable(item1)).toBe(false);
      expect(item1.getEnvironment()).toBeNull();
      expect(container.inventory.size).toBe(1);
    });

    it('detaching an item that was never placed is a no-op', () => {
      ContainmentApi.move(item3, null);
      expect(container.inventory.size).toBe(2);
    });

    it('detaching every item leaves an empty container', () => {
      ContainmentApi.move(item1, null);
      ContainmentApi.move(item2, null);
      expect(container.inventory.size).toBe(0);
      expect(container.getContents()).toEqual([]);
    });
  });

  describe('hasContainable', () => {
    beforeEach(() => {
      ContainmentApi.move(item1, container);
      ContainmentApi.move(item2, container);
    });

    it('returns true for items currently inside', () => {
      expect(container.hasContainable(item1)).toBe(true);
      expect(container.hasContainable(item2)).toBe(true);
    });

    it('returns false for items never placed', () => {
      expect(container.hasContainable(item3)).toBe(false);
    });

    it('returns false after the item is moved out', () => {
      ContainmentApi.move(item1, null);
      expect(container.hasContainable(item1)).toBe(false);
    });
  });

  describe('getContents', () => {
    it('returns an empty array for an empty container', () => {
      expect(container.getContents()).toEqual([]);
    });

    it('returns every contained item', () => {
      ContainmentApi.move(item1, container);
      ContainmentApi.move(item2, container);
      const contents = container.getContents();
      expect(contents.length).toBe(2);
      expect(contents).toContain(item1);
      expect(contents).toContain(item2);
    });

    it('returns a snapshot, not a live reference', () => {
      ContainmentApi.move(item1, container);
      const contents1 = container.getContents();
      ContainmentApi.move(item2, container);
      const contents2 = container.getContents();

      expect(contents1.length).toBe(1);
      expect(contents2.length).toBe(2);
    });
  });

  describe('persistence', () => {
    it('does NOT declare persistentFields (complex type)', () => {
      const fields = (TestContainer as { persistentFields?: unknown }).persistentFields;
      expect(fields).toBeUndefined();
    });
  });
});
