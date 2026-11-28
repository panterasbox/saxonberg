/**
 * DegradationMixin — *it BREAKS DOWN in its surroundings* (decomposition W0,
 * D6). The shipped material rows, through the real template merge and the
 * real applier: every listed material suffers what it should, corrosion is
 * worded by the metal, and a child row overrides ONE mechanism by key.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { withSaveMany } from '../../persistence/__tests__/pm-fake';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import { Template } from '../../stuff/Template';
import { ZoneApi } from '../../../api/zone';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import type { Degradation } from '../Degradation';
import Wood from '../../../platform/idea/material/Wood';
import Metal from '../../../platform/idea/material/Metal';
import Stone from '../../../platform/idea/material/Stone';
import Glass from '../../../platform/idea/material/Glass';
import Ceramic from '../../../platform/idea/material/Ceramic';

const MATERIAL = fileURLToPath(
  new URL('../../../../../../content/base-library/content/stuff/idea/material/', import.meta.url),
);
const ROOT = '/stuff/idea/material/';

type Doc = { path: string; class?: string | null; extends?: string; data?: Record<string, unknown> };

function row(key: string): Doc {
  const raw = YAML.parse(readFileSync(`${MATERIAL}${key}.yaml`, 'utf8')) as Omit<Doc, 'path'>;
  return { ...raw, path: `${ROOT}${key}` };
}

/** Serve the given rows as the content store, so `Template.findByPath` merges them for real. */
function install(docs: Doc[]): void {
  const store = docs.map((d, i) => ({ ...d, _id: String(i + 1) }));
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(withSaveMany({
    save: vi.fn(async () => '0'),
    find: vi.fn(async (c: string, q: Record<string, unknown>) =>
      c === Collections.Content && typeof q.path === 'string' ? store.filter((d) => d.path === q.path) : [],
    ),
    findById: vi.fn(async () => null),
  }) as unknown as PersistenceManager);
  vi.spyOn(ZoneApi, 'isFolderClass').mockResolvedValue(false);
  vi.spyOn(StuffApi, 'ensureConstituent').mockResolvedValue();
}

/**
 * The row, merged through its `extends:` chain, its `degradation` applied at
 * mint onto its class by the real applier. (Only that field: the rest of a
 * row cites aromas and catalogues this test does not stand up.)
 */
async function mint(key: string, docs: Doc[]): Promise<Stuff & Degradation> {
  install(docs);
  const template = (await Template.findByPath(`${ROOT}${key}`))!;
  const ctor = (await StuffApi.loadClassByPath(template.class!)) as new () => Stuff;
  const material = makeStuff(() => new ctor());
  await makeStuff(() => new TemplateApplier()).apply(material, { degradation: template.data.degradation }, { mode: 'mint' });
  if (!MixinApi.hasDegradation(material)) throw new Error(`${key} does not compose DegradationMixin`);
  return material;
}

afterEach(() => vi.restoreAllMocks());

describe('the kinds that break down', () => {
  it('metal, wood, plant fibre, hide and horn, and the fired bodies compose it', () => {
    for (const ctor of [Metal, Wood, Ceramic]) {
      expect(MixinApi.hasMixin(ctor as never, 'DegradationMixin')).toBe(true);
    }
  });

  it('⚠ NOT bare Stone: glass, sand and soil do not spall', () => {
    expect(MixinApi.hasMixin(Stone as never, 'DegradationMixin')).toBe(false);
    expect(MixinApi.hasMixin(Glass as never, 'DegradationMixin')).toBe(false);
  });
});

describe('the shipped rows', () => {
  const CORRODES: Array<[string, string]> = [
    ['element/iron', 'rust'],
    ['alloy/steel', 'rust'],
    ['alloy/bloom-iron', 'rust'],
    ['alloy/cast-iron', 'rust'],
    ['alloy/sulfurous-iron', 'rust'],
    ['element/copper', 'verdigris'],
    ['alloy/bronze', 'verdigris'],
    ['alloy/brass', 'tarnish'],
    ['element/silver', 'tarnish'],
  ];
  for (const [key, product] of CORRODES) {
    it(`${key} corrodes, and its product is ${product}`, async () => {
      const m = await mint(key, [row(key)]);
      expect(m.suffers('corrosion')).toBe(true);
      expect(m.productOf('corrosion')).toBe(product);
      expect(m.ratePerYear('corrosion')).toBeGreaterThan(0);
      // ⭐ Iron does not rot.
      expect(m.suffers('rot')).toBe(false);
    });
  }

  for (const key of ['wood/oak', 'wood/yew', 'wood/willow', 'organic/leather', 'organic/rawhide', 'organic/paper']) {
    it(`${key} rots and molds, and does not corrode`, async () => {
      const m = await mint(key, [row(key)]);
      expect(m.suffers('rot')).toBe(true);
      expect(m.suffers('mold')).toBe(true);
      expect(m.suffers('corrosion')).toBe(false);
      expect(m.productOf('corrosion')).toBeNull();
    });
  }

  for (const key of ['textile/wool', 'textile/linen', 'textile/canvas', 'textile/hemp', 'textile/jute']) {
    it(`${key} rots, molds and fades`, async () => {
      const m = await mint(key, [row(key)]);
      for (const mech of ['rot', 'mold', 'fade'] as const) expect(m.suffers(mech)).toBe(true);
    });
  }

  for (const key of ['ceramic/brick', 'ceramic/terracotta', 'ceramic/earthenware']) {
    it(`${key} spalls in frost — authorable, not derivable`, async () => {
      const m = await mint(key, [row(key)]);
      expect(m.suffers('frost')).toBe(true);
      expect(m.ratePerYear('frost')).toBeNull();
      expect(m.suffers('rot')).toBe(false);
    });
  }

  it('oak rots slower than willow', async () => {
    const oak = await mint('wood/oak', [row('wood/oak')]);
    const willow = await mint('wood/willow', [row('wood/willow')]);
    expect(oak.ratePerYear('rot')!).toBeLessThan(willow.ratePerYear('rot')!);
  });

  it('⭐ by-key: charred oak overrides rot and keeps oak’s mold', async () => {
    const oak = await mint('wood/oak', [row('wood/oak')]);
    const charred = await mint('wood/charred-oak', [row('wood/oak'), row('wood/charred-oak')]);
    expect(charred.ratePerYear('rot')).toBe(0.005);
    expect(charred.ratePerYear('mold')).toBe(oak.ratePerYear('mold'));
    expect(charred.ratePerYear('rot')!).toBeLessThan(oak.ratePerYear('rot')!);
  });
});

describe('the validating setter', () => {
  const wood = (): Wood => makeStuff(() => new Wood());

  it('an unknown mechanism throws, naming it', () => {
    expect(() => wood().setDegradation({ woodworm: { perYear: 1 } } as never)).toThrow(/'woodworm' is not a decay mechanism/);
  });

  it('corrosion without a product throws', () => {
    expect(() => wood().setDegradation({ corrosion: { perYear: 0.04 } })).toThrow(/needs a product/);
  });

  it('a negative or non-numeric perYear throws', () => {
    expect(() => wood().setDegradation({ rot: { perYear: -0.1 } })).toThrow(/perYear/);
    expect(() => wood().setDegradation({ rot: { perYear: 'fast' as never } })).toThrow(/perYear/);
  });

  it('a mechanism with no perYear is authorable only; null clears', () => {
    const w = wood();
    w.setDegradation({ frost: {} });
    expect(w.suffers('frost')).toBe(true);
    expect(w.ratePerYear('frost')).toBeNull();
    w.setDegradation(null);
    expect(w.suffers('frost')).toBe(false);
  });
});
