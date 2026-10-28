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
import Good from '../../stuff/Good';
import { BulkableMixin, type BulkPayload } from '../Bulkable';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { BlendIdentity } from '../../../lib/craft/BlendIdentity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

class TestVessel extends BulkableMixin(Good) {
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
const ROOT = '/stuff/idea/material/food/root-vegetable';
const MEAT = '/stuff/idea/material/food/stew-meat';
const STEW_PAYLOAD: BulkPayload = {
  recipeId: 'hearty-stew',
  makeup: [
    { materialPath: ROOT, fraction: 1 / 3 },
    { materialPath: MEAT, fraction: 2 / 3 },
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
    expect(slot.getPayload()!.makeup).toHaveLength(2);
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
    // dropped the makeup would still name the drink correctly and
    // silently flatten its nutrition to nothing.
    // ⭐ And BOTH halves keep the whole makeup (R1-D1): a fraction is
    // intensive, so a half pot poured off is made of what the pot was —
    // where absolute servings copied the whole pot's dose into the bowl.
    expect(to.getPayload()!.recipeId).toBe('hearty-stew');
    expect(from.getPayload()!.recipeId).toBe('hearty-stew');
    expect(to.getPayload()!.makeup).toEqual(STEW_PAYLOAD.makeup);
    expect(from.getPayload()!.makeup).toEqual(STEW_PAYLOAD.makeup);
  });

  it('⭐ a stew poured into a pot of stew keeps its ingredients — the makeup folds by volume', () => {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('broth');
      return m;
    }, BROTH);
    const pot = makeVessel(0.2);
    const other = makeVessel(0.2);
    const from = BulkableApi.slotFor(pot, undefined)!;
    const to = BulkableApi.slotFor(other, undefined)!;
    from.setPayload(STEW_PAYLOAD);
    to.setPayload({ makeup: [{ materialPath: ROOT, fraction: 1 }] });

    BulkableApi.transfer(from, to, { kind: 'all' });
    // Equal volumes: root (1/3 + 1)/2, meat (2/3 + 0)/2. The source's
    // parts used to be DROPPED by a pour into a non-empty pot.
    const share = (path: string): number =>
      to.getPayload()!.makeup?.find((e) => e.materialPath === path)?.fraction ?? 0;
    expect(share(ROOT)).toBeCloseTo(2 / 3, 9);
    expect(share(MEAT)).toBeCloseTo(1 / 3, 9);
  });
});
