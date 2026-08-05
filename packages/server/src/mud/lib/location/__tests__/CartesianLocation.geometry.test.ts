import { describe, it, expect, afterEach } from 'vitest';
import CartesianLocation from '../CartesianLocation';
import CartesianZone from '../../../obj/location/CartesianZone';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

function makeRoomInZone(cellSize?: number) {
  const zone = makeStuff(() => new CartesianZone());
  if (cellSize !== undefined) zone.setCellSize(cellSize);
  const room = makeStuff(() => new CartesianLocation());
  Stuff._stampZone(room, zone);
  return { zone, room };
}

describe('CartesianLocation — derived geometry', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('default cellSize 3 → volume 27 m³', () => {
    const { room } = makeRoomInZone();
    const v = room.getVolume();
    expect(v).not.toBeNull();
    expect(v!.rawValue()).toBe(27);
    expect(v!.unit).toBe('m³');
  });

  it('default cellSize 3 → ceiling 3 m', () => {
    const { room } = makeRoomInZone();
    const h = room.getCeilingHeight();
    expect(h).not.toBeNull();
    expect(h!.rawValue()).toBe(3);
    expect(h!.unit).toBe('m');
  });

  it('cellSize 5 → volume 125 m³ and ceiling 5 m', () => {
    const { room } = makeRoomInZone(5);
    expect(room.getVolume()!.rawValue()).toBe(125);
    expect(room.getCeilingHeight()!.rawValue()).toBe(5);
  });

  it('getSizeScale squares linear cellSize for light substrate', () => {
    const { room } = makeRoomInZone(3);
    expect(room.getSizeScale()).toBe(9);
  });

  it('room without a zone returns null for both', () => {
    const room = makeStuff(() => new CartesianLocation());
    expect(room.getVolume()).toBeNull();
    expect(room.getCeilingHeight()).toBeNull();
  });
});

describe('CartesianLocation — the per-room extent override', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('reports the zone cellSize when no override is authored', () => {
    const { room } = makeRoomInZone(3);
    expect(room.getExtent()).toBeNull();
    expect(room.getLinearExtent()).toBe(3);
  });

  it('an authored extent overrides the zone — a hall beside a shop', () => {
    const { room } = makeRoomInZone(3);
    room.setExtent(12);
    expect(room.getExtent()).toBe(12);
    expect(room.getLinearExtent()).toBe(12);
  });

  it('clearing the override falls back to the zone again', () => {
    const { room } = makeRoomInZone(3);
    room.setExtent(12);
    room.setExtent(null);
    expect(room.getLinearExtent()).toBe(3);
  });

  it('a zoneless room reports no extent at all', () => {
    const room = makeStuff(() => new CartesianLocation());
    expect(room.getLinearExtent()).toBeNull();
  });

  it('rejects a non-positive extent — a room has a real size', () => {
    const { room } = makeRoomInZone(3);
    expect(() => room.setExtent(0)).toThrow(/positive/);
    expect(() => room.setExtent(-4)).toThrow(/positive/);
    expect(() => room.setExtent(Number.NaN)).toThrow(/positive/);
    // The rejected writes left the field alone.
    expect(room.getExtent()).toBeNull();
  });

  /**
   * The load-bearing pin. Extent is ONE number feeding light, atmosphere
   * and combat bands, so re-pointing the three derivations through
   * `getLinearExtent()` must be invisible when nobody authors an
   * override. If this ever fails, the ranged build silently moved the
   * lux and gas-law readings of every shipped room.
   */
  it('with no override the three derivations are byte-identical to cellSize', () => {
    for (const cell of [1, 3, 7.5]) {
      const { room } = makeRoomInZone(cell);
      expect(room.getSizeScale()).toBe(cell * cell);
      expect(room.getVolume()!.rawValue()).toBe(cell * cell * cell);
      expect(room.getCeilingHeight()!.rawValue()).toBe(cell);
    }
  });

  it('WITH an override, light and atmosphere move too — deliberately', () => {
    const { room } = makeRoomInZone(3);
    room.setExtent(12);
    // A bigger room is dimmer for the same flux, airier, and taller. One
    // cause, three effects — authoring a room that is large for combat
    // but small for lux is exactly what this shape prevents.
    expect(room.getSizeScale()).toBe(144);
    expect(room.getVolume()!.rawValue()).toBe(1728);
    expect(room.getCeilingHeight()!.rawValue()).toBe(12);
  });
});
