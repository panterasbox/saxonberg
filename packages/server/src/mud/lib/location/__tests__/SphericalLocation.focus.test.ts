import { describe, it, expect, afterEach } from 'vitest';
import SphericalLocation from '../SphericalLocation';
import SphericalZone from '../SphericalZone';
import PersistentHydrator from '../../persistence/PersistentHydrator';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('SphericalLocation.setFocus', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  function makeRoomInZone() {
    const zone = makeStuff(() => new SphericalZone());
    const room = makeStuff(() => new SphericalLocation());
    Stuff._stampZone(room, zone);
    return { zone, room };
  }

  it('stores the value, stamps coordinates + radius, and registers with the zone', async () => {
    const { zone, room } = makeRoomInZone();
    await room.setFocus({ rho: 1, theta: 0.5, phi: -0.25, radius: 2 });
    expect(room.getFocus()).toEqual({
      rho: 1,
      theta: 0.5,
      phi: -0.25,
      radius: 2,
    });
    expect(room.getCoordinates()).toEqual([1, 0.5, -0.25]);
    expect(room.getRadius()).toBe(2);
    expect(zone.contains(room)).toBe(true);
    expect(zone.hasLocationAtFocus([1, 0.5, -0.25], room)).toBe(true);
  });

  it('re-setting with the same focus is a no-op (idempotent)', async () => {
    const { room } = makeRoomInZone();
    await room.setFocus({ rho: 1, theta: 0.5, phi: 0, radius: 1 });
    await expect(
      room.setFocus({ rho: 1, theta: 0.5, phi: 0, radius: 1 })
    ).resolves.toBeUndefined();
  });

  it('throws when no zone resolves from template-path ancestry', async () => {
    const room = makeStuff(() => new SphericalLocation());
    await expect(
      room.setFocus({ rho: 1, theta: 0, phi: 0, radius: 1 })
    ).rejects.toThrow(/no zone resolved/);
  });

  it('rejects malformed input (non-numeric fields)', async () => {
    const { room } = makeRoomInZone();
    await expect(
      room.setFocus({
        rho: 'one' as unknown as number,
        theta: 0,
        phi: 0,
        radius: 1,
      })
    ).rejects.toThrow(TypeError);
  });

  it('hydrates via PersistentHydrator method-dispatch', async () => {
    const { zone, room } = makeRoomInZone();
    await makeStuff(() => new PersistentHydrator()).hydrate(room, {
      focus: { rho: 3, theta: 0.1, phi: 0.2, radius: 5 },
    });
    expect(room.getFocus()).toEqual({ rho: 3, theta: 0.1, phi: 0.2, radius: 5 });
    expect(room.getRadius()).toBe(5);
    expect(zone.contains(room)).toBe(true);
  });
});
