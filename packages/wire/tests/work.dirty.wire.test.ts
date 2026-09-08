/**
 * The work-contract loop, end to end and fully diegetic: a boss funds an
 * account, buys a real torch at the general store, posts a chattel-bound
 * gig at the terminal-hall noticeboard; a fresh worker claims it,
 * carries the torch to the arrival gate, fulfills, hits the unbanked
 * refusal, opens an account, completes, and is paid out of escrow.
 *
 * Ported from `e2e/tests/work-drive.spec.ts` — 211 lines of Playwright
 * with **fourteen assertions and not one about the browser**. It drove a
 * real Chromium, typed into a real input and diffed `document.body`, to
 * prove a banking flow. This is the clearest case in the migration: the
 * render tier was carrying it for no reason at all.
 *
 * ⚠⚠ **The stable-handle trap, which the original documents and then
 * walks into.** Its comment says *"A fixed handle also means the
 * character already exists on the second run, so `startLocation` is
 * ignored and the boss wakes wherever it was left"* — and it then passes
 * the fixed literal `'boss'`. This port tried a stable boss for the same
 * reason (a persistent account needs no faucet) and hit exactly that:
 * he woke at the general store, the four-leg walk to Goodkin succeeded
 * leg by leg and arrived somewhere else, `bank` answered about
 * somewhere else, and eight checkpoints failed downstream of one wrong
 * assumption. **`startLocation` is a birth setting, not a teleport.**
 *
 * So: a fresh boss every run, whose position is therefore guaranteed.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectNote,
} from '../src/harness';

const HALL = '/world/terminus/terminal/location/hall';
const GATE = '/world/terminus/terminal/location/arrival-gate';

/**
 * ⭐⭐ **Why this file cannot run twice — and it is the sharpest content
 * finding in the migration.**
 *
 * The boss needs 25 credits of escrow and the price of a torch, and the
 * only way to get money into a new character is `reserve issue` — the
 * one CONSERVED faucet, gated on the Governor's seat. There is no sink.
 * So every run mints coin that stays minted, and leaves a funded
 * stranger standing in the terminal hall forever.
 *
 * The original did this unconditionally on every run and called itself
 * repeatable. It is not: it is *runnable* twice, while the realm's money
 * supply climbs each time. A test that needs money and has no way to
 * give it back is telling you the economy has a faucet and no drain —
 * which is a question for whoever owns the reserve, not something a test
 * can paper over.
 */
export const DIRTY_REASON =
  'mints conserved money through `reserve issue` with no way to return ' +
  'it, leaves a funded character in the hall every run, and leaves any ' +
  'unclaimed gig posted forever — the board has no expiry';

declareFile({
  file: 'work.dirty.wire.test.ts',
  packs: ['terminus', 'world-seed'],
  dirtyReason: DIRTY_REASON,
});

let b: Session; // the boss
let w: Session; // the worker — fresh every run, so unbanked is real
let gigId = '';

/** Read a balance off `bank`, or null when there is no account. */
async function balanceOf(s: Session): Promise<number | null> {
  const said = await s.prose('bank');
  const m = /balance is (\d+)/i.exec(said);
  return m ? Number(m[1]) : null;
}

async function walk(s: Session, dirs: string[]): Promise<void> {
  for (const d of dirs) expectOk(await s.cmd(d));
  // Nobody reads a walk's prose, so its scenes would otherwise land in
  // the next command's buffer and be mistaken for its answer.
  await s.drainProse();
}

/**
 * Every gig id currently on the board.
 *
 * ⚠ **The board accumulates.** An unclaimed gig from an earlier run is
 * still posted — there is no expiry — so "the first id on the board" is
 * very often somebody else's, and claiming it answers
 * `contract-refused`. The id of the gig THIS run posted is therefore
 * taken by DIFFING the board across the post, never by reading position
 * one. (That accumulation is itself a finding; see DIRTY_REASON.)
 */
async function boardIds(s: Session): Promise<Set<string>> {
  const browse = await s.prose('job');
  return new Set(
    [...browse.matchAll(/\[([0-9a-zA-Z_-]{6,10})\]/g)].map((m) => m[1]!)
  );
}

beforeAll(async () => {
  b = await Session.open(uniqueHandle('boss'), { startLocation: HALL });
}, 120_000);

afterAll(() => {
  b?.close();
  w?.close();
});

suite('the boss funds himself and posts a gig', () => {
  it('the hall has a noticeboard', async () => {
    const rows = await b.query('peers', { fields: ['displayName'] });
    expect(
      rows
        .map((r) => String((r as { displayName?: string }).displayName ?? ''))
        .join(' | ')
    ).toMatch(/noticeboard/i);
  });

  it('banks enough to cover a 25-credit escrow', async () => {
    /*
     * The handover is coin on the floor rather than `pay <name>`: both
     * `pay` and `bank transfer` resolve their recipient as an object,
     * and a session's HANDLE is not its character's in-world name.
     * Dropping and taking needs no name at all — only that the two of
     * them are in the same room, which `startLocation` guarantees.
     */
    await walk(b, ['north', 'north', 'west', 'west']);
    expectOk(await b.cmd('bank open')); // idempotent, auto-links
    let bal = await balanceOf(b);

    if ((bal ?? 0) < 25) {
      // A new account opens at zero, so on a fresh boss this always
      // runs — see DIRTY_REASON. It is guarded rather than
      // unconditional so the shape stays honest if a sink ever exists.
      await walk(b, ['east', 'east', 'south', 'south']);
      const gov = await Session.open('founder', { startLocation: HALL });
      try {
        expectOk(await gov.cmd('reserve issue 500'));
        expectOk(await gov.cmd('drop coins'));
      } finally {
        gov.close();
      }
      expectOk(await b.cmd('get coins'));
      await walk(b, ['north', 'north', 'west', 'west']);
      expectOk(await b.cmd('bank open'));
      expectOk(await b.cmd('bank deposit coins'));
      bal = await balanceOf(b);
    }

    expect(bal, 'a readable balance').not.toBeNull();
    expect(bal!).toBeGreaterThanOrEqual(25);
  }, 300_000);

  it('buys a real torch at the general store', async () => {
    // Retail + settle + chattel, in one act. A prior run's torch is
    // still in the pack, so the buy is conditional and the ASSERTION is
    // the postcondition.
    await walk(b, ['east', 'north']);
    const carried = async (): Promise<string> => {
      const rows = await b.query('me:i', { fields: ['displayName'] });
      return rows
        .map((r) => String((r as { displayName?: string }).displayName ?? ''))
        .join(' | ');
    };
    if (!/torch/i.test(await carried())) {
      expectOk(await b.cmd('buy torch'));
    }
    expect(await carried()).toMatch(/torch/i);
  }, 180_000);

  it('posts a chattel-bound gig, and it appears on the board', async () => {
    await walk(b, ['south', 'east', 'south', 'south']);
    const dropped = await b.cmd('drop torch');
    expectOk(dropped);
    /*
     * ⭐⭐ **A third shipped drive spec that is red on master.**
     * `work-drive.spec.ts` posts `job post torch to <place> for 25`, and
     * today that answers *"Post what? Say what has to be true —
     * `deliver <thing> to <place>` or `supply <n> <kind> to <place>`."*
     * The verb grew a CONDITION clause — only work the engine can CHECK
     * may be posted, because the reward is held in escrow against it —
     * and the spec has been unrunnable since, unnoticed.
     */
    const before = await boardIds(b);
    const posted = await b.cmd(`job post deliver torch to ${GATE} for 25`);
    expectOk(posted);
    const after = await boardIds(b);
    const mine = [...after].filter((id) => !before.has(id));
    expect(
      mine.length,
      `exactly one NEW gig on the board — post said ` +
        `"${(await posted.said()).replace(/\s+/g, ' ').slice(0, 200)}"`
    ).toBe(1);
    gigId = mine[0]!;
  }, 180_000);
});

/*
 * ⭐⭐⭐ **This suite could not run at all until this build fixed the
 * engine, and the bug it found was much larger than the gig board.**
 *
 * `job claim <any real gig>` answered *"You can't claim that: you can't
 * claim your own gig"* — to a character minted seconds earlier that had
 * never posted anything, for every gig on the board, and to the founder
 * too. `job claim ZZZZnope` correctly answered "no such gig", so id
 * resolution was fine: the SELF-CLAIM GUARD was matching everyone.
 *
 * The cause was not in the contract substrate. Since D17 split identity
 * from lineage, a player Avatar is cloned from `Avatar.SEED_TEMPLATE_PATH`
 * with its per-player path supplied as `asIdentityPath`
 * (`StuffApi.clone` stamps the two separately) — so **every player shares
 * one `getTemplatePath()`** and only `getIdentityPath()` tells them
 * apart. Banking and contracts were keying persons on lineage.
 *
 * ⚠⚠ The gig board was the SMALL half. Every player also shared ONE BANK
 * ACCOUNT: two characters minted seconds apart both read a balance of
 * 2480 zorkmids, and a brand-new account is supposed to open at zero.
 * `actingActorKey()` in `BankingLogic` derived the owner key the same
 * wrong way.
 *
 * Fixed by keying persons on `getIdentityPath()` — which for anything
 * that is not a minted identity falls back to `getTemplatePath()`, so
 * NPCs, businesses and fixtures are untouched. It is the accessor
 * `Chattel` already used, and the one `Stuff.getPlayerId()`'s docblock
 * now names (it said `getTemplatePath()`, which is what everybody
 * followed).
 *
 * ⭐⭐ Neither defect was visible to the suite. `contract-lifecycle.test.ts`
 * covers the self-claim path and passes, because its fixtures set real
 * distinct template paths. A green suite means self-consistent, not
 * working — and both of these took a session over the real wire.
 */
suite('a fresh worker claims, delivers and is paid', () => {
  beforeAll(async () => {
    w = await Session.open(uniqueHandle('worker'), { startLocation: HALL });
  }, 120_000);

  it('sees the gig and claims it into escrow', async () => {
    expect(await w.prose('job')).toContain(gigId);
    const claimed = await w.cmd(`job claim ${gigId}`);
    expect(
      claimed.status,
      `claiming ${gigId} said "${(await claimed.said()).replace(/\s+/g, ' ').slice(0, 240)}"`
    ).toBe('ok');
    expect((await claimed.said()).toLowerCase()).toContain('escrow');
  }, 120_000);

  it('carries the torch to the gate and fulfills', async () => {
    expectOk(await w.cmd('get torch'));
    expectOk(await w.cmd('north'));
    expectOk(await w.cmd('drop torch'));
    const sealed = await w.cmd('fulfill');
    expectOk(sealed);
    expect((await sealed.said()).toLowerCase()).toMatch(
      /seals the record|verifies the delivery/
    );
  }, 180_000);

  it('⭐ an unbanked worker is REFUSED the payout', async () => {
    // The refusal that makes the banking layer real: work done is not
    // money earned until there is somewhere to put it.
    expectOk(await w.cmd('south'));
    const refused = await w.cmd(`job complete ${gigId}`);
    expect((await refused.said()).toLowerCase()).toContain('no account');
  }, 120_000);

  it('opens an account, completes, and is paid out of escrow', async () => {
    await walk(w, ['north', 'north', 'west', 'west']);
    expectOk(await w.cmd('bank open'));
    await walk(w, ['east', 'east', 'south', 'south']);
    const paid = await w.cmd(`job complete ${gigId}`);
    expectOk(paid);
    expect((await paid.said()).toLowerCase()).toMatch(/pays out|released from escrow/);
  }, 300_000);

  it('a closed gig cannot be completed twice, and the money landed', async () => {
    const again = await w.cmd(`job complete ${gigId}`);
    expect((await again.said()).toLowerCase()).toMatch(/closed|no such|isn't done/);
    await walk(w, ['north', 'north', 'west', 'west']);
    expect(await balanceOf(w)).toBe(25);
  }, 300_000);

  it('the settled gig comes OFF the board', async () => {
    /*
     * ⚠ The original asserted the board reads "bare". It cannot: gigs
     * from earlier runs are still posted, because nothing expires an
     * unclaimed one. What is true, and what the escrow contract actually
     * promises, is that a COMPLETED gig is gone.
     */
    expect([...(await boardIds(b))]).not.toContain(gigId);
  }, 60_000);
});
