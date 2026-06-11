import { describe, it, expect, afterEach } from 'vitest';
import CartesianLocation from '../CartesianLocation';
import CartesianZone from '../CartesianZone';
import PersistentHydrator from '../../persistence/PersistentHydrator';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('CartesianLocation.setCoords', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  function makeRoomInZone() {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new CartesianLocation());
    Stuff._stampZone(room, zone);
    return { zone, room };
  }

  it('stores the value and registers with the zone via addLocation', async () => {
    const { zone, room } = makeRoomInZone();
    await room.setCoords({ x: 1, y: 2, z: 0 });
    expect(room.getCoords()).toEqual({ x: 1, y: 2, z: 0 });
    expect(zone.contains(room)).toBe(true);
    expect(zone.hasRoomAt(1, 2, 0, room)).toBe(true);
  });

  it('re-setting with the same coords is a no-op (idempotent)', async () => {
    const { room } = makeRoomInZone();
    await room.setCoords({ x: 1, y: 1, z: 0 });
    // Second call should not throw and should preserve state.
    await expect(room.setCoords({ x: 1, y: 1, z: 0 })).resolves.toBeUndefined();
    expect(room.getCoords()).toEqual({ x: 1, y: 1, z: 0 });
  });

  it('re-setting with different coords throws with conflict diagnostic', async () => {
    const { room } = makeRoomInZone();
    await room.setCoords({ x: 0, y: 0, z: 0 });
    await expect(
      room.setCoords({ x: 1, y: 1, z: 0 })
    ).rejects.toThrow(/already at/);
  });

  it('throws when no zone resolves from template-path ancestry', async () => {
    const room = makeStuff(() => new CartesianLocation());
    await expect(
      room.setCoords({ x: 0, y: 0, z: 0 })
    ).rejects.toThrow(/no zone resolved/);
  });

  it('rejects malformed input (non-numeric fields)', async () => {
    const { room } = makeRoomInZone();
    await expect(
      room.setCoords({ x: 'one' as unknown as number, y: 0, z: 0 })
    ).rejects.toThrow(TypeError);
  });

  it('hydrates via PersistentHydrator method-dispatch', async () => {
    const { zone, room } = makeRoomInZone();
    await makeStuff(() => new PersistentHydrator()).hydrate(room, {
      coords: { x: 3, y: 4, z: 0 },
    });
    expect(room.getCoords()).toEqual({ x: 3, y: 4, z: 0 });
    expect(zone.contains(room)).toBe(true);
  });
});
