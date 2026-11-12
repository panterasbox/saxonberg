/**
 * ⭐ A container shaped to one kind admits only that (size and carrying
 * D27): a holster takes a pistol and refuses a cup in its own words, and a
 * thing drawn out of a shaped container is drawn fast.
 */
import '../../../../test-bootstrap';
import { carry } from '../../slot/__tests__/carrying-fixture';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { installForms } from './size-fixture';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, tool, pack, wornGarment } from '../../slot/__tests__/carrying-fixture';
import { stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { Placements } from '../Placement';
import type { Containable } from '../Containable';
import type { Stuff } from '../../stuff/Stuff';

describe('Container — shapedTo (D27)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => StuffApi.clearAll());

  it('a holster row refuses a cup, in words, and takes its pistol', () => {
    const holster = pack('holster', 0.3, [0.06, 0.04, 0.25], '/trade/smithing/thing/pistol');
    const pistol = tool('pistol', 1.1, [0.04, 0.03, 0.2]);
    stampTemplatePathForTest(pistol, '/trade/smithing/thing/pistol/flintlock');
    const cup = tool('cup', 0.2, [0.04, 0.04, 0.05]);
    expect(holster.isShapedFor(pistol)).toBe(true);
    expect(holster.isShapedFor(cup)).toBe(false);
    expect(holster.fitRefusal(cup)?.reason).toBe('not-shaped-for');
    expect(holster.fitRefusal(pistol)).toBeNull();
    const { me } = makeBody();
    carry(me, cup);
    const plan = ContainmentApi.putPlanFor(cup as Stuff & Containable, holster, { prep: 'in', by: me });
    expect(plan).toMatchObject({ ok: false, reason: 'wont-fit', facts: { why: 'not-shaped-for' } });
    expect(() => ContainmentApi.move(cup, holster)).toThrow(/not-shaped-for/);
  });

  it('a mixin name shapes by what the thing is', () => {
    const quiver = pack('quiver', 0.4, [0.1, 0.1, 0.7], 'WieldableMixin');
    expect(quiver.isShapedFor(tool('arrow', 0.03, [0.01, 0.01, 0.7]))).toBe(true);
    expect(quiver.getShapedTo()).toBe('WieldableMixin');
    quiver.setShapedTo(null);
    expect(quiver.getShapedTo()).toBeNull();
    expect(() => quiver.setShapedTo('  ')).toThrow(TypeError);
  });

  it('draw fast: out of a holster on the belt sooner than out of a pouch on the belt', async () => {
    const { me, plan } = makeBody();
    const belt = await wornGarment(me, plan, 'belt', 'waist', [Placements.FROM]);
    const holster = pack('holster', 0.3, [0.06, 0.04, 0.25], '/trade/smithing/thing/pistol');
    const pouch = pack('pouch', 0.1, [0.12, 0.05, 0.12]);
    for (const p of [holster, pouch]) {
      carry(me, p);
      ContainmentApi.move(p, belt, Placements.FROM);
    }
    const pistol = tool('pistol', 1.1, [0.04, 0.03, 0.2]);
    stampTemplatePathForTest(pistol, '/trade/smithing/thing/pistol');
    ContainmentApi.move(pistol, holster);
    const knife = tool('knife', 0.2, [0.03, 0.02, 0.1]);
    ContainmentApi.move(knife, pouch);
    expect(me.tierOf(pistol)).toBe('ready');
    expect(me.readySeconds(pistol)).toBeLessThan(me.readySeconds(knife));
  });
});
