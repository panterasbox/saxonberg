/**
 * The work-contract loop, end to end and fully diegetic: a boss funds an
 * account, buys a real notebook at the testbed shop, posts a chattel-bound
 * gig at the plaza noticeboard; a fresh worker claims it, carries the
 * notebook down the approach, fulfills, hits the unbanked refusal, opens an
 * account, completes, and is paid out of escrow.
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
 *
 * ⭐ Stands in the scaffold (test-world-lifecycle D8). It used to stand in
 * the Terminus terminal hall and was dirty because its funding — the
 * Governor's `reserve override` — had no sink. `fundedAccount` stages the
 * same recorded override, and the run's purge retires every test
 * account's balance to the reserve (`reserve retire`, D10), so a run
 * leaves the money supply where it found it. The gig this run posts is
 * claimed and completed by this run, so the board is left as it was found
 * (⚠ a run that fails between `job post` and `job complete` leaves its gig
 * posted — the board still has no expiry). The board is still read by
 * DIFFING across the post, so a stranger's gig never confuses it.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  fundedAccount,
  standIn,
  PLAZA,
  APPROACH,
  EXITS,
} from '../src/harness';

/** Where the gig's notebook must be delivered: next door to the board. */
const DELIVERY = APPROACH;

declareFile({
  file: 'work.wire.test.ts',
  packs: ['platform', 'test-fixtures'],
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
 * one. (That accumulation is itself a finding: nothing expires a gig.)
 */
async function boardIds(s: Session): Promise<Set<string>> {
  const browse = await s.prose('job');
  return new Set(
    [...browse.matchAll(/\[([0-9a-zA-Z_-]{6,10})\]/g)].map((m) => m[1]!)
  );
}

beforeAll(async () => {
  // ⭐ Staged: an account at the testbed bank holding 500 (the recorded
  // override; the purge retires it). The boss then logs in on the plaza.
  const boss = uniqueHandle('boss');
  await fundedAccount(boss, 500, 'wire: work funding');
  b = await Session.open(boss, { startLocation: PLAZA });
}, 180_000);

afterAll(() => {
  b?.close();
  w?.close();
});

suite('the boss funds himself and posts a gig', () => {
  it('the plaza has a noticeboard', async () => {
    const rows = await b.query('~peers', { fields: ['displayName'] });
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
    await walk(b, [EXITS.plaza.bank]);
    expectOk(await b.cmd('bank open')); // idempotent, auto-links
    const bal = await balanceOf(b);
    expect(bal, 'a readable balance').not.toBeNull();
    expect(bal!).toBeGreaterThanOrEqual(25);
  }, 300_000);

  it('buys a real notebook at the shop', async () => {
    // Retail + settle + chattel, in one act. The boss is fresh, so he
    // carries nothing before the buy; the ASSERTION is the postcondition.
    await walk(b, [EXITS.bank.plaza, EXITS.plaza.shop]);
    const carried = async (): Promise<string> => {
      const rows = await b.query('me:i', { fields: ['displayName'] });
      return rows
        .map((r) => String((r as { displayName?: string }).displayName ?? ''))
        .join(' | ');
    };
    expect(await carried()).not.toMatch(/notebook/i);
    expectOk(await b.cmd('buy notebook'));
    expect(await carried()).toMatch(/notebook/i);
  }, 180_000);

  it('posts a chattel-bound gig, and it appears on the board', async () => {
    await walk(b, [EXITS.shop.plaza]);
    const dropped = await b.cmd('drop notebook');
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
    const posted = await b.cmd(`job post deliver notebook to ${DELIVERY} for 25`);
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
 * from lineage, a player Avatar is cloned from `PrimaryAvatar.ROW_TEMPLATE_PATH`
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
    w = await standIn(PLAZA, 'worker');
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

  it('carries the notebook down the approach and fulfills', async () => {
    expectOk(await w.cmd('get notebook'));
    expectOk(await w.cmd(EXITS.plaza.approach));
    expectOk(await w.cmd('drop notebook'));
    const sealed = await w.cmd('job fulfill');
    expectOk(sealed);
    expect((await sealed.said()).toLowerCase()).toMatch(
      /seals the record|verifies the delivery/
    );
  }, 180_000);

  it('⭐ an unbanked worker is REFUSED the payout', async () => {
    // The refusal that makes the banking layer real: work done is not
    // money earned until there is somewhere to put it.
    expectOk(await w.cmd(EXITS.approach.plaza));
    const refused = await w.cmd(`job complete ${gigId}`);
    expect((await refused.said()).toLowerCase()).toContain('no account');
  }, 120_000);

  it('opens an account, completes, and is paid out of escrow', async () => {
    await walk(w, [EXITS.plaza.bank]);
    expectOk(await w.cmd('bank open'));
    await walk(w, [EXITS.bank.plaza]);
    const paid = await w.cmd(`job complete ${gigId}`);
    expectOk(paid);
    expect((await paid.said()).toLowerCase()).toMatch(/pays out|released from escrow/);
  }, 300_000);

  it('a closed gig cannot be completed twice, and the money landed', async () => {
    const again = await w.cmd(`job complete ${gigId}`);
    expect((await again.said()).toLowerCase()).toMatch(/closed|no such|isn't done/);
    await walk(w, [EXITS.plaza.bank]);
    expect(await balanceOf(w)).toBe(25);
  }, 300_000);

  it('the settled gig comes OFF the board', async () => {
    /*
     * ⚠ The original asserted the board reads "bare". It cannot: another
     * drive's gig may be posted, because nothing expires an unclaimed
     * one. What is true, and what the escrow contract actually
     * promises, is that a COMPLETED gig is gone.
     */
    expect([...(await boardIds(b))]).not.toContain(gigId);
  }, 60_000);
});
