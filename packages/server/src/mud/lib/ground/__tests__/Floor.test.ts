/**
 * `FloorMixin` — the keyword union, the canonical slot, the material
 * ladder and the `onGrade` derivation.
 *
 * ⚠⚠ The keyword block is the most load-bearing thing in this file.
 * `sit` / `lie` / `kneel` declined in the room a new player wakes up in,
 * and the reason was NOT that rooms had no floor row — it was that the
 * word `ground` lived only in a floor's `details:` map, and the MQL scope
 * walk pools a thing's own `getKeywords()` while `pushDetails` gives a
 * detail the pool `[<its id>]` and never its authored keywords. So
 * attaching `default-floor` to all 180 Locations would have fixed
 * `look floor` and left bare `sit` broken. The union is on the class.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import Floor from '../../../platform/thing/Floor';
import Material from '../../material/Material';
import CartesianLocation from '../../location/CartesianLocation';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { UNBOUNDED_CAPACITY } from '../../slot/Slotted';
import { CANONICAL_GROUND_SLOT } from '../Floor';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

let seq = 0;

function mat(name: string, tags: string[] = ['rock']): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    return m;
  }, `/test/material/${name}-${seq}`) as unknown as Material;
}

function bareFloor(): Floor {
  return makeStuff(() => new Floor());
}

describe('FloorMixin is registered and composed', () => {
  it('Floor composes it and MixinApi narrows on it', () => {
    const f = bareFloor();
    expect(MixinApi.isFloor(f)).toBe(true);
    expect(MixinApi.hasMixin(Floor, Mixins.Floor)).toBe(true);
  });
});

describe('the keyword union', () => {
  it('adds floor and ground to whatever the row authored', () => {
    const f = bareFloor();
    // The `weeping-floor` row, verbatim — it authors NEITHER word, which
    // is what made it unsittable and un-lookable-at.
    f.setKeywords(['flagstones', 'wet']);
    const kw = f.getKeywords();
    expect(kw).toContain('flagstones');
    expect(kw).toContain('wet');
    expect(kw).toContain('floor');
    expect(kw).toContain('ground');
  });

  it('does not duplicate a word the row already authored', () => {
    const f = bareFloor();
    // The `heath-floor` row — the one that already did it right.
    f.setKeywords(['ground', 'sodden', 'peat']);
    const kw = f.getKeywords();
    expect(kw.filter((k) => k === 'ground')).toHaveLength(1);
    expect(kw).toContain('floor');
  });

  it('answers to both words with no keywords authored at all', () => {
    expect(bareFloor().getKeywords()).toEqual(
      expect.arrayContaining(['floor', 'ground'])
    );
  });
});

describe('the canonical posture slot', () => {
  it('appears when a row authors no staticSlots', () => {
    const f = bareFloor();
    expect(f.getSlotNames()).toEqual(['ground:1']);
    const spec = f.getSlotSpec('ground:1');
    expect(spec).not.toBeNull();
    expect(spec!.capacity).toBe(UNBOUNDED_CAPACITY);
    expect(spec!.postures).toEqual(['sit', 'lie', 'kneel', 'stand']);
    expect(spec!.userFacingDetail).toBe('floor');
    // ⭐ `forge-floor` authored no slot at all and was therefore pourable
    // but not sittable. This is the line that fixes it.
    expect(f.getAcceptedPostures('ground:1')).toContain('sit');
  });

  it('defers entirely to an authored slot set — including stand-only', () => {
    const f = bareFloor();
    f.setStaticSlots([
      { name: 'catwalk:1', accepts: 'SlottableMixin', postures: ['stand'] },
    ]);
    expect(f.getSlotNames()).toEqual(['catwalk:1']);
    // No silent addition of the canonical slot beside the authored one.
    expect(f.getSlotSpec('ground:1')).toBeNull();
    expect(f.getAcceptedPostures('catwalk:1')).toEqual(['stand']);
  });

  it('the canonical spec matches the shape the five rows repeat by hand', () => {
    expect(CANONICAL_GROUND_SLOT).toEqual({
      name: 'ground:1',
      accepts: 'SlottableMixin',
      capacity: UNBOUNDED_CAPACITY,
      postures: ['sit', 'lie', 'kneel', 'stand'],
      userFacingDetail: 'floor',
    });
  });
});

describe('getMaterial — authored, then stamped, then nothing', () => {
  it('a floor with neither answers null', () => {
    const f = bareFloor();
    expect(f.getMaterial()).toBeNull();
    expect(f.getUnderfootRung()).toBeNull();
  });

  it('the authored material wins and marks rung 1', async () => {
    const f = bareFloor();
    const granite = mat('granite');
    f.setMaterial(granite);
    await f.resolveUnderfoot();
    expect(f.getMaterial()!.getName()).toBe('granite');
    expect(f.getUnderfootRung()).toBe(1);
    // ⭐ Rung 1 stamps NOTHING: stamping would shadow a later edit to the
    // row, and `getMaterial` already prefers the author's field.
    expect(f.getUnderfootMaterialPath()).toBeNull();
  });

  it('with nothing authored it falls to the plain default (rung 5)', async () => {
    const f = bareFloor();
    await f.resolveUnderfoot();
    expect(f.getUnderfootRung()).toBe(5);
    expect(f.getUnderfootMaterialPath()).toBe(
      '/stuff/idea/material/wood/oak'
    );
  });

  it('a stamped path answers getMaterial when the row authored none', async () => {
    const oak = mat('oak', ['wood']);
    const f = bareFloor();
    (f as unknown as { underfootMaterialPath: string }).underfootMaterialPath =
      oak.getTemplatePath()!;
    expect(f.getMaterial()!.getName()).toBe('oak');
    // …and the kind falls out of it with no further wiring.
    expect(f.getGroundKind()).toBe('boards');
  });

  it("the Location's floor: spec is rung 2", async () => {
    const clay = mat('clay', ['earth']);
    const room = makeStuff(() => new CartesianLocation());
    (room as unknown as { getFloorSpec(): unknown }).getFloorSpec = () => ({
      material: clay.getTemplatePath()!,
      worked: true,
    });
    const f = bareFloor();
    room.addFixture(f, 'floor');
    await f.resolveUnderfoot();
    expect(f.getUnderfootRung()).toBe(2);
    expect(f.getMaterial()!.getName()).toBe('clay');
  });
});

describe('onGrade — the derivation, and what it is NOT', () => {
  it('an authored answer is obeyed either way', () => {
    const f = bareFloor();
    f.setOnGrade(true);
    expect(f.isOnGrade()).toBe(true);
    f.setOnGrade(false);
    expect(f.isOnGrade()).toBe(false);
  });

  it('defaults to derive, and an indoor room at datum is not on grade', () => {
    const room = makeStuff(() => new CartesianLocation());
    room.setCoordinates([3, 4, 0]);
    const f = bareFloor();
    room.addFixture(f, 'floor');
    expect(f.getOnGrade()).toBeNull();
    expect(f.isOnGrade()).toBe(false);
  });

  it('below datum is on grade — a cellar and a gallery both', () => {
    const room = makeStuff(() => new CartesianLocation());
    room.setCoordinates([0, 0, -3]);
    const f = bareFloor();
    room.addFixture(f, 'floor');
    expect(f.isOnGrade()).toBe(true);
  });

  it('an upper storey is not on grade', () => {
    const room = makeStuff(() => new CartesianLocation());
    room.setCoordinates([0, 0, 2]);
    const f = bareFloor();
    room.addFixture(f, 'floor');
    expect(f.isOnGrade()).toBe(false);
  });

  it('an unattached floor is not on grade — it is not anywhere', () => {
    expect(bareFloor().isOnGrade()).toBe(false);
  });
});
