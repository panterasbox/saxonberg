/**
 * ⭐ Pressed in, or it leaves (size and carrying D5–D6): gravity, buoyancy
 * and weightlessness are three cases of one rule, and closed sides hold
 * regardless of force.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { BiomeApi, type MediumRead } from '../../../api/biome';
import { Quantity } from '../../quantity';
import { Placements } from '../Placement';
import { installForms, material, thing, place, Item, OpenBox, Chest, Surface } from './size-fixture';
import { installV1QuantityMarshallers, installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const CORK = '/stuff/idea/material/_press/cork';
const IRON = '/stuff/idea/material/_press/iron';

function underWater(): void {
  vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue({
    tag: 'water', substance: 'water', immersed: true, atSurface: false,
    temperatureK: null, depthM: 2, waterRef: null,
  } as unknown as MediumRead);
  vi.spyOn(BiomeApi, 'densityOf').mockReturnValue(Quantity.of(1000, 'kg/m³'));
}

describe('Container — pressing', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('in air a thing in an open bucket stays — its weight presses it in', () => {
    const room = place(3, 'ceiling', 'walled');
    const bucket = thing(() => new OpenBox(), { kg: 1, box: { width: 0.3, depth: 0.3, height: 0.3 } });
    ContainmentApi.move(bucket, room);
    const cork = thing(() => new Item(), { material: material(CORK, 240), kg: 0.01 });
    ContainmentApi.move(cork, bucket);
    expect(bucket.reconcilePressing()).toEqual([]);
    expect(cork.getContainer()).toBe(bucket);
  });

  it('under water a cork bobs up out of an open bucket; iron stays', () => {
    const room = place(3, 'ceiling', 'walled');
    const bucket = thing(() => new OpenBox(), { kg: 1, box: { width: 0.3, depth: 0.3, height: 0.3 } });
    ContainmentApi.move(bucket, room);
    const cork = thing(() => new Item(), { material: material(CORK, 240), kg: 0.01 });
    const nail = thing(() => new Item(), { material: material(IRON, 7870), kg: 0.01 });
    ContainmentApi.move(cork, bucket);
    ContainmentApi.move(nail, bucket);
    underWater();
    const left = bucket.reconcilePressing();
    expect(left).toEqual([cork]);
    expect(cork.getContainer()).toBe(room);
    expect(nail.getContainer()).toBe(bucket);
  });

  it('a shut lid holds a floater under water', () => {
    const room = place(3, 'ceiling', 'walled');
    const chest = thing(() => new Chest(), { kg: 10, box: { width: 0.6, depth: 0.4, height: 0.4 } });
    ContainmentApi.move(chest, room);
    chest.setOpen(true);
    const cork = thing(() => new Item(), { material: material(CORK, 240), kg: 0.01 });
    ContainmentApi.move(cork, chest);
    chest.setOpen(false);
    underWater();
    expect(chest.reconcilePressing()).toEqual([]);
    expect(cork.getContainer()).toBe(chest);
  });

  it('at zero gravity what is not behind a closed side drifts out; a lid holds', () => {
    const room = place(3, 'ceiling', 'walled');
    const bucket = thing(() => new OpenBox(), { kg: 1, box: { width: 0.3, depth: 0.3, height: 0.3 } });
    const chest = thing(() => new Chest(), { kg: 10, box: { width: 0.6, depth: 0.4, height: 0.4 } });
    ContainmentApi.move(bucket, room);
    ContainmentApi.move(chest, room);
    const nail = thing(() => new Item(), { material: material(IRON, 7870), kg: 0.01 });
    const ring = thing(() => new Item(), { material: material(IRON, 7870), kg: 0.01 });
    ContainmentApi.move(nail, bucket);
    chest.setOpen(true);
    ContainmentApi.move(ring, chest);
    chest.setOpen(false);
    room.setGravity(Quantity.of(0, 'm/s²'));
    expect(room.gravityNow().rawValue()).toBe(0);
    expect(nail.getContainer()).toBe(room);
    expect(ring.getContainer()).toBe(chest);
  });

  it('at zero gravity a cup drifts off the table; a thing hung FROM a hook stays', () => {
    const room = place(3, 'ceiling', 'walled');
    const table = thing(() => new Surface(), { kg: 30, box: { width: 1, depth: 0.6, height: 0.75 } });
    const hook = thing(() => new Surface(), { kg: 0.5, box: { width: 0.02, depth: 0.05, height: 0.1 } });
    hook.placements = [Placements.FROM];
    ContainmentApi.move(table, room);
    ContainmentApi.move(hook, room);
    const cup = thing(() => new Item(), { material: material(IRON, 7870), kg: 0.2 });
    const ham = thing(() => new Item(), { material: material(IRON, 7870), kg: 0.2 });
    ContainmentApi.move(cup, table, Placements.ON);
    ContainmentApi.move(ham, hook, Placements.FROM);
    room.setGravity(Quantity.of(0, 'm/s²'));
    expect(cup.getContainer()).toBe(room);
    expect(cup.getPlacement()).toBeNull();
    expect(ham.getPlacement()?.host).toBe(hook);
  });

  it('a thing arriving in an open container at zero gravity does not stay', async () => {
    const room = place(3, 'ceiling', 'walled');
    room.setGravity(Quantity.of(0, 'm/s²'));
    const bucket = thing(() => new OpenBox(), { kg: 1, box: { width: 0.3, depth: 0.3, height: 0.3 } });
    ContainmentApi.move(bucket, room);
    const nail = thing(() => new Item(), { material: material(IRON, 7870), kg: 0.01 });
    ContainmentApi.move(nail, bucket);
    await Promise.resolve();
    await Promise.resolve();
    expect(nail.getContainer()).toBe(room);
  });
});
