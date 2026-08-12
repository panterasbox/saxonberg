import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { WieldableMixin } from '../Wieldable';
import { SlottableMixin } from '../Slottable';
import { ContainableMixin } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class Longbow extends WieldableMixin(SlottableMixin(ContainableMixin(Idea))) {}

describe('WieldableMixin', () => {
  let bow: Longbow;

  beforeEach(() => {
    bow = makeStuff(() => new Longbow());
  });

  it('passes the MixinApi.isWieldable predicate', () => {
    expect(MixinApi.isWieldable(bow)).toBe(true);
    expect(MixinApi.hasMixin(bow, Mixins.Wieldable)).toBe(true);
  });

  it('two-handed claim on biped', () => {
    bow.setSlotClaim('/idea/race/bodyplan/biped', [
      'hand:left',
      'hand:right',
    ]);
    expect(bow.getSlotClaim('/idea/race/bodyplan/biped')).toEqual([
      'hand:left',
      'hand:right',
    ]);
  });
});
