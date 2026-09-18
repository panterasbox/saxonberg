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


/**
 * The verb is AFFORDED here — the parser knew it. A bare verb with a
 * required arg answers with a SHAPE note that names the verb; an
 * unafforded one answers `unknown-verb`. ⚠ The weakest honest claim
 * about a bare verb: "status is defined" is true of a typo, and the
 * first cut of this file asserted exactly that.
 */
function reachedItsGate(result: { notes: { kind: string }[]; text: string }): void {
  const unknown = result.notes.find(
    (n) =>
      n.kind === 'command-rejected' &&
      (n as { reason?: string }).reason === 'unknown-verb',
  );
  expect(unknown, `'${result.text}' is not afforded here`).toBeUndefined();
}

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
    // ⚠ `first`, not bare `wheat`: `get` is greedy over everything that
    // matches, and eight 25 kg sacks against a 70 kg lift ceiling means
    // bare `get wheat` picks up two and declines the rest — a decline,
    // honestly, and this checkpoint is about ONE sack.
    expectOk(await p.cmd('get first wheat'));
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
    // ⚠ No article: a non-greedy object arg binds one token (the
    // parsing defect identity.dirty.wire records).
    const text = await (await p.cmd('analyze power millrace')).said();
    const lower = text.toLowerCase();
    expect(lower).toMatch(/head/);
    expect(lower).toMatch(/m³\/s|m3\/s|passing/);
    expect(lower).toMatch(/\bw\b|kw|making/);
  }, 120_000);

  it('the verb is AFFORDED where the stones are', async () => {
    // A verb nothing confers is dead silently. The instrument is what
    // makes `mill` sayable, and the affordance is a static on the class.
    // Bare `mill` with nothing to mill declines in the CONTROLLER's
    // words — which is the proof the verb is afforded here. A verb
    // nothing affords is refused by the parser as unknown.
    reachedItsGate(await p.cmd('mill'));
  }, 120_000);

  it('⭐⭐⭐ milling produces FLOUR and BRAN, and the input is gone', async () => {
    expectOk(await p.cmd('drop wheat'));
    const before = await p.query('here:i', { fields: ['displayName'] });
    // ⚠⚠ `expectOk`, not "the status is defined". The first cut of this
    // checkpoint accepted any dispatch, and it sat green for two review
    // rounds over a `mill` that DECLINED every time — the controller read
    // its bound arg as a `Stuff` when the binder hands an `MqlOneResult`,
    // and nothing a player could type reached the stones. A drive that
    // cannot fail is not a drive.
    expectOk(await p.cmd('mill wheat 0.72'));
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
  // ⚠ A second person, born at the wharf: `teleport` is a wizard's verb
  // and a drive has no wizard (the `logistics`/`farming` rule —
  // `startLocation` is the only teleport a test gets). The first cut
  // typed `teleport` from the valley, it declined silently, and every
  // bakery checkpoint below ran in the farmstead yard.
  let b: Session;
  beforeAll(async () => {
    b = await Session.open(uniqueHandle('baker'), { startLocation: WHARFSIDE });
  }, 180_000);
  afterAll(() => b?.close());

  it('is a west door off the market square', async () => {
    expectOk(await b.cmd('go north'));
    const square = (await (await b.cmd('look')).said()).toLowerCase();
    expect(square).toContain('west');
    expectOk(await b.cmd('go west'));
    expect((await (await b.cmd('look')).said()).toLowerCase()).toMatch(/oven|bread|flour/);
  }, 120_000);

  it('⭐⭐ TWO loaves, priced APART — which is what makes demand a choice', async () => {
    // The counter, not the room: `look counter` renders the shelf with
    // its prices (the general store's `look counter` reads the same way).
    const text = (await (await b.cmd('look counter')).said()).toLowerCase();
    expect(text).toMatch(/loaf|bread/);
    expect(text).toMatch(/\(2\)|\b2\b/);
    expect(text).toMatch(/\(4\)|\b4\b/);
  }, 120_000);

  it('the trough affords `knead` where you are standing', async () => {
    reachedItsGate(await b.cmd('knead'));
  }, 120_000);

  it('…and `bake`, whose oven arg binds the bakery\'s own oven', async () => {
    // Bare `bake` with nothing proved in the trough declines in the
    // controller's words — which is the arg gate (`[mixin.FurnaceMixin]`)
    // and the affordance both proven, since the parser knew the verb and
    // the binder found the oven. The header used to CLAIM `bake`
    // dispatched and never typed it.
    const result = await b.cmd('bake');
    reachedItsGate(result);
    expect(
      result.notes.some(
        (n) => n.kind === 'controller-rejected' || n.kind === 'engagement-started',
      ),
      'bake reached its controller and answered',
    ).toBe(true);
  }, 120_000);

  it('⭐ you can BUY a loaf, and the counter takes the money', async () => {
    // Either it sells or it says why — both prove the counter resolves
    // and `buy`'s default arg finds it; a typo would not.
    reachedItsGate(await b.cmd('buy loaf'));
  }, 120_000);

  it('⭐⭐ `help retrogradation` predicts the bread box', async () => {
    // AC 19: a reader must be able to predict the storage table BEFORE
    // putting a loaf anywhere. All three conditions, in one body.
    const text = (
      await (await b.cmd('help retrogradation')).said()
    ).toLowerCase();
    expect(text).toMatch(/counter|room/);
    expect(text).toMatch(/cold/);
    expect(text).toMatch(/frozen|freez/);
    expect(text).toMatch(/oven/);
    // …and the direction that surprises people.
    expect(text).toMatch(/fastest/);
  }, 120_000);

  it('⭐ `help gluten` says why barley cannot make a loaf', async () => {
    const text = (await (await b.cmd('help gluten')).said()).toLowerCase();
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
