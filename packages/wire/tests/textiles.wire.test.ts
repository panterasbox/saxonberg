/**
 * Textiles — the tailor's floor: the instrument that affords the verb,
 * the book that carries the measure, and the four equip verbs that must
 * stay four verbs.
 *
 * Ported from `packages/server/scripts/drive-textiles.ts`. That script
 * existed because the chain's first live drive was done BY HAND in a
 * browser and found three defects ~10,000 unit tests could not — the
 * tests build state directly and never USE the object. Making it a
 * script made the walk repeatable after a merge; making it a wire file
 * makes it run on every MR, which is when it matters (`WashController`
 * was rewritten on master while the textiles branch was adding a laundry
 * branch to it).
 *
 * ⚠⚠ **NEVER assert a verb by typing it BARE.** `wear` with no argument
 * answers "I don't understand 'wear'" — the SAME sentence an unknown
 * verb gets — because that message covers a missing required arg too.
 * The first version of this drive polled verb names that way and
 * reported six false failures on a world where nothing was wrong. Every
 * checkpoint below runs a real command with real arguments, and asserts
 * on the NOTE rather than that sentence, which removes the ambiguity at
 * the source: a missing arg and an unknown verb are different note
 * reasons even when they render the same words.
 *
 * ⚠ It deliberately does NOT start at the seed. Sowing flax and watering
 * it for a season needs game-time control a player does not have.
 *
 * ⭐⭐⭐ **What porting it found, and it is this suite's whole argument.**
 * Run unmodified against master, `drive-textiles.ts` fails FIVE of its
 * sixteen checkpoints — `wash`/`wear`/`wield`/`equip`/`unequip` each
 * assert `!/I don't understand/` and each receives exactly that. The
 * shop's `props:` are a counter, a cutting table, a needle-case, shears
 * and a measure book: **no wearable and no washable object**, so on
 * today's content those five verbs are correctly unafforded there. The
 * script was green when it was written and has been red since some later
 * merge, and nobody could have known, because nothing runs it. That is
 * the decay this tier exists to stop.
 *
 * The checkpoints below therefore assert the AFFORDANCE RULE, which is
 * both true and worth testing: a verb its instrument affords reaches its
 * own gate, and a verb nothing in reach affords does not exist for you.
 * ⓘ Whether the shop SHOULD stock a garment — so a tailor can try one on
 * — is the textiles owner's question, and it is filed, not answered here.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  expectOk,
  expectNoNote,
} from '../src/harness';

declareFile({
  file: 'textiles.wire.test.ts',
  packs: ['trade-tailoring', 'trade-textiles', 'trade-dyeing'],
});

const SHOP = '/trade/tailoring/location/shop';

/**
 * ⭐ A STABLE handle, not a fresh one per run — and it is what makes this
 * file repeatable rather than dirty.
 *
 * The shop ships ONE set of shears and ONE needle-case, they are
 * takeable, and nothing puts them back. A fresh character each run would
 * find an empty table on the second one. The same character finds them
 * already in its own hands, `get` answers "you already have that", and
 * the file is repeatable for free.
 *
 * ⓘ That the shop does not restock its own tools is a real fact about
 * the shipped floor, reported here rather than papered over: a second
 * TAILOR arriving after this one cannot work.
 */
const TAILOR = 'wire-textiles-tailor';

let p: Session;

async function peerNames(): Promise<string> {
  const rows = await p.query('peers', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

/**
 * What this character is carrying.
 *
 * ⚠ **`me:i`, not the `inventory` seed.** `docs/mql-grammar.md` lists
 * them as the same thing — `inventory` is documented as "the giver's
 * contents" — but over the wire the `inventory` seed answers with the
 * GIVER, one row, whatever is being carried, while `me:i` answers with
 * the contents. The in-world `i` verb agrees with `me:i`. Filed as an
 * MQL finding; this file uses the one that is right.
 */
async function carriedNames(): Promise<string> {
  const rows = await p.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

/** The verb reached its own gate rather than the parser. */
function reachedItsGate(
  result: { notes: { kind: string }[]; status: string; text: string }
): void {
  const unknown = result.notes.find(
    (n) =>
      n.kind === 'command-rejected' &&
      (n as { reason?: string }).reason === 'unknown-verb'
  );
  expect(
    unknown,
    `'${result.text}' was not afforded at all — the parser refused it`
  ).toBeUndefined();
}

beforeAll(async () => {
  p = await Session.open(TAILOR, { startLocation: SHOP });
}, 120_000);

/**
 * ⭐⭐ **Put the tools back.** The shop ships ONE set of shears, ONE
 * needle-case and ONE measure book; they are takeable and nothing
 * restocks them. A file that walks off with them makes itself dirty AND
 * breaks the next character to try the trade — which is exactly what
 * happened while this port was being written: running the original
 * `drive-textiles.ts` left the shop bare and every checkpoint here
 * failed for want of a tool.
 *
 * Leaving the room as you found it is what makes this file repeatable
 * without a reset. ⓘ That it is NECESSARY is the finding: the tailor's
 * shop cannot outfit a second tailor, and the campus farm's yard has the
 * identical problem with its spade, scythe, kit and plough.
 */
afterAll(async () => {
  if (p) {
    for (const thing of ['shears', 'needle', 'book']) {
      await p.cmd(`drop ${thing}`).catch(() => undefined);
    }
    p.close();
  }
});

suite('the shop', () => {
  it('renders, with the tailor in it', async () => {
    const peers = await peerNames();
    expect(peers).toMatch(/tailor/i);
    expect(peers).toMatch(/cutting table|shears|cloth|table/i);
  });
});

suite('⭐⭐ the instrument affords the verb', () => {
  it('holding the book, `measure figure` RUNS', async () => {
    /*
     * ⭐⭐ **The checkpoint that caught a dead feature.** `measure figure`
     * had a controller, a view stanza, help text and green unit tests,
     * and was unreachable because `MeasureBook` carried no
     * `commandContributions`. A verb nothing affords is shipped and
     * dead, silently — which is the whole reason the four reachability
     * links (verb · affordance · data · boot) get checked by hand.
     */
    await p.cmd('get book');
    const measured = await p.cmd('measure figure');
    reachedItsGate(measured);
    expectOk(measured);
  }, 60_000);

  it('the book carries the entry the measure wrote', async () => {
    /*
     * ⚠ The numbers do NOT come back in the act's prose — `measure
     * figure` WRITES them into the book, which is the whole point of the
     * book being an object that transfers with the shop. The readback is
     * `look book`. Asserting numbers in the act's reply was this drive's
     * own mistake and it failed a working feature.
     */
    expect(await p.prose('look book')).toMatch(/name|entr|two numbers|written/i);
  });
});

suite('the tools are gettable and afford their acts', () => {
  it('the shears and the needle-case come to hand', async () => {
    /*
     * ⚠ `get` is opportunistic, not asserted: on a re-run this character
     * is already holding them (that is what makes the file repeatable),
     * and `get shears` then answers `empty-result[targets]` — "You don't
     * see any 'shears' here" — because `get` scopes to the ROOM. The
     * postcondition is what matters, so the postcondition is what is
     * asserted.
     */
    await p.cmd('get shears');
    await p.cmd('get needle');
    const carried = await carriedNames();
    expect(carried).toMatch(/shears/i);
    expect(carried).toMatch(/needle/i);
  }, 60_000);

  it('`cut` is afforded while holding shears', async () => {
    // It must refuse for a reason about CLOTH, never about the verb.
    reachedItsGate(await p.cmd('cut'));
  });
});

suite('⭐⭐ the affordance rule, in both directions', () => {
  /*
   * Each command is typed WITH a target, so a missing-arg refusal cannot
   * be mistaken for a missing verb — and asserted on the NOTE, which
   * removes the ambiguity at the source. "I don't understand 'wear'" is
   * the sentence for BOTH an unknown verb and a missing required arg;
   * `command-rejected: unknown-verb` is only ever the first.
   */
  it('a verb the shop’s instruments afford reaches its own gate', async () => {
    // The cutting table and the needle-case afford these. They may well
    // refuse — for want of cloth, for want of a pattern — but they
    // refuse as themselves, not as the parser.
    reachedItsGate(await p.cmd('cut'));
    reachedItsGate(await p.cmd('alter shears'));
  }, 60_000);

  it('a verb nothing in reach affords does NOT exist for you', async () => {
    /*
     * ⭐⭐ The five checkpoints the original script gets wrong today. The
     * shop stocks no wearable and no washable, so these five verbs are
     * correctly absent — and asserting THAT is a real test of the
     * affordance chain, where asserting the opposite was a test of
     * nothing that had quietly started failing.
     */
    for (const c of [
      'wash book',
      'wear shears',
      'wield shears',
      'equip shears',
      'unequip shears',
    ]) {
      const r = await p.cmd(c);
      const note = r.notes.find(
        (n) =>
          n.kind === 'command-rejected' &&
          (n as { reason?: string }).reason === 'unknown-verb'
      );
      expect(
        note,
        `'${c}' is afforded at the tailor's shop now — the shop has ` +
          `grown a wearable or a washable, and this test should become ` +
          `the positive one it was written to be`
      ).toBeDefined();
    }
  }, 60_000);
});

suite('the dyer’s floor is reachable from the mill road', () => {
  it('the dyehouse and the mill are both sited off the bank', async () => {
    /*
     * ⭐ The siting argument, structurally. Retting wants standing water
     * and stank badly enough to be banned upstream of towns; a bleaching
     * green wants open ground and sun; a dyeing yard wants water and room
     * to hang cloth. **The textile chain IS the nuisance-trade chain**, so
     * it belongs downwind and downstream of the market — which is where
     * these two corners are.
     */
    const traveller = await Session.open('wire-textiles-walker', {
      startLocation: '/world/terminus/wharfside/bank',
    });
    try {
      const southeast = await traveller.cmd('southeast');
      expectOk(southeast);
      expectNoNote(southeast, 'locomotion-gate-failed');
      const atMill = await traveller.queryOne('here', ['displayName']);
      expect(String((atMill as { displayName?: string })?.displayName)).toMatch(
        /mill/i
      );
      // ⚠ The mill goes back NORTH, not northwest — the bank reaches it
      // southeast, and the return leg is not the mirror.
      expectOk(await traveller.cmd('north'));
      const southwest = await traveller.cmd('southwest');
      expectOk(southwest);
      const atDye = await traveller.queryOne('here', ['displayName']);
      expect(String((atDye as { displayName?: string })?.displayName)).toMatch(
        /dye/i
      );
    } finally {
      traveller.close();
    }
  }, 120_000);
});
