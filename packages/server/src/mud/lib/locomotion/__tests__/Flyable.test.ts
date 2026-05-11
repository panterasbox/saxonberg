import { describe, it, expect, beforeEach } from 'vitest';
import { FlyableMixin, FLIGHT_CAPABILITY_PROP } from '../Flyable';
import { Idea } from '../../stuff/Idea';
import { Thing } from '../../stuff/Thing';
import { PropertiedMixin, Property } from '../../stuff/Propertied';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class Sky extends FlyableMixin(Idea) {}
class Actor extends PropertiedMixin(Thing) {}

describe('FlyableMixin', () => {
  describe('mixin marker', () => {
    it('MixinApi.hasMixin returns true after composition', () => {
      const s = makeStuff(() => new Sky());
      expect(MixinApi.hasMixin(s, Mixins.Flyable)).toBe(true);
    });

    it('Mixins.Flyable resolves to "FlyableMixin"', () => {
      expect(Mixins.Flyable).toBe('FlyableMixin');
    });
  });

  describe('axes / difficulty', () => {
    let s: Sky;
    beforeEach(() => {
      s = makeStuff(() => new Sky());
    });

    it('default axes empty, difficulty null', () => {
      expect(s.getAxes()).toEqual([]);
      expect(s.getDifficulty()).toBe(null);
    });

    it('canBeEngagedBy reads FLIGHT_CAPABILITY_PROP', () => {
      const actor = makeStuff(() => new Actor());
      s.setDifficulty(3);
      actor.setProp(FLIGHT_CAPABILITY_PROP, 3);
      expect(s.canBeEngagedBy(actor)).toBe(true);
      actor.setProp(FLIGHT_CAPABILITY_PROP, 2);
      expect(s.canBeEngagedBy(actor)).toBe(false);
    });

    it('setAxes rejects empty strings', () => {
      expect(() => s.setAxes([''])).toThrow(/non-empty/);
    });
  });

  it('FLIGHT_CAPABILITY_PROP is Property<number> named "flight"', () => {
    const ref = Property.of<number>('flight');
    expect(FLIGHT_CAPABILITY_PROP.toString()).toBe(ref.toString());
  });
});
