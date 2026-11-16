/**
 * ⭐ Chambers (size and carrying D-W10-14; owner final A): a container is ONE
 * interior or a set of named chambers, never both — `hasInterior()` is
 * derived (true iff it offers no enclosing region). Volume and fit are per
 * chamber, never summed. Chambers alike in every way the world cares about
 * are the container's to fill (the first that fits); chambers that differ
 * are the player's to choose (`put` asks) and the caller's to name (`move`
 * with no region word throws, finalize R3).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi, ContainmentError } from '../../../api/containment';
import { Placements } from '../Placement';
import type { PlacementEntry } from '../Placing';
import type { Containable } from '../Containable';
import type { Stuff } from '../../stuff/Stuff';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { installShapes } from './size-fixture';
import { makeBody, tool, wornGarment, pack, carry } from '../../slot/__tests__/carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';
import Location from '../../location/Location';

const ALIKE: PlacementEntry[] = [
  { member: Placements.IN, name: 'left pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
  { member: Placements.IN, name: 'right pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
];
const DIFFER: PlacementEntry[] = [
  ...ALIKE,
  { member: Placements.IN, name: 'breast pocket', mouth: { width: 0.12, height: 0.03 }, volumeM3: 0.0004, closes: true },
  { member: Placements.IN, name: 'inner pocket', mouth: { width: 0.14, height: 0.03 }, volumeM3: 0.0006, covered: true },
];
const key = () => tool('key', 0.02, [0.06, 0.025, 0.003]);
const put = (item: Stuff, target: Stuff, by: Stuff, prep?: string) =>
  ContainmentApi.putPlanFor(item as Stuff & Containable, target, { by, ...(prep ? { prep } : {}) });

describe('Container — chambers (D-W10-14)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installShapes();
  });
  afterEach(() => StuffApi.clearAll());

  it('a host naming two chambers has no interior; one naming none has one', async () => {
    const p = pack('satchel', 0.5, [0.3, 0.1, 0.25]);
    expect(p.hasInterior()).toBe(true);
    await p.setPlacements(ALIKE);
    expect(p.hasInterior()).toBe(false);
  });

  it('`move(x, host)` lands in a chamber, or throws when no chamber takes it', async () => {
    const room = makeStuff(() => new Location());
    const p = pack('satchel', 0.5, [0.3, 0.1, 0.25]);
    ContainmentApi.move(p, room);
    await p.setPlacements(ALIKE);
    const k = key();
    ContainmentApi.move(k, room);
    ContainmentApi.move(k, p);
    expect(k.getPlacement()).toEqual({ host: p, name: 'left pocket' });
    const big = tool('brick', 2, [0.2, 0.1, 0.06]);
    ContainmentApi.move(big, room);
    expect(() => ContainmentApi.move(big, p)).toThrow(ContainmentError);
    expect(big.getContainer()).toBe(room);
  });

  it('alike chambers: `put key in trousers` takes the first that fits, no prompt', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const trousers = await wornGarment(me, plan, 'trousers', 'legs', ALIKE);
    expect(trousers.alikeChambers(['left pocket', 'right pocket'])).toBe(true);
    const k = key();
    carry(me, k);
    const p = put(k, trousers, me, 'in');
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect((await p.onComplete()).ok).toBe(true);
    expect(k.getPlacement()).toEqual({ host: trousers, name: 'left pocket' });
  });

  it('differing chambers: `put key in coat` asks, naming each region', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const coat = await wornGarment(me, plan, 'coat', 'torso', DIFFER);
    expect(coat.alikeChambers(coat.namedRegions())).toBe(false);
    expect(coat.chamberCharacter('left pocket')).toBe(coat.chamberCharacter('right pocket'));
    expect(coat.chamberCharacter('breast pocket')).not.toBe(coat.chamberCharacter('inner pocket'));
    const k = key();
    carry(me, k);
    const asked = put(k, coat, me, 'in');
    expect(asked).toMatchObject({ ok: false, reason: 'preposition-ambiguous', facts: { regions: ['left pocket', 'right pocket', 'breast pocket', 'inner pocket'] } });
  });

  it('⭐ differing chambers: `move(x, host)` with no region word throws naming them — never picks (finalize R3)', async () => {
    const room = makeStuff(() => new Location());
    const p = pack('satchel', 0.5, [0.3, 0.1, 0.25]);
    ContainmentApi.move(p, room);
    await p.setPlacements(DIFFER);
    const k = key();
    ContainmentApi.move(k, room);
    // Asked dry, the same refusal — so a verb or a drift refuses or skips.
    expect(ContainmentApi.arrivalRefusal(k, p)).toMatchObject({ reason: 'refused-by-container' });
    expect(() => ContainmentApi.move(k, p)).toThrow(/"left pocket", "right pocket", "breast pocket", "inner pocket", which differ/);
    expect(k.getContainer()).toBe(room);
    // Named, it goes exactly there.
    ContainmentApi.move(k, p, 'inner pocket');
    expect(k.getPlacement()).toEqual({ host: p, name: 'inner pocket' });
  });
});
