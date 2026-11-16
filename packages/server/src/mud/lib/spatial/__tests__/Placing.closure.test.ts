/**
 * ⭐ A chamber that `closes` is a closure the player drives (size and
 * carrying D-W10-12; owner default: it starts shut and its state persists
 * per instance). Shut means shut: a thing in it is refused naming `open`;
 * opened, it is reachable, others may see in, and it presses open-topped;
 * a pocket with no `closes` cannot be shut.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { PerceptionApi } from '../../../api/perception';
import { Placements } from '../Placement';
import type { PlacementEntry } from '../Placing';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { installShapes } from './size-fixture';
import { makeBody, tool, wornGarment } from '../../slot/__tests__/carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';
import Location from '../../location/Location';
import canReach from '../../command/validators/canReach';

const COAT: PlacementEntry[] = [
  { member: Placements.IN, name: 'left pocket', mouth: { width: 0.16, height: 0.05 }, volumeM3: 0.0015 },
  { member: Placements.IN, name: 'breast pocket', mouth: { width: 0.12, height: 0.03 }, volumeM3: 0.0004, closes: true },
];

async function scene() {
  const room = makeStuff(() => new Location());
  const { me, plan } = makeBody();
  ContainmentApi.move(me, room);
  const { me: other } = makeBody();
  ContainmentApi.move(other, room);
  const coat = await wornGarment(me, plan, 'coat', 'torso', COAT);
  const k = tool('key', 0.02, [0.06, 0.025, 0.003]);
  ContainmentApi.move(k, room);
  coat.fastenRegion('breast pocket', false);
  ContainmentApi.move(k, coat, 'breast pocket');
  coat.fastenRegion('breast pocket', true);
  return { room, me, other, coat, k };
}

describe('Placing — a chamber that closes (D-W10-12)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installShapes();
  });
  afterEach(() => StuffApi.clearAll());

  it('a `closes` pocket starts shut; an open one is open; one with no `closes` cannot be shut', async () => {
    const { coat } = await scene();
    expect(coat.isRegionOpen('left pocket')).toBe(true);
    expect(coat.fastenRegion('left pocket', true)).toEqual({ ok: false, reason: 'does-not-close' });
    expect(coat.isRegionOpen('left pocket')).toBe(true);
  });

  it('a key in the shut pocket is `enclosed-shut` naming `open`; opened it is reachable and seen; closed, back', async () => {
    const { room, me, other, coat, k } = await scene();
    const ctx = { commandGiver: me, location: room } as never;
    expect(k.reachRefusal(me)).toMatchObject({ ok: false, reason: 'enclosed-shut', facts: { by: coat, region: 'breast pocket' } });
    expect(canReach({ stuff: [k], raw: 'key' }, 'tool', ctx)).toBe("Your coat's breast pocket is shut — `open \"breast pocket\"` first.");
    expect(PerceptionApi.perceives(other, k)).toBe(false);
    coat.fastenRegion('breast pocket', false);
    expect(k.reachRefusal(me)).toBeNull();
    expect(canReach({ stuff: [k], raw: 'key' }, 'tool', ctx)).toBeUndefined();
    coat.fastenRegion('breast pocket', true);
    expect(k.reachRefusal(me)).not.toBeNull();
  });

  it('a new coat\'s `closes` pocket starts shut', async () => {
    const { me, plan } = makeBody();
    const coat = await wornGarment(me, plan, 'coat', 'torso', COAT);
    expect(coat.isRegionOpen('breast pocket')).toBe(false);
  });

  it('the state persists across capture/restore (the host\'s own persistent field)', async () => {
    const { coat } = await scene();
    // The Hydrator's carve-out: the persisted field is read by name.
    coat.fastenRegion('breast pocket', false);
    expect(coat.shutRegions).toEqual([]);
    coat.fastenRegion('breast pocket', true);
    expect(coat.shutRegions).toEqual(['breast pocket']);
  });
});
