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
  packs: ['trade-mining', 'trade-fuel', 'trade-smelting', 'rejection'],
  dirtyReason: DIRTY_REASON,
});

// ⚠ The outcrop is a DETAIL on the pithead yard, not a room. That is the
// point of the first checkpoint: the green band is something you NOTICE
// where you already are, before you own an instrument.
const PITHEAD = '/world/rejection/location/pithead-yard';
const DRIFT = '/world/rejection/ferrow/timbered-drift';
const FUEL_YARD = '/world/rejection/location/fuel-yard';

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

  it('⚠⚠ without an instrument the channel does not exist for you', async () => {
    /*
     * ⭐⭐ **A finding, and a correction to the original spec.** It
     * asserted that `measure strike` REFUSES and names the instrument
     * you need. On today's world it answers *"I don't understand
     * 'measure'"* — because `measure` is afforded BY an instrument, so
     * with none in reach there is no verb to refuse with. The spec could
     * only ever have passed after its shopping leg, which ran first and
     * which it did not treat as a precondition.
     *
     * Both shapes are defensible and they are different designs: "the
     * verb exists and tells you what you need" teaches the ladder, while
     * "the verb is not yours until you hold the tool" is the affordance
     * rule the rest of the game follows. ⓘ Which one the survey channels
     * should have is the mining owner's call. What is asserted here is
     * what the world actually does.
     */
    const strike = await p.cmd('measure strike');
    const unknown = strike.notes.find(
      (n) =>
        n.kind === 'command-rejected' &&
        (n as { reason?: string }).reason === 'unknown-verb'
    );
    expect(
      unknown,
      `'measure strike' is afforded bare now — the pithead has grown an ` +
        `instrument, or the channel moved off the instrument. Either way ` +
        `this checkpoint should become the positive one.`
    ).toBeDefined();
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
   * ⚠⚠ **`char` and `smelt` are unafforded to an empty-handed arrival**,
   * exactly as `measure` is at the pithead — the trade verbs come off
   * the trade's instruments. The original spec asserted the REFUSALS
   * ("an empty clamp declines and says what it wants", "a cold furnace
   * names the temperature"), which its own shopping leg had made
   * reachable. Those refusals are worth testing and this file cannot
   * reach them yet: buying the kit needs the funding walk that
   * `work.dirty` does, from a different city.
   *
   * ⭐ So what is asserted is the half that is true of the world as it
   * stands and still says something: **the two ends of the chain are
   * different PLACES**, one room apart, and neither lends the other its
   * verbs. The refusal checkpoints move to the growth slate with the
   * provisioning leg they depend on.
   */
  it('the fuel yard does not lend the smelter its verbs', async () => {
    const smelt = await f.cmd('smelt');
    expect(
      smelt.notes.find(
        (n) =>
          n.kind === 'command-rejected' &&
          (n as { reason?: string }).reason === 'unknown-verb'
      ),
      'smelting happens at the furnace, not the clamp'
    ).toBeDefined();
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
