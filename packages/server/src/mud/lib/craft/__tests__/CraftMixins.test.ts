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
