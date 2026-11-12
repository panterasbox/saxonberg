/**
 * ⭐⭐ The flip (size and carrying W7, D11–D13/D32/D37): nothing sits loose
 * on a body. `receive` resolves D11's order and refuses in words, moving
 * nothing; the veto refuses any other way on; the idioms by counterparty
 * (made → set down, granted → never lost); a restore places what it finds
 * loose; a guest gives back what it borrowed.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MessageApi } from '../../../api/message';
import { Quantity } from '../../quantity';
import Good from '../../../platform/thing/Good';
import Location from '../../location/Location';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms } from '../../spatial/__tests__/size-fixture';
import { makeBody, tool, wornGarment, wornBag } from './carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';

const POCKET = { member: '/platform/placements/pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 };

function good(name: string, kg: number, box: [number, number, number]): Good {
  const g = makeStuff(() => new Good());
  g.setShortDescription(name);
  g.setKeywords([name]);
  g.setMass(Quantity.of(kg, 'kg'));
  g.setDimensions({ width: box[0], depth: box[1], height: box[2] });
  return g;
}

let said: string[];
function quietScenes(): void {
  said = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: unknown) => {
      said.push(String(m));
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

describe('the flip — nothing loose on a body', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
    quietScenes();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function newcomer() {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    const trousers = await wornGarment(me, plan, 'trousers', 'legs', [
      { ...POCKET, name: 'left pocket' },
      { ...POCKET, name: 'right pocket' },
    ]);
    return { room, me, plan, trousers };
  }

  it('⭐ drive 1: a mug to a hand, a second to the other, a key to a pocket, a fourth refused in words', async () => {
    const { room, me, trousers } = await newcomer();
    const mug = good('mug', 0.35, [0.09, 0.09, 0.1]);
    const lantern = good('lantern', 1, [0.15, 0.15, 0.3]);
    const key = good('key', 0.02, [0.06, 0.025, 0.003]);
    const map = good('map', 0.05, [0.3, 0.2, 0.02]);
    for (const x of [mug, lantern, key, map]) ContainmentApi.move(x, room);
    expect(me.receive(mug)).toBeNull();
    expect(me.tierOf(mug)).toBe('hand');
    expect(me.receive(lantern)).toBeNull();
    expect(me.heldThings()).toEqual(expect.arrayContaining([mug, lantern]));
    expect(me.receive(key)).toBeNull();
    expect(key.getPlacement()?.host).toBe(trousers);
    const refused = me.receive(map);
    expect(refused?.reason).toBe('nowhere-to-carry');
    expect(map.getContainer()).toBe(room);
    const words = me.refusalWords(refused!);
    expect(words).toMatch(/^Your hands are full — the mug and the lantern — and the map won't fit in your pockets\./);
    expect(words).toMatch(/`drop lantern`/);
  });

  /**
   * ⭐ The browser walk: Dave's back-bar holds three mugs, and `get mug`
   * takes them all — the third is refused "Your hands are full — the mug
   * and the mug — and the mug won't fit". Identical things are counted,
   * and the refused one is another of them.
   */
  it('⭐ three alike: "both mugs", and another mug won\'t fit', async () => {
    const { room, me } = await newcomer();
    const mugs = [0, 1, 2].map(() => good('mug', 0.35, [0.09, 0.09, 0.1]));
    for (const x of mugs) ContainmentApi.move(x, room);
    expect(me.receive(mugs[0]!)).toBeNull();
    expect(me.receive(mugs[1]!)).toBeNull();
    const refused = me.receive(mugs[2]!);
    expect(refused?.reason).toBe('nowhere-to-carry');
    expect(me.refusalWords(refused!)).toMatch(/^Your hands are full — both mugs — and another mug won't fit in your pockets\. Set something down \(`drop mug`\)\.$/);
  });

  it('⭐ a held thing that leaves the body leaves its hand (no phantom occupant — the lead rope)', async () => {
    const { room, me } = await newcomer();
    const rope = good('rope', 0.5, [0.2, 0.2, 0.05]);
    ContainmentApi.move(rope, room);
    expect(me.receive(rope)).toBeNull();
    expect(me.freeHands()).toBe(1);
    ContainmentApi.move(rope, room);
    expect(me.freeHands()).toBe(2);
    expect(me.heldThings()).toEqual([]);
  });

  it('⭐ a pocket is as deep as its volume over its mouth: a pencil stands out of it, a sword does not go in', async () => {
    const { room, me, trousers } = await newcomer();
    const pencil = good('pencil', 0.01, [0.008, 0.008, 0.18]);
    const sword = good('sword', 1, [0.05, 0.01, 0.9]);
    for (const x of [pencil, sword]) ContainmentApi.move(x, room);
    expect(trousers.canPlace(pencil, 'left pocket').ok).toBe(true);
    expect(trousers.canPlace(sword, 'left pocket')).toEqual({ ok: false, reason: 'too-big-inside' });
  });

  it('⭐ the veto: a direct move onto a body is refused loose-on-body; placed or received it comes on', async () => {
    const { room, me, trousers } = await newcomer();
    const coin = good('coin', 0.01, [0.02, 0.02, 0.002]);
    ContainmentApi.move(coin, room);
    expect(() => ContainmentApi.move(coin, me)).toThrow(/loose-on-body/);
    expect(coin.getContainer()).toBe(room);
    ContainmentApi.move(coin, trousers, 'left pocket');
    expect(coin.getContainer()).toBe(me);
    expect(me.isHonest(coin)).toBe(true);
  });

  it('a received thing goes to a worn bag when the hands are full; pockets-first is the setting', async () => {
    const { room, me, plan } = await newcomer();
    const satchel = wornBag(me, plan, 'satchel', 'torso');
    satchel.setDimensions({ width: 0.35, depth: 0.12, height: 0.3 });
    const a = tool('hammer', 1, [0.3, 0.05, 0.03]);
    const b = tool('saw', 1, [0.5, 0.15, 0.02]);
    const c = good('book', 0.5, [0.2, 0.15, 0.03]);
    for (const x of [a, b, c]) ContainmentApi.move(x, room);
    me.receive(a);
    me.receive(b);
    expect(me.receive(c)).toBeNull();
    expect(c.getContainer()).toBe(satchel);
  });

  it('⭐ made: a thing with nowhere to go is SET DOWN where it was made, with a line — never refused', async () => {
    const { room, me } = await newcomer();
    me.receive(tool('hammer', 1, [0.3, 0.05, 0.03]));
    me.receive(tool('saw', 1, [0.5, 0.15, 0.02]));
    const loaf = good('loaf', 0.5, [0.25, 0.12, 0.1]);
    expect(me.receiveOrSetDown(loaf)).toBe('set-down');
    expect(loaf.getContainer()).toBe(room);
    expect(said.join('\n')).toMatch(/you set .*loaf.* down/);
  });

  it('⭐ D32: a restore places what it finds loose; what fits nowhere is never lost', async () => {
    const { room, me } = await newcomer();
    const key = good('key', 0.02, [0.06, 0.025, 0.003]);
    const crate = good('crate', 4, [0.6, 0.5, 0.5]);
    const a = tool('hammer', 1, [0.3, 0.05, 0.03]);
    const b = tool('saw', 1, [0.5, 0.15, 0.02]);
    // A pre-flip inventory: loose in the contents. Only the body itself and
    // the restore may admit a thing (the gate refuses a test), so the
    // record's replay is stood in for by admitting everything for a moment.
    const admitAll = vi.spyOn(me, 'isAdmitting').mockReturnValue(true);
    for (const x of [a, b, key, crate]) ContainmentApi.move(x, me);
    admitAll.mockRestore();
    expect(me.isHonest(key)).toBe(false);
    await me.placeLoose();
    expect(me.isHonest(a) && me.isHonest(b) && me.isHonest(key)).toBe(true);
    // The crate fit nowhere on a body with full hands: set at its feet, not lost.
    expect(crate.getContainer()).toBe(room);
  });

  it('⭐ D37: a guest gives back what it borrowed — another\'s good to its owner, a found thing dropped', async () => {
    const { room, me } = await newcomer();
    const found = good('pebble', 0.05, [0.03, 0.03, 0.03]);
    ContainmentApi.move(found, room);
    me.receive(found);
    me.returnBorrowed();
    expect(found.getContainer()).toBe(room);
  });

  it('the held predicate is a hand slot: a pocketed key is not held', async () => {
    const { room, me, trousers } = await newcomer();
    const key = good('key', 0.02, [0.06, 0.025, 0.003]);
    ContainmentApi.move(key, room);
    ContainmentApi.move(key, trousers, 'left pocket');
    expect(me.tierOf(key)).toBe('ready');
    expect(me.heldThings()).not.toContain(key);
  });

});
