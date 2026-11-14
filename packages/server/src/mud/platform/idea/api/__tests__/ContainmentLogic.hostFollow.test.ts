/**
 * ⭐⭐ Whatever is placed on or from a thing travels with it (size and
 * carrying D33) — a rule of MOVING, not of garments: a tray's cups, a belt's
 * pouches go where their host goes, pair kept, recursively; the whole
 * bring-along is asked first, so a refusal moves nothing; and a planted
 * cycle trips the guard. ⭐ What is IN a thing — a coat's pocketed key — is
 * its contents and travels as contents, with no host-follow (W9, D-W9-8).
 */
import '../../../../../test-bootstrap';
import { carry } from '../../../../lib/slot/__tests__/carrying-fixture';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { Placements } from '../../../../lib/spatial/Placement';
import type { PlacementEntry } from '../../../../lib/spatial/Placing';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms, thing, place, Item, Surface, Chest } from '../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, wornGarment } from '../../../../lib/slot/__tests__/carrying-fixture';

const POCKETS: PlacementEntry[] = [
  { member: Placements.POCKET, name: 'left pocket', mouth: { width: 0.16, height: 0.05 }, volumeM3: 0.0015 },
  { member: Placements.POCKET, name: 'right pocket', mouth: { width: 0.16, height: 0.05 }, volumeM3: 0.0015 },
];
const key = () => tool('key', 0.02, [0.06, 0.025, 0.003]);

describe('ContainmentLogic — the host-follow (D33)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => StuffApi.clearAll());

  async function coated() {
    const { me, plan } = makeBody();
    const room = place(4, 'ceiling', 'walled');
    ContainmentApi.move(me, room);
    const coat = await wornGarment(me, plan, 'coat', 'torso', POCKETS);
    const k = key();
    carry(me, k);
    ContainmentApi.move(k, coat, 'left pocket');
    return { me, plan, room, coat, k };
  }

  it('remove coat: the key is the coat\'s contents before and after — nothing follows', async () => {
    const { me, coat, k } = await coated();
    expect(k.getContainer()).toBe(coat);
    expect(me.getContents()).not.toContain(k);
    me.vacate('torso', coat);
    expect(coat.getContainer()).toBe(me);
    expect(k.getContainer()).toBe(coat);
    expect(k.getPlacement()).toEqual({ host: coat, name: 'left pocket' });
  });

  it('drop coat: the key in the coat, the coat in the room, pair kept', async () => {
    const { me, room, coat, k } = await coated();
    me.vacate('torso', coat);
    ContainmentApi.move(coat, room);
    expect(coat.getContainer()).toBe(room);
    expect(k.getContainer()).toBe(coat);
    expect(room.getContents()).not.toContain(k);
    expect(k.getPlacement()).toEqual({ host: coat, name: 'left pocket' });
    expect(coat.getPlaced('left pocket')).toEqual([k]);
    expect(me.tierOf(k)).toBe('elsewhere');
  });

  it('give coat: the new wearer\'s contents hold the coat, the coat the key', async () => {
    const { me, room, coat, k } = await coated();
    const { me: ruth } = makeBody();
    ContainmentApi.move(ruth, room);
    me.vacate('torso', coat);
    ContainmentApi.move(coat, ruth);
    expect(coat.getContainer()).toBe(ruth);
    expect(k.getContainer()).toBe(coat);
    expect(k.getPlacement()).toEqual({ host: coat, name: 'left pocket' });
    expect(ruth.tierOf(k)).toBe('ready');
  });

  it('a tray with cups into a chest too small for the cups — refused, and the tray stays', () => {
    const room = place(4, 'ceiling', 'walled');
    const tray = thing(() => new Surface(), { kg: 0.5, box: { width: 0.4, depth: 0.3, height: 0.02 } });
    ContainmentApi.move(tray, room);
    const cup = thing(() => new Item(), { kg: 0.2, box: { width: 0.08, depth: 0.08, height: 0.1 } });
    ContainmentApi.move(cup, room);
    ContainmentApi.move(cup, tray, Placements.ON);
    // A flat chest with its lid down (`move` asks the tape measure, not the
    // lid — the verb refuses a shut lid): the tray lies in it, a cup does not.
    const chest = thing(() => new Chest(), { kg: 5, box: { width: 0.5, depth: 0.4, height: 0.05 } });
    chest.setOpen(false);
    ContainmentApi.move(chest, room);
    expect(chest.fitRefusal(tray)).toBeNull();
    expect(() => ContainmentApi.move(tray, chest)).toThrow(/canAddContainable/);
    expect(tray.getContainer()).toBe(room);
    expect(cup.getContainer()).toBe(room);
    expect(cup.getPlacement()).toEqual({ host: tray, name: Placements.ON });
  });

  it('a cup on a tray in a pocket: tray and cup are the coat\'s contents, the cup\'s pair names the tray', async () => {
    const { me, room, coat } = await coated();
    const tray = thing(() => new Surface(), { kg: 0.05, box: { width: 0.1, depth: 0.03, height: 0.005 } });
    carry(me, tray);
    ContainmentApi.move(tray, coat, 'right pocket');
    const pin = thing(() => new Item(), { kg: 0.001, box: { width: 0.01, depth: 0.01, height: 0.01 } });
    carry(me, pin);
    ContainmentApi.move(pin, tray, Placements.ON);
    expect(tray.getContainer()).toBe(coat);
    expect(pin.getContainer()).toBe(coat);
    me.vacate('torso', coat);
    ContainmentApi.move(coat, room);
    expect(tray.getContainer()).toBe(coat);
    expect(tray.getPlacement()).toEqual({ host: coat, name: 'right pocket' });
    expect(pin.getContainer()).toBe(coat);
    expect(pin.getPlacement()).toEqual({ host: tray, name: Placements.ON });
  });

  it('a cycle planted by a test trips the guard, and nothing moves', () => {
    const room = place(4, 'ceiling', 'walled');
    const a = thing(() => new Surface(), { kg: 1 });
    const b = thing(() => new Surface(), { kg: 1 });
    ContainmentApi.move(a, room);
    ContainmentApi.move(b, room);
    ContainmentApi.move(b, a, Placements.ON);
    // Plant the cycle: a on b while b is on a — no verb can make this.
    ContainmentApi.move(a, b, Placements.ON);
    expect(a.getPlacement()?.host).toBe(b);
    expect(b.getPlacement()?.host).toBe(a);
    const chest = thing(() => new Chest(), { kg: 5 });
    chest.setOpen(true);
    ContainmentApi.move(chest, room);
    expect(() => ContainmentApi.move(a, chest)).toThrow(/placement cycle/);
    expect(a.getContainer()).toBe(room);
    expect(b.getContainer()).toBe(room);
  });
});
