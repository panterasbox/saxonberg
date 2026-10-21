import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { SwimmableMixin } from '../Swimmable';
import { Idea } from '../../stuff/Idea';
import Good from '../../stuff/Good';
import { PropertiedMixin } from '../../stuff/Propertied';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class Pond extends SwimmableMixin(Idea) {}
class Actor extends PropertiedMixin(Good) {}
class BareActor extends Good {}

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

    it('⭐ swimming is a cost, never a check: every body may go in, and a water has no difficulty', () => {
      const actor = makeStuff(() => new Actor());
      const bare = makeStuff(() => new BareActor());
      expect(p.canBeEngagedBy(actor)).toBe(true);
      expect(p.canBeEngagedBy(bare)).toBe(true);
      expect(p.getDifficulty()).toBeNull();
      expect(() => p.setDifficulty(2)).toThrow(/cost, not a check/);
    });
  });
});
