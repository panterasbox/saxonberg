/**
 * ContainableMixin tests — exercises environment management through
 * `ContainmentApi.move`. Direct `setContainer` calls now require an
 * `mud/api/containment#ContainmentApi` caller frame; the unit-level
 * tests for the chokepoint live above this file in `containment.test.ts`.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContainableMixin } from '../Containable';
import { ContainerMixin } from '../Container';
import { PlacingMixin } from '../Placing';
import { SingletonMixin } from '../../stuff/Singleton';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";
import type { FieldMeta } from '../../mixin';

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
    it('neither environment nor restingOn is persistent — both are live refs', () => {
      // Through the accessor (the class's own static is gone with the
      // `fieldMeta` fold). The accessor aggregates the chain, so the
      // claim is stated as "neither reference field is persistent"
      // rather than "the list is empty".
      const fields = MixinApi.getAllPersistentFields(TestContainable);
      // Containable's two reference fields (`environment`, `_restingOn`)
      // are both instance (live) refs. `environment` is rebuilt at
      // clone time via the `applyContainer` instruction-field path;
      // `_restingOn` resets to null on hydrate by design (see
      // Containable.ts JSDoc on the `_restingOn` field).
      expect(fields).not.toContain('environment');
      expect(fields).not.toContain('_restingOn');
    });
  });
});

// A Placing host composed with Containable for placement round-trips.
class TestSurface extends PlacingMixin(ContainableMixin(Idea)) {}

describe('ContainableMixin.placement', () => {
  let room: ConcreteStuff;
  let item: TestContainable;
  let surface: TestSurface;

  beforeEach(() => {
    StuffApi.clearAll();
    room = makeStuff(() => new ConcreteStuff());
    item = makeStuff(() => new TestContainable());
    surface = makeStuffAtPath(
      () => new TestSurface(),
      '/test/placement-host',
    );
    // Put the host in the room so place() has an environment.
    ContainmentApi.move(surface, room);
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('initializes with no placement', () => {
    expect((item.getPlacement()?.host ?? null)).toBeNull();
  });

  it('place sets the pair AND moves into the host\'s environment', () => {
    ContainmentApi.place(item, 'on', surface);
    expect(item.getContainer()).toBe(room);
    expect((item.getPlacement()?.host ?? null)).toBe(surface);
  });

  it('move() to a different container clears the placement', () => {
    ContainmentApi.place(item, 'on', surface);
    expect((item.getPlacement()?.host ?? null)).toBe(surface);
    const elsewhere = makeStuff(() => new ConcreteStuff());
    ContainmentApi.move(item, elsewhere);
    expect(item.getContainer()).toBe(elsewhere);
    expect((item.getPlacement()?.host ?? null)).toBeNull();
  });

  it('place between two hosts in the same room: container unchanged, placement updates', () => {
    const otherSurface = makeStuffAtPath(
      () => new TestSurface(),
      '/test/other-surface',
    );
    ContainmentApi.move(otherSurface, room);
    ContainmentApi.place(item, 'on', surface);
    expect((item.getPlacement()?.host ?? null)).toBe(surface);
    expect(item.getContainer()).toBe(room);
    ContainmentApi.place(item, 'on', otherSurface);
    expect((item.getPlacement()?.host ?? null)).toBe(otherSurface);
    expect(item.getContainer()).toBe(room);
  });

  it('_setPlacement(null) clears the pair', () => {
    ContainmentApi.place(item, 'on', surface);
    expect((item.getPlacement()?.host ?? null)).toBe(surface);
    // Direct _setPlacement(null) is gated by ContainmentApi — invoke
    // through ContainmentApi.move(item, null) and check both fields
    // drop via the change-of-container invariant.
    ContainmentApi.move(item, null);
    expect(item.getContainer()).toBeNull();
    expect((item.getPlacement()?.host ?? null)).toBeNull();
  });

  it('rejects direct _setPlacement calls outside ContainmentApi', () => {
    // The setter is @CallSecurity(FromContainmentApi); test code
    // calling it directly through the proxy should be rejected by
    // the policy gate.
    expect(() => {
      (item as unknown as {
        _setPlacement(h: unknown, n?: string): void;
      })._setPlacement(surface, 'on');
    }).toThrow();
  });
});

// Singleton + Container test class for applyContainer targets.
class SingletonContainer extends SingletonMixin(ContainerMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
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
