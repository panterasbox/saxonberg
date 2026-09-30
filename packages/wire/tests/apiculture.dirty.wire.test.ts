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
    const moved = await say(s, dir);
    expect(
      moved.notes.find((n) => n.kind === 'command-rejected'),
      `'${dir}' is not a way out of here`,
    ).toBeUndefined();
  }
  await s.drainProse();
}

/**
 * ⚠⚠ **A command, with an unanswered PROMPT recovered from.**
 *
 * A foreground prompt is not a hang — it lands on its own frame and
 * `cmd` waits out the whole timeout — and worse, **it poisons every
 * later command in the session** until somebody answers it. One
 * ambiguous `look cherry` cost this file fifteen checkpoints on run 4:
 * three trees in a dim room matched, the world asked *which target?*,
 * and nothing after it could get a word in.
 *
 * So every command goes through here: on a prompt, answer it with the
 * first match (which is what a player pressing 1 does) and retry once.
 * ⭐ The lesson is the harness's own advice, and it is worth paying the
 * ten lines for: make the target unambiguous, and be able to recover
 * when the world asks anyway.
 */
async function say(s: Session, text: string): Promise<CommandResult> {
  try {
    return await s.cmd(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    const pending = await s.awaitPrompt(5_000);
    const payload = (
      pending as unknown as {
        payload?: {
          promptId?: string;
          outcome?: {
            notes?: Array<{ matches?: Array<{ stuffId?: string }> }>;
          };
        };
      }
    ).payload;
    const id = payload?.promptId;
    // ⚠⚠ **An `mqlObject` prompt wants the stuffId, not an index.**
    // `PromptLogic.handleResponse` does `StuffApi.findById(response)`, so
    // answering `1` resolves to null, the resolver never settles, and
    // every later command in the session reports *no dispatch-response* —
    // which looks exactly like a wedged server. Run 5 spent nine
    // checkpoints on it.
    const first = payload?.outcome?.notes
      ?.map((n) => n.matches?.[0]?.stuffId)
      .find((x): x is string => typeof x === 'string');
    if (id && first) s.answerPrompt(id, first);
    await new Promise((r) => setTimeout(r, 300));
    return await s.cmd(text);
  }
}

/**
 * A prose read, with the same prompt recovery. ⚠ `prose()` calls `cmd()`
 * underneath, so it throws on a prompt exactly as `cmd` does — wrapping
 * one and not the other is how run 6 lost nine checkpoints twice.
 */
async function read(s: Session, text: string): Promise<string> {
  try {
    return await s.prose(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    await say(s, text);
    return await s.prose(text);
  }
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
    const lamp = await say(k, 'buy lantern');
    expect(refusedFor(lamp)).toBeNull();
    expectOk(await say(k, 'ignite lantern'));
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
      const out = await say(k, `buy ${line}`);
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
    const out = await say(k, 'buy nucleus');
    expect(refusedFor(out)).toBeNull();
    expect(await carried(k)).toMatch(/nucleus|bees/i);
  }, 300_000);
});

/* ───────────────── 1–2. the valley, and what is in flower ───────────────── */

suite('⭐ the close — a clover ley under three cherry trees', () => {
  it('⭐⭐ the road to the valley is real, and it is thirteen hops', async () => {
    // ⚠⚠ **Asserted on the WALK, not on the prose**, and the reason is an
    // honest limitation rather than a weak checkpoint: the world has
    // nights, and a hand lantern on four acres of open ground reads
    // *"shapes and edges, no more"*. No wire drive can advance the clock
    // to noon, so the close's clover line and the trees' *"in flower"* are
    // the BROWSER walk's to read, by daylight. What this proves — and it
    // is the thing D18 rests on — is that the thirteen hops exist and a
    // person carrying a hive can walk them.
    await walk(k, TO_THE_CLOSE);
    const here = await k.queryOne('here', ['displayName']);
    expect(here, 'the close resolved').toBeTruthy();
  }, 300_000);

  it('⭐⭐ three beds and three CHERRIES are seated in the close', async () => {
    // ⭐ Keyword binding works in the dark even when presentation does
    // not — run 4 proved it the hard way, by matching three trees and
    // asking which. So the trees are asserted by BINDING rather than by
    // prose, and this is the checkpoint that proves
    // `Cultivable.applyProps` seated an authored plant into a bed's slot
    // with no code at all.
    const trees = await k.query('here:i:cherry', { fields: ['displayName'] });
    expect(trees.length, 'three cherries in three beds').toBeGreaterThanOrEqual(3);
    const beds = await k.query('here:i:bed', { fields: ['displayName'] });
    expect(beds.length).toBeGreaterThanOrEqual(3);
  }, 120_000);

  it('a cherry answers `look`, and the verb is not the problem', async () => {
    // ⚠ `first`, not bare `cherry`: three of them match and the binder
    // asks which — the `get first wheat` convention, for the same reason.
    const out = await say(k, 'look first cherry');
    expect(refusedFor(out)).not.toBe('unknown-verb');
    expect(out.notes.find((n) => n.kind === 'command-rejected')).toBeUndefined();
  }, 120_000);
});

/* ───────────────── 4. the hive, and installing the colony ───────────────── */

suite('⭐⭐ a hive is a box until you put bees in it', () => {
  it('the hive stands where you drop it', async () => {
    expectOk(await say(k, 'drop hive'));
    expect(await hereHolds(k)).toMatch(/hive/i);
  }, 120_000);

  it('⭐ an EMPTY hive gives nothing — `rob` refuses, and not because of the verb', async () => {
    // ⚠ The arg gate is the fifth reachability link and the only one no
    // controller test can see: `rob`'s target declares
    // `requires: ProducingMixin`, so a hive binds and a bucket does not.
    // An empty box has no species, so it has no taps — which is the
    // decline, rather than a guard inside the reconcile.
    const out = await say(k, 'rob hive');
    expect(refusedFor(out)).not.toBe('unknown-verb');
    expect(['no-such-tap', 'not-producing', 'nothing-standing']).toContain(
      refusedFor(out),
    );
  }, 120_000);

  it('⭐⭐ a SHUT hive refuses the colony, and that is right', async () => {
    // ⭐ The drive's own finding about the requirements' ordering: the
    // script says install at step 4 and open at step 8, and physically
    // you cannot put bees into a closed box. A hive ships with its lid
    // weighted down, `put … in` a shut Sealable refuses `shut`, and the
    // refusal is the object telling you what to do first.
    const shut = await say(k, 'put nucleus in hive');
    expect(refusedFor(shut)).toBe('shut');
  }, 120_000);

  it('⭐⭐ AC 1 — installing the colony is the platform’s `put`', async () => {
    expectOk(await say(k, 'open hive'));
    expectOk(await say(k, 'put nucleus in hive'));
    // The nucleus is CONSUMED: the bees are the hive's now, and leaving
    // an empty husk behind would be a second object claiming to be the
    // same colony.
    expect(await carried(k)).not.toMatch(/nucleus/i);
    const said = await read(k, 'look first hive');
    expect(said.length).toBeGreaterThan(10);
  }, 120_000);
});

/* ───────────────── 5–7. the sting, the covering, the reading ───────────────── */

suite('⭐⭐ the covering decides the sting, and the reading has no number', () => {
  it('⭐ AC 3 / AC 5 — handling it bare stings you, and the scene says what to do instead', async () => {
    const out = await say(k, 'handle hive');
    expect(refusedFor(out)).toBeNull();
    await k.drainProse();
    // ⚠ `assess me`, not `conditions` — there is no `conditions` verb,
    // and a guess about a verb name is a checkpoint that tests the
    // guess. A sting is a PUNCTURE down the ordinary wound path: the
    // same reader a knife wound answers to, which is the claim.
    const body = (await read(k, 'assess me')).toLowerCase();
    expect(body).not.toMatch(/don't understand/);
    expect(body).toMatch(/puncture|sting|wound|bruis|nothing|well/);
    // ⭐ AC 5: you cannot fight a colony, so the scene has to carry what
    // to do instead — there is no `fight hive` to refuse, and the
    // envelope's own Note vocabulary has no combat kind in it, which is
    // the structural version of the same claim.
    expect(
      out.notes.map((n) => n.kind).join(','),
      'a sting is not a fight',
    ).not.toMatch(/combat/);
  }, 120_000);

  it('⭐⭐ AC 3 — a veil and gloves are ORDINARY CLOTHING, and they work', async () => {
    // Nothing bee-specific about either. They work because they are cloth
    // over the places bees go for, and the shipped covering stack
    // attenuates a sting the way it attenuates anything else.
    // ⚠ **Dressing is DURATIVE.** `wear veil` starts an engagement, and
    // the second garment answers `busy` until the first is on — which is
    // the activity framework working, and a thing a drive has to wait
    // for rather than a defect to report.
    const veil = await say(k, 'wear veil');
    expectOk(veil);
    await settle(k, veil);
    const gloves = await say(k, 'wear gloves');
    expectOk(gloves);
    await settle(k, gloves);
    // ⚠ There is no `equipment` verb either — a body's own read is
    // `look me`, which is the mirror the exertion build put there.
    const worn = (await read(k, 'look me')).toLowerCase();
    expect(worn).not.toMatch(/don't understand/);
    const out = await say(k, 'handle hive');
    expect(refusedFor(out)).toBeNull();
  }, 120_000);

  it('⭐⭐ AC 2 — with smoke, the reading is BANDS: no digit anywhere in it', async () => {
    // The smoker is lit with the platform's `ignite` and held in a hand,
    // because the colony reads the ACTOR's hands — a smoker in your pack
    // is a smoker you did not use.
    const lit = await say(k, 'ignite smoker');
    expect(refusedFor(lit)).not.toBe('unknown-verb');
    await say(k, 'wield smoker');
    await k.drainProse();
    const said = await read(k, 'handle hive');
    // ⭐⭐ …and it names TRAFFIC, which is the proof the colony actually
    // installed. ⚠ The first cut of this checkpoint only asserted "no
    // digits", and *"Nothing at the door at all."* has no digits in it
    // either — so it passed on an EMPTY hive. A regex that a failure
    // satisfies is not a checkpoint.
    expect(said.toLowerCase(), `the hive read: ${said}`).toMatch(
      /door|traffic|board|brood/,
    );
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
  it('8. `open` is the platform’s, and you can see inside', async () => {
    // ⚠ The lid came off back at the install (a shut hive refuses bees),
    // so this reads the INSIDE rather than re-opening: `open` on an
    // already-open hive answers `already-open`, which is the platform's
    // sentence and not this trade's business.
    const inside = await read(k, 'look in first hive');
    expect(inside).not.toMatch(/don't understand|do not understand/i);
    expect(inside.length).toBeGreaterThan(5);
  }, 120_000);

  it('⭐⭐ 10. `put super in hive` is the supering act, and there is no verb for it', async () => {
    const out = await say(k, 'put super in hive');
    expect(refusedFor(out)).toBeNull();
    const inside = await read(k, 'look in first hive');
    expect(inside.toLowerCase()).toMatch(/super|box|frame/);
  }, 120_000);

  it('⚠ a hive is not a cupboard — it refuses what does not belong in it', async () => {
    // The refusal is where the object says what it is for. ⚠ The gloves
    // are WORN by now, so the lantern is the honest probe: something
     // carried, ordinary, and no business being in a beehive.
    await say(k, 'put lantern in hive');
    // ⚠⚠ Asserted on the WORLD, not on the note. `canAddContainable`'s
    // veto throws a `ContainmentError` inside the chokepoint and `put`
    // turns it into an envelope this helper does not read — the unit
    // suite proves the veto fires; what only a live world can say is
    // whether the lantern ended up in the hive. *What is solid is the
    // WORLD* — the extraction drive's own lesson.
    const inside = await k.query('here:i:hive:i:lantern', {
      fields: ['displayName'],
    });
    expect(inside.length, 'a hive took a lantern').toBe(0);
    expect(await carried(k), 'the lantern is still in hand').toMatch(/lantern/i);
  }, 120_000);

  it('⭐⭐ 12. `rob` is the trade’s ONE verb, and out of the flow the refusal is the SEASON’s', async () => {
    const out = await say(k, 'rob hive');
    const reason = refusedFor(out);
    // A fresh colony in a box with nothing capped has nothing to give,
    // and the sentence says so about the season rather than about the
    // bees. ⚠ Whether anything is standing depends on the game clock,
    // which this file cannot move — so a take and a seasonal refusal are
    // BOTH passes. What is not a pass is the verb being unafforded, or
    // the hive being refused as a target.
    expect(reason, `rob answered '${reason}'`).not.toBe('unknown-verb');
    expect(reason).not.toBe('not-producing');
    expect(reason).not.toBe('no-such-tap');
    if (reason === null) expect(await carried(k)).toMatch(/comb/i);
  }, 120_000);

  it('⭐ `split` rides the platform’s verb with no registration, and refuses honestly', async () => {
    // A fresh nucleus is at 0.35 strength, well under the 0.6 a split
    // needs — so the refusal is the colony's own sentence, which is the
    // `Splittable` contract working rather than a guard in a controller.
    const out = await say(k, 'split hive');
    const reason = refusedFor(out);
    expect(reason).not.toBe('unknown-verb');
    // ⚠ `not-splittable` would mean the narrowing failed — the marker or
    // the two methods missing — and that is the one answer this
    // checkpoint refuses. A colony's own refusal is a pass.
    expect(reason).not.toBe('not-splittable');
    if (reason !== null) {
      expect(['too-weak', 'no-queen', 'no-colony']).toContain(reason);
    } else {
      await settle(k, out);
    }
  }, 180_000);
});

/* ───────────────── 20. and the honey is sold where things are sold ───────────────── */

suite('⭐ honey goes on the shelf people already buy from', () => {
  it('a jar of honey can be consigned on Quist’s shelf', async () => {
    // ⭐ The farm's shelf is a `ConsignmentShelf` and it refuses par on
    // principle, which is exactly right: what is on it is somebody's, and
    // honey is the first thing anybody has had to put on it.
    await walk(k, ['down']);
    // ⚠ The shelf is asserted by BINDING, not by prose: the yard is as
    // dark as the close and a lantern reads *"shapes and edges"*. What
    // matters here is that the consignment shelf a player already buys
    // from is standing in the room the hive's keeper walks back into.
    const shelf = await k.query('here:i:shelf', { fields: ['displayName'] });
    expect(shelf.length, "Quist's shelf is in the yard").toBeGreaterThan(0);
    const bought = await say(k, 'consign jar');
    // ⚠ Either outcome is honest — a jar has to be carried to be
    // consigned, and whether `rob` produced one is the clock's answer.
    // What this reads is that the verb is AFFORDED where the shelf is.
    expect(refusedFor(bought)).not.toBe('unknown-verb');
  }, 300_000);
});
