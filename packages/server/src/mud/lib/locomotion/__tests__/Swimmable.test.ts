import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { SwimmableMixin, SWIMMING_CAPABILITY_PROP } from '../Swimmable';
import { Idea } from '../../stuff/Idea';
import Thing from '../../stuff/Thing';
import { PropertiedMixin, Property } from '../../stuff/Propertied';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class Pond extends SwimmableMixin(Idea) {}
class Actor extends PropertiedMixin(Thing) {}
class BareActor extends Thing {}

describe('SwimmableMixin', () => {
  describe('mixin marker', () => {
    it('MixinApi.hasMixin returns true after composition', () => {
      const p = makeStuff(() => new Pond());
      expect(MixinApi.hasMixin(p, Mixins.Swimmable)).toBe(true);
    });

    it('Mixins.Swimmable resolves to "SwimmableMixin"', () => {
      expect(Mixins.Swimmable).toBe('SwimmableMixin');
    });

    it('implements the shared Enablement interface', () => {
      const p = makeStuff(() => new Pond());
      expect(typeof p.canEngageAxis).toBe('function');
      expect(typeof p.canBeEngagedBy).toBe('function');
    });
  });

  describe('axes / difficulty', () => {
    let p: Pond;
    beforeEach(() => {
      p = makeStuff(() => new Pond());
    });

    it('canEngageAxis honors "*"', () => {
      p.setAxes(['*']);
      expect(p.canEngageAxis('south')).toBe(true);
    });

    it('setDifficulty rejects 0', () => {
      expect(() => p.setDifficulty(0)).toThrow(RangeError);
    });

    it('canBeEngagedBy reads SWIMMING_CAPABILITY_PROP', () => {
      const actor = makeStuff(() => new Actor());
      p.setDifficulty(2);
      actor.setProp(SWIMMING_CAPABILITY_PROP, 2);
      expect(p.canBeEngagedBy(actor)).toBe(true);
      actor.setProp(SWIMMING_CAPABILITY_PROP, 1);
      expect(p.canBeEngagedBy(actor)).toBe(false);
    });

    it('canBeEngagedBy rejects non-Propertied actor when difficulty is set', () => {
      const bare = makeStuff(() => new BareActor());
      p.setDifficulty(2);
      expect(p.canBeEngagedBy(bare)).toBe(false);
    });
  });

  it('SWIMMING_CAPABILITY_PROP is Property<number> named "swimming"', () => {
    const ref = Property.of<number>('swimming');
    expect(SWIMMING_CAPABILITY_PROP.toString()).toBe(ref.toString());
  });
});
