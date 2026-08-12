import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import SphericalLocation from '../SphericalLocation';
import SphericalZone from '../SphericalZone';
import { Stuff } from '../../../lib/stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

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

describe('SphericalLocation — linear extent', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('is the DIAMETER — the longest line a shot must cross', () => {
    const { room } = makeRoomInZone(5);
    expect(room.getLinearExtent()).toBe(10);
  });

  it('needs no authored override — the radius is already per-room', () => {
    // Cartesian cells are sized by their ZONE, which is why they needed
    // an override. A sphere already varies freely room by room.
    const { room: small } = makeRoomInZone(1.5);
    const { room: big } = makeRoomInZone(12);
    expect(small.getLinearExtent()).toBe(3);
    expect(big.getLinearExtent()).toBe(24);
  });

  it('an unset radius is the shipped unit sphere — honestly 2 m across', () => {
    // `radius` defaults to 1.0 (a unit sphere), not null, so a room that
    // never authored one still reports a real size. That is the honest
    // answer and it caps such a room at the melee bands.
    const room = makeStuff(() => new SphericalLocation());
    expect(room.getLinearExtent()).toBe(2);
  });

  it('a zero radius reports no extent — a degenerate room', () => {
    const { room } = makeRoomInZone(5);
    room.setRadius(0);
    expect(room.getLinearExtent()).toBeNull();
  });
});
