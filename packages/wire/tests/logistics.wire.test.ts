/**
 * Logistics — goods over real ground.
 *
 * Ported from `packages/server/scripts/drive-logistics.ts` (the AC22
 * drive), which proved the build's headline claims once and was then
 * never run again. Same flow, same seam, same command strings; what
 * changed is what it asserts on — and what that change immediately
 * caught, which is written up at each checkpoint below.
 *
 * ⭐ The two things the port buys:
 *
 *   1. **Arrival is a QUERY, not a regex.** The script matched the room
 *      description against `/the ford/i`, twelve times, against prose it
 *      did not own. `here.displayName` is the same fact structurally and
 *      does not break when somebody rewrites a room.
 *   2. **A refusal is a REASON.** `ship … to Narnia-on-Sea` was asserted
 *      with `/heard of/i`; the controller's own answer is
 *      `controller-rejected: unknown-destination`. Binding to the reason
 *      is what exposed that the original checkpoint had never once
 *      reached the destination check at all (see `ship`, below).
 *
 * ⚠ **A fresh actor per run, deliberately.** The `ship` checkpoint hands
 * over goods, and the only goods this character owns without a shopping
 * trip are the aether implant it is BORN with — which char-gen mints
 * again for the next one. So the file is repeatable in the sense that
 * matters (it consumes only what the world regenerates) at the price of
 * one linkdead avatar per run. That litter is real and is reported in
 * the run notes, not solved here.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectNote,
  expectNoNote,
  detailOf,
} from '../src/harness';

declareFile({
  file: 'logistics.wire.test.ts',
  packs: ['transport', 'trade-haulage', 'terminus', 'rejection', 'world-seed'],
});

const SQUARE = '/world/terminus/market/square';

let p: Session;

/** Where the traveller is standing, structurally. */
async function whereAmI(): Promise<string> {
  const here = await p.queryOne('here', ['displayName']);
  return String((here as { displayName?: string })?.displayName ?? '');
}

/**
 * Walk one leg and answer with the room actually reached.
 *
 * ⚠ Every move asserts. The original script walked its return route with
 * unchecked `cmd(dir)` calls, so a leg that silently failed would have
 * put every later checkpoint in the wrong room and reported the drift as
 * eight unrelated content failures.
 */
async function go(dir: string): Promise<string> {
  const moved = await p.cmd(dir);
  expectOk(moved);
  return whereAmI();
}

/** What is standing here, by name — the structural `look`. */
async function peerNames(): Promise<string[]> {
  const rows = await p.query('peers', { fields: ['displayName'] });
  return rows.map((r) => String((r as { displayName?: string }).displayName ?? ''));
}

beforeAll(async () => {
  p = await Session.open(uniqueHandle('haul'), { startLocation: SQUARE });
}, 120_000);

afterAll(() => p?.close());

suite('the realm is contiguous', () => {
  /*
   * ⚠ No teleport, no wizard flag, no `clone`. `requiresWizard` is the
   * TypeScript-trust axis and is never a stand-in for content authority,
   * so a test that flagged itself would prove something no player can
   * do. Everything below is reachable by walking.
   */
  it('walks Terminus to Rejection on foot', async () => {
    const legs: [string, RegExp][] = [
      ['south', /bank|confluence/i],
      ['south', /ford/i],
      ['south', /milestone/i],
      ['south', /drove/i],
      ['south', /flats/i],
      ['south', /crossroads/i],
      ['west', /lower climb/i],
      ['west', /last water/i],
      ['west', /pass/i],
      ['west', /tips/i],
      ['west', /yard gate/i],
      ['northeast', /pithead/i],
    ];
    for (const [dir, expected] of legs) {
      expect(await go(dir), `after ${dir}`).toMatch(expected);
    }
  }, 180_000);

  it('Rejection is still Rejection — the road did not replace it', async () => {
    // The outcrop's colour is authored prose with no projected field
    // behind it: a counted read, and honestly one.
    expect(await p.prose('look outcrop')).toMatch(/green|malachite|verdigris/i);
  });
});

suite('the pass is a barrier with one way through', () => {
  it('the gate says where bulk breaks, and the last water is a place', async () => {
    expect(await go('southwest')).toMatch(/yard gate/i);
    expect(await go('east')).toMatch(/tips/i);
    expect(await go('east')).toMatch(/pass/i);
    expect(await p.prose('look board')).toMatch(
      /NO WHEELS BEYOND THIS GATE|BREAK YOUR LOAD/i
    );
    expect(await go('east')).toMatch(/last water/i);
    expect(await p.prose('look trough')).toMatch(/LAST WATER|trough|water/i);
  }, 120_000);
});

suite('the depot at Wharfside', () => {
  beforeAll(async () => {
    // Back down the Delight to the bank, then EAST along the quay.
    for (const dir of ['east', 'east', 'north', 'north', 'north', 'north', 'north']) {
      await go(dir);
    }
    expect(await go('east')).toMatch(/towpath|quay/i);
  }, 180_000);

  it('the depot is a staffed public counter', async () => {
    /*
     * ⭐ AC12 — "a stranger can read the tariff" — asserted
     * STRUCTURALLY, because the prose version of it is not
     * clock-independent (below) and a suite must not be.
     */
    const peers = await peerNames();
    expect(peers.join(' | ')).toMatch(/rate board/i);
    expect(peers.join(' | ')).toMatch(/counter|shed/i);
    expect(peers.join(' | ')).toMatch(/warehouseman|dispatcher/i);
  });

  it('the tariff is refused for LIGHT, never for permission', async () => {
    /*
     * ⭐⭐ **A finding, and the reason this checkpoint is shaped like
     * this.** The original drive asserted `/RATES|rate|carrier/i` on the
     * board's text. The quay is outdoors, and at the game hour a fresh
     * world boots into, the answer is
     * `controller-rejected: too-dark-to-read` — *"There is writing on
     * the rate board, but you cannot make out a word of it in this
     * light."* So that checkpoint passed or failed **by time of day**,
     * and nobody knew.
     *
     * What AC12 actually claims is an AUTHORITY fact: the tariff is
     * public, and a stranger with no standing at the depot may read it.
     * A darkness refusal proves the reader got past the authority gate;
     * a permission refusal would be the failure. That is what this
     * asserts, and it is true at every hour.
     */
    const read = await p.cmd('read board');
    for (const note of read.notes) {
      const reason = (note as { reason?: string }).reason ?? '';
      expect(
        reason,
        `reading a public tariff must never be refused for standing`
      ).not.toMatch(/permission|denied|not-allowed|unauthori[sz]ed/i);
    }
  });

  it('ships to a remote place NAMED, and refuses one nobody has heard of', async () => {
    /*
     * ⭐⭐ **The checkpoint the original drive claimed and never once
     * performed.** Its header says it buys a handcart "on the way"; the
     * script never buys anything, so `ship handcart to Rejection`
     * answered *"There's no 'handcart' here to send"* — a GOODS refusal,
     * which fires before the destination is ever resolved. The assertion
     * was `!/heard of/i`, and a goods refusal satisfies it. So the
     * checkpoint was green for its whole life while testing nothing.
     *
     * Binding to the reason is what surfaced it: `expectNote` demands
     * `unknown-destination` and gets `no-goods`, loudly.
     *
     * The fix is to ship something the character actually has. Every
     * avatar is born carrying an aether implant, so that is the parcel.
     */
    const nowhere = await p.cmd('ship implant to Narnia-on-Sea --worth 12');
    expectNote(nowhere, 'controller-rejected', {
      reason: 'unknown-destination',
    });

    const shipped = await p.cmd('ship implant to Rejection --worth 12');
    expectOk(shipped);
    // ⭐ A remote place NAMED, not spelled as a template path — which is
    // what `resolvePlace` could not do for this verb's whole life, so
    // both examples in `ship`'s own help were unusable.
    expectNoNote(shipped, 'controller-rejected');
  });

  it('`journey` is unafforded where nothing stands to journey IN', async () => {
    /*
     * ⭐ **The affordance rule, and a correction to the original.** The
     * drive ran `journey to Narnia-on-Sea` at this quay and asserted the
     * refusal LISTS the stops you may name. But `journey` is contributed
     * by `Vehicular` — a vehicle affords it — and no vehicle stands on
     * this quay, so the honest answer here is that the verb does not
     * exist for you. `help journey` still renders: the verb is
     * installed, it is simply not yours to type standing here.
     *
     * ⓘ Reported, not judged: whether a barge SHOULD be moored at the
     * estuary depot is the logistics owner's question. What is certain
     * is that the original checkpoint could not have passed here as
     * written.
     */
    const bad = await p.cmd('journey to Narnia-on-Sea');
    const note = expectNote(bad, 'command-rejected', { reason: 'unknown-verb' });
    expect(detailOf(note)).toBe('journey');
  });
});

suite('the labor market is visible', () => {
  it('answers the backhaul read', async () => {
    expectOk(await p.cmd('jobs'));
    const back = await p.cmd('jobs --origin here');
    expectOk(back);
    expect(await back.said()).toMatch(
      /wanting carriage|nothing wants moving|board is bare|go back empty|Posted work/i
    );
  });

  it('reads a keeper’s orders from anywhere by origin', async () => {
    /*
     * ⓘ REPORTED, never asserted. `restocks` is the only NPC that posts,
     * its board is in the bar, and the bar is off the map — but a gig's
     * ORIGIN is the supplier's counter, which is in Terminus. Whether
     * she is short right now is the world's business, not the test's.
     *
     * ⚠⚠ Do NOT guess a reason in the reported line. The original drive
     * printed "(the bar's par may be met)" for three green runs while
     * the truth was the opposite — the par was maximally unmet and the
     * keeper was structurally unable to order anything at all.
     */
    const keeper = await p.cmd(
      'jobs --origin /world/terminus/counting-houses/cash-and-carry'
    );
    expectOk(keeper);
    const said = await keeper.said();
    console.log(
      /wanting carriage/i.test(said)
        ? '   ⓘ the bar keeper HAS posted — carriage wanted out of the cash-and-carry'
        : '   ⓘ NOTHING posted out of the cash-and-carry. This test cannot\n' +
            '     see why (the Lounge is off the map): off shift, unfunded, or\n' +
            '     the loop is broken. Check it.'
    );
  });
});

suite('the goods yards', () => {
  it('are behind the city, with a door for every trade', async () => {
    expect(await go('west')).toMatch(/bank|confluence/i);
    expect(await go('northwest')).toMatch(/goods yards|yard/i);
  }, 60_000);

  it('a producer floor is no longer an exitless island', async () => {
    expect(await go('northeast')).toMatch(/floor|still|rack|mill|shop/i);
    // The works board is furniture: structural presence, not its text.
    expect((await peerNames()).join(' | ')).toMatch(/works board/i);
  }, 60_000);

  it('the board is readable; what is ON it is a player’s business', async () => {
    /*
     * ⚠ Expected BARE on a fresh realm, and that is not a defect: no NPC
     * posts to a producer floor's board. The hand walks its own goods to
     * the counter. This proves the board answers at all.
     */
    expectOk(await p.cmd('jobs'));
  });
});
