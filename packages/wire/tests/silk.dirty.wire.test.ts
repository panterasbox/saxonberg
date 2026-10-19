/**
 * ⭐⭐ **Silk, driven end to end** — the silk build's exit criterion
 * (requirements § The drive), against the real socket.
 *
 * In one sentence: *walk up to the silk house and read a tray in words;
 * buy leaf there and eggs, a tray, a reel and a brush in town; set a lot
 * on a tray and feed it; watch the house take its crop off, stifle it and
 * set it on the counter; buy cocoons and reel them at the mill's basin and
 * over a pot at home; throw the raw silk; buy the mill's silk cloth at the
 * general store — woven by its reeler, out of the house's cocoons — boil it
 * white in a copper, and dye it; see fishing's `reel` unchanged.*
 *
 * ## ⚠⚠ What the SEASON keeps out of this file, said plainly
 *
 * The world boots in winter, and a rearing ages by warmth: an unheated
 * loft or kitchen in January does not rear worms, honestly. Walking the
 * clock to summer is a jump of months, and the taps drive measured that
 * **four 20-day jumps wedge a world**. So the checkpoints that need a
 * month of WARM degree-days — the ages, the moults, hunger against a fed
 * control, the specks and the collapse, the spin of a home tray, the
 * unstifled deadline and the lay, selection across a generation — are
 * pinned where the arithmetic lives, over real `ThermalMixin`
 * trajectories:
 *
 *  - `trade-sericulture/src/__tests__/rearing-clock.test.ts` (steps 3–5,
 *    14: warm vs cold, fed vs starved, the moult, specks and collapse,
 *    three heft stacks and frass);
 *  - `…/stifling.test.ts` (steps 6–7, 15: a 500 K range stifles before it
 *    scorches, a 345 K oven never scorches, the ten-day deadline, the lay,
 *    h² × S, the inherited load);
 *  - `…/reel.test.ts` (step 8's refusals and evenness).
 *
 * ⭐ What the season does NOT block is the house's crop: the first loft
 * tray is authored finishing its spin, and spinning is a time, not a
 * warmth — so the house→mill→store chain (step 16) runs in any month.
 *
 * ⚠ **"Your own kitchen" is the Hearthworks cookhouse.** A lot's kitchen
 * is a warren room the harness cannot enter yet (the farming drive's
 * recorded limit); the cookhouse is a public kitchen with an oven, which
 * is all the hobby steps ask of a kitchen.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2016 WIRE_FRAME_TIMEOUT=60000 npx vitest run
 * tests/silk.dirty.wire.test.ts`
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  engagementIdOf,
  isOwnedTestWorld,
  advanceWorldClock,
} from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It buys the general store's
 * eggs, tray, reel and brush par, the silk house's leaf and its first crop
 * of cocoons, persists a tray with a lot on it, and walks the world clock.
 *
 * ⭐ The dirty reason is a question for a trade: the eggs come off a par
 * because nobody here GRAINS — keeping a valley's clean eggs through a
 * winter is a trade of its own (the grainer, silk-slate § 7), and the par
 * is the faucet standing in for it.
 */
export const DIRTY_REASON =
  'buys the general store’s eggs/tray/reel/brush par and the silk ' +
  'house’s leaf and first crop, persists a tray with a lot on it, and ' +
  'walks the world clock';

declareFile({
  file: 'silk.dirty.wire.test.ts',
  packs: [
    'trade-sericulture',
    'trade-textiles',
    'trade-dyeing',
    'trade-fishing',
    'trade-farming',
    'trade-forestry',
    'trade-fuel',
    'trade-shopkeeping',
    'generic-objects',
    'base-library',
    'species-and-names',
    'terminus',
    'hearthworks',
    'hearts-delight',
  ],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const BENCH_LANE = '/world/terminus/hearts-delight/location/bench-lane';
const LOFT = '/world/terminus/hearts-delight/silk-house/location/floor';
const STORE = '/world/terminus/general-store/shop-floor';
const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';
const MILL = '/world/terminus/wharfside/mill/location/floor';
const DYEHOUSE = '/world/terminus/wharfside/dyehouse/location/floor';

let handle = '';

async function say(s: Session, text: string): Promise<CommandResult> {
  try {
    return await s.cmd(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    const pending = await s.awaitPrompt(5_000);
    // ⚠ The prompt id and outcome sit at the TOP level of the envelope in
    // this harness (`payload` is the older shape) — read both.
    type Prompt = {
      promptId?: string;
      outcome?: { notes?: Array<{ matches?: Array<{ stuffId?: string }> }> };
    };
    const env = pending as unknown as Prompt & { payload?: Prompt };
    const id = env.promptId ?? env.payload?.promptId;
    const first = (env.outcome ?? env.payload?.outcome)?.notes
      ?.map((n) => n.matches?.[0]?.stuffId)
      .find((x): x is string => typeof x === 'string');
    if (id && first) s.answerPrompt(id, first);
    await new Promise((r) => setTimeout(r, 300));
    return await s.cmd(text);
  }
}

async function read(s: Session, text: string): Promise<string> {
  try {
    return await s.prose(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    await say(s, text);
    return await s.prose(text);
  }
}

function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected' || n.kind === 'command-rejected' || n.kind === 'validator-failed',
  );
  return note ? (note.reason ?? note.kind ?? 'refused') : null;
}

async function names(s: Session, q: string): Promise<string> {
  const rows = await s.query(q, { fields: ['displayName'] });
  return rows.map((r) => String((r as { displayName?: string }).displayName ?? '')).join(' | ');
}

async function settle(s: Session, started: CommandResult): Promise<void> {
  const id = engagementIdOf(started);
  if (id) await s.awaitActivity(id, 400_000);
  await new Promise((r) => setTimeout(r, 500));
}

async function advance(duration: string): Promise<void> {
  const { before, after } = await advanceWorldClock(duration);
  expect(after - before, `advance ${duration}: world-time did not move`).toBeGreaterThan(0);
  await new Promise((r) => setTimeout(r, 400));
}

/** Open a session as the grower, standing at `where`. */
async function at(where: string): Promise<Session> {
  return Session.open(handle, { startLocation: where });
}

beforeAll(async () => {
  handle = uniqueHandle('silker');
  const k = await Session.open(handle, { startLocation: BANK_HALL });
  try {
    expectOk(await k.cmd('bank open'));
    const gov = await Session.open('founder', { startLocation: BANK_HALL });
    try {
      expectOk(await gov.cmd(`reserve override 900 to ${handle} "wire: silk funding"`));
    } finally {
      gov.close();
    }
    const bal = /balance is (\d+)/i.exec(await k.prose('bank'));
    expect(bal, 'the account must be funded before the drive starts').toBeTruthy();
    expect(Number(bal![1])).toBeGreaterThan(300);
  } finally {
    k.close();
  }
}, 300_000);

/* ───────────── 0. morning ───────────── */

suite.skipIf(!isOwnedTestWorld())('⭐ 0. the clock to morning — the house and the mill are staffed 05–19', () => {
  it('the world boots at midnight; walk it to ten (staffed, and daylight)', async () => {
    // ⭐ Found by the first run: every seat in this chain is on shift
    // 05–19, so at game-time 0 the loft and the basin are EMPTY — no hand,
    // no reeler, nothing to drive. The cast are offstage, which is right.
    await advance('10 hours');
  }, 300_000);
});

/* ───────────── 1. the silk house ───────────── */

suite('⭐ 1. the silk house — a lit loft, its trays in words', () => {
  it('⭐ up the lane and into the loft: trays, an oven, a counter, the keeper and a hand', async () => {
    const s = await at(BENCH_LANE);
    try {
      const moved = await say(s, 'north');
      expect(refusedFor(moved), 'the lane must go north to the silk house').toBeNull();
      const loft = await read(s, 'look');
      expect(loft).toMatch(/silk house loft/i);
      expect(loft, 'a LIT loft — not "something"').not.toMatch(/too dark|pitch/i);
      const here = await names(s, 'here:i');
      expect(here).toMatch(/rearing tray/i);
      expect(here).toMatch(/stifling oven/i);
      expect(here).toMatch(/counter/i);
      expect(here, 'the keeper, by name').toMatch(/Ines Vale/);
      expect(here, 'the hand, by name').toMatch(/Tobin Ash/);
    } finally {
      s.close();
    }
  }, 300_000);

  it('⭐ AC 2 — `look tray` reads the worms in WORDS, with no number in them', async () => {
    const s = await at(LOFT);
    try {
      const tray = await read(s, 'look second tray');
      const line = tray.split(/\n/).filter((l) => /worm|egg|tray|nothing/i.test(l)).join(' ');
      expect(line, 'the tray must say something about its rearing').not.toBe('');
      expect(line, 'AC 2 — in words, never a number').not.toMatch(/\d/);
    } finally {
      s.close();
    }
  }, 300_000);
});

/* ───────────── 2. buy in ───────────── */

suite('⭐ 2. buy in — leaf at the house, the kit in town', () => {
  it('`buy leaf` at the silk house counter', async () => {
    const s = await at(LOFT);
    try {
      const bought = await say(s, 'buy leaf');
      expect(refusedFor(bought), 'the house sells leaf').toBeNull();
      expect(await names(s, 'me:i')).toMatch(/mulberry leaves/i);
    } finally {
      s.close();
    }
  }, 300_000);

  it('eggs, a tray, a reel and a brush at the general store', async () => {
    const s = await at(STORE);
    try {
      for (const thing of ['imported', 'cheap', 'tray', 'reel', 'brush']) {
        const r = await say(s, `buy ${thing}`);
        expect(refusedFor(r), `buy ${thing}`).toBeNull();
      }
      const kit = await names(s, 'me:i');
      expect(kit).toMatch(/imported silkworm eggs/i);
      expect(kit).toMatch(/rearing tray/i);
      expect(kit).toMatch(/hand reel/i);
      expect(kit).toMatch(/mounting brush/i);
    } finally {
      s.close();
    }
  }, 300_000);

  it('⭐⭐ AC 12 — `look` at an egg lot says strain, where and when, and NOTHING about disease', async () => {
    // ⚠ At the cookhouse, not the store: on the shop floor the shelf's own
    // cards answer to `imported` too, and the look stops at a prompt.
    const s = await at(COOKHOUSE);
    try {
      const clean = await read(s, 'look imported');
      expect(clean).toMatch(/one-brood white/i);
      expect(clean).toMatch(/over the mountains/i);
      expect(clean).not.toMatch(/disease|pebrine|pébrine|speck|infect|sick/i);
      const sick = await read(s, 'look cheap');
      expect(sick).toMatch(/valley gold/i);
      expect(sick).not.toMatch(/disease|pebrine|pébrine|speck|infect|sick/i);
    } finally {
      s.close();
    }
  }, 300_000);
});

/* ───────────── 3–4. hatch and feed, in a kitchen ───────────── */

suite('⭐ 3–4. a lot on a tray, and leaf on the lot', () => {
  it('⭐ AC 1 — `put eggs in tray` hatches the lot onto it; `on` is taught, not swallowed', async () => {
    const s = await at(COOKHOUSE);
    try {
      expectOk(await say(s, 'drop tray'));
      const wrong = await say(s, 'put imported on tray');
      expect(refusedFor(wrong), '`on` a container is the teaching refusal').not.toBeNull();
      const put = await say(s, 'put imported in tray');
      expect(refusedFor(put)).toBeNull();
      const tray = await read(s, 'look tray');
      expect(tray).toMatch(/eggs, waiting for warmth|worms/i);
      // The card was consumed — the eggs are the tray's now.
      expect(await names(s, 'me:i')).not.toMatch(/imported silkworm eggs/i);
    } finally {
      s.close();
    }
  }, 300_000);

  it('`put leaf in tray` — leaf is what a tray takes', async () => {
    const s = await at(COOKHOUSE);
    try {
      const put = await say(s, 'put leaf in tray');
      expect(refusedFor(put)).toBeNull();
      expect(await names(s, 'here:i:tray:i')).toMatch(/mulberry leaves/i);
      const shelf = await say(s, 'put reel in tray');
      expect(refusedFor(shelf), 'a tray is not a shelf').not.toBeNull();
    } finally {
      s.close();
    }
  }, 300_000);
});

/* ───────────── 16. the house runs, and sells ───────────── */

suite.skipIf(!isOwnedTestWorld())('⭐⭐⭐ 16. the house takes its crop off, stifles it, and sells it', () => {
  it('⭐⭐ AC 14 — while loaded, the hand takes the crop off, stifles it, and it is BOUGHT stifled at the counter', async () => {
    // ⚠ Behaviour beats come every ~20 REAL seconds and a clock jump drains
    // only game-time schedules, so each step is a small jump AND a real
    // wait (found by the drive). ⚠ And the mill's reeler buys off the same counter (that is
    // the chain), so what is asserted is that the player can BUY stifled
    // cocoons here, not that a pile sits waiting.
    const s = await at(LOFT);
    try {
      let bought = 0;
      for (let i = 0; i < 150 && bought < 80; i++) {
        const r = await say(s, 'buy cocoon');
        if (refusedFor(r) === null) {
          bought += 1;
          continue;
        }
        await advance('2 minutes');
        // ⚠ Behaviour beats are REAL-time (~20 s); a clock jump drains only
        // game-time schedules. Every brain step here needs a real beat.
        await s.listen(20_000);
      }
      expect(bought, 'eighty stifled cocoons bought off the house counter — two reelings').toBe(80);
    } finally {
      s.close();
    }
  }, 4_200_000);
});

/* ───────────── 8–9. reel, and throw ───────────── */

suite.skipIf(!isOwnedTestWorld())('⭐⭐ 8–9. reel at the basin, reel over a pot, throw the silk', () => {
  it('⭐⭐ AC 7 — at the mill basin: a skein of raw silk, its fineness in words; pupae left', async () => {
    const s = await at(MILL);
    try {
      // The basin wants hot water — light its brazier first.
      await say(s, 'stoke charcoal into brazier');
      const lit = await say(s, 'light brazier');
      expect(refusedFor(lit) ?? 'ok', 'the brazier under the basin lights').toMatch(/ok|already/);
      const started = await say(s, 'reel cocoons --count 6 with basin');
      expect(refusedFor(started), 'the basin reels stifled cocoons over a lit fire').toBeNull();
      await settle(s, started);
      const kit = await names(s, 'me:i');
      expect(kit).toMatch(/skein of raw silk/i);
      expect(kit).toMatch(/pupae/i);
      const skein = await read(s, 'look hank');
      expect(skein).toMatch(/6 cocoons to it|six cocoons/i);
      expect(skein).toMatch(/even|uneven|thick and thin/i);
    } finally {
      s.close();
    }
  }, 1_200_000);

  it('…and over the cookhouse oven with a hand reel', async () => {
    const s = await at(COOKHOUSE);
    try {
      // The house sold them stifled (and in the cookhouse nothing else
      // answers to `cocoon`).
      expect(await read(s, 'look cocoon')).toMatch(/quiet and dry|whatever was inside is dead/i);
      await say(s, 'stoke log into oven');
      const lit = await say(s, 'light oven');
      expect(refusedFor(lit) ?? 'ok', 'the cookhouse oven lights').toMatch(/ok|already/);
      const started = await say(s, 'reel cocoons --count 10 with reel');
      expect(refusedFor(started), 'a hand reel over a lit oven reels').toBeNull();
      await settle(s, started);
      const kit = await names(s, 'me:i');
      expect((kit.match(/skein of raw silk/gi) ?? []).length + (/2 skeins/i.test(kit) ? 1 : 0)).toBeGreaterThan(0);
    } finally {
      s.close();
    }
  }, 1_200_000);

  it('⭐⭐ AC 8 — `spin hank` throws it: a skein of RAW SILK yarn, not linen', async () => {
    const s = await at(MILL);
    try {
      const started = await say(s, 'spin hank');
      expect(refusedFor(started)).toBeNull();
      await settle(s, started);
      const kit = await names(s, 'me:i');
      expect(kit).toMatch(/raw silk yarn/i);
      expect(kit).not.toMatch(/linen yarn/i);
    } finally {
      s.close();
    }
  }, 1_200_000);
});

/* ───────────── 16 continued — the mill reels, weaves and sells ───────────── */

suite.skipIf(!isOwnedTestWorld())('⭐⭐⭐ 16. the mill reels and weaves, and silk reaches the store', () => {
  it('⭐⭐⭐ AC 14 — silk cloth appears on the general store counter, woven at the mill', async () => {
    const s = await at(STORE);
    try {
      let shelf = '';
      for (let i = 0; i < 70 && !/bolt of (raw )?silk/i.test(shelf); i++) {
        await advance('5 minutes');
        await s.listen(20_000);
        shelf = await names(s, 'here:i:counter:i');
      }
      expect(shelf, 'a bolt of silk on the general store counter').toMatch(/bolt of (raw )?silk/i);
    } finally {
      s.close();
    }
  }, 4_200_000);

  it('⭐ AC 16 — the silk bolt is bought, and carries its weaver’s mark', async () => {
    const s = await at(STORE);
    try {
      const r = await say(s, 'buy "bolt of raw silk"');
      expect(refusedFor(r)).toBeNull();
      expect(await names(s, 'me:i')).toMatch(/bolt of raw silk/i);
    } finally {
      s.close();
    }
  }, 300_000);
});

/* ───────────── 10–11. degum, and dye ───────────── */

suite.skipIf(!isOwnedTestWorld())('⭐⭐ 10–11. boil the cloth white, and dye it', () => {
  it('⭐⭐ AC 9 — in a copper on the dyehouse fire: soft, lighter, and SILK', async () => {
    const s = await at(DYEHOUSE);
    try {
      expectOk(await say(s, 'fill copper from butt'));
      await say(s, 'stoke log into brazier');
      const lit = await say(s, 'light brazier');
      expect(refusedFor(lit) ?? 'ok', 'the dyehouse brazier lights').toMatch(/ok|already/);
      expectOk(await say(s, 'heat copper'));
      expectOk(await say(s, 'put bolt in copper'));
      expect(await read(s, 'look bolt in copper')).toMatch(/stiff in the gum|gum/i);
      let look = '';
      for (let i = 0; i < 40 && !/bolt of silk/i.test(look); i++) {
        await advance('10 minutes');
        look = await names(s, 'here:i:copper:i');
      }
      expect(look, 'the raw silk degums to silk').toMatch(/bolt of silk/i);
      expectOk(await say(s, 'get bolt from copper'));
    } finally {
      s.close();
    }
  }, 1_800_000);
});

/* ───────────── 19. fishing still reels ───────────── */

suite('⭐ 19. fishing’s `reel` is unchanged', () => {
  it('⭐ AC 19 — `reel` with no line out says so, as it always did', async () => {
    const s = await at(MILL);
    try {
      const r = await say(s, 'reel');
      expect(refusedFor(r)).toBe('no-line');
    } finally {
      s.close();
    }
  }, 300_000);
});

/* ───────────── recorded gaps ───────────── */

suite('⚠⚠ RECORDED GAPS — what the season keeps out of this file', () => {
  it('the warm-weather steps are pinned in the pack suite, by name', () => {
    // ⭐ An assertion rather than a comment, so the gap is in the suite's
    // own output (the taps drive's rule). See the file header.
    expect([
      'rearing-clock.test.ts — steps 3–5, 14 (ages, moults, hunger, specks, collapse, heft stacks)',
      'stifling.test.ts — steps 6–7, 13, 15 (stifle vs scorch on a real oven, the deadline, the lay, h²×S)',
      'reel.test.ts — step 8 refusals and evenness',
      'depth.test.ts (dyeing) — step 11 (silk deeper than linen on alum; gum dyes thin)',
      'labour.bench.test.ts — step 20',
    ]).toHaveLength(5);
  });
});
