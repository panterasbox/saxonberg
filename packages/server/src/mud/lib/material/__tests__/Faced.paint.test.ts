/**
 * ⭐⭐ `paint` — the TARGET plans the coat (paint D9), and `write … with
 * paint` letters words in a coat (D10).
 *
 * A good takes paint in proportion to its skin; a pot with too little
 * coats nothing; a liquid that lays no coat is refused; a building is
 * painted only from where it meets the weather. Lettered words read in
 * any weather and go when the coat does.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageApi } from '../../../api/message';
import Good from '../../stuff/Good';
import Material from '../Material';
import { BulkableMixin } from '../../bulk/Bulkable';
import { MarkedMixin } from '../../description/Marked';
import { WeatheringMixin } from '../Weathering';
import Structure from '../../../platform/idea/Structure';
import Location from '../../location/Location';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { ActPlan } from '../../craft/ActPlan';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import type { Containable } from '../../spatial/Containable';

class Pot extends BulkableMixin(Good) {
  static _mixinName = 'PaintTestPot';
}
class Board extends MarkedMixin(WeatheringMixin(Good)) {
  static _mixinName = 'PaintTestBoard';
}

const OIL = '/stuff/idea/material/_paint/oil';
const WATER = '/stuff/idea/material/_paint/water';
const PINE = '/stuff/idea/material/_paint/pine';

function material(path: string, fill: (m: Material) => void): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(900, 'kg/m³'));
    fill(m);
    return m;
  }, path);
}

function pot(path: string, litres: number): Pot {
  return makeStuff(() => {
    const p = new Pot();
    p.setMass(Quantity.of(0.5, 'kg'));
    p.interiorBulk = true;
    p.setInteriorCapacity(Quantity.of(20, 'L'));
    p.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(path)!);
    p.setBulkAmount('interior', Quantity.of(litres, 'L'));
    return p;
  });
}

function board(): Board {
  return makeStuff(() => {
    const b = new Board();
    b.setMass(Quantity.of(4, 'kg'));
    b.setMaterial(StuffApi.findByTemplatePath<Material>(PINE)!);
    b.setWritingRoom(80);
    return b;
  });
}

const painter = (): Stuff => makeStuff(() => new Good());

beforeEach(() => {
  installV1QuantityMarshallers();
  const scene = { topic: () => scene, toSelf: () => scene, toPeers: () => scene, send: () => undefined };
  vi.spyOn(MessageApi, 'scene').mockReturnValue(scene as never);
  material(OIL, (m) => {
    m.setLaysCoat(true);
    m.setCoatWord('painted');
    m.setSolidsKgPerL(0.6);
  });
  material(WATER, () => undefined);
  material(PINE, (m) => m.setDensity(Quantity.of(500, 'kg/m³')));
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the thing painted plans the coat', () => {
  it('a board takes paint in proportion to its skin, and the pot gives exactly that', async () => {
    const b = board();
    const p = pot(OIL, 2);
    const plan = (await b.coatPlanFor({ actor: painter(), source: p, brush: painter() })) as ActPlan;
    expect(plan.ok).toBe(true);
    await plan.onComplete();
    const used = 2 - p.getBulkAmount('interior').rawValue();
    expect(used).toBeCloseTo(b.coatAreaM2() * 0.00005 * 1000, 6);
    const top = b.getCoats('outside')[0]!;
    expect(top.state).toBe('wet');
    expect(top.thicknessM).toBeCloseTo(0.00005 * 0.6, 9);
  });

  it('a pot with too little coats nothing, and says how much it would take', async () => {
    const b = board();
    const plan = await b.coatPlanFor({ actor: painter(), source: pot(OIL, 0.001), brush: painter() });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe('source-too-low');
    expect(b.getCoats('outside')).toEqual([]);
  });

  it('water lays no coat', async () => {
    const plan = await board().coatPlanFor({ actor: painter(), source: pot(WATER, 5), brush: painter() });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe('not-paint');
  });
});

describe('a building is painted from its landing', () => {
  it('refuses from a room that is not one of its landings', async () => {
    const house = makeStuffAtPath(() => new Structure(), '/world/_pt/house/structure');
    house.setExtent('/world/_pt/house');
    const parlour = makeStuffAtPath(() => new Location(), '/world/_pt/house/parlour');
    const who = makeStuff(() => new Good());
    ContainmentApi.move(who as unknown as Stuff & Containable, parlour as unknown as Stuff & Container);
    const plan = await house.coatPlanFor({ actor: who, source: pot(OIL, 10), brush: painter() });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe('no-landing');
  });
});

describe('write … with paint', () => {
  it('letters words in a coat that anyone reads, and they go with the coat', () => {
    const b = board();
    const p = pot(OIL, 1);
    const holder = makeStuff(() => new Location());
    ContainmentApi.move(b as unknown as Stuff & Containable, holder as unknown as Stuff & Container);
    const out = b.writeOn(holder, 'ROPEWALK', p);
    expect(out.ok).toBe(true);
    expect(b.getMarkText()).toContain('ROPEWALK');
    expect(p.getBulkAmount('interior').rawValue()).toBeLessThan(1);
    // The weather takes the coat — and the words with it.
    b.setCoats({});
    expect(b.getMarkText()).not.toContain('ROPEWALK');
  });

  it('a medium that lays no coat letters nothing', () => {
    const b = board();
    const holder = makeStuff(() => new Location());
    ContainmentApi.move(b as unknown as Stuff & Containable, holder as unknown as Stuff & Container);
    const out = b.writeOn(holder, 'X', pot(WATER, 1));
    expect(out.ok).toBe(false);
  });
});
