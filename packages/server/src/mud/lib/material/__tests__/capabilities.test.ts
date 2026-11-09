/**
 * The material capabilities (material decomposition W0): each group of
 * fields a material may or may not have is its own mixin, named for the
 * physics, with a `MixinApi.has<X>` predicate — and a derived read that
 * needs a SIBLING capability asks for it rather than assuming it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import Material from '../Material';
import { Idea } from '../../stuff/Idea';
import { FusionMixin } from '../Fusion';
import { SolidityMixin } from '../Solidity';
import { SolutionMixin } from '../Solution';
import { VolatilityMixin } from '../Volatility';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';

beforeEach(() => {
  StuffApi.clearAll();
});

const CAPABILITIES = [
  'Odor', 'Combustion', 'Fusion', 'Volatility', 'Solidity', 'Porosity',
  'Edibility', 'Toxicity', 'Perishability', 'Acidity', 'Solution',
  'Kinetic', 'Shrinkage', 'Coating', 'Optics', 'Tissue',
  'Mixture',
] as const;

class Tagless extends Idea {
  public hasTag(): boolean { return false; }
}
class MeltsOnly extends FusionMixin(Tagless) {}
class MeltsAndExpands extends SolidityMixin(FusionMixin(Tagless)) {}
class BreaksOnly extends SolidityMixin(Tagless) {}
class DissolvesOnly extends SolutionMixin(Tagless) {}
class DissolvesAndBoils extends VolatilityMixin(SolutionMixin(Tagless)) {}

describe('⭐ every capability is a registered mixin with a predicate', () => {
  it('each has a Mixins name and a has<X> predicate', () => {
    for (const cap of CAPABILITIES) {
      expect(Mixins[cap]).toBe(`${cap}Mixin`);
      expect(typeof (MixinApi as unknown as Record<string, unknown>)[`has${cap}`]).toBe('function');
    }
  });

  it('⚠ scaffold: the base still composes every capability (until the cut)', () => {
    for (const cap of CAPABILITIES) {
      expect(MixinApi.hasMixin(Material, Mixins[cap])).toBe(true);
    }
    expect(MixinApi.hasMixin(Material, Mixins.Radioactivity)).toBe(false);
  });
});

describe('⭐ a derived read asks for its sibling capability', () => {
  it('cast shrinkage needs a thermal expansion: without Solidity it is 0', () => {
    const m = makeStuff(() => new MeltsOnly());
    m.setMeltingPoint(Quantity.of(1200, 'K'));
    expect(m.castShrinkage()).toBe(0);

    const brass = makeStuff(() => new MeltsAndExpands());
    brass.setMeltingPoint(Quantity.of(1200, 'K'));
    brass.setThermalExpansion(1.9e-5);
    expect(brass.castShrinkage()).toBeCloseTo(1.9e-5 * (1200 - 293), 6);
  });

  it('a broken piece falls back to the cast template only for a thing that melts', () => {
    expect(makeStuff(() => new BreaksOnly()).getBrokenTemplate()).toBe('');
    expect(makeStuff(() => new MeltsAndExpands()).getBrokenTemplate()).toBe('/stuff/thing/Casting');
  });

  it('the boil-down needs a boiling point: without Volatility the elevated boil is 0', () => {
    const brine = makeStuff(() => new DissolvesOnly());
    brine.setBoilingPointElevation([[0, 0], [0.5, 10]]);
    expect(brine.boilingPointAt(0.5)).toBe(0);

    const syrup = makeStuff(() => new DissolvesAndBoils());
    syrup.setBoilingPoint(Quantity.of(373, 'K'));
    syrup.setBoilingPointElevation([[0, 0], [0.5, 10]]);
    expect(syrup.boilingPointAt(0.5)).toBe(383);
  });
});
