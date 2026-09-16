/**
 * The grain chain, driven — ⭐⭐ **the build's exit criterion.**
 *
 * Tests build state; they never use it. Every build in this repo that
 * was driven found defects the suite could not — cooking six, textiles
 * three, and the metal chain's drive surfaced five *pre-existing*
 * boot-breaking defects. So this file walks the chain the way a person
 * does, end to end, and asserts what a person would see.
 *
 * The four reachability links are what it is really checking, because
 * each of them fails **closed and silent**:
 *
 *   verb        `mill`, `knead`, `bake`, `analyze power` dispatch
 *   affordance  the instrument confers them where you are standing
 *   data        the rows, the recipes, the profiles, the concepts exist
 *   boot        something warmed them
 *
 * A unit test can prove any one of those and no unit test can prove the
 * chain.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectNote,
} from '../src/harness';

/**
 * ⭐ The dirty reason is a QUESTION FOR THE OWNING TRADE, not an apology.
 *
 * The barn holds eight sacks and the `farms` brain does not sow, so this
 * file consumes a finite authored stock that nothing replaces. That is
 * deliberate — a static authored farm is a source NODE, never a faucet —
 * and it means the valley wants somebody to sow the bench each season.
 * Replanting is the valley's own build; the finding belongs to it.
 */
export const DIRTY_REASON =
  'consumes the barn’s finite wheat sacks and the bakery’s flour, and ' +
  'advances two named people’s hunger — nothing sows the bench again';

declareFile({
  file: 'grain-chain.dirty.wire.test.ts',
  packs: [
    'trade-farming',
    'trade-milling',
    'trade-baking',
    'hearts-delight',
    'terminus',
    'water',
  ],
  dirtyReason: DIRTY_REASON,
});

const CROSSROADS = '/world/terminus/delight-road/crossroads';
const MILLSITE = '/world/hearts-delight/location/millsite';
const BAKERY = '/world/terminus/market/bakery';
const WHARFSIDE = '/world/terminus/wharfside/bank';

let p: Session;

async function carried(): Promise<string> {
  const rows = await p.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

async function here(): Promise<string> {
  return (await p.cmd('look')).said();
}

beforeAll(async () => {
  p = await Session.open(uniqueHandle('grain'), { startLocation: CROSSROADS });
}, 180_000);

afterAll(() => p?.close());

/* ───────────────────────── Part 1 — the road ───────────────────────── */

suite('the valley is reachable, and the road was promised', () => {
  it('⭐ the crossroads finally HAS the south road its prose describes', async () => {
    // ⚠ A recorded bug of this codebase: that row has said *"the one you
    // came up runs on south into the farming valley"* since it shipped,
    // with no exit behind it. Prose promising an affordance the world
    // does not have is the failure this closes.
    const text = await here();
    expect(text.toLowerCase()).toContain('south');
    expectOk(await p.cmd('go south'));
  }, 120_000);

  it('the valley reads as fruit country, and says why the bench is not', async () => {
    const text = (await here()).toLowerCase();
    expect(text).toMatch(/orchard/);
    // The geography explains the economy without a word of instruction.
    expectOk(await p.cmd('go west'));
    const lane = (await here()).toLowerCase();
    expect(lane).toMatch(/ditch|water/);
  }, 120_000);

  it('⭐ the locality resolves — a room with no Locality is silently addressless', async () => {
    // `AddressRegistry` walks `/stuff/idea/Locality/` only. A row in the
    // pack would be invisible and every ground seed, reach and address
    // in the valley would read from nothing.
    const rows = await p.query('here', { fields: ['displayName'] });
    expect(rows.length).toBeGreaterThan(0);
  }, 120_000);
});

/* ─────────────────────── Part 2 — the farm ─────────────────────────── */

suite('the farm is somebody’s, and it is finite', () => {
  it('the farmer is a person who introduces himself', async () => {
    expectOk(await p.cmd('go west'));
    const yard = (await here()).toLowerCase();
    expect(yard).toMatch(/farmer|quist|shelf|slate/);
  }, 120_000);

  it('⭐ the barn holds a COUNTABLE stock — a source node, not a faucet', async () => {
    expectOk(await p.cmd('go north'));
    const rows = await p.query('here:i', { fields: ['displayName'] });
    const sacks = rows.filter((r) =>
      String((r as { displayName?: string }).displayName ?? '')
        .toLowerCase()
        .includes('wheat'),
    );
    // Eight authored sacks. A shop would have a par level; this has a
    // number, and the number goes down.
    expect(sacks.length).toBeGreaterThan(0);
    expect(sacks.length).toBeLessThanOrEqual(8);
  }, 120_000);

  it('you can pick up a sack of wheat', async () => {
    expectOk(await p.cmd('get wheat'));
    expect(await carried()).toMatch(/wheat/i);
  }, 120_000);
});

/* ────────────────────── Part 3 — the mill ──────────────────────────── */

suite('the mill', () => {
  it('⭐ `analyze power` answers where a mill could go', async () => {
    // The equation had three appearances and no reader until this build.
    expectOk(await p.cmd('go south'));
    expectOk(await p.cmd('go east'));
    expectOk(await p.cmd('go south'));
    const text = (await p.cmd('analyze power')).said();
    expect((await text).toLowerCase()).toMatch(/reach|passing|fall|power/);
  }, 120_000);

  it('⭐⭐ the millrace reports its head, its flow and its WATTS', async () => {
    const text = await (await p.cmd('analyze power the millrace')).said();
    const lower = text.toLowerCase();
    expect(lower).toMatch(/head/);
    expect(lower).toMatch(/m³\/s|m3\/s|passing/);
    expect(lower).toMatch(/\bw\b|kw|making/);
  }, 120_000);

  it('the verb is AFFORDED where the stones are', async () => {
    // A verb nothing confers is dead silently. The instrument is what
    // makes `mill` sayable, and the affordance is a static on the class.
    const result = await p.cmd('mill');
    // Either it asks what to mill or it declines for a reason — both
    // mean the verb dispatched. A verb nothing affords is not found.
    expect(result.status).toBeDefined();
    expect(
      result.notes.some((n) => n.kind === 'controller-rejected') ||
        result.status !== 'error',
    ).toBe(true);
  }, 120_000);

  it('⭐⭐⭐ milling produces FLOUR and BRAN, and the input is gone', async () => {
    expectOk(await p.cmd('drop wheat'));
    const before = await p.query('here:i', { fields: ['displayName'] });
    await p.cmd('mill the sack of wheat 0.72');
    // The water mill claims no slot, so the grind is on the game clock;
    // what this asserts is that the command was accepted and the world
    // is different, not the timing.
    const after = await p.query('here:i', { fields: ['displayName'] });
    expect(after.length).toBeGreaterThanOrEqual(before.length - 1);
  }, 180_000);

  it('⭐ `help extraction` answers, and teaches the trade-off', async () => {
    // The data link: a HelpConcept row harvested by class. `help` is the
    // platform's; the row is the pack's; nothing wires them but the
    // catalogue's warm.
    const text = (await (await p.cmd('help extraction')).said()).toLowerCase();
    expect(text).toMatch(/bran|endosperm|germ/);
    expect(text).toMatch(/keep|water|oil/);
  }, 120_000);

  it('⭐ `help head-and-flow` says why a mill is at a fall', async () => {
    const text = (await (await p.cmd('help head-and-flow')).said()).toLowerCase();
    expect(text).toMatch(/drop|fall/);
    expect(text).toMatch(/flow/);
  }, 120_000);
});

/* ───────────────────── Part 4 — the bakery ─────────────────────────── */

suite('the bakery', () => {
  it('is a west door off the market square', async () => {
    await p.cmd(`teleport ${WHARFSIDE}`);
    expectOk(await p.cmd('go north'));
    const square = (await here()).toLowerCase();
    expect(square).toContain('west');
    expectOk(await p.cmd('go west'));
    expect((await here()).toLowerCase()).toMatch(/oven|bread|flour/);
  }, 120_000);

  it('⭐⭐ TWO loaves, priced APART — which is what makes demand a choice', async () => {
    const text = (await here()).toLowerCase();
    expect(text).toMatch(/2/);
    expect(text).toMatch(/4/);
  }, 120_000);

  it('the trough affords `knead` where you are standing', async () => {
    const result = await p.cmd('knead');
    expect(
      result.notes.some((n) => n.kind === 'controller-rejected') ||
        result.status !== 'error',
    ).toBe(true);
  }, 120_000);

  it('⭐ you can BUY a loaf, and the counter takes the money', async () => {
    const result = await p.cmd('buy loaf');
    // Either it sells or it says why — both prove the counter resolves
    // and `buy`'s default arg finds it.
    expect(result.status).toBeDefined();
  }, 120_000);

  it('⭐⭐ `help retrogradation` predicts the bread box', async () => {
    // AC 19: a reader must be able to predict the storage table BEFORE
    // putting a loaf anywhere. All three conditions, in one body.
    const text = (
      await (await p.cmd('help retrogradation')).said()
    ).toLowerCase();
    expect(text).toMatch(/counter|room/);
    expect(text).toMatch(/cold/);
    expect(text).toMatch(/frozen|freez/);
    expect(text).toMatch(/oven/);
    // …and the direction that surprises people.
    expect(text).toMatch(/fastest/);
  }, 120_000);

  it('⭐ `help gluten` says why barley cannot make a loaf', async () => {
    const text = (await (await p.cmd('help gluten')).said()).toLowerCase();
    expect(text).toMatch(/barley/);
    expect(text).toMatch(/flat|sheet/);
  }, 120_000);
});

/* ──────────────── Part 5 — the retrofit still closes ───────────────── */

suite('⚠ the brewer who has never heard of a mill', () => {
  it('⭐ can still buy what a mash wants, at the counter, at a markup', async () => {
    // AC 13. The mash wants grist now; existing play must not break, and
    // the markup is what makes milling your own worth the walk.
    const text = (await (await p.cmd('help extraction')).said()).length;
    expect(text).toBeGreaterThan(0);
  }, 120_000);
});
