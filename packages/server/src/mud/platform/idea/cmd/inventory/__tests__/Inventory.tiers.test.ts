/**
 * ⭐ `inventory` walks the whole tree by tier (size and carrying D28): in
 * hand · ready (pockets, the belt, a satchel with what is in it) · worn ·
 * packed (each pack as N things, M kg; `--all` opens it) · the burden in
 * words. `--flat`, `--weight`, one section by name; a container; a person
 * (what you perceive); `i belt` with the room left in words.
 */
import '../../../../../../test-bootstrap';
import { carry } from '../../../../../lib/slot/__tests__/carrying-fixture';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import InventoryController from '../InventoryController';
import { ContainmentApi } from '../../../../../api/containment';
import { StuffApi } from '../../../../../api/stuff';
import { MessageApi } from '../../../../../api/message';
import { PerceptionApi } from '../../../../../api/perception';
import type { Mml } from '../../../../../api/mml';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Placements } from '../../../../../lib/spatial/Placement';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import Place from '../../../../../lib/stuff/Place';
import Location from '../../../../../lib/location/Location';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms } from '../../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, hold, wornBag, wornGarment, pack, type Body } from '../../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff, withRootContext } from '../../../../../lib/security/__tests__/test-setup';

let said: string[];

function ctx(me: Body): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: me as never,
    location: makeStuff(() => new Place()) as never,
    commandText: 'inventory', executionId: 't', commandId: 't', verb: 'inventory',
    command: CommandDefinition.fromYaml(`verbs: [inventory]\ncontroller: X\ndescription: d\n`, '<t>'),
  });
}

const inventory = (me: Body, model: Record<string, unknown> = {}): Promise<string> =>
  withRootContext(null, 'tiers.test', async () => {
    said = [];
    makeStuff(() => new InventoryController()).execute(model as never, ctx(me));
    return said.join('\n');
  });

describe('inventory — by tier (D28)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
    said = [];
    // Everything on your own body is perceived; the test is the grouping.
    vi.spyOn(PerceptionApi, 'perceived').mockImplementation((_v, xs) => [...xs]);
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.meta = () => b;
      b.toSelf = (m: Mml) => { said.push(m.toString()); return b; };
      b.toPeers = () => b;
      b.send = () => {};
      return b as never;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function kitted() {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    hold(me, plan, tool('sword', 1.2));
    const satchel = wornBag(me, plan, 'satchel', 'torso');
    ContainmentApi.move(tool('compass', 0.2), satchel);
    const rucksack = wornBag(me, plan, 'rucksack', 'back');
    ContainmentApi.move(tool('map', 0.1), rucksack);
    ContainmentApi.move(tool('rope', 2), rucksack);
    const belt = await wornGarment(me, plan, 'belt', 'waist', [Placements.FROM]);
    const pouch = pack('pouch', 0.1, [0.12, 0.05, 0.12]);
    carry(me, pouch);
    ContainmentApi.move(pouch, belt, Placements.FROM);
    ContainmentApi.move(tool('coin', 0.01), pouch);
    const coat = await wornGarment(me, plan, 'coat', 'torso', [
      { member: Placements.POCKET, name: 'left pocket', mouth: { width: 0.16, height: 0.05 }, volumeM3: 0.0015 },
    ]);
    const key = tool('key', 0.02, [0.06, 0.025, 0.003]);
    carry(me, key);
    ContainmentApi.move(key, coat, 'left pocket');
    return { me, plan, belt, rucksack };
  }

  it('the default view: in hand · ready · worn · packed, and the burden', async () => {
    const { me } = await kitted();
    const out = await inventory(me);
    expect(out).toMatch(/In hand: [^\n]*sword/);
    expect(out).toMatch(/Ready:/);
    expect(out).toMatch(/In your [^\n]*coat[^\n]*'s left pocket: [^\n]*key/);
    expect(out).toMatch(/Hanging from your [^\n]*belt[^\n]*: [^\n]*pouch/);
    expect(out).toMatch(/pouch[^\n]*: [^\n]*coin/);
    expect(out).toMatch(/satchel[^\n]*: [^\n]*compass/);
    expect(out).toMatch(/Worn: [^\n]*belt/);
    expect(out).toMatch(/Packed:\n\s*[^\n]*rucksack[^\n]*: 2 things, 2\.1 kg/);
    expect(out).not.toMatch(/map/);
    // The order is the tier order.
    expect(out.indexOf('In hand')).toBeLessThan(out.indexOf('Ready'));
    expect(out.indexOf('Ready')).toBeLessThan(out.indexOf('Worn'));
    expect(out.indexOf('Worn')).toBeLessThan(out.indexOf('Packed'));
  });

  it('`--all` opens the packs; `--packed` is that section alone', async () => {
    const { me } = await kitted();
    expect(await inventory(me, { all: true })).toMatch(/rucksack[^\n]*: [^\n]*map/);
    const packed = await inventory(me, { packed: true });
    expect(packed).toMatch(/map/);
    expect(packed).not.toMatch(/In hand|Ready|Worn/);
  });

  it('`--flat` is one list of everything', async () => {
    const { me } = await kitted();
    const out = await inventory(me, { flat: true });
    expect(out).toMatch(/You have: /);
    for (const w of ['sword', 'compass', 'map', 'coin', 'key', 'belt']) expect(out).toContain(w);
    expect(out).not.toMatch(/Ready:/);
  });

  it('`--weight` gives each thing its mass and bulk', async () => {
    const { me } = await kitted();
    expect(await inventory(me, { held: true, weight: true })).toMatch(/sword[^\n]*\(1\.2 kg/);
  });

  it('a container lists what is in it', async () => {
    const { me, rucksack } = await kitted();
    vi.spyOn(PerceptionApi, 'visibleContentsOf').mockImplementation((_v, t) => ({
      worn: [], held: [], carried: [...(t as Stuff & { getContents(): Stuff[] }).getContents()], shut: false,
    }));
    const out = await inventory(me, { target: { stuff: rucksack, raw: 'rucksack' } });
    expect(out).toMatch(/In it: [^\n]*map[^\n]*rope|In it: [^\n]*rope[^\n]*map/);
  });

  it('a person: what you perceive on them', async () => {
    const { me } = await kitted();
    const { me: ruth } = makeBody();
    vi.spyOn(PerceptionApi, 'visibleContentsOf').mockReturnValue({ worn: [], held: [tool('lantern', 1)], carried: [], shut: false });
    const out = await inventory(me, { target: { stuff: ruth, raw: 'ruth' } });
    expect(out).toMatch(/Holding: [^\n]*lantern/);
    expect(PerceptionApi.visibleContentsOf).toHaveBeenCalledWith(me, ruth);
  });

  it('`i belt`: what hangs from it and the room left, in words', async () => {
    const { me, belt } = await kitted();
    const out = await inventory(me, { target: { stuff: belt, raw: 'belt' } });
    expect(out).toMatch(/Hanging from it: [^\n]*pouch/);
    expect(out).toMatch(/Room left: (plenty|one more pouch|a small thing|none)\./);
    expect(out).not.toMatch(/\d+(\.\d+)? m\b/);
  });
});
