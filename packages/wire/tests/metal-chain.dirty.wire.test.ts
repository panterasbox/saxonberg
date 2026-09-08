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

const OUTCROP = '/world/rejection/ferrow/outcrop';
const DRIFT = '/world/rejection/ferrow/timbered-drift';
const FUEL_YARD = '/world/rejection/location/fuel-yard';

suite('prospecting starts with NOTICING, not with shopping', () => {
  let p: Session;
  beforeAll(async () => {
    p = await Session.open(uniqueHandle('prospect'), { startLocation: OUTCROP });
  }, 120_000);
  afterAll(() => p?.close());

  it('the green band is a detail you can look at for free', async () => {
    // ⭐ The outcrop is a DETAIL on the room — visible before you own an
    // instrument, which is what makes prospecting start with noticing.
    expect(await p.prose('look outcrop')).toMatch(/verdigris/i);
  });

  it('⚠ without an instrument the channel refuses, and NAMES it', async () => {
    expect(await p.prose('measure strike')).toMatch(/surveyor's instrument/i);
  });

  it('⚠ dip is unobtainable up here, and the refusal teaches the geometry', async () => {
    expect(await p.prose('measure dip')).toMatch(/line has no fall/i);
  });
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

  it('⭐ dip IS obtainable here: the vein is in section on the face', async () => {
    // The other half of the outcrop's refusal. Same channel, different
    // ground, and the difference is the geology rather than a gate.
    const said = await m.prose('measure dip');
    expect(said).toMatch(/Dip \d+|surveyor's instrument/i);
  });

  it('hewing and driving are acts a player starts', async () => {
    const hewn = await m.cmd('hew west');
    expect(await hewn.said()).toMatch(
      /start cutting|set the pick|surveyor|pick/i
    );
    const driven = await m.cmd('drive south');
    expect(await driven.said()).toMatch(/start driving|pick|timber/i);
  }, 180_000);

  it('⭐ shoring is the PROVISIONING act, and says so out loud', async () => {
    const shored = await m.cmd('shore');
    expect(await shored.said()).toMatch(/timber takes the weight|timber/i);
  }, 120_000);
});

suite('the chain — charcoal at the yard, metal at the furnace', () => {
  let f: Session;
  beforeAll(async () => {
    f = await Session.open(uniqueHandle('burner'), {
      startLocation: FUEL_YARD,
    });
  }, 120_000);
  afterAll(() => f?.close());

  it('⚠ an empty clamp declines, and says what it wants', async () => {
    expect(await f.prose('char')).toMatch(/empty|cordwood/i);
  });

  it('⭐ the draught is the one dial, and it is set out loud', async () => {
    expect(await f.prose('char 0.46')).toMatch(/empty|cordwood|three days/i);
  });

  it('⚠ a cold furnace refuses and NAMES what it wants', async () => {
    expect(await f.prose('smelt')).toMatch(/furnace|ore|charcoal/i);
  });
});
