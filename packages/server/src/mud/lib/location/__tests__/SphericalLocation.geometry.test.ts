import { describe, it, expect, afterEach } from 'vitest';
import SphericalLocation from '../SphericalLocation';
import SphericalZone from '../SphericalZone';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

function makeRoomInZone(radius: number) {
  const zone = makeStuff(() => new SphericalZone());
  const room = makeStuff(() => new SphericalLocation());
  Stuff._stampZone(room, zone);
  room.setRadius(radius);
  return { zone, room };
}

describe('SphericalLocation — derived geometry', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('radius 2 m → full-sphere volume (4/3)·π·8 ≈ 33.51 m³', () => {
    const { room } = makeRoomInZone(2);
    const v = room.getVolume();
    expect(v).not.toBeNull();
    expect(v!.rawValue()).toBeCloseTo((4 / 3) * Math.PI * 8, 5);
    expect(v!.unit).toBe('m³');
  });

  it('radius 2 m → inscribed-cube ceiling 4/√3 m ≈ 2.309', () => {
    const { room } = makeRoomInZone(2);
    const h = room.getCeilingHeight();
    expect(h).not.toBeNull();
    expect(h!.rawValue()).toBeCloseTo(4 / Math.sqrt(3), 5);
    expect(h!.unit).toBe('m');
  });

  it('inscribed-cube invariant: ceiling × √3 ≈ 2·radius', () => {
    const radius = 3;
    const { room } = makeRoomInZone(radius);
    const ceiling = room.getCeilingHeight()!.rawValue();
    expect(ceiling * Math.sqrt(3)).toBeCloseTo(2 * radius, 5);
  });

  it('radius 0 returns null for both', () => {
    const { room } = makeRoomInZone(0);
    expect(room.getVolume()).toBeNull();
    expect(room.getCeilingHeight()).toBeNull();
  });
});
