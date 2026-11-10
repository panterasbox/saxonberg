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
import Food from '@saxonberg/server/mud/platform/idea/material/Food';
import Oil from '@saxonberg/server/mud/platform/idea/material/Oil';
import CoatingOil from '@saxonberg/server/mud/platform/idea/material/CoatingOil';
import PigmentPaint from '@saxonberg/server/mud/platform/idea/material/PigmentPaint';
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

function rowClass(rel: string): string {
  const url = new URL(`../../content/trade/painting/idea/material/${rel}.yaml`, import.meta.url);
  return (parse(readFileSync(fileURLToPath(url), 'utf8')) as { class: string }).class;
}

function material<M extends Material>(path: string, make: () => M, fill: (m: M) => void): void {
  makeStuffAtPath(() => {
    const m = make();
    fill(m);
    return m;
  }, path);
}

function fromRow(path: string, rel: string): void {
  const d = rowData(rel);
  const make = rowClass(rel).endsWith('/CoatingOil') ? () => new CoatingOil() : () => new PigmentPaint();
  material(path, make, (m) => {
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
    material(EGG, () => new Food(), (m) => { m.setName('egg'); m.setTags(['food', 'egg']); });
    const pot = makeStuff(() => new PaintPot());
    const payload = pot.payloadFor([item(EGG, 0.06), item(OCHRE, 0.1)]);
    expect(payload?.paint?.binder).toBe('/trade/painting/idea/material/egg-tempera');
  });

  it('a thinner is recorded and lowers the solids', () => {
    fromRow(OIL, 'linseed-oil');
    fromRow(OCHRE, 'yellow-ochre');
    material(TURPS, () => new Oil(), (m) => { m.setName('turpentine'); m.setTags(['liquid', 'solvent']); });
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
    const set = StuffApi.findByTemplatePath<CoatingOil>(OIL)!.getKinetics()!.airSet()!;
    expect(set.getSets()).toBe('oxidation');
    expect(set.getExothermicJPerKg()).toBeGreaterThan(0);
  });
});

describe('the pot reads its own charge', () => {
  it('a paper of ochre in a pot of oil is counted as pigment', async () => {
    const { default: Pigment } = await import('../thing/Pigment');
    const { Quantity } = await import('@saxonberg/server/mud/lib/quantity');
    const { ContainmentApi } = await import('@saxonberg/server/mud/api/containment');
    const { installV1QuantityMarshallers } = await import('@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers');
    installV1QuantityMarshallers();
    fromRow(OIL, 'linseed-oil');
    fromRow(OCHRE, 'yellow-ochre');
    const pot = makeStuff(() => {
      const p = new PaintPot();
      p.setMass(Quantity.of(0.8, 'kg'));
      p.interiorBulk = true;
      p.setInteriorCapacity(Quantity.of(6, 'L'));
      p.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(OIL)!);
      p.setBulkAmount('interior', Quantity.of(0.3, 'L'));
      return p;
    });
    const paper = makeStuff(() => {
      const x = new Pigment();
      x.setMaterial(StuffApi.findByTemplatePath<Material>(OCHRE)!);
      x.setMass(Quantity.of(1, 'kg'));
      return x;
    });
    ContainmentApi.move(paper as never, pot as never);
    const charge = pot.chargeContributions();
    const payload = pot.payloadFor(charge);
    expect(charge.map((c) => [c.kind, c.materialPath, c.massKg])).toContainEqual(['item', OCHRE, 1]);
    expect(payload?.paint?.pigments).toEqual([{ material: OCHRE, share: 1 }]);
  });
});
