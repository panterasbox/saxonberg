import { describe, it, expect } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { GradedMixin } from '../Graded';
import { ToolMixin } from '../Tooled';
import { DurableMixin } from '../../material/Durable';
import { CraftedMixin } from '../Crafted';
import { MakerMixin } from '../Maker';
import { Grade } from '../Grade';
import { makeStuff } from '../../security/__tests__/test-setup';

class GradedHost extends GradedMixin(Idea) {
  static _mixinName = 'GradedHost';
}
// A ToolItem composes both: capabilities (ToolMixin) + wear (DurableMixin).
class ToolHost extends ToolMixin(DurableMixin(Idea)) {
  static _mixinName = 'ToolHost';
}
class CraftedHost extends CraftedMixin(Idea) {
  static _mixinName = 'CraftedHost';
}
class MakerHost extends MakerMixin(Idea) {
  static _mixinName = 'MakerHost';
}

describe('GradedMixin', () => {
  it('persists the band word and exposes a Grade contract', () => {
    const g = makeStuff(() => new GradedHost());
    g.setGradeBand('fine');
    expect(g.getGradeBand()).toBe('fine');
    expect(g.getGrade().getBand()).toBe('fine');

    g.setGrade(Grade.of('poor'));
    expect(g.getGradeBand()).toBe('poor');
  });

  it('rejects an unknown band on the setter', () => {
    const g = makeStuff(() => new GradedHost());
    expect(() => g.setGradeBand('legendary')).toThrow();
  });
});

describe('ToolMixin', () => {
  it('matches capabilities and rejects unknown ones', () => {
    const t = makeStuff(() => new ToolHost());
    t.setCapabilities(['shaker']);
    expect(t.hasCapability('shaker')).toBe(true);
    expect(t.hasCapability('strainer')).toBe(false);
    expect(() => t.setCapabilities(['blender'])).toThrow();
  });

  it('wears on use and clamps condition to [0,1]', () => {
    const t = makeStuff(() => new ToolHost());
    expect(t.getCondition()).toBe(1);
    t.wear(0.1);
    expect(t.getCondition()).toBeCloseTo(0.9, 6);
    t.wear(5); // floor at 0
    expect(t.getCondition()).toBe(0);
    t.setCondition(2); // clamp at 1
    expect(t.getCondition()).toBe(1);
  });

  describe('the capability table (getInstanceContributions)', () => {
    it('derives buckets from the table over authored kinds', () => {
      const t = makeStuff(() => new ToolHost());
      t.setCapabilities(['mending']);
      const c = t.getInstanceContributions();
      expect(c.environment).toEqual([
        'crafting/repair.yaml',
        'crafting/salvage.yaml',
      ]);
      expect(c.inventory).toEqual([
        'crafting/repair.yaml',
        'crafting/salvage.yaml',
      ]);
    });

    it('a carried-placement kind yields inventory only (the whetstone)', () => {
      const t = makeStuff(() => new ToolHost());
      t.setCapabilities(['whetstone']);
      const c = t.getInstanceContributions();
      expect(c.inventory).toEqual(['crafting/sharpen.yaml']);
      expect(c.environment ?? []).toEqual([]);
    });

    it('recipe-side kinds and empty capabilities confer nothing', () => {
      const t = makeStuff(() => new ToolHost());
      t.setCapabilities(['striking', 'strainer', 'muddler']);
      expect(t.getInstanceContributions()).toEqual({});
      t.setCapabilities([]);
      expect(t.getInstanceContributions()).toEqual({});
    });

    it('a broken tool still contributes (the verb declines, not vanishes)', () => {
      const t = makeStuff(() => new ToolHost());
      t.setCapabilities(['anvil']);
      t.setCondition(0);
      expect(t.hasCapability('anvil')).toBe(false); // capability lost
      const c = t.getInstanceContributions(); // affordance kept
      expect(c.environment).toContain('crafting/hammer.yaml');
    });
  });
});

describe('CraftedMixin', () => {
  it('stamps the maker mark and is graded', () => {
    const c = makeStuff(() => new CraftedHost());
    c.stamp({
      maker: '/obj/Avatar/dave',
      grade: Grade.of('exceptional'),
      recipe: 'martini',
      craftedAt: 123,
    });
    expect(c.getMaker()).toBe('/obj/Avatar/dave');
    expect(c.getRecipe()).toBe('martini');
    expect(c.getCraftedAt()).toBe(123);
    expect((c as unknown as { getGrade(): Grade }).getGrade().getBand()).toBe('exceptional');
  });

  it('renders a band-word verdict, never a number', () => {
    const c = makeStuff(() => new CraftedHost());
    c.stamp({
      maker: '',
      grade: Grade.of('fine'),
      recipe: 'martini',
      craftedAt: 0,
    });
    const verdict = c.renderVerdict();
    expect(verdict.toLowerCase()).toContain('fine');
    expect(verdict).not.toMatch(/[0-9]/);
  });
});

describe('MakerMixin', () => {
  it('marks an agent as a maker', () => {
    const m = makeStuff(() => new MakerHost());
    expect(m.isMaker()).toBe(true);
  });
});
