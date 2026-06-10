/**
 * PerceiverMixin tests — substrate-only coverage. The verb-execution
 * paths (look / scry / locate) ride on their own controllers'
 * test files.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Idea } from '../../stuff/Idea';
import { SensorMixin } from '../../message/Sensor';
import { PerceiverMixin } from '../Perceiver';
import { makeStuff } from '../../security/__tests__/test-setup';

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
    // pane plan Wave 5) is that find rides on the Perceiver
    // contribution surface so every Sensor/Perceiver actor (Avatar +
    // future NPCs) gets the verb for free.
    class Looker extends PerceiverMixin(SensorMixin(Idea)) {}
    const selfContributions = (Looker as unknown as {
      commandContributions: { self: string[] };
    }).commandContributions.self;
    expect(selfContributions).toContain('perception/look.yaml');
    expect(selfContributions).toContain('perception/scry.yaml');
    expect(selfContributions).toContain('perception/locate.yaml');
    expect(selfContributions).toContain('shell/find.yaml');
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
});
