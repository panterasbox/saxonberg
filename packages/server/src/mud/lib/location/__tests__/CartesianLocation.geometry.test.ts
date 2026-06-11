import { describe, it, expect, afterEach } from 'vitest';
import CartesianLocation from '../CartesianLocation';
import CartesianZone from '../CartesianZone';
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
