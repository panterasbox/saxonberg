/**
 * PerceiverMixin tests — substrate-only coverage. The verb-execution
 * paths (look / scry / locate) ride on their own controllers'
 * test files.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Idea } from '../../stuff/Idea';
import { SensorMixin } from '../../message/Sensor';
import { PerceiverMixin } from '../Perceiver';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { Perceiver } from '../Perceiver';
import type { Stuff } from '../../stuff/Stuff';

/** A place that is not `Exitable` — perceiving it must still count. */
class Nowhere extends Idea {}

describe('PerceiverMixin', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('registers in the mixin registry under Mixins.Perceiver', () => {
    class Looker extends PerceiverMixin(SensorMixin(Idea)) {}
    const obj = makeStuff(() => new Looker());
    expect(MixinApi.isPerceiver(obj)).toBe(true);
    expect(MixinApi.hasMixin(obj, Mixins.Perceiver)).toBe(true);
  });

  it('contributes the perception verbs (look / scry / locate / find) to the self bucket', () => {
    // Discovery wiring sanity-check — `find.yaml` lives here next to
    // `look` because find is a snapshot-shaped perception verb, not
    // a focus-management verb. The acceptance criterion (inspection-
    // card plan Wave 5) is that find rides on the Perceiver
    // contribution surface so every Sensor/Perceiver actor (Avatar +
    // future NPCs) gets the verb for free.
    class Looker extends PerceiverMixin(SensorMixin(Idea)) {}
    const selfContributions = (Looker as unknown as {
      commandContributions: { self: string[] };
    }).commandContributions.self;
    expect(selfContributions).toContain('platform/cmd/perception/look.yaml');
    expect(selfContributions).toContain('platform/cmd/perception/scry.yaml');
    expect(selfContributions).toContain('platform/cmd/perception/locate.yaml');
    expect(selfContributions).toContain('platform/cmd/shell/find.yaml');
  });

  it('affords the concealment verbs (search + disarm) so a player can invoke them', () => {
    // Regression guard: a command YAML being loaded is NOT enough — a verb
    // is only usable in-world if a mixin CONTRIBUTES it (getAffordances).
    // search.yaml/disarm.yaml shipped without being wired here, so a real
    // player got "I don't understand 'search'" while every unit/integration
    // test passed (they call the controllers directly, past the affordance
    // gate). This asserts the actor-side wiring so it can't regress.
    class Looker extends PerceiverMixin(SensorMixin(Idea)) {}
    const selfContributions = (Looker as unknown as {
      commandContributions: { self: string[] };
    }).commandContributions.self;
    expect(selfContributions).toContain('platform/cmd/perception/search.yaml');
    expect(selfContributions).toContain('platform/cmd/device/disarm.yaml');
    // The stealth build's actor-side verbs — same wiring, same guard.
    expect(selfContributions).toContain('platform/cmd/perception/hide.yaml');
    expect(selfContributions).toContain('platform/cmd/perception/unhide.yaml');
    expect(selfContributions).toContain('platform/cmd/device/arm.yaml');
  });

  describe('composition validation', () => {
    it('throws when PerceiverMixin is composed without SensorMixin', () => {
      class LonePerceiver extends PerceiverMixin(Idea) {
        static _mixinName = 'LonePerceiver';
      }
      expect(() => makeStuff(() => new LonePerceiver())).toThrow(
        /PerceiverMixin without SensorMixin/
      );
    });

    it('accepts the canonical Perceiver(Sensor(...)) chain', () => {
      class Looker extends PerceiverMixin(SensorMixin(Idea)) {
        static _mixinName = 'Looker';
      }
      expect(() => makeStuff(() => new Looker())).not.toThrow();
    });

    it('accepts SensorMixin anywhere below PerceiverMixin in the chain', () => {
      // SensorMixin doesn't need to be the immediate base — just
      // present somewhere on the prototype chain so handleMessage is
      // dispatchable.
      class WithInterior extends PerceiverMixin(
        // A no-op mixin sandwich between Perceiver and Sensor to
        // exercise the deeper-walk case.
        class extends SensorMixin(Idea) {}
      ) {
        static _mixinName = 'WithInterior';
      }
      expect(() => makeStuff(() => new WithInterior())).not.toThrow();
    });
  });
  describe('⭐⭐ the perception moment is a CALL, the hook is an EXTENSION', () => {
    /*
     * The seam this suite guards: three command controllers used to
     * fire `onPerceivedPlace` through their own structural casts, each
     * re-assembling the gate + the `Exitable` narrowing, and they had
     * already diverged (`look` recorded who it saw; `sense` did not).
     * A verb now makes ONE call and the body decides what perceiving
     * entails.
     */

    it('fires the hook on a host that implements it, with the gated exits', () => {
      const seen: Array<{ loc: Stuff; perceived: readonly Stuff[] }> = [];
      class Keeper extends PerceiverMixin(SensorMixin(Idea)) {
        onPerceivedPlace(loc: Stuff, perceived: readonly Stuff[]): void {
          seen.push({ loc, perceived });
        }
      }
      const looker = makeStuff(() => new Keeper());
      const place = makeStuff(() => new Nowhere());

      const exits = (looker as unknown as Perceiver).perceivePlace(place);

      // A place that is not `Exitable` is still PERCEIVED — a room
      // with no way out is somewhere you have been.
      expect(exits).toEqual([]);
      expect(seen).toHaveLength(1);
      expect(seen[0]?.loc).toBe(place);
      expect(seen[0]?.perceived).toEqual([]);
    });

    it('⭐ a host implementing NOTHING is a clean no-op — no cast, no throw', () => {
      class Blank extends PerceiverMixin(SensorMixin(Idea)) {}
      const looker = makeStuff(() => new Blank());
      const place = makeStuff(() => new Nowhere());
      expect(() =>
        (looker as unknown as Perceiver).perceivePlace(place),
      ).not.toThrow();
      expect(
        (looker as unknown as Perceiver).perceivePlace(place),
      ).toEqual([]);
    });

    it('an empty timetable never reaches the hook', () => {
      let calls = 0;
      class Reader extends PerceiverMixin(SensorMixin(Idea)) {
        onReadTimetable(): void {
          calls += 1;
        }
      }
      const reader = makeStuff(() => new Reader());
      (reader as unknown as Perceiver).perceiveTimetable([]);
      expect(calls).toBe(0);
      (reader as unknown as Perceiver).perceiveTimetable([
        { identity: '/x', address: '', grouping: '' } as never,
      ]);
      expect(calls).toBe(1);
    });

    it('⭐⭐ the call surface is on the INTERFACE — a verb needs no structural cast', () => {
      // The regression this guards: `perceivePlace` going optional (or
      // back onto the hook) would put the casts back in the
      // controllers, which is how `look` and `sense` diverged.
      class Looker extends PerceiverMixin(SensorMixin(Idea)) {}
      const obj = makeStuff(() => new Looker());
      expect(MixinApi.isPerceiver(obj)).toBe(true);
      if (MixinApi.isPerceiver(obj)) {
        // No `as unknown as` anywhere in these two lines — that IS the
        // assertion; the narrowing alone must reach both methods.
        expect(typeof obj.perceivePlace).toBe('function');
        expect(typeof obj.perceiveTimetable).toBe('function');
      }
    });
  });
});
