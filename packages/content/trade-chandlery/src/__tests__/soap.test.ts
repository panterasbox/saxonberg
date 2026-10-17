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

  it('⭐ water through ash runs the lye-leach — and the ash is spent', () => {
    const leach = { key: 'lye-leach' } as never;
    const byKey = vi.spyOn(MaturationProfileRef, 'byKey').mockReturnValue(leach);
    const h = makeStuff(() => new Hopper());
    const ash = makeStuff(() => new Good());
    ash.setMaterial(material(['organic', 'potash']));
    ContainmentApi.move(ash, h);
    const destruct = vi.spyOn(StuffApi, 'destruct');
    expect(h.matchProfile(material(['liquid', 'water']))).toBe(leach);
    expect(byKey).toHaveBeenCalledWith('lye-leach');
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
