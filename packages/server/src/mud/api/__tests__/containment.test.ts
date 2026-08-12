/**
 * ContainmentApi tests
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContainmentApi } from '../containment';
import { ContainmentLogic } from '../../obj/api/ContainmentLogic';
import { SecurityError } from '../../lib/security/errors';
import Location from '../../lib/stuff/Location';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { SurfacedMixin } from '../../lib/spatial/Surfaced';
import { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../stuff';
import { ExecutionContextApi } from '../execution-context';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { Idea } from "../../lib/stuff/Idea";

/**
 * Wrap a test-only invocation of an ApiOnly-gated static so the
 * policy gate sees a stamped Api class as caller. Tests are
 * structurally outside the Api layer; this helper plants a frame
 * whose target is `StuffApi` (stamped `mud/api/stuff#StuffApi`),
 * which matches the `mud/api/**` glob.
 */
function asApiCaller<T>(fn: () => T): T {
  return ExecutionContextApi.run(null, StuffApi, 'test-harness', undefined, fn);
}

// Create test classes
const ContainableBase = ContainableMixin(Idea);
class TestItem extends ContainableBase {}

const ContainerBase = ContainerMixin(ContainableMixin(Idea));
class TestContainer extends ContainerBase {}

const SurfaceBase = SurfacedMixin(ContainableMixin(Idea));
class TestSurface extends SurfaceBase {}

describe('ContainmentApi.looseContents', () => {
  it('drops items resting on a listed surface, keeps the surface + loose items', () => {
    const room = makeStuff(() => new TestContainer());
    const surface = makeStuff(() => new TestSurface());
    const onSurface = makeStuff(() => new TestItem());
    const loose = makeStuff(() => new TestItem());
    ContainmentApi.move(surface, room);
    ContainmentApi.move(loose, room);
    ContainmentApi.placeOn(onSurface, surface);

    const result = ContainmentApi.looseContents([surface, onSurface, loose]);
    expect(result).toContain(surface);
    expect(result).toContain(loose);
    expect(result).not.toContain(onSurface);
  });

  it('keeps an item whose surface is not in the set (e.g. on the floor)', () => {
    const room = makeStuff(() => new TestContainer());
    const surface = makeStuff(() => new TestSurface());
    const onSurface = makeStuff(() => new TestItem());
    ContainmentApi.move(surface, room);
    ContainmentApi.placeOn(onSurface, surface);

    // The surface isn't in the listing → the resting item stays top-level.
    expect(ContainmentApi.looseContents([onSurface])).toContain(onSurface);
  });
});

describe('ContainmentApi', () => {
  let item: TestItem;
  let container1: TestContainer;
  let container2: TestContainer;
  let location1: Location;
  let location2: Location;

  beforeEach(() => {
    item = makeStuff(() => new TestItem());

    container1 = makeStuff(() => new TestContainer());

    container2 = makeStuff(() => new TestContainer());

    location1 = makeStuff(() => new Location());

    location2 = makeStuff(() => new Location());
  });

  describe('move()', () => {
    it('should move item to container', () => {
      ContainmentApi.move(item, container1);

      expect(item.getContainer()).toBe(container1);
      expect(container1.hasContainable(item)).toBe(true);
    });

    it('should automatically remove from previous container', () => {
      ContainmentApi.move(item, container1);
      expect(container1.hasContainable(item)).toBe(true);

      ContainmentApi.move(item, container2);

      expect(container1.hasContainable(item)).toBe(false);
      expect(container2.hasContainable(item)).toBe(true);
      expect(item.getContainer()).toBe(container2);
    });

    it('should work when item has no current environment', () => {
      expect(item.getContainer()).toBeNull();

      ContainmentApi.move(item, container1);

      expect(item.getContainer()).toBe(container1);
      expect(container1.hasContainable(item)).toBe(true);
    });

    it('should work with Location as container', () => {
      ContainmentApi.move(item, location1);

      expect(item.getContainer()).toBe(location1);
      expect(location1.hasContainable(item)).toBe(true);
    });

    it('should move between locations', () => {
      ContainmentApi.move(item, location1);
      expect(location1.hasContainable(item)).toBe(true);

      ContainmentApi.move(item, location2);

      expect(location1.hasContainable(item)).toBe(false);
      expect(location2.hasContainable(item)).toBe(true);
      expect(item.getContainer()).toBe(location2);
    });
  });

  describe('isContainedIn()', () => {
    it('should return true when item is in container', () => {
      ContainmentApi.move(item, container1);

      expect(ContainmentApi.isContainedIn(item, container1)).toBe(true);
    });

    it('should return false when item is not in container', () => {
      ContainmentApi.move(item, container1);

      expect(ContainmentApi.isContainedIn(item, container2)).toBe(false);
    });

    it('should return false when item has no environment', () => {
      expect(ContainmentApi.isContainedIn(item, container1)).toBe(false);
    });
  });

  describe('getContainer()', () => {
    it('should return container holding the item', () => {
      ContainmentApi.move(item, container1);

      expect(item.getContainer()).toBe(container1);
    });

    it('should return null when item has no environment', () => {
      expect(item.getContainer()).toBeNull();
    });

    it('should update when item moves between containers', () => {
      ContainmentApi.move(item, container1);
      expect(item.getContainer()).toBe(container1);

      ContainmentApi.move(item, container2);
      expect(item.getContainer()).toBe(container2);
    });
  });

  describe('getContents()', () => {
    it('should return contents of container', () => {
      ContainmentApi.move(item, container1);

      const contents = container1.getContents();

      expect(contents).toHaveLength(1);
      expect(contents[0]).toBe(item);
    });

    it('should return empty array for empty container', () => {
      const contents = container1.getContents();

      expect(contents).toHaveLength(0);
    });

    it('should return all items in container', () => {
      const item2 = makeStuff(() => new TestItem());
      const item3 = makeStuff(() => new TestItem());

      ContainmentApi.move(item, container1);
      ContainmentApi.move(item2, container1);
      ContainmentApi.move(item3, container1);

      const contents = container1.getContents();

      expect(contents).toHaveLength(3);
      expect(contents).toContain(item);
      expect(contents).toContain(item2);
      expect(contents).toContain(item3);
    });
  });

  describe('Integration: Complex movement scenarios', () => {
    it('should handle item moving through multiple containers', () => {
      // Start in location1
      ContainmentApi.move(item, location1);
      expect(item.getContainer()).toBe(location1);

      // Pick up into container1
      ContainmentApi.move(item, container1);
      expect(item.getContainer()).toBe(container1);
      expect(location1.hasContainable(item)).toBe(false);

      // Transfer to container2
      ContainmentApi.move(item, container2);
      expect(item.getContainer()).toBe(container2);
      expect(container1.hasContainable(item)).toBe(false);

      // Drop in location2
      ContainmentApi.move(item, location2);
      expect(item.getContainer()).toBe(location2);
      expect(container2.hasContainable(item)).toBe(false);
    });

    it('should handle nested containers', () => {
      // Put container1 in location1
      ContainmentApi.move(container1, location1);

      // Put item in container1
      ContainmentApi.move(item, container1);

      expect(item.getContainer()).toBe(container1);
      expect(container1.getContainer()).toBe(location1);
      expect(container1.hasContainable(item)).toBe(true);
      expect(location1.hasContainable(container1)).toBe(true);
    });
  });

  describe('placeDirect()', () => {
    it('places a fresh item into an env without firing arrival witnesses', () => {
      let addedCount = 0;
      let removedCount = 0;
      let itemMovedCount = 0;

      class WitnessContainer extends ContainerMixin(ContainableMixin(Idea)) {
        onContainableAdded(_item: Stuff): void {
          addedCount++;
        }
        onContainableRemoved(_item: Stuff): void {
          removedCount++;
        }
      }
      class WitnessItem extends ContainableMixin(Idea) {
        onMoved(_from: Stuff | null, _to: Stuff | null): void {
          itemMovedCount++;
        }
      }

      const env = makeStuff(() => new WitnessContainer());
      const fresh = makeStuff(() => new WitnessItem());

      // Baseline — confirm hook wiring is active by going through move().
      ContainmentApi.move(fresh, env);
      expect(addedCount).toBe(1);
      expect(itemMovedCount).toBe(1);

      // Reset state and exercise placeDirect on a fresh subject.
      addedCount = 0;
      removedCount = 0;
      itemMovedCount = 0;
      const fresh2 = makeStuff(() => new WitnessItem());

      asApiCaller(() => ContainmentApi.placeDirect(fresh2, env));
      expect(fresh2.getContainer()).toBe(env);
      expect(env.hasContainable(fresh2)).toBe(true);
      expect(addedCount).toBe(0);
      expect(removedCount).toBe(0);
      expect(itemMovedCount).toBe(0);
    });

    it('throws when item already has a container (relocations go through move)', () => {
      ContainmentApi.move(item, container1);
      expect(() =>
        asApiCaller(() => ContainmentApi.placeDirect(item, container2))
      ).toThrow(/already has a container/);
    });

    it('throws when item is not Containable', () => {
      class NotContainable extends Idea {}
      const stranger = makeStuff(() => new NotContainable());
      expect(() =>
        asApiCaller(() =>
          ContainmentApi.placeDirect(
            stranger as unknown as TestItem,
            container1
          )
        )
      ).toThrow(/not Containable/);
    });

    it('throws when env is not a Container', () => {
      class NotAContainer extends ContainableMixin(Idea) {}
      const notEnv = makeStuff(() => new NotAContainer());
      expect(() =>
        asApiCaller(() =>
          ContainmentApi.placeDirect(
            item,
            notEnv as unknown as TestContainer
          )
        )
      ).toThrow(/not a Container/);
    });

    it('rejects callers outside the mud/api/** module tree (ApiOnly gate)', () => {
      // No asApiCaller wrapper — bare invocation from the test harness
      // is not a stamped Api class, so the ApiOnly policy denies.
      const fresh = makeStuff(() => new TestItem());
      expect(() =>
        ContainmentApi.placeDirect(fresh, container1)
      ).toThrow(/Policy ApiOnly denied/);
    });
  });

  describe('placeOn() — Surfaced auxiliary pointer', () => {
    class TestSurface extends SurfacedMixin(ContainableMixin(Idea)) {}
    let surface: TestSurface;
    let otherSurface: TestSurface;
    let testIndex = 0;

    beforeEach(() => {
      // Each test allocates fresh template paths so the per-template
      // index doesn't collide across tests (the outer describe's
      // beforeEach allocates new test items but doesn't clear the
      // global registry).
      testIndex += 1;
      surface = makeStuffAtPath(
        () => new TestSurface(),
        `/test/placeOn-surface-${testIndex}`,
      );
      otherSurface = makeStuffAtPath(
        () => new TestSurface(),
        `/test/placeOn-other-surface-${testIndex}`,
      );
    });

    it('places item into surface\'s container AND sets restingOn', () => {
      ContainmentApi.move(surface, location1);
      ContainmentApi.placeOn(item, surface);
      expect(item.getContainer()).toBe(location1);
      expect(item.getRestingOn()).toBe(surface);
    });

    it('move() after placeOn clears restingOn (container-change invariant)', () => {
      ContainmentApi.move(surface, location1);
      ContainmentApi.placeOn(item, surface);
      expect(item.getRestingOn()).toBe(surface);
      ContainmentApi.move(item, container1);
      expect(item.getContainer()).toBe(container1);
      expect(item.getRestingOn()).toBeNull();
    });

    it('placeOn between two surfaces in same env: container unchanged, restingOn updates', () => {
      ContainmentApi.move(surface, location1);
      ContainmentApi.move(otherSurface, location1);
      ContainmentApi.placeOn(item, surface);
      expect(item.getContainer()).toBe(location1);
      expect(item.getRestingOn()).toBe(surface);
      ContainmentApi.placeOn(item, otherSurface);
      expect(item.getContainer()).toBe(location1);
      expect(item.getRestingOn()).toBe(otherSurface);
    });

    it('placeOn between surfaces in different envs: both container and restingOn update', () => {
      ContainmentApi.move(surface, location1);
      ContainmentApi.move(otherSurface, location2);
      ContainmentApi.placeOn(item, surface);
      expect(item.getContainer()).toBe(location1);
      ContainmentApi.placeOn(item, otherSurface);
      expect(item.getContainer()).toBe(location2);
      expect(item.getRestingOn()).toBe(otherSurface);
    });

    it('throws when surface has no environment', () => {
      // surface was never moved into a container; getContainer() is null.
      expect(() => ContainmentApi.placeOn(item, surface)).toThrow(
        /no environment/,
      );
    });

    it('throws when surface.canRest() returns false', () => {
      class RejectingSurface extends SurfacedMixin(ContainableMixin(Idea)) {
        canRest(): boolean {
          return false;
        }
      }
      const rejecting = makeStuffAtPath(
        () => new RejectingSurface(),
        `/test/placeOn-rejecting-${testIndex}`,
      );
      ContainmentApi.move(rejecting, location1);
      expect(() => ContainmentApi.placeOn(item, rejecting)).toThrow(/rejects/);
    });
  });
});

describe('ContainmentLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /obj/api/containment once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton.
    const probe = makeStuff(() => new TestContainer());
    ContainmentApi.isContainedIn(probe, probe);
    const found = StuffApi.findByTemplatePath('/obj/api/containment');
    expect(found).toBeDefined();
    expect(StuffApi.findByPathGlob('/obj/api/*')).toContain(found);
  });

  it('denies a direct logic-method call from a non-ContainmentApi caller', () => {
    const probe = makeStuff(() => new TestContainer());
    ContainmentApi.isContainedIn(probe, probe);
    const logic = StuffApi.findByTemplatePath<ContainmentLogic>(
      '/obj/api/containment'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/containment#ContainmentApi`, so the
    // FromModule gate on the logic's own methods denies the call. The
    // gate throws synchronously even for async-bodied methods, so a
    // direct call to the isContainedIn path is sufficient.
    expect(() => logic!.isContainedIn(probe, probe)).toThrow(SecurityError);
  });
});
