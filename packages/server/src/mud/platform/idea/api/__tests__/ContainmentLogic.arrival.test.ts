/**
 * ⭐⭐ `move` just works (size and carrying W8): a body is a destination that
 * places what arrives — a hand, the other hand, a pocket it fits — and when
 * it has no honest place, `move` THROWS naming why; it never lands the
 * thing anywhere but the body. `canReceive` is the same answer, read dry.
 */
import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi, ContainmentError } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { Placements } from '../../../../lib/spatial/Placement';
import type { PlacementEntry } from '../../../../lib/spatial/Placing';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms } from '../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, wornGarment } from '../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import Location from '../../../../lib/location/Location';
import Holder from '../../../../lib/stuff/Holder';

const TROUSERS: PlacementEntry[] = [
  { member: Placements.POCKET, name: 'left pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
];
const key = () => tool('key', 0.02, [0.06, 0.025, 0.003]);
const mug = () => tool('mug', 0.35, [0.09, 0.09, 0.1]);

describe('ContainmentApi.move onto a body — the body places what arrives (W8)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a mug lands in a hand; a second in the other; a key in a pocket; a fourth throws naming the hands and the pockets', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const trousers = await wornGarment(me, plan, 'trousers', 'legs', TROUSERS);
    const [m1, m2, k, m3] = [mug(), mug(), key(), mug()];
    ContainmentApi.move(m1, me);
    expect(me.tierOf(m1)).toBe('hand');
    ContainmentApi.move(m2, me);
    expect(me.tierOf(m2)).toBe('hand');
    expect(me.freeHands()).toBe(0);
    ContainmentApi.move(k, me);
    expect(k.getPlacement()).toEqual({ host: trousers, name: 'left pocket' });
    expect(me.isHonest(k)).toBe(true);
    // The dry read says so first…
    const refused = me.canReceive(m3);
    expect(refused?.reason).toBe('nowhere-to-carry');
    // …and the act throws rather than lie: nothing moved.
    let thrown: unknown = null;
    try {
      ContainmentApi.move(m3, me);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(ContainmentError);
    const e = thrown as ContainmentError;
    expect(e.reason).toBe('nowhere-to-carry');
    expect(e.message).toMatch(/has no place on/);
    expect(e.message).toMatch(/hands hold .*mug.* and .*mug/);
    expect(e.message).toMatch(/tried .*trousers/);
    expect(m3.getContainer()).toBeNull();
  });

  it('out of a box: leaves the box, lands in a hand', () => {
    const { me } = makeBody();
    const box = makeStuff(() => new Holder());
    const m = mug();
    ContainmentApi.move(m, box);
    ContainmentApi.move(m, me);
    expect(box.getContents()).not.toContain(m);
    expect(me.tierOf(m)).toBe('hand');
  });

  it('a key moved out of its pocket onto its owner goes to a hand, never loose', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const trousers = await wornGarment(me, plan, 'trousers', 'legs', TROUSERS);
    const k = key();
    ContainmentApi.move(k, trousers, 'left pocket');
    expect(me.tierOf(k)).toBe('ready');
    ContainmentApi.move(k, me);
    expect(k.getPlacement()).toBeNull();
    expect(me.tierOf(k)).toBe('hand');
    expect(me.isHonest(k)).toBe(true);
  });

  it('a slot named: seated there, exactly', () => {
    const { me } = makeBody();
    const m = mug();
    me.seatInSlot(m, 'hand:left');
    expect(me.getOccupant('hand:left')).toBe(m);
    expect(me.isSeating(m)).toBe(false);
  });

  it('every container answers canReceive — a box by its fit, with no narrowing', () => {
    const box = makeStuff(() => new Holder());
    expect(box.canReceive(mug())).toBeNull();
    expect(MixinApi.isCarrying(box)).toBe(false);
  });
});
