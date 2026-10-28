/**
 * ⭐⭐ The ceramic water filter (ceramics S9, W8): a porous body set IN or ON
 * a vessel runs its water THROUGH into that vessel instead of weeping onto
 * its own outside, and what comes through is what the pores let through —
 * `Material.filteredTo`. Fouled water (the dysentery is IN something) comes
 * through as water; tainted water (lead, dissolved) comes through tainted,
 * its dissolved dose with it. A filter in mid-air weeps like any jar.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Place from '../../stuff/Place';
import Material from '../../material/Material';
import { ThermalMixin } from '../../thermal/Thermal';
import { BulkableMixin } from '../Bulkable';
import { ContainerMixin } from '../../spatial/Container';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';

class Filter extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'WaterFilterTestCandle';
}
class Crock extends ThermalMixin(BulkableMixin(ContainerMixin(Good))) {
  static _mixinName = 'WaterFilterTestCrock';
}
class Room extends Place {}

let real = 0;
const SCALE = 12;
function advance(gameS: number): void {
  real += (gameS / SCALE) * 1000;
}

const WATER = '/stuff/idea/material/_filter/water';
const FOULED = '/stuff/idea/material/_filter/fouled-water';
const TAINTED = '/stuff/idea/material/_filter/tainted-water';
const BODY = '/stuff/idea/material/_filter/filter-stoneware';
const GLAZED_BODY = '/stuff/idea/material/_filter/stoneware';

function mat(path: string, fill: (m: Material) => void): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    fill(m);
    return m;
  }, path) as unknown as Material;
}

let fouled: Material;
let tainted: Material;
let body: Material;
let tight: Material;

function filterOf(b: Material, contents?: { m: Material; l: number; payload?: Record<string, unknown> }): Filter {
  return makeStuff(() => {
    const f = new Filter();
    f.setMass(Quantity.of(1.4, 'kg'));
    f.setMaterial(b);
    f.interiorBulk = true;
    f.setInteriorCapacity(Quantity.of(2, 'L'));
    if (contents) {
      f.setBulkMaterial('interior', contents.m);
      f.setBulkAmount('interior', Quantity.of(contents.l, 'L'));
      if (contents.payload) f.setBulkPayload('interior', contents.payload as never);
    }
    return f;
  });
}

function crock(): Crock {
  return makeStuff(() => {
    const c = new Crock();
    c.setMass(Quantity.of(1.9, 'kg'));
    c.setMaterial(tight);
    c.interiorBulk = true;
    c.setInteriorCapacity(Quantity.of(4, 'L'));
    return c;
  });
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 1_000_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  WorldClockApi.setScale(SCALE);
  // ⚠ `clearAll` dropped the clock's registry, and with none the face
  // exchange cannot time a seep (the freeze test's precedent).
  if (!StuffApi.findByTemplatePath('/platform/idea/WorldClockRegistry')) {
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  }
  // Plain water: what fouled water filters TO (resolved by path at the seep).
  mat(WATER, (m) => m.setTags(['liquid', 'water']));
  fouled = mat(FOULED, (m) => {
    m.setTags(['liquid', 'water']);
    m.setFilteredTo(WATER);
  });
  tainted = mat(TAINTED, (m) => m.setTags(['liquid', 'water']));
  body = mat(BODY, (m) => {
    m.setTags(['ceramic', 'fired', 'porous', 'stoneware']);
    m.setWaterAbsorptionCapacity(Quantity.of(12, '%'));
  });
  tight = mat(GLAZED_BODY, (m) => {
    m.setTags(['ceramic', 'fired', 'vitrified', 'stoneware']);
    m.setWaterAbsorptionCapacity(Quantity.of(1.5, '%'));
  });
});
afterEach(() => WorldClockApi._resetForTesting());

describe('⭐⭐ the ceramic water filter', () => {
  it('fouled water poured into a filter set IN a crock comes through as WATER', () => {
    const room = makeStuff(() => new Room());
    const c = crock();
    ContainmentApi.move(c, room);
    const f = filterOf(body, { m: fouled, l: 2 });
    ContainmentApi.move(f, c);
    f.getBulkAmount('interior'); // opens the face clock
    advance(3 * 3600);
    const left = f.getBulkAmount('interior').rawValue();
    expect(left).toBeLessThan(2);
    const below = c.getBulkAmount('interior').rawValue();
    expect(below).toBeCloseTo(2 - left, 9);
    // ⭐ What came through is WATER — the dysentery stayed in the wall.
    expect(c.getBulkMaterial('interior')?.getTemplatePath()).toBe(WATER);
  });

  it('⭐ looking into the CROCK alone shows what dripped — nobody has to read the filter (drive C, run 37)', () => {
    const room = makeStuff(() => new Room());
    const c = crock();
    ContainmentApi.move(c, room);
    const f = filterOf(body, { m: fouled, l: 2 });
    ContainmentApi.move(f, c);
    f.getBulkAmount('interior'); // the pour opens the face clock
    advance(3 * 3600);
    // The crock is read first, and only the crock — and the way a LOOK
    // reads it (the contents line checks the slot's material path first).
    expect(c.getContentsDescriptionFor(c as never, 'interior')).not.toBeNull();
    expect(c.getBulkMaterial('interior')?.getTemplatePath()).toBe(WATER);
    expect(c.getBulkAmount('interior').rawValue()).toBeGreaterThan(0);
  });

  it('⭐ tainted water comes through TAINTED, and its dissolved lead with it', () => {
    const room = makeStuff(() => new Room());
    const c = crock();
    ContainmentApi.move(c, room);
    const f = filterOf(body, {
      m: tainted,
      l: 2,
      payload: { dissolvedToxins: [{ type: 'lead-poisoning', amount: 3 }] },
    });
    ContainmentApi.move(f, c);
    f.getBulkAmount('interior');
    advance(3 * 3600);
    f.getBulkAmount('interior');
    expect(c.getBulkAmount('interior').rawValue()).toBeGreaterThan(0);
    expect(c.getBulkMaterial('interior')?.getTemplatePath()).toBe(TAINTED);
    const dose = c.getBulkPayload('interior')?.dissolvedToxins?.find((t) => t.type === 'lead-poisoning');
    expect(dose?.amount).toBeCloseTo(3, 9);
  });

  it('it is a FLOW, not a weep: a filter in a crock passes far more than the same filter weeps in the open', () => {
    const room = makeStuff(() => new Room());
    const c = crock();
    ContainmentApi.move(c, room);
    const through = filterOf(body, { m: fouled, l: 2 });
    ContainmentApi.move(through, c);
    const open = filterOf(body, { m: fouled, l: 2 });
    ContainmentApi.move(open, room);
    through.getBulkAmount('interior');
    open.getBulkAmount('interior');
    advance(3600);
    const passed = 2 - through.getBulkAmount('interior').rawValue();
    const wept = 2 - open.getBulkAmount('interior').rawValue();
    expect(passed).toBeGreaterThan(wept * 50);
    // The open one weeps onto its own outside — nothing lands anywhere.
    expect(c.getBulkAmount('interior').rawValue()).toBeCloseTo(passed, 9);
  });

  it('a vitrified body holds its water: nothing comes through', () => {
    const room = makeStuff(() => new Room());
    const c = crock();
    ContainmentApi.move(c, room);
    const jar = filterOf(tight, { m: fouled, l: 2 });
    ContainmentApi.move(jar, c);
    jar.getBulkAmount('interior');
    advance(3 * 3600);
    expect(jar.getBulkAmount('interior').rawValue()).toBe(2);
    expect(c.getBulkAmount('interior').rawValue()).toBe(0);
  });

  it('a crock already holding something else takes none of it', () => {
    const room = makeStuff(() => new Room());
    const c = crock();
    ContainmentApi.move(c, room);
    c.setBulkMaterial('interior', tainted);
    c.setBulkAmount('interior', Quantity.of(1, 'L'));
    const f = filterOf(body, { m: fouled, l: 2 });
    ContainmentApi.move(f, c);
    f.getBulkAmount('interior');
    advance(3 * 3600);
    expect(f.getBulkAmount('interior').rawValue()).toBe(2);
    expect(c.getBulkAmount('interior').rawValue()).toBe(1);
  });
});
