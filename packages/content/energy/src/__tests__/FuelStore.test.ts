/**
 * The town's oil store (energy build A2) — ⭐ **a short supply darkens the
 * junior streets, the way a short treasury already does.**
 *
 * The store holds casks and, at the settle, covers as many streets as its oil
 * allows, in the seniority order handed in, then burns what that cost. The
 * assertions are that both halves are real: enough oil lights the queue, and a
 * store run dry lights nothing and says so.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import FuelStore from '../thing/FuelStore';
import Bottle from '@saxonberg/server/mud/platform/thing/Bottle';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const A = '/world/_civic/high-street';
const B = '/world/_civic/back-lane';
const C = '/world/_civic/the-cut';
const D = '/world/_civic/dock-row';
const E = '/world/_civic/mill-end';
const QUEUE = [A, B, C, D, E];

let oil: unknown;

function cask(litres: number): unknown {
  const c = makeStuff(() => new Bottle());
  c.interiorBulk = true;
  c.setInteriorCapacity(Quantity.of(40, 'L'));
  c.setBulkMaterial('interior', oil as never);
  c.setBulkAmount('interior', Quantity.of(litres, 'L'));
  return c;
}

function storeHolding(...litres: number[]): FuelStore {
  const store = makeStuff(() => new FuelStore());
  for (const l of litres) {
    ContainmentApi.move(cask(l) as never, store as never);
  }
  return store;
}

describe('the fuel store', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    oil = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('lamp-oil');
      m.setKeywords(['lamp-oil']);
      m.setTags(['liquid', 'lamp-oil', 'fuel', 'flammable']);
      m.setDensity(Quantity.of(820, 'kg/m³'));
      return m;
    }, '/stuff/idea/material/bulk/lamp-oil') as unknown;
  });
  afterEach(() => StuffApi.clearAll());

  it('defaults to 2 L per street-night', () => {
    expect(storeHolding().getLitresPerStreet()).toBe(2);
  });

  it('⭐ covers as many streets as the oil allows, in order, and burns the cost', async () => {
    const store = storeHolding(2, 2, 2); // 6 L, at 2 L/street → three streets
    const lit = await store.lightStreets(QUEUE, 0);

    expect([...lit]).toEqual([A, B, C]);
    expect(store.getLitresOnHand()).toBe(0);
  });

  it('a partly-stocked store lights the senior streets only', async () => {
    const store = storeHolding(5); // 5 L → two whole street-nights (4 L)
    const lit = await store.lightStreets(QUEUE, 0);

    expect([...lit]).toEqual([A, B]);
    expect(store.getLitresOnHand()).toBe(1); // 5 − 2×2
  });

  it('⚠ a dry store lights nothing and reports dry', async () => {
    const store = storeHolding(1); // under one street-night
    const lit = await store.lightStreets(QUEUE, 0);

    expect([...lit]).toEqual([]);
    const report = await store.supplyReport(0);
    expect(report.state).toBe('dry');
  });

  it('reads as fed from the town\'s oil store, and serves live once lit', async () => {
    const store = storeHolding(10);
    expect(store.lightingSourceLabel()).toBe("fed from the town's oil store");
    expect(store.isServingNow(A)).toBe(true);
    const report = await store.supplyReport(0);
    expect(report.state).toBeNull();
    expect(report.lines.join(' ')).toContain('10 L');
  });
});
