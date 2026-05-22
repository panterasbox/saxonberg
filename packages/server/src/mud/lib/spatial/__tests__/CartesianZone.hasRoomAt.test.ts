import { describe, it, expect, afterEach } from 'vitest';
import { CartesianLocation } from '../CartesianLocation';
import { CartesianZone } from '../CartesianZone';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('CartesianZone.hasRoomAt', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('returns true when a room is at the given coords (no room arg)', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    expect(zone.hasRoomAt(0, 0, 0)).toBe(true);
  });

  it('returns false when no room is at the given coords', () => {
    const zone = makeStuff(() => new CartesianZone());
    expect(zone.hasRoomAt(99, 99, 99)).toBe(false);
  });

  it('with room arg: returns true only when the specific room matches', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 1, 1, 1);
    expect(zone.hasRoomAt(0, 0, 0, a)).toBe(true);
    expect(zone.hasRoomAt(0, 0, 0, b)).toBe(false);
    expect(zone.hasRoomAt(1, 1, 1, a)).toBe(false);
    expect(zone.hasRoomAt(1, 1, 1, b)).toBe(true);
  });
});
