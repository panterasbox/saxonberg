/**
 * ⭐⭐ One pot makes every paint (paint D8): what went in decides the
 * makeup — the binder (the coat-laying liquid, or an egg for tempera), the
 * pigments by mass, the solids, a thinner — and the look names binder,
 * pigment and color with no number in it. And the shipped rows: linseed
 * oil sets by oxidation, milk of lime lays a limewash.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import PaintPot from '../thing/PaintPot';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { Paint } from '@saxonberg/server/mud/lib/material/Paint';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { BuildContribution } from '@saxonberg/server/mud/lib/craft/ManualBuild';

const OIL = '/trade/painting/idea/material/linseed-oil';
const OCHRE = '/trade/painting/idea/material/yellow-ochre';
const TURPS = '/trade/painting/idea/material/turpentine';
const EGG = '/stuff/idea/material/food/egg';

function rowData(rel: string): Record<string, unknown> {
  const url = new URL(`../../content/trade/painting/idea/material/${rel}.yaml`, import.meta.url);
  return (parse(readFileSync(fileURLToPath(url), 'utf8')) as { data: Record<string, unknown> }).data;
}

function material(path: string, fill: (m: Material) => void): void {
  makeStuffAtPath(() => {
    const m = new Material();
    fill(m);
    return m;
  }, path);
}

function fromRow(path: string, rel: string): void {
  const d = rowData(rel);
  material(path, (m) => {
    m.setName(String(d.name));
    if (d.laysCoat) m.setLaysCoat(true);
    if (d.coatWord) m.setCoatWord(String(d.coatWord));
    if (d.solidsKgPerL) m.setSolidsKgPerL(Number(d.solidsKgPerL));
    if (d.pigment) m.setPigment(d.pigment as never);
    if (d.tags) m.setTags(d.tags as string[]);
    if (d.kinetics) m.setKinetics(d.kinetics as never);
  });
}

const item = (path: string, kg: number): BuildContribution => ({
  kind: 'item', measureL: 0, massKg: kg, gradeBand: 'fair', tags: [], materialPath: path,
});
const bulk = (path: string, litres: number): BuildContribution => ({
  measureL: litres, gradeBand: 'fair', tags: [], materialPath: path,
});

afterEach(() => StuffApi.clearAll());

describe('the paint pot', () => {
  it('ochre stirred into linseed oil is a yellow oil paint, said in words', () => {
    fromRow(OIL, 'linseed-oil');
    fromRow(OCHRE, 'yellow-ochre');
    const pot = makeStuff(() => new PaintPot());
    const payload = pot.payloadFor([bulk(OIL, 1), item(OCHRE, 0.5)]);
    expect(payload?.paint?.binder).toBe(OIL);
    expect(payload?.paint?.pigments).toEqual([{ material: OCHRE, share: 1 }]);
    const paint = new Paint(payload!.paint!);
    expect(paint.colorTag()).toMatch(/yellow|gold|straw|fawn/);
    expect(paint.words()).toMatch(/yellow ochre in linseed oil/);
    expect(paint.words()).not.toMatch(/\d/);
    // Pigment raises the solids: more stays on the wall than oil alone.
    expect(payload!.paint!.solidsFraction).toBeGreaterThan(pot.payloadFor([bulk(OIL, 1)])!.paint!.solidsFraction);
  });

  it('an egg in the pot binds as tempera', () => {
    fromRow(OCHRE, 'yellow-ochre');
    material(EGG, (m) => { m.setName('egg'); m.setTags(['food', 'egg']); });
    const pot = makeStuff(() => new PaintPot());
    const payload = pot.payloadFor([item(EGG, 0.06), item(OCHRE, 0.1)]);
    expect(payload?.paint?.binder).toBe('/trade/painting/idea/material/egg-tempera');
  });

  it('a thinner is recorded and lowers the solids', () => {
    fromRow(OIL, 'linseed-oil');
    fromRow(OCHRE, 'yellow-ochre');
    material(TURPS, (m) => { m.setName('turpentine'); m.setTags(['liquid', 'solvent']); });
    const pot = makeStuff(() => new PaintPot());
    const thick = pot.payloadFor([bulk(OIL, 1), item(OCHRE, 0.5)])!.paint!;
    const thin = pot.payloadFor([bulk(OIL, 1), bulk(TURPS, 0.2), item(OCHRE, 0.5)])!.paint!;
    expect(thin.thinner).toBe(TURPS);
    expect(thin.solidsFraction).toBeLessThan(thick.solidsFraction);
  });

  it('nothing that lays a coat, no paint', () => {
    fromRow(OCHRE, 'yellow-ochre');
    const pot = makeStuff(() => new PaintPot());
    expect(pot.payloadFor([item(OCHRE, 0.5)])).toBeNull();
  });
});

describe('the binders, as shipped', () => {
  it('linseed oil sets by oxidation and warms as it does', () => {
    fromRow(OIL, 'linseed-oil');
    const set = StuffApi.findByTemplatePath<Material>(OIL)!.getKinetics()!.airSet()!;
    expect(set.getSets()).toBe('oxidation');
    expect(set.getExothermicJPerKg()).toBeGreaterThan(0);
  });
});
