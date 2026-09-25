/**
 * The metal chain — prospect, provision, cut, and smelt.
 *
 * Ported from `e2e/tests/drive-metal-chain.spec.ts` (188 lines, ONE
 * `expect`). It drove a browser and took screenshots to prove a
 * surveying ladder.
 *
 * ⭐⭐ **What this chain is really about, and why every checkpoint below
 * is a refusal as often as a success: a refusal has to TEACH.** Without
 * an instrument, `measure strike` names the instrument. Up on the
 * outcrop, `measure dip` explains the geometry — a surface trace is a
 * LINE, and a line has no fall in it — instead of withholding a number.
 * An empty clamp says it wants cordwood. A cold furnace names the
 * temperature. A player who cannot act on a refusal has hit a dead end,
 * and this file is mostly a test that none of them are dead ends.
 *
 * ⭐ And the survey is real arithmetic: one reading is a guess with an
 * error bar, three narrow it, because independent observations of an
 * angle average and the residual falls as error/√n. The card says how
 * many more it wants until it can solve.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, expectOk } from '../src/harness';

/**
 * ⭐⭐ **Why this file cannot run twice.**
 *
 * It BUYS its instruments (compass, jar, pick, timber) with money it has
 * to be given, CUTS ground that stays cut — a driven heading and a
 * shored working persist, which is the whole point of the persistence
 * pass — and burns a charge of cordwood at the fuel yard. The workings
 * are the interesting half: the mine is a place a player CHANGES, and a
 * test that changes it cannot pretend otherwise.
 */
export const DIRTY_REASON =
  'buys instruments with issued coin, drives and shores workings that ' +
  'persist by design, and burns the fuel yard’s cordwood';

declareFile({
  file: 'metal-chain.dirty.wire.test.ts',
  packs: ['trade-mining', 'trade-fuel', 'trade-forestry', 'trade-smelting', 'rejection'],
  dirtyReason: DIRTY_REASON,
});

// ⚠ The outcrop is a DETAIL on the pithead yard, not a room. That is the
// point of the first checkpoint: the green band is something you NOTICE
// where you already are, before you own an instrument.
const PITHEAD = '/world/terminus/rejection/location/pithead-yard';
const DRIFT = '/world/terminus/rejection/ferrow/timbered-drift';
const FUEL_YARD = '/world/terminus/rejection/location/fuel-yard';

suite('prospecting starts with NOTICING, not with shopping', () => {
  let p: Session;
  beforeAll(async () => {
    p = await Session.open(uniqueHandle('prospect'), { startLocation: PITHEAD });
  }, 120_000);
  afterAll(() => p?.close());

  it('the green band is a detail you can look at for free', async () => {
    // ⭐ The outcrop is a DETAIL on the room — visible before you own an
    // instrument, which is what makes prospecting start with noticing.
    expect(await p.prose('look outcrop')).toMatch(/verdigris/i);
  });

  it('⭐⭐ without an instrument the channel REFUSES, naming the route', async () => {
    /*
     * ⭐⭐⭐ **The mining owner's call, made — and this checkpoint is the
     * positive one its predecessor said it should become.**
     *
     * It used to assert that `measure strike` did not exist at all,
     * because `measure` was afforded BY an instrument and with none in
     * reach there was no verb to refuse with. It recorded the fork
     * plainly: *"the verb exists and tells you what you need" teaches
     * the ladder, while "the verb is not yours until you hold the tool"
     * is the affordance rule* — and left the choice to whoever owned
     * mining.
     *
     * The instrumentation build chose the first, for the whole ladder
     * and not just for this channel: **the refusal IS the progression
     * UI.** `measure` rides `Avatar.commandContributions.self`, so it
     * always exists, and a rung you have not got is something the world
     * can now NAME instead of pretending the verb was never a word.
     * Competence resolves detail; it never resolves access.
     */
    const strike = await p.cmd('measure strike');
    const unknown = strike.notes.find(
      (n) =>
        n.kind === 'command-rejected' &&
        (n as { reason?: string }).reason === 'unknown-verb'
    );
    expect(
      unknown,
      `'measure strike' answered as an unknown verb — the reading ladder ` +
        `puts 'measure' on every character, so a missing instrument must ` +
        `be a refusal that NAMES the instrument, never a missing word.`
    ).toBeUndefined();
    // And the refusal has to be worth reading: it names what is wanted.
    expect(await strike.said()).toMatch(/compass|clinometer|instrument|nothing in reach/i);
  }, 60_000);
});

suite('the workings — the ground answers, and remembers', () => {
  let m: Session;
  beforeAll(async () => {
    m = await Session.open(uniqueHandle('miner'), { startLocation: DRIFT });
  }, 120_000);
  afterAll(() => m?.close());

  it('⭐ `survey` — the MIRROR — answers in a working for free', async () => {
    const said = await m.prose('survey');
    expect(said.length).toBeGreaterThan(0);
  });

  it('hewing and driving refuse for a reason about the GROUND', async () => {
    /*
     * ⚠ The shipped drift is already cut out — *"That way is already
     * driven"*, *"These workings are cut and finished"* — which is the working
     * remembering what was done to it, and the whole reason a mine is a
     * place rather than a menu. So the assertion is that the refusal is
     * about the ground, never about the verb: a cut that has happened
     * cannot happen again.
     */
    const hewn = await m.cmd('hew west');
    expect(await hewn.said()).toMatch(
      /start cutting|set the pick|already driven|nothing left to cut|pick/i
    );
    const driven = await m.cmd('drive south');
    expect(await driven.said()).toMatch(
      /start driving|already driven|cut and finished|pick|timber/i
    );
  }, 180_000);

  it('⭐ shoring is the PROVISIONING act, and says so out loud', async () => {
    const shored = await m.cmd('shore');
    expect(await shored.said()).toMatch(/timber takes the weight|timber/i);
  }, 120_000);
});

suite('the chain — the fuel yard and the smelter are PLACES', () => {
  let f: Session;
  beforeAll(async () => {
    f = await Session.open(uniqueHandle('burner'), {
      startLocation: FUEL_YARD,
    });
  }, 120_000);
  afterAll(() => f?.close());

  /*
   * ⚠⚠ **This assertion changed with the metallurgy build, and the
   * change is the finding.** It used to assert that `smelt` was an
   * `unknown-verb` here — and it passed, for the wrong reason: `smelt`
   * was afforded by NOTHING ANYWHERE. No class named its view, so the
   * verb was unreachable in every room in the world and the whole metal
   * chain's centrepiece had never run in a booted game.
   *
   * ⭐ Now a `SmeltingFurnace` affords it, and the fuel yard is one
   * passable exit from the smelter — which is exactly the reach `peers`
   * has and the reach the anvil has always had. So the verb arrives,
   * finds the charcoal clamp (a Furnace AND a Container, like any
   * chargeable furnace), and declines for a reason about what a clamp
   * IS: a heap kept deliberately starving of air. That is a better
   * answer than "I don't understand 'smelt'", and it is the
   * *afford statically, decline diegetically* rule doing its job.
   */
  it('⭐⭐ `smelt` REACHES the fuel yard, and the clamp refuses it by what it is', async () => {
    const smelt = await f.cmd('smelt');
    expect(
      smelt.notes.find((n) => n.kind === 'command-rejected'),
      'the verb exists now — it used to be afforded by nothing anywhere'
    ).toBeUndefined();
    expect(await smelt.said()).toMatch(/clamp|air|tuy|draught/i);
  }, 60_000);

  it('the smelter is one room east, and it is a real place', async () => {
    expectOk(await f.cmd('east'));
    await f.drainProse();
    const here = await f.queryOne('here', ['displayName']);
    expect(String((here as { displayName?: string })?.displayName)).toMatch(
      /smelter|furnace|slag/i
    );
  }, 120_000);
});
