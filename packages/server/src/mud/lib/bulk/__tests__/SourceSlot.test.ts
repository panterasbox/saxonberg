/**
 * SourceSlot (maritime revision 3): a slot held by a PLACE — the water a
 * shore is beside. What it gives is what the water is there (the read's
 * material, at the water's temperature), endlessly; one that cannot
 * give is empty and says why. `drink` from a source that never runs dry
 * takes one draught, never `∞`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { BulkableApi, type TransferAmount, type TransferResult } from '../../../api/bulk';
import { BulkableMixin, type BulkSlot, type Bulkable } from '../Bulkable';
import { UnboundedSourceMixin } from '../UnboundedSource';
import { SourceSlot, type SourceSlotPlace } from '../SourceSlot';
import { ContainableMixin } from '../../spatial/Containable';
import { NamedMixin } from '../../description/Named';
import { Idea } from '../../stuff/Idea';
import Material from '../../material/Material';
import type { Stuff } from '../../stuff/Stuff';
import type { WaterRead } from '../../location/WaterSource';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { ExecutionContextApi } from '../../../api/execution-context';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

const FOULED = '/stuff/idea/material/bulk/fouled-water';

function transfer(from: BulkSlot, to: BulkSlot | null, amount: TransferAmount): TransferResult {
  return ExecutionContextApi.run(null, BulkableApi, 'test-harness', undefined, () =>
    BulkableApi.transfer(from, to, amount),
  );
}

class Pail extends BulkableMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'TestPail';
}
class Tap extends UnboundedSourceMixin(BulkableMixin(ContainableMixin(NamedMixin(Idea)))) {
  static _mixinName = 'TestTap';
}

/** A place whose water reads as `read`. */
function placeReading(read: WaterRead | null): Stuff & SourceSlotPlace {
  const p = makeStuff(() => new Idea()) as unknown as Stuff & SourceSlotPlace;
  p.peekWaterRead = () => read;
  p.settleWater = async () => read;
  return p;
}

const kestrel = (over: Partial<WaterRead> = {}): WaterRead => ({
  ref: 'kestrel:confluence',
  atS: 0,
  name: 'the Kestrel',
  frozen: false,
  draw: { materialPath: FOULED, temperatureK: 281 },
  ...over,
});

function pail(): Stuff & Bulkable {
  return makeStuff(() => {
    const v = new Pail();
    v.setName('pail');
    v.interiorBulk = true;
    v.setClosure('liquidTight');
    v.setInteriorCapacity(Quantity.of(10, 'L'));
    return v;
  }) as unknown as Stuff & Bulkable;
}

beforeEach(() => {
  ShadowApi._clearAllForTesting();
  StuffApi.clearAll();
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    m.setKeywords(['water']);
    m.setAppearance('some water');
    return m;
  }, FOULED);
});

describe('drawing from the water a place is beside', () => {
  it('⭐⭐ a pail filled from the river holds what the river is — fouled — and the river is no less', () => {
    const river = new SourceSlot(placeReading(kestrel()), 'river');
    const to = pail().getBulk('interior');
    const r = transfer(river, to, { kind: 'measure', litres: 10, mode: 'lenient' });
    expect(r.applied).toBe(10);
    expect(to.getMaterialPath()).toBe(FOULED);
    expect(river.isEmpty()).toBe(false);
    expect(river.available()).toBe(Infinity);
  });

  it('it pours at the water\'s own temperature', () => {
    expect(new SourceSlot(placeReading(kestrel()), 'river').getTemperatureK()).toBe(281);
  });

  it('⭐ a frozen mere gives nothing, and says so in words', () => {
    const mere = new SourceSlot(placeReading(kestrel({ name: 'the blackmere', frozen: true, draw: null })), 'mere');
    expect(mere.isEmpty()).toBe(true);
    expect(mere.whyEmpty()).toBe('The blackmere is frozen from bank to bank; nothing comes up but ice.');
    const r = transfer(mere, pail().getBulk('interior'), { kind: 'measure', litres: 1, mode: 'lenient' });
    expect(r.applied).toBe(0);
  });

  it('a water not read yet gives nothing yet — and never a guess', () => {
    const unread = new SourceSlot(placeReading(null), 'river');
    expect(unread.whyEmpty()).toBe('You cannot tell what you would be drawing yet.');
    expect(unread.getMaterialPath()).toBeNull();
  });

  it('a place that could not pick a water carries its own words', () => {
    const which = new SourceSlot(placeReading(null), null, 'Which water — the Kestrel or the Delight?');
    expect(which.whyEmpty()).toBe('Which water — the Kestrel or the Delight?');
  });
});

describe('a draught, not ∞', () => {
  it('⭐ drinking from the river with no amount takes one draught', () => {
    const r = transfer(new SourceSlot(placeReading(kestrel()), 'river'), null, { kind: 'all' });
    expect(r.applied).toBe(0.25);
  });

  it('⭐ …and so does the shipped tap, which had the same hole', () => {
    const tap = makeStuff(() => {
      const t = new Tap();
      t.setName('tap');
      t.interiorBulk = true;
      t.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(FOULED)!);
      return t;
    }) as unknown as Stuff & Bulkable;
    expect(transfer(tap.getBulk('interior'), null, { kind: 'all' }).applied).toBe(0.25);
  });
});
