/**
 * ⭐ A container bounds a thing only on the sides it closes (size and
 * carrying D4) — the requirements' six-row table, plus the mouth, the
 * capacity, the honest unknown and the body that carries.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Placements } from '../Placement';
import {
  installForms, material, thing, place, Item, OpenBox, Chest, Surface,
} from './size-fixture';
import { installV1QuantityMarshallers, installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const ASH = '/stuff/idea/material/_fit/ash';
const PINE = '/stuff/idea/material/_fit/pine';
const BONE = '/stuff/idea/material/_fit/bone';

describe('Container — fit', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const pole = () =>
    thing(() => new Item(), { material: material(ASH, 700), kg: 2, box: { width: 0.04, depth: 0.04, height: 2.4 } });

  it('a shut chest closes every side — the pole is refused', () => {
    const chest = thing(() => new Chest(), { kg: 20, box: { width: 1.0, depth: 0.5, height: 0.5 } });
    chest.setOpen(false);
    // Endwise it passes the lid's mouth; no way of turning it fits inside.
    expect(chest.fitRefusal(pole())?.reason).toBe('too-big-inside');
    chest.setOpen(true);
    // Open, it still closes the sides; a 2.4 m pole stands out of the top.
    expect(chest.fitRefusal(pole())).toBeNull();
  });

  it('an open bucket closes sides and bottom — a broom stands in it', () => {
    const bucket = thing(() => new OpenBox(), { kg: 1, box: { width: 0.3, depth: 0.3, height: 0.33 } });
    const broom = pole();
    expect(bucket.fitRefusal(broom)).toBeNull();
    ContainmentApi.move(broom, bucket);
    expect(broom.getContainer()).toBe(bucket);
    // But a thing wider than the bucket is refused at the chokepoint.
    const plank = thing(() => new Item(), { material: material(PINE, 500), kg: 3, box: { width: 0.4, depth: 0.4, height: 0.05 } });
    expect(() => ContainmentApi.move(plank, bucket)).toThrow(/too-big/);
  });

  it('a table supports and closes nothing — a long plank overhangs', () => {
    const room = place(3, 'ceiling', 'walled');
    const table = thing(() => new Surface(), { kg: 30, box: { width: 1, depth: 0.6, height: 0.75 } });
    ContainmentApi.move(table, room);
    const plank = thing(() => new Item(), { material: material(PINE, 500), kg: 6, box: { width: 0.2, depth: 0.03, height: 2.5 } });
    expect(table.canPlace(plank, Placements.ON)).toEqual({ ok: true });
    ContainmentApi.move(plank, table, Placements.ON);
    expect(plank.getPlacement()?.host).toBe(table);
  });

  it('a roofed, walled room closes every face — the mast cannot come indoors', () => {
    const hall = place(3, 'ceiling', 'walled');
    const mast = thing(() => new Item(), { material: material(PINE, 500), kg: 200, box: { width: 0.3, depth: 0.3, height: 8 } });
    expect(hall.fitRefusal(mast)?.reason).toBe('too-big-inside');
    expect(() => ContainmentApi.move(mast, hall)).toThrow(/too-big-inside/);
  });

  it('a walled yard under the sky — the mast stands upright', () => {
    const yard = place(3, 'open', 'walled');
    const mast = thing(() => new Item(), { material: material(PINE, 500), kg: 200, box: { width: 0.3, depth: 0.3, height: 8 } });
    expect(yard.fitRefusal(mast)).toBeNull();
    // And with no ceiling there is no ceiling height.
    expect(yard.getCeilingHeight()).toBeNull();
  });

  it('a field closes nothing — a whale skeleton lies in a 3 m cell', () => {
    const field = place(3, 'open', 'none');
    const whale = thing(() => new Item(), { material: material(BONE, 1900), kg: 9000, box: { width: 4, depth: 3, height: 18 } });
    expect(field.fitRefusal(whale)).toBeNull();
    ContainmentApi.move(whale, field);
    expect(whale.getContainer()).toBe(field);
  });

  it('a normal room takes a creature-sized thing and a large prop', () => {
    const room = place(3, 'ceiling', 'walled');
    const wardrobe = thing(() => new Item(), { material: material(PINE, 500), kg: 60, box: { width: 1.2, depth: 0.6, height: 2.0 } });
    const body = thing(() => new Item(), { material: material(BONE, 1000), kg: 80 });
    expect(room.fitRefusal(wardrobe)).toBeNull();
    expect(room.fitRefusal(body)).toBeNull();
  });

  it('capacity is physical — a full crate takes no more', () => {
    const crate = thing(() => new OpenBox(), { kg: 5, box: { width: 0.5, depth: 0.5, height: 0.5 } });
    const pine = material(PINE, 500);
    // Interior 0.45³ ≈ 0.091 m³; bricks of 0.03 m³ each — three go, a fourth does not.
    for (let i = 0; i < 3; i++) {
      ContainmentApi.move(thing(() => new Item(), { material: pine, kg: 15, box: { width: 0.2, depth: 0.375, height: 0.4 } }), crate);
    }
    const fourth = thing(() => new Item(), { material: pine, kg: 15, box: { width: 0.2, depth: 0.375, height: 0.4 } });
    expect(crate.fitRefusal(fourth)?.reason).toBe('no-room');
  });

  it('a hollow thing whose only size is its mass has no known room — nothing is asked', () => {
    const bag = thing(() => new OpenBox(), { material: material(PINE, 500), kg: 1 });
    expect(bag.bounds()).toBeNull();
    expect(bag.fitRefusal(pole())).toBeNull();
  });

  it('a thing of unknown size is never refused', () => {
    const crate = thing(() => new OpenBox(), { kg: 5, box: { width: 0.2, depth: 0.2, height: 0.2 } });
    expect(crate.fitRefusal(thing(() => new Item(), {}))).toBeNull();
  });

  it('put words the tape measure before anything moves', () => {
    const chest = thing(() => new Chest(), { kg: 20, box: { width: 1.0, depth: 0.5, height: 0.5 } });
    chest.setOpen(true);
    const plank = thing(() => new Item(), { material: material(PINE, 500), kg: 3, box: { width: 0.6, depth: 0.6, height: 0.6 } });
    const by = thing(() => new Item(), {});
    const plan = ContainmentApi.putPlanFor(plank, chest, { by });
    expect(plan).toMatchObject({ ok: false, reason: 'wont-fit', facts: { why: 'too-big-for-mouth' } });
  });
});
