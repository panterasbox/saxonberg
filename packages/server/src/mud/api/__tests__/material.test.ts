import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MaterialApi } from '../material';
import { MaterialLogic } from '../../platform/idea/api/MaterialLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import Material from '../../lib/material/Material';
import Good from '../../lib/stuff/Good';
import { Idea } from '../../lib/stuff/Idea';
import { MixinApi } from '../mixin';
import { Quantity } from '../../lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

describe('Tangible.getMaterial (direct object read)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('returns null for non-Tangible Stuff', () => {
    const idea = makeStuff(() => new Idea());
    expect(
      MixinApi.isTangible(idea) ? idea.getMaterial() : null
    ).toBeNull();
  });

  it('returns null for Tangible Stuff with no material set', () => {
    const thing = makeStuff(() => new Good());
    expect(
      MixinApi.isTangible(thing) ? thing.getMaterial() : null
    ).toBeNull();
  });

  it('returns the Material singleton for a Tangible Stuff with a path set', () => {
    const oak = makeStuff(() => new Material());
    oak.setName('oak');
    stampTemplatePathForTest(oak, '/stuff/idea/material/wood/oak');

    const log = makeStuff(() => new Good());
    if (!MixinApi.isTangible(log)) throw new Error('expected tangible');
    log.setMaterial(oak);

    expect(log.getMaterial()).toBe(oak);
  });

  it('reads per-Detail overrides when detailKey is supplied', () => {
    const oak = makeStuff(() => new Material());
    stampTemplatePathForTest(oak, '/stuff/idea/material/wood/oak');
    const iron = makeStuff(() => new Material());
    stampTemplatePathForTest(iron, '/stuff/idea/material/element/iron');

    const axe = makeStuff(() => new Good());
    if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
    axe.setMaterial(oak);
    axe.setMaterial(iron, 'head');

    expect(axe.getMaterial()).toBe(oak);
    expect(axe.getMaterial('head')).toBe(iron);
    // Unknown key falls through to bulk default.
    expect(axe.getMaterial('haft')).toBe(oak);
  });
});

describe('MaterialApi v2 — classification queries', () => {
  function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
    stampTemplatePathForTest(obj, path);
    return obj;
  }

  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  function setupSteel(): {
    iron: Material;
    carbon: Material;
    steel: Material;
  } {
    const iron = withTemplatePath(
      makeStuff(() => new Material()),
      '/stuff/idea/material/element/iron'
    );
    iron.setName('iron');
    iron.setTags(['element', 'metal', 'ferrous']);
    iron.setChemistry({
      symbol: 'Fe',
      atomicNumber: 26,
      molarMass: Quantity.of(55.845, 'g/mol'),
    });

    const carbon = withTemplatePath(
      makeStuff(() => new Material()),
      '/stuff/idea/material/element/carbon'
    );
    carbon.setName('carbon');
    carbon.setTags(['element', 'non-metal']);
    carbon.setChemistry({
      symbol: 'C',
      atomicNumber: 6,
      molarMass: Quantity.of(12.011, 'g/mol'),
    });

    const steel = withTemplatePath(
      makeStuff(() => new Material()),
      '/stuff/idea/material/alloy/steel'
    );
    steel.setName('steel');
    steel.setTags(['alloy', 'metal', 'ferrous']);
    steel.setComposition([
      { materialPath: '/stuff/idea/material/element/iron', fraction: 0.998 },
      { materialPath: '/stuff/idea/material/element/carbon', fraction: 0.002 },
    ]);

    return { iron, carbon, steel };
  }

  describe('compositionOf', () => {
    it('a pure element credits its own symbol with full weight', () => {
      const { iron } = setupSteel();
      const result = iron.elementalComposition();
      expect(result.direct).toEqual([]);
      expect(result.flat).toEqual({ Fe: 1 });
    });

    it('an alloy expands to leaf-element fractions', () => {
      const { steel } = setupSteel();
      const result = steel.elementalComposition();
      expect(result.direct).toHaveLength(2);
      expect(result.flat.Fe).toBeCloseTo(0.998);
      expect(result.flat.C).toBeCloseTo(0.002);
    });

    it('a mixture without composition refs yields an empty flat map', () => {
      const granite = withTemplatePath(
        makeStuff(() => new Material()),
        '/stuff/idea/material/rock/granite'
      );
      granite.setTags(['rock', 'igneous', 'mixture']);
      // composition empty by default
      const result = granite.elementalComposition();
      expect(result.flat).toEqual({});
    });
  });

  describe('containsElement', () => {
    it('iron contains Fe; not C', () => {
      const { iron } = setupSteel();
      expect(iron.containsElement('Fe')).toBe(true);
      expect(iron.containsElement('C')).toBe(false);
    });

    it('steel contains both Fe and C', () => {
      const { steel } = setupSteel();
      expect(steel.containsElement('Fe')).toBe(true);
      expect(steel.containsElement('C')).toBe(true);
      expect(steel.containsElement('Au')).toBe(false);
    });
  });

  describe('findByTag', () => {
    it('returns every Material carrying the tag', () => {
      const { iron, carbon, steel } = setupSteel();
      const metals = MaterialApi.findByTag('metal');
      const ferrous = MaterialApi.findByTag('ferrous');
      const elements = MaterialApi.findByTag('element');

      expect(new Set(metals)).toEqual(new Set([iron, steel]));
      expect(new Set(ferrous)).toEqual(new Set([iron, steel]));
      expect(new Set(elements)).toEqual(new Set([iron, carbon]));
    });

    it('unknown tag returns empty list', () => {
      setupSteel();
      expect(MaterialApi.findByTag('fantasy')).toEqual([]);
    });
  });

  describe('findByElement', () => {
    it('finds every Material whose recursive composition contains the symbol', () => {
      const { iron, steel } = setupSteel();
      const ironContaining = MaterialApi.findByElement('Fe');
      expect(new Set(ironContaining)).toEqual(new Set([iron, steel]));
    });

    it('unknown element symbol returns empty', () => {
      setupSteel();
      expect(MaterialApi.findByElement('Au')).toEqual([]);
    });
  });
});

describe('MaterialLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /platform/idea/api/material once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton.
    MaterialApi.findByTag('nonexistent');
    const logic = StuffApi.findByTemplatePath('/platform/idea/api/material');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/platform/idea/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-MaterialApi caller', () => {
    MaterialApi.findByTag('nonexistent');
    const logic = StuffApi.findByTemplatePath<MaterialLogic>(
      '/platform/idea/api/material'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/material#MaterialApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() => logic!.findByTag('iron')).toThrow(SecurityError);
  });
});

describe('MaterialApi.makeupOf / foldMakeup — combining is one rule (ceramics re-plan R1-D6)', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  function mat(path: string, composition: { materialPath: string; fraction: number }[] = []): Material {
    const m = makeStuff(() => new Material());
    stampTemplatePathForTest(m, path);
    m.setComposition(composition);
    return m;
  }
  const share = (entries: readonly { materialPath: string; fraction: number }[], p: string): number =>
    entries.find((e) => e.materialPath === p)?.fraction ?? 0;

  it('a material with no record and no kind composition is itself, whole', () => {
    const gin = mat('/stuff/idea/material/_fold/gin');
    expect(MaterialApi.makeupOf(gin)).toEqual([{ materialPath: '/stuff/idea/material/_fold/gin', fraction: 1 }]);
  });

  it('⭐ a partial kind composition leaves the rest to the material itself — no mass goes missing', () => {
    const shoulder = mat('/stuff/idea/material/_fold/shoulder', [
      { materialPath: '/stuff/idea/material/_fold/fat', fraction: 0.12 },
    ]);
    const out = MaterialApi.makeupOf(shoulder);
    expect(share(out, '/stuff/idea/material/_fold/fat')).toBeCloseTo(0.12, 9);
    expect(share(out, '/stuff/idea/material/_fold/shoulder')).toBeCloseTo(0.88, 9);
  });

  it('a piece’s own record wins over the kind; an over-full record scales to 1', () => {
    const clay = mat('/stuff/idea/material/_fold/clay', [
      { materialPath: '/stuff/idea/material/_fold/mineral', fraction: 1 },
    ]);
    const own = [
      { materialPath: '/stuff/idea/material/_fold/mineral', fraction: 1 },
      { materialPath: '/stuff/idea/material/_fold/sand', fraction: 1 },
    ];
    const out = MaterialApi.makeupOf(clay, own);
    expect(share(out, '/stuff/idea/material/_fold/mineral')).toBeCloseTo(0.5, 9);
    expect(share(out, '/stuff/idea/material/_fold/sand')).toBeCloseTo(0.5, 9);
  });

  it('⭐ folds by mass, expanding each part: 8 kg of 0.4 % iron sand in 16 kg is 0.2 % iron', () => {
    const sand = mat('/stuff/idea/material/_fold/sand');
    const ash = mat('/stuff/idea/material/_fold/ash');
    const iron = '/stuff/idea/material/_fold/iron';
    const out = MaterialApi.foldMakeup([
      { material: sand, kg: 8, makeup: [{ materialPath: iron, fraction: 0.004 }] },
      { material: ash, kg: 8 },
    ]);
    expect(share(out, iron)).toBeCloseTo(0.002, 9);
    expect(share(out, '/stuff/idea/material/_fold/sand')).toBeCloseTo(0.498, 9);
    expect(share(out, '/stuff/idea/material/_fold/ash')).toBeCloseTo(0.5, 9);
    expect(out.reduce((a, e) => a + e.fraction, 0)).toBeCloseTo(1, 9);
  });

  it('nothing weighed folds to nothing', () => {
    expect(MaterialApi.foldMakeup([{ material: mat('/stuff/idea/material/_fold/x'), kg: 0 }])).toEqual([]);
  });
});
