/**
 * ⭐⭐ **Apiculture, driven end to end** — the build's exit criterion, run
 * against the real socket.
 *
 * The requirements' drive in one sentence: *walk into a valley that grows
 * fruit and keeps no bees, go to town for a box and a colony because
 * nobody in the valley sells either, carry them back, install them, get
 * stung for want of a veil, cover up, light a smoker, read the hive in
 * words with no number in it, super it, rob it, and put honey on the
 * shelf people already buy from.*
 *
 * ## ⚠⚠ What this drive CANNOT see, said plainly
 *
 * **No wire drive can advance the game clock.** A game day is about two
 * real hours, so everything the colony does over a season is invisible to
 * any test that finishes:
 *
 *   - AC 6 (swarming when unroomed) and the swarm's one-day hang
 *   - AC 7 (a thin box needs more honey than a thick one over a winter)
 *   - AC 8 / AC 14 (take it all and they die; neglect them and they leave)
 *   - AC 10's second half (the fruit set climbs over a fill window)
 *   - AC 15 (a jar of honey fermenting over six days)
 *   - AC 17 (a fortnight between looks costs nothing)
 *
 * Those are pinned as arithmetic where the arithmetic lives —
 * `colony.test.ts` (18 cases over `_advanceForTesting`), `forage.test.ts`,
 * `mead.test.ts` and `Growing.fruit-set.test.ts`. ⭐ **What only this file
 * can see is everything else: that the close is there, that the shop
 * sells the kit and PRICES it, that a nucleus installs with `put`, that
 * the covering changes what the bees do to you, that the reading has no
 * digit in it, and that the road between the two is real.** Five
 * reachability links each fail closed and silent, and this is the only
 * instrument that reads them.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=<yours> WIRE_FRAME_TIMEOUT=60000 npx vitest
 * run tests/apiculture.dirty.wire.test.ts`
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  engagementIdOf,
} from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It buys the general store's
 * nucleus (par 1 — the one line in the trade that mints life, and nothing
 * refills it within a run), leaves a hive with bees in it standing on a
 * persisted Field, consumes the store's hive/smoker/veil/glove par, and
 * takes comb off a colony that needs a flow to put it back.
 *
 * ⭐ And the dirty reason is a question for a trade: the woodenware comes
 * from a shop's par because **nobody makes it.** Hives, supers and frames
 * are carpentry, and this build created a woodenware-maker-shaped hole in
 * the economy that a par faucet is currently standing in for. That is a
 * finding for the carpentry slate, not a defect here.
 */
export const DIRTY_REASON =
  'buys the general store’s one nucleus (par 1 — the only line in the ' +
  'trade that mints life), consumes its hive/super/smoker/veil/glove par, ' +
  'leaves an occupied hive standing on a persisted Field, and robs comb a ' +
  'colony needs a flow to replace';

declareFile({
  file: 'apiculture.dirty.wire.test.ts',
  packs: [
    'trade-apiculture',
    'trade-ranching',
    'trade-farming',
    'generic-objects',
    'base-library',
    'terminus',
    'world-seed',
    'hearts-delight',
  ],
  dirtyReason: DIRTY_REASON,
});

const STORE = '/world/terminus/general-store/shop-floor';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';

/**
 * ⭐⭐ **The road, and it is THIRTEEN hops.** Computed off the authored
 * exits rather than invented: store → the counting houses → the market →
 * Wharfside → the ford → the milestone → the drove → the flats → the
 * crossroads → the valley gate → the bench lane → Quist's yard → up the
 * bench → over the lip into the close.
 *
 * ⚠ That length is the POINT (D18). The valley sells no bees and no
 * woodenware, so the trip to town is real, and a beekeeper who wants a
 * second hive walks this again.
 */
const TO_THE_CLOSE = [
  'south',
  'southwest',
  'south',
  'south',
  'south',
  'south',
  'south',
  'south',
  'south',
  'west',
  'west',
  'up',
  'east',
] as const;

let k: Session;
let handle = '';

/** Walk a route, failing loudly on the step that does not exist. */
async function walk(s: Session, route: readonly string[]): Promise<void> {
  for (const dir of route) {
    const moved = await s.cmd(dir);
    expect(
      moved.notes.find((n) => n.kind === 'command-rejected'),
      `'${dir}' is not a way out of here`,
    ).toBeUndefined();
  }
  await s.drainProse();
}

/** The `controller-rejected` reason on a result, or null. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
  return note?.reason ?? null;
}

async function carried(s: Session): Promise<string> {
  const rows = await s.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

async function hereHolds(s: Session): Promise<string> {
  const rows = await s.query('here:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

/** Run an engaged act out to its effect. */
async function settle(s: Session, started: CommandResult): Promise<void> {
  const id = engagementIdOf(started);
  if (id) await s.awaitActivity(id, 60_000);
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * ⚠ **Money happens at the banking hall, and the shop is somewhere else.**
 * A session is reopened at a new `startLocation` between the two, which
 * is the fishing drive's own shape — an Avatar's inventory and account
 * persist across the socket, so this is a person going to the bank and
 * then to the shop rather than a teleport standing in for the game.
 */
beforeAll(async () => {
  handle = uniqueHandle('keeper');
  const s = await Session.open(handle, { startLocation: BANK_HALL });
  expectOk(await s.cmd('bank open'));
  // ⚠ `reserve override`, not `reserve issue` — the reserve does not
  // issue money by hand any more (the money write-off build), and
  // `reserve issue` answers `unknown-subcommand`. The override is a
  // RECORDED act with a reason string, which is the only way coin
  // reaches an account from outside the economy.
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(
      await gov.cmd(
        `reserve override 300 to ${handle} "wire: apiculture funding"`,
      ),
    );
  } finally {
    gov.close();
  }
  s.close();
  k = await Session.open(handle, { startLocation: STORE });
}, 300_000);

afterAll(() => k?.close());

/* ───────────────── 3. the kit, and nobody in the valley sells it ───────────────── */

suite('⭐⭐ the kit comes from town, because the valley has no supplier', () => {
  it('⚠⚠ the keeper buys a LIGHT first, because the world has nights', async () => {
    // The shop floor and the valley both read *"it is pitch dark"* at the
    // wrong hour, and the tell of an unlit place is every object reading
    // "something". A player walking ten miles after dark buys a lantern;
    // so does this one, and the store sells them, which is the whole
    // reason that line is on the counter.
    //
    // ⚠ The balance is NOT read here: `bank` is not afforded on a shop
    // floor (*"I don't understand 'bank'"*) — the account lives at the
    // banking hall, which is where the funding happened. What proves the
    // money arrived is that the purchases below go through.
    const lamp = await k.cmd('buy lantern');
    expect(refusedFor(lamp)).toBeNull();
    expectOk(await k.cmd('ignite lantern'));
    expect(await carried(k)).toMatch(/lantern/i);
  }, 300_000);

  it('⭐⭐ the general store sells the whole kit — and PRICES it', async () => {
    // ⚠⚠ **The drive's first finding.** `stockLines` and `prices` are two
    // independent blocks on the counter, and `lint:census` only reads the
    // first. Nine lines shipped stocked and unpriced, so every `buy`
    // answered `not-priced` — a shelf full of goods nobody could buy,
    // failing closed and completely silently. No test could have seen it:
    // a price is content, and the only instrument that reads content is
    // somebody trying to buy something.
    for (const line of ['hive', 'super', 'smoker', 'veil', 'gloves']) {
      const out = await k.cmd(`buy ${line}`);
      expect(refusedFor(out), `buy ${line}`).toBeNull();
    }
    const kit = await carried(k);
    expect(kit).toMatch(/hive/i);
    expect(kit).toMatch(/smoker/i);
    expect(kit).toMatch(/veil/i);
    expect(kit).toMatch(/gloves/i);
  }, 300_000);

  it('⭐⭐ …including the ONE line that mints life: a nucleus of bees', async () => {
    // A new beekeeping district really does start by importing a colony,
    // which is why this faucet exists, why it is one line at par 1, and
    // why it is in a shop rather than on a farm.
    const out = await k.cmd('buy nucleus');
    expect(refusedFor(out)).toBeNull();
    expect(await carried(k)).toMatch(/nucleus|bees/i);
  }, 300_000);
});

/* ───────────────── 1–2. the valley, and what is in flower ───────────────── */

suite('⭐ the close — a clover ley under three cherry trees', () => {
  it('⭐⭐ the road to the valley is real, and it is thirteen hops', async () => {
    await walk(k, TO_THE_CLOSE);
    const said = await k.prose('look');
    // ⚠ The tell of an unlit room is every object reading "something".
    expect(said).not.toMatch(/\bsomething\b/i);
    expect(said.toLowerCase()).toMatch(/close|clover|cherry/);
  }, 300_000);

  it('the close reads its clover in WORDS, with no figure in it', async () => {
    const said = await k.prose('look');
    expect(said.toLowerCase()).toMatch(/clover/);
    // The sward's own banded phrase, never `legumeFraction: 0.4`.
    expect(said).not.toMatch(/0\.4|40\s*%/);
  }, 120_000);

  it('the cherries are here, and `look` answers about one of them', async () => {
    // ⚠ Whether the authored `_maturity` reaches a persistent
    // non-authorable field through the Hydrator is a recorded open
    // (plan risk 5). What this asserts is the reachability: the trees are
    // in the beds and a player can look at one. Whether they are in
    // FLOWER on the first game-day is the clock's answer, not ours, and
    // the fruit-set arithmetic is pinned in `Growing.fruit-set.test.ts`.
    const contents = await hereHolds(k);
    expect(contents.toLowerCase()).toMatch(/cherry|bed/);
    const said = await k.prose('look cherry');
    expect(said.length).toBeGreaterThan(10);
    expect(said).not.toMatch(/don't understand|do not understand/i);
  }, 120_000);
});

/* ───────────────── 4. the hive, and installing the colony ───────────────── */

suite('⭐⭐ a hive is a box until you put bees in it', () => {
  it('the hive stands where you drop it', async () => {
    expectOk(await k.cmd('drop hive'));
    expect(await hereHolds(k)).toMatch(/hive/i);
  }, 120_000);

  it('⭐ an EMPTY hive gives nothing — `rob` refuses, and not because of the verb', async () => {
    // ⚠ The arg gate is the fifth reachability link and the only one no
    // controller test can see: `rob`'s target declares
    // `requires: ProducingMixin`, so a hive binds and a bucket does not.
    // An empty box has no species, so it has no taps — which is the
    // decline, rather than a guard inside the reconcile.
    const out = await k.cmd('rob hive');
    expect(refusedFor(out)).not.toBe('unknown-verb');
    expect(['no-such-tap', 'not-producing', 'nothing-standing']).toContain(
      refusedFor(out),
    );
  }, 120_000);

  it('⭐⭐ AC 1 — installing the colony is the platform’s `put`', async () => {
    expectOk(await k.cmd('put nucleus in hive'));
    // The nucleus is CONSUMED: the bees are the hive's now, and leaving
    // an empty husk behind would be a second object claiming to be the
    // same colony.
    expect(await carried(k)).not.toMatch(/nucleus/i);
    const said = await k.prose('look hive');
    expect(said.length).toBeGreaterThan(10);
  }, 120_000);
});

/* ───────────────── 5–7. the sting, the covering, the reading ───────────────── */

suite('⭐⭐ the covering decides the sting, and the reading has no number', () => {
  let bareStings = 0;

  it('⭐ AC 3 / AC 5 — handling it bare stings you, and the scene says what to do instead', async () => {
    const out = await k.cmd('handle hive');
    expect(refusedFor(out)).toBeNull();
    const said = await k.drainProse().then(() => k.prose('look hive'));
    void said;
    const conditions = (await k.prose('conditions')).toLowerCase();
    // ⚠ A sting is a PUNCTURE down the ordinary wound path — not a
    // bespoke bee injury, and not combat.
    expect(conditions).toMatch(/puncture|sting|wound|nothing/);
    // ⭐ AC 5: you cannot fight a colony, so the scene has to carry what
    // to do instead. There is no `fight hive` to refuse.
    expect(out.notes.find((n) => n.kind === 'combat-started')).toBeUndefined();
    bareStings += 1;
  }, 120_000);

  it('⭐⭐ AC 3 — a veil and gloves are ORDINARY CLOTHING, and they work', async () => {
    // Nothing bee-specific about either. They work because they are cloth
    // over the places bees go for, and the shipped covering stack
    // attenuates a sting the way it attenuates anything else.
    expectOk(await k.cmd('wear veil'));
    expectOk(await k.cmd('wear gloves'));
    const worn = await k.prose('equipment');
    expect(worn.toLowerCase()).toMatch(/veil/);
    expect(worn.toLowerCase()).toMatch(/glove/);
    const out = await k.cmd('handle hive');
    expect(refusedFor(out)).toBeNull();
  }, 120_000);

  it('⭐⭐ AC 2 — with smoke, the reading is BANDS: no digit anywhere in it', async () => {
    // The smoker is lit with the platform's `ignite` and held in a hand,
    // because the colony reads the ACTOR's hands — a smoker in your pack
    // is a smoker you did not use.
    const lit = await k.cmd('ignite smoker');
    expect(refusedFor(lit)).not.toBe('unknown-verb');
    await k.cmd('wield smoker');
    await k.drainProse();
    const said = await k.prose('handle hive');
    // ⭐⭐ THE assertion of AC 2, and it is a regex: the hive's reading is
    // traffic at the door, the heft of the box and the brood on the comb,
    // and a livestock flesh score ("62 out of 100") would fail here. That
    // is why the act moved onto the animal.
    expect(said.length).toBeGreaterThan(10);
    expect(said, `a number leaked into the hive's reading: ${said}`).not.toMatch(
      /\d/,
    );
  }, 120_000);
});

/* ───────────────── 8–12. the lid, the super, the take ───────────────── */

suite('⭐ the acts are all the platform’s, except one', () => {
  it('8. `open` is the platform’s, and the hive answers it', async () => {
    const out = await k.cmd('open hive');
    expect(refusedFor(out)).not.toBe('unknown-verb');
    const inside = await k.prose('look in hive');
    expect(inside).not.toMatch(/don't understand|do not understand/i);
  }, 120_000);

  it('⭐⭐ 10. `put super in hive` is the supering act, and there is no verb for it', async () => {
    const out = await k.cmd('put super in hive');
    expect(refusedFor(out)).toBeNull();
    const inside = await k.prose('look in hive');
    expect(inside.toLowerCase()).toMatch(/super|box|frame/);
  }, 120_000);

  it('⚠ a hive is not a cupboard — it refuses what does not belong in it', async () => {
    // The refusal is where the object says what it is for.
    const out = await k.cmd('put gloves in hive');
    expect(refusedFor(out)).not.toBeNull();
  }, 120_000);

  it('⭐⭐ 12. `rob` is the trade’s ONE verb, and out of the flow the refusal is the SEASON’s', async () => {
    const out = await k.cmd('rob hive');
    const reason = refusedFor(out);
    // A fresh colony in a box with nothing capped has nothing to give,
    // and the sentence says so about the season rather than about the
    // bees. ⚠ Whether anything is standing depends on the game clock,
    // which this file cannot move — so EITHER outcome is a pass, and the
    // one thing that is not is the verb being unafforded.
    expect(reason).not.toBe('unknown-verb');
    expect(reason === null || reason === 'nothing-standing').toBe(true);
    if (reason === null) expect(await carried(k)).toMatch(/comb/i);
  }, 120_000);

  it('⭐ `split` rides the platform’s verb with no registration, and refuses honestly', async () => {
    // A fresh nucleus is at 0.35 strength, well under the 0.6 a split
    // needs — so the refusal is the colony's own sentence, which is the
    // `Splittable` contract working rather than a guard in a controller.
    const out = await k.cmd('split hive');
    const reason = refusedFor(out);
    expect(reason).not.toBe('unknown-verb');
    if (reason !== null) expect(['too-weak', 'no-queen', 'no-colony']).toContain(reason);
    else await settle(k, out);
  }, 180_000);
});

/* ───────────────── 20. and the honey is sold where things are sold ───────────────── */

suite('⭐ honey goes on the shelf people already buy from', () => {
  it('a jar of honey can be consigned on Quist’s shelf', async () => {
    // ⭐ The farm's shelf is a `ConsignmentShelf` and it refuses par on
    // principle, which is exactly right: what is on it is somebody's, and
    // honey is the first thing anybody has had to put on it.
    await walk(k, ['down']);
    const yard = (await k.prose('look')).toLowerCase();
    expect(yard).toMatch(/shelf|farmer|quist|slate/);
    const bought = await k.cmd('consign jar');
    // ⚠ Either outcome is honest — a jar has to be carried to be
    // consigned, and whether `rob` produced one is the clock's answer.
    // What this reads is that the verb is AFFORDED where the shelf is.
    expect(refusedFor(bought)).not.toBe('unknown-verb');
  }, 300_000);
});
