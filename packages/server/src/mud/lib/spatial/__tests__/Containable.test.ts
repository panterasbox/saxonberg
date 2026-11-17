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
import { Template } from '../../stuff/Template';
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
import { Placement } from '../Placement';
import { DocumentApi } from '../../../api/document';
import { Placements } from '../Placement';

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
/** ⭐ A host that may offer an enclosing region holds things (W9 refusal 3). */
class TestRegionHost extends PlacingMixin(ContainerMixin(ContainableMixin(Idea))) {}

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
    ContainmentApi.move(item, surface, Placements.ON);
    expect(item.getContainer()).toBe(room);
    expect((item.getPlacement()?.host ?? null)).toBe(surface);
  });

  it('move() to a different container clears the placement', () => {
    ContainmentApi.move(item, surface, Placements.ON);
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
    ContainmentApi.move(item, surface, Placements.ON);
    expect((item.getPlacement()?.host ?? null)).toBe(surface);
    expect(item.getContainer()).toBe(room);
    ContainmentApi.move(item, otherSurface, Placements.ON);
    expect((item.getPlacement()?.host ?? null)).toBe(otherSurface);
    expect(item.getContainer()).toBe(room);
  });

  it('_setPlacement(null) clears the pair', () => {
    ContainmentApi.move(item, surface, Placements.ON);
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
      })._setPlacement(surface, Placements.ON);
    }).toThrow();
  });
});

// Singleton + Container test class for applyContainer targets.
class SingletonContainer extends SingletonMixin(ContainerMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
}

describe('ContainableMixin — where a thing is is runtime state', () => {
  it('⭐ `container` is not an authored field (retired 2026-10-15)', () => {
    expect(MixinApi.getAllInstructionFields(TestContainable)).not.toContain('container');
    expect(
      (TestContainable as unknown as { prototype: Record<string, unknown> }).prototype
        .applyContainer,
    ).toBeUndefined();
  });
});

describe('ContainableMixin.getEnclosingScope', () => {
  let room: ConcreteStuff;
  let item: TestContainable;
  let host: TestRegionHost;

  async function warmMembers(): Promise<void> {
    // The kernel's ways of sitting are resident — the test bootstrap stands
    // in for every place's onCreate (documents D7).
  }

  beforeEach(async () => {
    StuffApi.clearAll();
    vi.restoreAllMocks();
    await warmMembers();
    room = makeStuff(() => new ConcreteStuff());
    item = makeStuff(() => new TestContainable());
    host = makeStuffAtPath(() => new TestRegionHost(), '/test/enclosing-host');
    ContainmentApi.move(host, room);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('unplaced: the container', () => {
    ContainmentApi.move(item, room);
    expect(item.getEnclosingScope()).toBe(room);
  });

  it('a NON-enclosing member: still the container — a desk encloses nothing', () => {
    host.setPlacements([Placements.ON]);
    ContainmentApi.move(item, host, Placements.ON);
    expect(item.getEnclosingScope()).toBe(room);
  });

  it('⭐ an ENCLOSING member: the HOST — a region with its own air, and its contents (W9)', async () => {
    await host.setPlacements([Placements.IN]);
    ContainmentApi.move(item, host, Placements.IN);
    expect(item.getEnclosingScope()).toBe(host);
    expect(item.getContainer()).toBe(host);
  });

  it('⚠ a host naming a placement no pack ships fails at the setter, naming it', async () => {
    vi.spyOn(DocumentApi, 'read').mockResolvedValue(null);
    await expect(host.setPlacements(['/t/placements/sideways'])).rejects.toThrow(/sideways/);
  });

  it('⚠ a destructed host heals to the container, whatever the name said', async () => {
    await host.setPlacements([Placements.IN]);
    ContainmentApi.move(item, host, Placements.IN);
    expect(item.getEnclosingScope()).toBe(host);
    StuffApi.destruct(host);
    expect(item.getPlacement()).toBeNull();
    expect(item.getEnclosingScope()).toBe(room);
  });
});
