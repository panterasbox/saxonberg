/**
 * ⭐ `query --ledger me:i` (the `i` / `inventory` aliases — size and
 * carrying W10h; the view walks the whole tree by tier, D28): in hand ·
 * ready (pockets, the belt and the room left along it, a satchel with what
 * is in it) · worn · packed (each pack as N things, M kg; a set that names
 * what is in it — `me:I` — opens it) · the burden in words. `--flat`,
 * `--weight`; narrowing is the query's (`me:i:held`); a container; a
 * person (what you perceive).
 */
import '../../../../../../test-bootstrap';
import { carry } from '../../../../../lib/slot/__tests__/carrying-fixture';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import QueryController from '../QueryController';
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
import { installShapes } from '../../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, hold, wornBag, wornGarment, pack, type Body } from '../../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff, withRootContext } from '../../../../../lib/security/__tests__/test-setup';
import { TestHarnessApi } from '../../../../../api/test-harness';

let said: string[];

function ctx(me: Body): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: me as never,
    location: makeStuff(() => new Place()) as never,
    commandText: 'query --ledger me:i', executionId: 't', commandId: 't', verb: 'query',
    command: CommandDefinition.fromYaml(`verbs: [query]\ncontroller: X\ndescription: d\n`, '<t>'),
  });
}

type Holder = Stuff & { getContents(): Stuff[]; getDeepContents(): Stuff[] };
/** `me:i` — what MQL names: the holder's own contents. */
const meI = (me: Body): Stuff[] => [...(me as unknown as Holder).getContents()];
/** `me:I` — the whole tree under the holder. */
const meDeep = (me: Body): Stuff[] => [...(me as unknown as Holder).getDeepContents()];

/** `query <options> <set>` with the set already bound (default `--ledger me:i`). */
const query = (me: Body, model: Record<string, unknown> = {}, set: Stuff[] = meI(me)): Promise<string> =>
  withRootContext(null, 'tiers.test', async () => {
    said = [];
    ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => makeStuff(() => new QueryController()).execute({ set: { stuff: set, raw: 'me:i' }, ledger: true, ...model } as never, ctx$)))(ctx(me));
    return said.join('\n');
  });

describe('query --ledger — yourself by tier (D28)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installShapes();
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
      { member: Placements.IN, name: 'left pocket', mouth: { width: 0.16, height: 0.05 }, volumeM3: 0.0015 },
    ]);
    const key = tool('key', 0.02, [0.06, 0.025, 0.003]);
    carry(me, key);
    ContainmentApi.move(key, coat, 'left pocket');
    return { me, plan, belt, rucksack };
  }

  it('the default view: in hand · ready · worn · packed, and the burden', async () => {
    const { me } = await kitted();
    const out = await query(me);
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

  it('⭐ a coat is worn with its pocket line under Ready; a pocketless shirt is worn, not a holder (W9)', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    await wornGarment(me, plan, 'shirt', 'torso');
    const coat = await wornGarment(me, plan, 'coat', 'torso', [
      { member: Placements.IN, name: 'left pocket', mouth: { width: 0.16, height: 0.05 }, volumeM3: 0.0015 },
    ]);
    const key = tool('key', 0.02, [0.06, 0.025, 0.003]);
    carry(me, key);
    ContainmentApi.move(key, coat, 'left pocket');
    expect(key.getContainer()).toBe(coat);
    const out = await query(me);
    expect(out).toMatch(/In your [^\n]*coat[^\n]*'s left pocket: [^\n]*key/);
    expect(out).toMatch(/Worn: [^\n]*shirt/);
    expect(out).toMatch(/Worn: [^\n]*coat/);
    // Neither garment is listed as a container of its own ("coat: empty").
    expect(out).not.toMatch(/shirt[^\n]*: empty/);
    expect(out).not.toMatch(/coat[^\n]*: empty/);
  });

  it('⭐ a set that names what is in a pack opens it (`me:I`, which `--all` was); narrowing is the query\'s', async () => {
    const { me, rucksack } = await kitted();
    expect(await query(me, {}, meDeep(me))).toMatch(/rucksack[^\n]*: [^\n]*map/);
    // `me:i:held` — the query narrows; the ledger groups what it named.
    const held = await query(me, {}, meI(me).filter((x) => x !== rucksack && /sword/.test(x.getPresentation())));
    expect(held).toMatch(/In hand: [^\n]*sword/);
    expect(held).not.toMatch(/Ready|Worn|Packed/);
  });

  it('`--flat` is one list of what the set names', async () => {
    const { me } = await kitted();
    const out = await query(me, { flat: true }, meDeep(me));
    expect(out).toMatch(/You have: /);
    for (const w of ['sword', 'compass', 'map', 'coin', 'key', 'belt']) expect(out).toContain(w);
    expect(out).not.toMatch(/Ready:/);
  });

  it('`--weight` gives each thing its mass and bulk — in the ledger, and as a list alone', async () => {
    const { me } = await kitted();
    expect(await query(me, { weight: true })).toMatch(/In hand: [^\n]*sword[^\n]*\(1\.2 kg/);
    expect(await query(me, { ledger: false, weight: true })).toMatch(/You have: [\s\S]*sword[^\n]*\(1\.2 kg/);
  });

  it('⭐ your own pack named by `rucksack:i`: the pack, opened, with what the set named (W10h-e)', async () => {
    const { me, rucksack } = await kitted();
    vi.spyOn(PerceptionApi, 'visibleContentsOf').mockImplementation((_v, t) => ({
      worn: [], held: [], carried: [...(t as Stuff & { getContents(): Stuff[] }).getContents()], shut: false,
    }));
    const out = await query(me, {}, [...(rucksack as unknown as Holder).getContents()]);
    expect(out).toMatch(/Packed:\n\s*[^\n]*rucksack[^\n]*: [^\n]*(map[^\n]*rope|rope[^\n]*map)/);
    expect(out).not.toMatch(/sword|satchel/);
  });

  it('a person: what you perceive on them', async () => {
    const { me } = await kitted();
    const { me: ruth } = makeBody();
    const lantern = tool('lantern', 1);
    ContainmentApi.move(lantern as never, ruth as never);
    vi.spyOn(PerceptionApi, 'visibleContentsOf').mockReturnValue({ worn: [], held: [lantern], carried: [], shut: false });
    const out = await query(me, {}, [lantern]);
    expect(out).toMatch(/Holding: [^\n]*lantern/);
    expect(PerceptionApi.visibleContentsOf).toHaveBeenCalledWith(me, ruth);
  });

  /**
   * ⭐ The browser walk: a body's other things read "In it: an aether
   * implant and a key" — a person (or a mule with its panniers) is not a
   * box. What a body has that is neither worn nor held, it is CARRYING.
   */
  it('⭐ a body carries — never "In it"', async () => {
    const { me } = await kitted();
    const { me: ruth } = makeBody();
    const lantern = tool('lantern', 1);
    ContainmentApi.move(lantern as never, ruth as never);
    vi.spyOn(PerceptionApi, 'visibleContentsOf').mockReturnValue({ worn: [], held: [], carried: [lantern], shut: false });
    const out = await query(me, {}, [lantern]);
    expect(out).toMatch(/── Carrying: [^\n]*lantern/);
    expect(out).not.toMatch(/In it:/);
  });

  it('⭐ the belt: what hangs from it and the room left, in words (D27 — once `i belt`)', async () => {
    const { me } = await kitted();
    const out = await query(me);
    expect(out).toMatch(/Hanging from your [^\n]*belt[^\n]*: [^\n]*pouch[^\n]*\. Room left: (plenty|one more pouch|a small thing|none)\./);
    expect(out).not.toMatch(/\d+(\.\d+)? m\b/);
  });
});
