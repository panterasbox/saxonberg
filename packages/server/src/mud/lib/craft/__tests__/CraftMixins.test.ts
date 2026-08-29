import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { GradedMixin } from '../Graded';
import { ToolMixin } from '../Tooled';
import { DurableMixin } from '../../material/Durable';
import { CraftedMixin } from '../Crafted';
import { MakerMixin } from '../Maker';
import { Grade } from '../Grade';
import PersistentHydrator from '../../../platform/idea/persistence/PersistentHydrator';
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
  it('matches capabilities and rejects malformed names (the vocabulary is open)', () => {
    const t = makeStuff(() => new ToolHost());
    t.setCapabilities(['shaker']);
    expect(t.hasCapability('shaker')).toBe(true);
    expect(t.hasCapability('strainer')).toBe(false);
    t.setCapabilities(['blender']); // any pack's kind is a kind
    expect(t.hasCapability('blender')).toBe(true);
    expect(() => t.setCapabilities(['Blender!'])).toThrow();
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

  describe('authored verbs (getInstanceContributions)', () => {
    const MEND = ['platform/cmd/crafting/repair.yaml', 'platform/cmd/crafting/salvage.yaml'];
    it('derives buckets from the row\'s own verbs — reachable by default', () => {
      const t = makeStuff(() => new ToolHost());
      t.setCapabilities([{ kind: 'mending', verbs: MEND }]);
      const c = t.getInstanceContributions();
      expect(c.peers).toEqual(MEND);
      expect(c.environment).toEqual(MEND);
    });

    it('a carried-placement entry grants to its HOLDER only (the whetstone)', () => {
      const t = makeStuff(() => new ToolHost());
      t.setCapabilities([
        { kind: 'whetstone', verbs: ['trade/smithing/cmd/crafting/sharpen.yaml'], placement: 'carried' },
      ]);
      const c = t.getInstanceContributions();
      expect(c.environment).toEqual(['trade/smithing/cmd/crafting/sharpen.yaml']);
      expect(c.peers ?? []).toEqual([]);
    });

    it('bare kinds (recipe-side requirements) and empty capabilities confer nothing', () => {
      const t = makeStuff(() => new ToolHost());
      t.setCapabilities(['striking', 'strainer', 'juicer', { kind: 'muddler' }]);
      expect(t.getInstanceContributions()).toEqual({});
      t.setCapabilities([]);
      expect(t.getInstanceContributions()).toEqual({});
    });

    it('the vocabulary is open — a pack\'s own kind confers a pack\'s own view', () => {
      const t = makeStuff(() => new ToolHost());
      t.setCapabilities([
        { kind: 'muddler', verbs: ['trade/hospitality/cmd/crafting/muddle.yaml'] },
      ]);
      const c = t.getInstanceContributions();
      expect(c.environment).toEqual(['trade/hospitality/cmd/crafting/muddle.yaml']);
    });

    it('a broken tool still contributes (the verb declines, not vanishes)', () => {
      const t = makeStuff(() => new ToolHost());
      t.setCapabilities([{ kind: 'anvil', verbs: ['trade/smithing/cmd/crafting/hammer.yaml'] }]);
      t.setCondition(0);
      expect(t.hasCapability('anvil')).toBe(false); // capability lost
      const c = t.getInstanceContributions(); // affordance kept
      expect(c.peers).toContain('trade/smithing/cmd/crafting/hammer.yaml');
    });
  });

  describe('parameterized capability specs', () => {
    it('string shorthand ≡ the defaulted spec', () => {
      const short = makeStuff(() => new ToolHost());
      short.setCapabilities(['mending']);
      const spec = makeStuff(() => new ToolHost());
      spec.setCapabilities([{ kind: 'mending' }]);
      for (const t of [short, spec]) {
        expect(t.hasCapability('mending')).toBe(true);
        expect(t.capabilityRate('mending')).toBe(1);
        expect(t.capabilityControl('mending')).toBeNull();
      }
      expect(short.getInstanceContributions()).toEqual(
        spec.getInstanceContributions(),
      );
    });

    it('validates both entry forms on set', () => {
      const t = makeStuff(() => new ToolHost());
      expect(() => t.setCapabilities(['Blender!'])).toThrow(/Blender/);
      expect(() => t.setCapabilities([{ kind: '' }])).toThrow(/name/);
      expect(() =>
        t.setCapabilities([{ kind: 'blender', verbs: ['not-a-view'] }]),
      ).toThrow(/verbs/);
      expect(() =>
        t.setCapabilities([{ kind: 'mending', rate: 0 }]),
      ).toThrow(/rate/);
      expect(() =>
        t.setCapabilities([{ kind: 'mending', rate: -2 }]),
      ).toThrow(/rate/);
      expect(() =>
        t.setCapabilities([{ kind: 'mending', rate: NaN }]),
      ).toThrow(/rate/);
      expect(() =>
        t.setCapabilities([{ kind: 'mending', control: 'legendary' }]),
      ).toThrow(/control/);
      expect(() =>
        t.setCapabilities([
          { kind: 'mending', placement: 'orbital' as never },
        ]),
      ).toThrow(/placement/);
    });

    it('clamps the read rate to the band', () => {
      const t = makeStuff(() => new ToolHost());
      t.setCapabilities([{ kind: 'mending', rate: 0.3 }]);
      expect(t.capabilityRate('mending')).toBeCloseTo(0.3, 6);
      t.setCapabilities([{ kind: 'mending', rate: 0.1 }]);
      expect(t.capabilityRate('mending')).toBe(0.25);
      t.setCapabilities([{ kind: 'mending', rate: 50 }]);
      expect(t.capabilityRate('mending')).toBe(10);
      expect(t.capabilityRate('anvil')).toBe(1); // absent kind → 1
    });

    it('per-entry placement is the entry\'s own', () => {
      const SHARPEN = ['trade/smithing/cmd/crafting/sharpen.yaml'];
      const wheel = makeStuff(() => new ToolHost());
      wheel.setCapabilities([
        { kind: 'whetstone', verbs: SHARPEN, placement: 'reachable', rate: 4 },
      ]);
      const c = wheel.getInstanceContributions();
      expect(c.peers).toEqual(SHARPEN); // the grinding wheel
      expect(c.environment).toEqual(SHARPEN);

      const MEND = ['platform/cmd/crafting/repair.yaml', 'platform/cmd/crafting/salvage.yaml'];
      const strapped = makeStuff(() => new ToolHost());
      strapped.setCapabilities([{ kind: 'mending', verbs: MEND, placement: 'carried' }]);
      const c2 = strapped.getInstanceContributions();
      expect(c2.environment).toEqual(MEND);
      expect(c2.peers ?? []).toEqual([]);
    });

    it('a mixed authored array round-trips the Hydrator behavior-identically', async () => {
      const t = makeStuff(() => new ToolHost());
      const authored = [
        'whetstone',
        { kind: 'mending', rate: 3, control: 'fine' },
      ];
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        capabilities: authored,
      });
      expect(t.hasCapability('whetstone')).toBe(true);
      expect(t.capabilityRate('mending')).toBe(3);
      expect(t.capabilityControl('mending')).toBe('fine');
      // Persisted field stays the authored plain-record shape.
      expect(t.capabilities).toEqual(authored);
    });
  });
});

describe('CraftedMixin', () => {
  it('stamps the maker mark and is graded', () => {
    const c = makeStuff(() => new CraftedHost());
    c.stamp({
      maker: '/platform/agent/Avatar/dave',
      grade: Grade.of('exceptional'),
      recipe: 'martini',
      craftedAt: 123,
    });
    expect(c.getMaker()).toBe('/platform/agent/Avatar/dave');
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
