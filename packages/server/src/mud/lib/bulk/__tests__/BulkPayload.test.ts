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
import { BlendIdentity } from '../../../lib/craft/BlendIdentity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

class TestVessel extends BulkableMixin(Thing) {
  static _mixinName = 'TestVesselPayload';
}

const BROTH = '/stuff/idea/material/_test/payload-broth';

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

// ⭐ What a blend payload IS now: what recipe made it and what went in.
// The name, the appearance, the label and the tastes are all READ off
// these — so this suite asserts the round-trip of the facts, not of a
// derived string.
const STEW_PAYLOAD: BulkPayload = {
  recipeId: 'hearty-stew',
  composition: [
    { materialPath: '/stuff/idea/material/food/root-vegetable', servings: 1 },
    { materialPath: '/stuff/idea/material/food/stew-meat', servings: 2 },
  ],
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
    expect(slot.getPayload()!.recipeId).toBe('hearty-stew');
    expect(slot.getPayload()!.composition).toHaveLength(2);
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
    // ⚠ The SHARES ride along too — a transfer that kept the recipe and
    // dropped the composition would still name the drink correctly and
    // silently flatten its nutrition to nothing.
    expect(to.getPayload()!.recipeId).toBe('hearty-stew');
    expect(from.getPayload()!.recipeId).toBe('hearty-stew');
    expect(to.getPayload()!.composition?.map((c) => c.servings)).toEqual([1, 2]);
  });
});
