/**
 * ⭐ Soap with no new verb (cleanliness D24): lye leaches only through ash
 * in a hopper (and spends the ash); fat and lye in the kettle become soap
 * paste and the boil makes soft soap; salt grains it into a curd the frame
 * sets into a bar that cures on a rack. The rows say what, the vessels say
 * when.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import Hopper from '../thing/Hopper';
import SoapKettle from '../thing/SoapKettle';
import SoapBar from '../thing/SoapBar';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import MaturationProfileRef from '@saxonberg/server/mud/lib/maturation/MaturationProfile';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { CompositionMixin } from '@saxonberg/server/mud/lib/material/Composition';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { LyeStrength } from '@saxonberg/server/mud/lib/cleanliness/LyeStrength';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', 'content', 'trade', 'chandlery');
const row = (rel: string): { class: string; data: Record<string, unknown> } =>
  YAML.parse(readFileSync(join(ROOT, rel), 'utf8'));

let seq = 0;
function material(tags: string[], path = `/stuff/idea/material/_soap/${seq++}`): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path);
    m.setTags(tags);
    return m;
  }, path);
}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the hopper (lye from ash)', () => {
  it('water in an EMPTY hopper is just water', () => {
    const h = makeStuff(() => new Hopper());
    expect(h.matchProfile(material(['liquid', 'water']))).toBeNull();
  });

  it('⭐ water through ash runs the lye-leach — and the ash is spent', async () => {
    const leach = { key: 'lye-leach' } as never;
    const byKey = vi.spyOn(MaturationProfileRef, 'byKey').mockReturnValue(leach);
    installV1QuantityMarshallers();
    const h = makeStuff(() => new Hopper());
    const water = material(['liquid', 'water']);
    h.setInteriorCapacity(Quantity.of(20, 'L'));
    h.setBulkMaterial('interior', water);
    h.setBulkAmount('interior', Quantity.of(10, 'L'));
    const ash = makeStuff(() => new Good());
    ash.setMaterial(material(['organic', 'potash']));
    ContainmentApi.move(ash, h);
    const destruct = vi.spyOn(StuffApi, 'destruct');
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => makeStuff(() => new Good()) as never);
    expect(h.matchProfile(water)).toBe(leach);
    expect(byKey).toHaveBeenCalledWith('lye-leach');
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(destruct).toHaveBeenCalledWith(ash);
  });
});

describe('the kettle (soap from fat and lye)', () => {
  it('⭐ lye poured on fat — and salt on soft soap — are the kettle\'s transforms', () => {
    const k = makeStuff(() => new SoapKettle());
    const fat = material(['liquid', 'fat']);
    vi.spyOn(k, 'getBulkMaterial').mockReturnValue(fat);
    const lye = material(['liquid', 'caustic', 'lye']);
    expect(k.classifyForeignPour(lye, '')).toBe('transform');
    const rekey = vi.spyOn(k, 'rekeyBatch').mockImplementation(() => {});
    k.applyForeignPour('transform', '', 1, lye);
    expect(rekey).toHaveBeenCalledWith('/trade/chandlery/idea/material/soap-paste');

    vi.spyOn(k, 'getBulkMaterial').mockReturnValue(material(['liquid', 'soap', 'soft-soap']));
    const salt = material(['solid', 'food', 'salt']);
    expect(k.classifyForeignPour(salt, '')).toBe('transform');
    k.applyForeignPour('transform', '', 1, salt);
    expect(rekey).toHaveBeenLastCalledWith('/trade/chandlery/idea/material/hard-soap-curd');
  });

  it('anything else is the shipped maturation\'s question', () => {
    const k = makeStuff(() => new SoapKettle());
    vi.spyOn(k, 'getBulkMaterial').mockReturnValue(material(['liquid', 'water']));
    expect(k.classifyForeignPour(material(['liquid', 'lye']), '')).toBeNull();
  });
});

describe('the rows say what', () => {
  it('saponification: soap paste at the boil → soft soap, with glycerin lees', () => {
    const p = row('idea/maturation/saponification.yaml').data;
    expect(p).toMatchObject({
      inputCategory: 'soap-paste',
      mechanism: 'chemical',
      productMaterial: '/trade/chandlery/idea/material/soft-soap',
      leesMaterial: '/trade/chandlery/idea/material/glycerin',
    });
    expect(p.stallBelowK as number).toBeGreaterThan(340);
  });

  it('the frame is a kernel Mould whose cast is the bar; the curd drains into hard soap', () => {
    const f = row('thing/soap-frame.yaml');
    expect(f.class).toBe('/platform/thing/Mould');
    expect(f.data.castTemplate).toBe('/trade/chandlery/thing/soap-bar');
    const curd = row('idea/material/hard-soap-curd.yaml').data;
    expect((curd.drainSetting as { becomes: string }).becomes).toBe(
      '/trade/chandlery/idea/material/hard-soap',
    );
    expect(row('idea/material/hard-soap.yaml').data.seasoningDays).toBe(28);
  });

  it('lye eats protein and tissue — never `organic` or `textile` (rubber stays out of it)', () => {
    const lye = row('idea/material/lye.yaml').data;
    expect(lye.corrosiveTo).toEqual(['protein', 'tissue']);
  });
});

describe('the bar cures', () => {
  it('⭐ a green bar reads harsh; a cured one mild', () => {
    const b = makeStuff(() => new SoapBar());
    expect(b.seasonPhrase(0.05)).toMatch(/take the skin off you/);
    expect(b.seasonPhrase(1)).toMatch(/mild/);
  });
});

/** A heap of ash that says its own strength (trade-fuel's `Ash`, in shape). */
class TestAsh extends CompositionMixin(Good) {
  static _mixinName = 'TestAsh';
}
const POTASH = '/stuff/idea/material/mineral/potash';

describe('⭐⭐ the leach is DERIVED: ash, passes, hardness (potash D6)', () => {
  function hopperOf(litres: number, liquor: Material, payload: Record<string, number> = {}): Hopper {
    installV1QuantityMarshallers();
    const h = makeStuff(() => new Hopper());
    h.setInteriorCapacity(Quantity.of(40, 'L'));
    h.setBulkMaterial('interior', liquor);
    h.setBulkAmount('interior', Quantity.of(litres, 'L'));
    h.setBulkPayload('interior', payload);
    return h;
  }
  function heap(h: Hopper, kg: number, strength: number): TestAsh {
    const a = makeStuff(() => new TestAsh());
    a.setMaterial(material(['organic', 'potash']));
    a.setMass(Quantity.of(kg, 'kg'));
    a.setAlloying([{ materialPath: POTASH, fraction: strength }]);
    ContainmentApi.move(a, h);
    return a;
  }
  function leach(h: Hopper, liquor: Material): number {
    vi.spyOn(MaturationProfileRef, 'byKey').mockReturnValue({ key: 'lye-leach' } as never);
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => makeStuff(() => new Good()) as never);
    h.matchProfile(liquor);
    return h.getBulkPayload('interior')?.dissolvedSolidsKgPerL ?? 0;
  }

  it('⭐ 3 kg of oak ash in 20 L of rain gives a WEAK lye; a second pass makes it soap strength', () => {
    const rain = material(['liquid', 'water']);
    const h = hopperOf(20, rain, { hardnessDgh: 1 });
    heap(h, 3, 0.15);
    const first = leach(h, rain);
    expect(first).toBeCloseTo((0.45 / 20) * 0.96, 6);
    expect(new LyeStrength(first).band()).toBe('weak');
    expect((h as unknown as { getGrade(): { getBand(): string } }).getGrade().getBand()).toBe('fair');

    // The lye, drawn off and poured back through fresh ash.
    const lye = material(['liquid', 'caustic', 'alkali', 'lye']);
    const again = hopperOf(20, lye, { hardnessDgh: 1, dissolvedSolidsKgPerL: first });
    heap(again, 3, 0.15);
    const second = leach(again, lye);
    expect(second).toBeCloseTo(first * 2, 6);
    expect(new LyeStrength(second).band()).toBe('soap-strength');
    expect((again as unknown as { getGrade(): { getBand(): string } }).getGrade().getBand()).toBe('fine');
  });

  it('⭐ river water (12 °dH) makes a lye about half as strong as rain', () => {
    const water = material(['liquid', 'water']);
    const rain = hopperOf(20, water, { hardnessDgh: 1 });
    heap(rain, 3, 0.15);
    const soft = leach(rain, water);
    vi.restoreAllMocks();
    const river = hopperOf(20, water, { hardnessDgh: 12 });
    heap(river, 3, 0.15);
    const hard = leach(river, water);
    expect(hard).toBeCloseTo((0.45 / 20) * 0.52, 6);
    expect(hard / soft).toBeLessThan(0.6);
  });

  it('⭐ beech ash makes a stronger lye than pine ash, mass for mass (AC 3)', () => {
    const water = material(['liquid', 'water']);
    const beech = hopperOf(20, water);
    heap(beech, 4, 0.18);
    const strong = leach(beech, water);
    vi.restoreAllMocks();
    const pine = hopperOf(20, water);
    heap(pine, 4, 0.08);
    expect(leach(pine, water)).toBeLessThan(strong);
  });

  it('⭐ the heaps are SPENT, not lost — each leaves spent ash in the hopper', async () => {
    const water = material(['liquid', 'water']);
    const h = hopperOf(20, water);
    const a = heap(h, 3, 0.15);
    const destruct = vi.spyOn(StuffApi, 'destruct');
    const clone = vi.spyOn(StuffApi, 'clone').mockImplementation(async () => makeStuff(() => new Good()) as never);
    vi.spyOn(MaturationProfileRef, 'byKey').mockReturnValue({ key: 'lye-leach' } as never);
    h.matchProfile(water);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(clone).toHaveBeenCalledWith('/trade/fuel/thing/spent-ash', undefined, { madeFrom: [a] });
    expect(destruct).toHaveBeenCalledWith(a);
  });

  it('a lye with no ash under it is just lye', () => {
    const lye = material(['liquid', 'caustic', 'alkali', 'lye']);
    const h = hopperOf(20, lye, { dissolvedSolidsKgPerL: 0.02 });
    expect(h.matchProfile(lye)).toBeNull();
    expect(h.getBulkPayload('interior')?.dissolvedSolidsKgPerL).toBe(0.02);
  });
});
