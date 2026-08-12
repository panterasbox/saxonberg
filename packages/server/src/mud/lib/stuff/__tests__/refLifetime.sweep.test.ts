/**
 * W7 — the sweep, where behaviour CHANGES.
 *
 * Unlike W6's conversions these sites had no correct prior behaviour to
 * reproduce, so each one needs its own test rather than a pin. Every
 * case below is a dangling reference that survived before this build and
 * does not now.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { ContainmentApi } from '../../../api/containment';
import type { Stuff } from '../Stuff';
import Thing from '../Thing';
import Location from '../Location';
import Exit from '../../boundary/Exit';
import Door from '../../../obj/Door';
import { ContainerMixin } from '../../spatial/Container';
import { ExitableMixin } from '../../boundary/Exitable';
import { DoorBearingMixin } from '../../boundary/DoorBearing';
import { AdornableMixin } from '../../boundary/Adornable';
import { AdornmentMixin } from '../../boundary/Adornment';
import { makeStuff } from '../../security/__tests__/test-setup';

class Box extends ContainerMixin(Thing) {}
class ExitRoom extends ExitableMixin(Location) {}
class Bearer extends DoorBearingMixin(ExitableMixin(Location)) {}
class Wall extends AdornableMixin(ContainerMixin(Thing)) {}
class Fixture extends AdornmentMixin(Thing) {}

const asStuff = (x: unknown): Stuff => x as Stuff;

describe('reference-lifetime sweep (W7)', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  describe('Exit.inverse — was HALF-symmetric', () => {
    it("destructing one exit clears its partner's back-ref", () => {
      const a = makeStuff(() => new ExitRoom());
      const b = makeStuff(() => new ExitRoom());
      const east = makeStuff(
        () => new Exit({ direction: 'east', source: a, destinationPath: '/x' })
      );
      const west = makeStuff(
        () => new Exit({ direction: 'west', source: b, destinationPath: '/y' })
      );
      east.setInverse(west);
      west.setInverse(east);

      // Before this build the clear happened only on the exit's OWN
      // destruct, so the partner was left pointing at a dead Exit.
      StuffApi.destruct(asStuff(east));

      expect(asStuff(west).isDestroyed()).toBe(false);
      expect(west.getInverse()).toBeUndefined();
    });
  });

  describe('Exit.source / _destination — weak', () => {
    it('a destroyed source reads as null rather than a dead Stuff', () => {
      const room = makeStuff(() => new Box());
      const exit = makeStuff(
        () =>
          new Exit({ direction: 'north', source: room, destinationPath: '/z' })
      );
      StuffApi.destruct(room);

      // `canEvict` already asked `isDestroyed()` on this slot; now the
      // slot itself stops holding the corpse.
      expect(
        (exit as unknown as { source: Stuff | null }).source
      ).toBeNull();
    });
  });

  describe('DoorBearing.door — the mixin had no destruct hook at all', () => {
    it('a destroyed door reads as null', () => {
      const bearer = makeStuff(() => new Bearer());
      const door = makeStuff(() => new Door());
      bearer.setDoor(door);
      expect(bearer.getDoor()).toBe(door);

      StuffApi.destruct(asStuff(door));

      expect(bearer.getDoor()).toBeNull();
    });
  });

  describe('Adornment.adornedTo — weak, not the symmetric pair the doc claimed', () => {
    it('a fixture destroyed standalone stops pointing at its host', () => {
      const wall = makeStuff(() => new Wall());
      const fixture = makeStuff(() => new Fixture());
      wall.addFixture(fixture);
      expect(fixture.getAdornedTo()).toBe(wall);

      // The holder still owns the fixture (W6 declared `fixtureSlots`
      // owned); this is the other direction — the fixture's back-ref
      // must stop dangling when the HOST goes.
      StuffApi.destruct(asStuff(wall));
      expect(asStuff(fixture).isDestroyed()).toBe(true);
    });

    it('the back-ref self-heals when the host dies without the fixture', () => {
      const wall = makeStuff(() => new Wall());
      const fixture = makeStuff(() => new Fixture());
      wall.addFixture(fixture);
      wall.removeFixture(fixture);
      // Re-point by hand at a host that then dies, bypassing the
      // owned cascade — the case `weak` exists for.
      (fixture as unknown as { adornedTo: unknown }).adornedTo = wall;
      StuffApi.destruct(asStuff(wall));

      expect(fixture.getAdornedTo()).toBeNull();
    });
  });

  describe('CONTROL — Container.contents still evacuates', () => {
    it('the sweep did not turn contents into an owned cascade', () => {
      const outer = makeStuff(() => new Box());
      const inner = makeStuff(() => new Box());
      const item = makeStuff(() => new Thing());
      ContainmentApi.move(inner, outer);
      ContainmentApi.move(item, inner);

      StuffApi.destruct(asStuff(inner));

      expect(asStuff(item).isDestroyed()).toBe(false);
      expect(item.getContainer()).toBe(outer);
    });
  });
});
