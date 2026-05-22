/**
 * ContainableMixin tests — exercises environment management through
 * `ContainmentApi.move`. Direct `setContainer` calls now require an
 * `mud/api/containment#ContainmentApi` caller frame; the unit-level
 * tests for the chokepoint live above this file in `containment.test.ts`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContainableMixin } from '../Containable';
import { ContainerMixin } from '../Container';
import { SingletonMixin } from '../../stuff/Singleton';
import { ContainmentApi } from '../../../api/containment';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
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

// Singleton + Container test class for applyContainer targets.
class SingletonContainer extends SingletonMixin(ContainerMixin(Idea)) {
  static persistentFields: string[] = [];
}

describe('ContainableMixin.applyContainer', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('declares container as an instruction field', () => {
    const fields = MixinApi.getAllInstructionFields(TestContainable);
    expect(fields).toContain('container');
  });

  it('places self into the declared container on first apply', async () => {
    const target = makeStuffAtPath(
      () => new SingletonContainer(),
      '/test/target-room'
    );
    const child = makeStuff(() => new TestContainable());
    expect(child.getContainer()).toBeNull();

    await (child as unknown as {
      applyContainer(path: string): Promise<void>;
    }).applyContainer('/test/target-room');

    expect(child.getContainer()).toBe(target);
  });

  it('no-ops when current container equals declared (compare-and-move)', async () => {
    const target = makeStuffAtPath(
      () => new SingletonContainer(),
      '/test/already-here'
    );
    const child = makeStuff(() => new TestContainable());
    ContainmentApi.move(child, target);
    expect(child.getContainer()).toBe(target);

    // Spy on ContainmentApi.move to confirm no second move is issued.
    const moveSpy = vi.spyOn(ContainmentApi, 'move');

    await (child as unknown as {
      applyContainer(path: string): Promise<void>;
    }).applyContainer('/test/already-here');

    expect(moveSpy).not.toHaveBeenCalled();
    expect(child.getContainer()).toBe(target);
  });

  it('moves when current container differs from declared', async () => {
    const elsewhere = makeStuffAtPath(
      () => new SingletonContainer(),
      '/test/elsewhere'
    );
    const target = makeStuffAtPath(
      () => new SingletonContainer(),
      '/test/target'
    );
    const child = makeStuff(() => new TestContainable());
    ContainmentApi.move(child, elsewhere);
    expect(child.getContainer()).toBe(elsewhere);

    await (child as unknown as {
      applyContainer(path: string): Promise<void>;
    }).applyContainer('/test/target');

    expect(child.getContainer()).toBe(target);
    expect(elsewhere.hasContainable(child)).toBe(false);
  });
});
