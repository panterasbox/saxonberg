/**
 * A pile's flaws and its maker (review R2-B6): a cracked tile is not a sound
 * one, so the flaws an eye can find split a stack; a hidden one does not
 * (refusing to merge would tell what only `ring` may) and rides the merge
 * instead, so stacking never launders a crack. The maker is stack identity.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../Good';
import Material from '../../material/Material';
import { StackableMixin } from '../Stackable';
import { CraftedMixin } from '../../craft/Crafted';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const ROW = '/test/thing/flaw-tile';

class Tile extends CraftedMixin(StackableMixin(Good)) {
  static _mixinName = 'TestFlawTile';
}

let clay: Material;

function tile(n: number, maker = ''): Tile {
  return makeStuffAtPath(() => {
    const t = new Tile();
    t.setMass(Quantity.of(1, 'kg'));
    t.setMaterial(clay);
    t.setQuantity(n);
    if (maker) t.setMaker(maker);
    return t;
  }, ROW) as Tile;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  ShadowApi._clearAllForTesting();
  clay = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('flaw-clay');
    return m;
  }, '/test/idea/material/flaw-clay') as unknown as Material;
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a pile’s flaws (R2-B6)', () => {
  it('a visibly cracked tile does not merge into a sound stack', () => {
    const sound = tile(4);
    const cracked = tile(1);
    cracked.addFlaw('crack', true);
    expect(sound.canMergeWith(cracked)).toBe(false);
    const alsoCracked = tile(2);
    alsoCracked.addFlaw('crack', true);
    expect(alsoCracked.canMergeWith(cracked)).toBe(true);
  });

  it('a HIDDEN crack does not split the pile, and rides the merge', () => {
    const sound = tile(4);
    const hidden = tile(1);
    hidden.addFlaw('crack', false);
    expect(sound.canMergeWith(hidden)).toBe(true);
    sound.absorb(hidden);
    expect(sound.getQuantity()).toBe(5);
    expect(sound.getFlaws().filter((f) => !f.visible)).toHaveLength(1);
  });

  it('a split-off of a cracked pile is cracked', async () => {
    const pile = tile(6);
    pile.addFlaw('crack', true);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async () => tile(1)) as never);
    const off = await pile.split(2);
    expect(off.getQuantity()).toBe(2);
    expect((off as Tile).getFlaws().map((f) => f.kind)).toEqual(['crack']);
    expect(off.canMergeWith(pile)).toBe(true);
  });

  it('the maker is stack identity — and the split copies it', async () => {
    const mine = tile(9, '/test/agent/a');
    const theirs = tile(14, '/test/agent/b');
    expect(mine.canMergeWith(theirs)).toBe(false);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async () => tile(1)) as never);
    const off = (await mine.split(3)) as Tile;
    expect(off.getMaker()).toBe('/test/agent/a');
  });
});
