import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { LocomotionApi } from '../locomotion';
import { LocomotionMode } from '../../obj/LocomotionMode';
import {
  ClimbableMixin,
  CLIMBING_CAPABILITY_PROP,
} from '../../lib/locomotion/Climbable';
import {
  SwimmableMixin,
  SWIMMING_CAPABILITY_PROP,
} from '../../lib/locomotion/Swimmable';
import { FlyableMixin } from '../../lib/locomotion/Flyable';
import { Idea } from '../../lib/stuff/Idea';
import Thing from '../../lib/stuff/Thing';
import Location from '../../lib/stuff/Location';
import { MobileMixin } from '../../lib/spatial/Mobile';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { SlottableMixin } from '../../lib/slot/Slottable';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { MountableMixin } from '../../lib/slot/Mountable';
import { DrivableMixin } from '../../lib/slot/Drivable';
import { PropertiedMixin } from '../../lib/stuff/Propertied';
import { ContainmentApi } from '../containment';
import Exit from '../../lib/boundary/Exit';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import {
  buildAllModes,
  buildMode,
} from '../../lib/locomotion/__tests__/test-helpers';
import { Mixins } from '../../lib/mixin';
import { MixinApi } from '../mixin';

// Test classes — compose the mixins this Api exercises.
const ClimbableLoc = ClimbableMixin(Location);
class ClimbLocation extends ClimbableLoc {}

const SwimmableLoc = SwimmableMixin(Location);
class SwimLocation extends SwimmableLoc {}

const FlyableLoc = FlyableMixin(Location);
class FlyLocation extends FlyableLoc {}

// A Climbable Thing — e.g., a ladder sitting in a Location.
const ClimbableThingBase = ClimbableMixin(ContainableMixin(Thing));
class Ladder extends ClimbableThingBase {}

// A mobile + containable + propertied actor (avatar-shaped).
const MobileActorBase = PropertiedMixin(MobileMixin(SlottableMixin(ContainableMixin(Idea))));
class Actor extends MobileActorBase {}

// A Mountable + Slotted + Mobile host (horse-shaped).
const MobileMount = MobileMixin(MountableMixin(SlottedMixin(ContainableMixin(Idea))));
class TestMount extends MobileMount {}

// A Drivable + Slotted + Mobile host (cart-shaped).
const MobileCart = MobileMixin(DrivableMixin(SlottedMixin(ContainableMixin(Idea))));
class TestCart extends MobileCart {}

// An Organism + Mobile + Containable actor (NPC-shaped) for the
// body-plan default chain.
import { OrganismMixin } from '../../lib/species/Organism';
import Species from '../../obj/species/Species';
import BodyPlan from '../../obj/species/BodyPlan';
import { StuffApi } from '../stuff';
import { LocomotionLogic } from '../../obj/api/LocomotionLogic';
import { SecurityError } from '../../lib/security/errors';
const OrganismMover = OrganismMixin(MobileMixin(ContainableMixin(Idea)));
class TestOrganismMover extends OrganismMover {}

function makeAtPath<T extends import('../../lib/stuff/Stuff').Stuff>(
  factory: () => T,
  path: string,
): T {
  return makeStuffAtPath(factory, path);
}

describe('LocomotionApi', () => {
  describe('modeOf / modeOfOrThrow', () => {
    beforeEach(() => {
      buildMode('walk');
    });

    it('accepts a short name and resolves the full path', () => {
      const m = LocomotionApi.modeOf('walk');
      expect(m).toBeInstanceOf(LocomotionMode);
      expect(m?.getName()).toBe('walk');
    });

    it('accepts a full templatePath', () => {
      const m = LocomotionApi.modeOf('/obj/LocomotionMode/walk');
      expect(m?.getName()).toBe('walk');
    });

    it('returns null for an unknown name', () => {
      expect(LocomotionApi.modeOf('rocketpack')).toBeNull();
    });

    it('modeOfOrThrow throws with the resolved path in the message', () => {
      expect(() => LocomotionApi.modeOfOrThrow('rocketpack')).toThrow(
        /\/obj\/LocomotionMode\/rocketpack/,
      );
    });
  });

  describe('allModes', () => {
    it('returns every loaded LocomotionMode', () => {
      const modes = buildAllModes();
      const all = LocomotionApi.allModes();
      // 9 v1 modes — assert at least; tests may share registry state.
      const names = all.map((m) => m.getName()).sort();
      expect(names).toEqual(Object.keys(modes).sort());
    });
  });

  describe('resolveHostMode', () => {
    let walk: LocomotionMode;
    let wheeled: LocomotionMode;

    beforeEach(() => {
      walk = buildMode('walk');
      wheeled = buildMode('wheeled');
    });

    it('returns engagedMode when set', () => {
      const cart = makeStuff(() => new TestCart());
      cart.setEngagedMode(walk);
      expect(LocomotionApi.resolveHostMode(cart)).toBe(walk);
    });

    it('returns vehicularMode when engagedMode is null and host is Drivable', () => {
      const cart = makeStuff(() => new TestCart());
      cart.setVehicularMode(wheeled);
      expect(LocomotionApi.resolveHostMode(cart)).toBe(wheeled);
    });

    it('falls back to walk for a non-Drivable Mobile with no engagedMode', () => {
      // A Mountable horse without engagedMode set: not Drivable, so
      // the bodyplan-throw path doesn't apply; falls back to walk.
      const horse = makeStuff(() => new TestMount());
      expect(LocomotionApi.resolveHostMode(horse)).toBe(walk);
    });

    it('throws when a Drivable host has no vehicularMode authored', () => {
      const cart = makeStuff(() => new TestCart());
      // engagedMode null, vehicularMode null — Drivable bug.
      expect(() => LocomotionApi.resolveHostMode(cart)).toThrow(
        /no vehicularMode authored/,
      );
    });
  });

  describe('bodyPlanAllows', () => {
    let walk: LocomotionMode;

    beforeEach(() => {
      walk = buildMode('walk');
    });

    it('returns true when requiresBodyPlanMode is empty', () => {
      const climb = buildMode('climb', { requiresBodyPlanMode: [] });
      const actor = makeStuff(() => new Actor());
      expect(LocomotionApi.bodyPlanAllows(actor, climb)).toBe(true);
    });

    it('returns true for non-Organism actors (no body-plan to consult)', () => {
      const actor = makeStuff(() => new Actor());
      expect(LocomotionApi.bodyPlanAllows(actor, walk)).toBe(true);
    });
  });

  describe('postureAllows', () => {
    it('returns true when requiresPosture is empty', () => {
      const walk = buildMode('walk');
      const actor = makeStuff(() => new Actor());
      expect(LocomotionApi.postureAllows(actor, walk)).toBe(true);
    });

    it('treats non-Posed actors as Postures.Stand', () => {
      const climb = buildMode('climb', { requiresPosture: ['stand'] });
      const actor = makeStuff(() => new Actor());
      expect(LocomotionApi.postureAllows(actor, climb)).toBe(true);
    });

    it('returns false when posture not in requiresPosture', () => {
      const climb = buildMode('climb', { requiresPosture: ['kneel'] });
      const actor = makeStuff(() => new Actor());
      expect(LocomotionApi.postureAllows(actor, climb)).toBe(false);
    });
  });

  describe('checkEnablement', () => {
    describe('walk-shaped (no enablementMixin)', () => {
      it('returns ok regardless of scope', () => {
        const walk = buildMode('walk');
        const loc = makeStuff(() => new Location());
        const actor = makeStuff(() => new Actor());
        ContainmentApi.move(actor, loc);
        expect(LocomotionApi.checkEnablement(actor, walk, 'north')).toEqual({
          ok: true,
        });
      });
    });

    describe('climb', () => {
      let climb: LocomotionMode;

      beforeEach(() => {
        climb = buildMode('climb');
      });

      it('finds a Climbable in the actor\'s container', () => {
        const loc = makeStuff(() => new ClimbLocation());
        loc.setAxes(['up']);
        const actor = makeStuff(() => new Actor());
        ContainmentApi.move(actor, loc);
        expect(LocomotionApi.checkEnablement(actor, climb, 'up')).toEqual({
          ok: true,
        });
      });

      it('finds a Climbable Containable in the room', () => {
        const loc = makeStuff(() => new Location());
        const ladder = makeStuff(() => new Ladder());
        ladder.setAxes(['up']);
        ContainmentApi.move(ladder, loc);
        const actor = makeStuff(() => new Actor());
        ContainmentApi.move(actor, loc);
        expect(LocomotionApi.checkEnablement(actor, climb, 'up')).toEqual({
          ok: true,
        });
      });

      it('returns gate=enablement when no Climbable is in scope', () => {
        const loc = makeStuff(() => new Location());
        const actor = makeStuff(() => new Actor());
        ContainmentApi.move(actor, loc);
        const guard = LocomotionApi.checkEnablement(actor, climb, 'up');
        expect(guard.ok).toBe(false);
        expect(guard.gate).toBe('enablement');
        expect(guard.mode).toBe('climb');
      });

      it('returns gate=capability when difficulty exceeds capability', () => {
        const loc = makeStuff(() => new ClimbLocation());
        loc.setAxes(['*']);
        loc.setDifficulty(5);
        const actor = makeStuff(() => new Actor());
        actor.setProp(CLIMBING_CAPABILITY_PROP, 1);
        ContainmentApi.move(actor, loc);
        const guard = LocomotionApi.checkEnablement(actor, climb, 'up');
        expect(guard.ok).toBe(false);
        expect(guard.gate).toBe('capability');
      });
    });

    describe('swim', () => {
      it('finds a Swimmable Location', () => {
        const swim = buildMode('swim');
        const loc = makeStuff(() => new SwimLocation());
        loc.setAxes(['*']);
        const actor = makeStuff(() => new Actor());
        ContainmentApi.move(actor, loc);
        expect(LocomotionApi.checkEnablement(actor, swim, 'down')).toEqual({
          ok: true,
        });
      });

      it('returns gate=enablement when no Swimmable in scope', () => {
        const swim = buildMode('swim');
        const loc = makeStuff(() => new Location());
        const actor = makeStuff(() => new Actor());
        ContainmentApi.move(actor, loc);
        const guard = LocomotionApi.checkEnablement(actor, swim, 'down');
        expect(guard.ok).toBe(false);
        expect(guard.gate).toBe('enablement');
      });

      it('returns gate=capability when SWIMMING_CAPABILITY_PROP too low', () => {
        const swim = buildMode('swim');
        const loc = makeStuff(() => new SwimLocation());
        loc.setAxes(['*']);
        loc.setDifficulty(4);
        const actor = makeStuff(() => new Actor());
        actor.setProp(SWIMMING_CAPABILITY_PROP, 1);
        ContainmentApi.move(actor, loc);
        const guard = LocomotionApi.checkEnablement(actor, swim, 'down');
        expect(guard.gate).toBe('capability');
      });
    });

    describe('fly', () => {
      it('finds a Flyable Location and admits', () => {
        const fly = buildMode('fly');
        const loc = makeStuff(() => new FlyLocation());
        loc.setAxes(['*']);
        const actor = makeStuff(() => new Actor());
        ContainmentApi.move(actor, loc);
        expect(LocomotionApi.checkEnablement(actor, fly, 'up')).toEqual({
          ok: true,
        });
      });
    });

    describe('ride (passthrough)', () => {
      it('returns ok when actor occupies a Mountable\'s mount slot', () => {
        const ride = buildMode('ride');
        const horse = makeStuff(() => new TestMount());
        horse.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
        horse.setMountSlot('mount:1');
        const rider = makeStuff(() => new Actor());
        horse.occupy(rider, 'mount:1');
        expect(LocomotionApi.checkEnablement(rider, ride, 'north')).toEqual({
          ok: true,
        });
      });

      it('returns gate=noConveyance when actor occupies no Mountable', () => {
        const ride = buildMode('ride');
        const rider = makeStuff(() => new Actor());
        const guard = LocomotionApi.checkEnablement(rider, ride, 'north');
        expect(guard.ok).toBe(false);
        expect(guard.gate).toBe('noConveyance');
      });
    });

    describe('drive (passthrough)', () => {
      it('returns ok when actor occupies a Drivable\'s controller slot', () => {
        const drive = buildMode('drive');
        const cart = makeStuff(() => new TestCart());
        cart.setStaticSlots([{ name: 'driver:1', accepts: 'SlottableMixin' }]);
        cart.setControllerSlot('driver:1');
        const driver = makeStuff(() => new Actor());
        cart.occupy(driver, 'driver:1');
        expect(LocomotionApi.checkEnablement(driver, drive, 'east')).toEqual({
          ok: true,
        });
      });
    });
  });

  describe('findConveyanceHost', () => {
    it('returns the Mountable host for ride', () => {
      const ride = buildMode('ride');
      const horse = makeStuff(() => new TestMount());
      horse.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
      horse.setMountSlot('mount:1');
      const rider = makeStuff(() => new Actor());
      horse.occupy(rider, 'mount:1');
      expect(LocomotionApi.findConveyanceHost(rider, ride)).toBe(horse);
    });

    it('returns the Drivable host for drive', () => {
      const drive = buildMode('drive');
      const cart = makeStuff(() => new TestCart());
      cart.setStaticSlots([{ name: 'driver:1', accepts: 'SlottableMixin' }]);
      cart.setControllerSlot('driver:1');
      const driver = makeStuff(() => new Actor());
      cart.occupy(driver, 'driver:1');
      expect(LocomotionApi.findConveyanceHost(driver, drive)).toBe(cart);
    });

    it('throws when called with a non-passthrough mode', () => {
      const walk = buildMode('walk');
      const actor = makeStuff(() => new Actor());
      expect(() => LocomotionApi.findConveyanceHost(actor, walk)).toThrow(
        /not a passthrough mode/,
      );
    });

    it('returns null when actor is not in a matching slot', () => {
      const ride = buildMode('ride');
      const rider = makeStuff(() => new Actor());
      expect(LocomotionApi.findConveyanceHost(rider, ride)).toBeNull();
    });
  });

  describe('eligibleModes', () => {
    it('returns modes whose body-plan + posture gates pass', () => {
      buildMode('walk');
      buildMode('climb');
      const actor = makeStuff(() => new Actor());
      // Actor isn't an Organism, so bodyPlanAllows admits everything
      // (no anatomy constraint to consult). Both walk and climb pass.
      const eligible = LocomotionApi.eligibleModes(actor).map((m) => m.getName());
      expect(eligible).toContain('walk');
      expect(eligible).toContain('climb');
    });
  });

  describe('engagedMode', () => {
    it('returns the resolved singleton for Mobile actors', () => {
      const walk = buildMode('walk');
      const actor = makeStuff(() => new Actor());
      actor.setEngagedMode(walk);
      expect(actor.getEngagedMode()).toBe(walk);
    });

    it('non-Mobile Stuff has no engaged mode surface', () => {
      class Bare extends Idea {}
      const obj = makeStuff(() => new Bare());
      expect(MixinApi.isMobile(obj)).toBe(false);
    });
  });

  describe('isTransientEngagement', () => {
    it('returns true for walk regardless of destination', () => {
      const walk = buildMode('walk');
      const dest = makeStuff(() => new Location());
      // Build a synthetic Exit pointing at dest.
      const src = makeStuff(() => new Location());
      const exit = makeStuff(
        () => new Exit({ direction: 'n', source: src, destination: dest }),
      );
      expect(LocomotionApi.isTransientEngagement(walk, exit)).toBe(true);
    });

    it('returns false for passthrough modes', () => {
      const ride = buildMode('ride');
      const dest = makeStuff(() => new Location());
      const src = makeStuff(() => new Location());
      const exit = makeStuff(
        () => new Exit({ direction: 'n', source: src, destination: dest }),
      );
      expect(LocomotionApi.isTransientEngagement(ride, exit)).toBe(false);
    });

    it('returns false for climb when destination composes Climbable', () => {
      const climb = buildMode('climb');
      const dest = makeStuff(() => new ClimbLocation());
      const src = makeStuff(() => new Location());
      const exit = makeStuff(
        () => new Exit({ direction: 'up', source: src, destination: dest }),
      );
      expect(LocomotionApi.isTransientEngagement(climb, exit)).toBe(false);
    });

    it('returns true for climb when destination has no Climbable in contents', () => {
      const climb = buildMode('climb');
      const dest = makeStuff(() => new Location());
      const src = makeStuff(() => new Location());
      const exit = makeStuff(
        () => new Exit({ direction: 'down', source: src, destination: dest }),
      );
      expect(LocomotionApi.isTransientEngagement(climb, exit)).toBe(true);
    });

    it('returns false for climb when destination has a Climbable Containable', () => {
      const climb = buildMode('climb');
      const dest = makeStuff(() => new Location());
      const ladder = makeStuff(() => new Ladder());
      ladder.setAxes(['up', 'down']);
      ContainmentApi.move(ladder, dest);
      const src = makeStuff(() => new Location());
      const exit = makeStuff(
        () => new Exit({ direction: 'down', source: src, destination: dest }),
      );
      expect(LocomotionApi.isTransientEngagement(climb, exit)).toBe(false);
    });
  });

  describe('Mixins.Climbable / Swimmable / Flyable registry', () => {
    it('all three are in the Mixins constants', () => {
      expect(Mixins.Climbable).toBe('ClimbableMixin');
      expect(Mixins.Swimmable).toBe('SwimmableMixin');
      expect(Mixins.Flyable).toBe('FlyableMixin');
    });
  });

  describe('defaultModeFor (chain)', () => {
    beforeEach(() => {
      buildMode('walk');
    });

    it('returns universe-default "walk" for a bare non-Organism actor', () => {
      const actor = makeStuff(() => new Actor());
      expect(LocomotionApi.defaultModeFor(actor)).toBe('walk');
    });

    it('returns the bodyplan default for an Organism whose bodyplan declares one', () => {
      // Set up a bird-shaped bodyplan with default='fly'.
      const bodyplan = makeAtPath(
        () => new BodyPlan(),
        '/obj/species/bodyplan/test-avian',
      );
      bodyplan.setName('test-avian');
      bodyplan.setLocomotionModes(['walk', 'fly']);
      bodyplan.setDefaultLocomotionMode('fly');

      const species = makeAtPath(
        () => new Species(),
        '/obj/species/test-bird',
      );
      species.setBodyPlan(bodyplan);

      const npc = makeStuff(() => new TestOrganismMover());
      npc.setSpecies(species);
      expect(LocomotionApi.defaultModeFor(npc)).toBe('fly');
    });

    it('falls back to "walk" for an Organism whose bodyplan has no default', () => {
      const bodyplan = makeAtPath(
        () => new BodyPlan(),
        '/obj/species/bodyplan/test-bareplan',
      );
      bodyplan.setName('test-bareplan');
      // defaultLocomotionMode stays at default null.

      const species = makeAtPath(
        () => new Species(),
        '/obj/species/test-noplan',
      );
      species.setBodyPlan(bodyplan);

      const npc = makeStuff(() => new TestOrganismMover());
      npc.setSpecies(species);
      expect(LocomotionApi.defaultModeFor(npc)).toBe('walk');
    });

    it('falls back to "walk" for an Organism without a species', () => {
      const npc = makeStuff(() => new TestOrganismMover());
      expect(LocomotionApi.defaultModeFor(npc)).toBe('walk');
    });
  });

  describe('LocomotionLogic singleton encapsulation', () => {
    it('lives at /obj/api/locomotion once the facade has materialized it', () => {
      // A sync facade call lazily creates the logic singleton.
      LocomotionApi.modeOf('walk');
      const logic = StuffApi.findByTemplatePath('/obj/api/locomotion');
      expect(logic).toBeDefined();
    });

    it('denies a direct logic-method call from a non-LocomotionApi caller', () => {
      LocomotionApi.modeOf('walk');
      const logic = StuffApi.findByTemplatePath<LocomotionLogic>(
        '/obj/api/locomotion',
      );
      expect(logic).toBeDefined();
      // The test module is neither mud/api/locomotion#LocomotionApi nor
      // the singleton itself, so AnyOf(FromModule, SelfOnly) denies.
      expect(() => logic!.modeOf('walk')).toThrow(SecurityError);
    });
  });
});
