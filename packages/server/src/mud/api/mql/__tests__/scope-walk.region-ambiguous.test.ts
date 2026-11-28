/**
 * ⭐ A word matching several chambers of ONE host binds the host with no
 * region (size and carrying D-W10-6 (c)): the container then decides among
 * alike chambers, and `put` asks among differing ones. The same word
 * answered by two hosts is the binder's ordinary *which one?*; a chamber's
 * own name binds that chamber (`via.region`).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../stuff';
import { MqlApi } from '../../mql';
import { ContainmentApi } from '../../containment';
import { Placements } from '../../../lib/spatial/Placement';
import type { PlacementEntry } from '../../../lib/spatial/Placing';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installShapes } from '../../../lib/spatial/__tests__/size-fixture';
import { makeBody, wornGarment } from '../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import Location from '../../../lib/place/Location';

const ALIKE: PlacementEntry[] = [
  { member: Placements.IN, name: 'left pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
  { member: Placements.IN, name: 'right pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
];
const COAT: PlacementEntry[] = [
  ...ALIKE,
  { member: Placements.IN, name: 'breast pocket', mouth: { width: 0.12, height: 0.03 }, volumeM3: 0.0004, closes: true },
  { member: Placements.IN, name: 'inner pocket', mouth: { width: 0.14, height: 0.03 }, volumeM3: 0.0006, covered: true },
];

describe('a word naming several chambers of one host (D-W10-6)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installShapes();
  });
  afterEach(() => StuffApi.clearAll());

  it('`pocket` against the coat binds the coat with no region; `inner pocket` binds that chamber', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const coat = await wornGarment(me, plan, 'coat', 'torso', COAT);
    const r = MqlApi.resolveOne('pocket', { commandGiver: me as never, scope: '~inventory' });
    expect(r.stuff).toBe(coat);
    expect(r.via?.region).toBeUndefined();
    const inner = MqlApi.resolveOne('inner pocket', { commandGiver: me as never, scope: '~inventory' });
    expect(inner.stuff).toBe(coat);
    expect(inner.via?.region).toBe('inner pocket');
  });

  it('with a coat AND trousers in reach, `pocket` names both garments — the binder asks which', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const coat = await wornGarment(me, plan, 'coat', 'torso', COAT);
    const trousers = await wornGarment(me, plan, 'trousers', 'legs', ALIKE);
    const r = MqlApi.resolveMany('pocket', { commandGiver: me as never, scope: '~inventory' });
    expect(r.stuff).toEqual(expect.arrayContaining([coat, trousers]));
  });
});
