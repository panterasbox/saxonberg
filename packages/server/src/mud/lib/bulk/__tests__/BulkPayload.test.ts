/**
 * BulkPayload — the per-instance blend face on a bulk slot: round-trip
 * on the slot, clear-on-empty (payload never outlives its matter), and
 * the transfer carry rule (a blend poured into an empty vessel stays
 * that blend; a full drain clears the source's payload with it).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import Thing from '../../stuff/Thing';
import { BulkableMixin, type BulkPayload } from '../Bulkable';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

class TestVessel extends BulkableMixin(Thing) {
  static _mixinName = 'TestVesselPayload';
}

const BROTH = '/obj/material/_test/payload-broth';

function makeVessel(amountL: number): TestVessel {
  const v = makeStuff(() => new TestVessel());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(1, 'L'));
  if (amountL > 0) {
    (v as unknown as { interiorMaterial: string }).interiorMaterial = BROTH;
    v.setInteriorAmount(Quantity.of(amountL, 'L'));
  }
  return v;
}

const STEW_PAYLOAD: BulkPayload = {
  name: 'hearty stew',
  appearance: 'a thick brown stew',
  keywords: ['stew'],
  nutrients: ['carb', 'protein'],
  nutrientAmounts: { carb: 34000, protein: 26000 },
  toxicity: [],
  edible: true,
};

afterEach(() => StuffApi.clearAll());

describe('BulkPayload on a slot', () => {
  it('round-trips (as a copy) and clears when the slot empties', () => {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('broth');
      return m;
    }, BROTH);
    const v = makeVessel(0.4);
    const slot = BulkableApi.slotFor(v, undefined)!;
    slot.setPayload(STEW_PAYLOAD);
    expect(slot.getPayload()!.name).toBe('hearty stew');
    expect(slot.getPayload()).not.toBe(STEW_PAYLOAD); // stored copy

    // Draining the slot clears the payload with the matter.
    const res = BulkableApi.transfer(slot, null, { kind: 'all' });
    expect(res.applied).toBeCloseTo(0.4, 9);
    expect(slot.getPayload()).toBeNull();
    expect(slot.getMaterialPath()).toBeNull();
  });

  it('a transfer into an empty vessel carries the blend', () => {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('broth');
      return m;
    }, BROTH);
    const pot = makeVessel(0.4);
    const bowl = makeVessel(0);
    const from = BulkableApi.slotFor(pot, undefined)!;
    const to = BulkableApi.slotFor(bowl, undefined)!;
    from.setPayload(STEW_PAYLOAD);

    const res = BulkableApi.transfer(from, to, {
      kind: 'measure',
      litres: 0.2,
      mode: 'strict',
    });
    expect(res.applied).toBeCloseTo(0.2, 9);
    // The bowl holds the same blend; the pot (still half full) keeps its.
    expect(to.getPayload()!.name).toBe('hearty stew');
    expect(from.getPayload()!.name).toBe('hearty stew');
  });
});
