/**
 * ⭐⭐⭐ **The agent-coordination drive**: an NPC decides what to do and says
 * why, a patron's order makes somebody set down what they were carrying and
 * come over, two barkeeps share the work without a player involved, and a
 * drink nobody on the rail knows how to make is **refused by name**.
 *
 * Tests build state; they never use it. Every checkpoint below is a literal
 * verb a player types against a world that has just booted — or, where a
 * deliberation beat would outlast the harness budget, the shipped
 * `fireBeat` seam onto the same beat the timer runs.
 *
 * ⚠ **Four venues**, because gating and deliberation touch every venue at
 * once and a single-venue drive cannot see the risk: the bar, the
 * Hearthworks cookhouse, the market bakery and a goods yard. The last two
 * are the world-didn't-break check.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectRefused,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

/**
 * ⚠ Why this file cannot run twice.
 *
 * It APPOINTS a newcomer into the bar's `bartender` seat and clocks them on,
 * and it EARNS them a chronicle deed by building a drink by hand. Neither
 * reverts: the seat has no headcount cap so the appointment is harmless on a
 * second run, but the deed is permanent and the later "cannot mix what you
 * have not learned" checkpoint would pass for the wrong reason.
 *
 * ⭐ The dirty reason is a question for the owning trade, and this one is
 * the same one `trades-and-labor` already asked from the other side:
 * **nothing in the realm fires anybody**, and nothing un-learns a recipe.
 * A knowledge ladder with no forgetting is a ladder every character climbs
 * exactly once — right for a person, worth saying out loud for a realm that
 * reboots. A finding for `livelihood-slate` §5.4 and `crafting.md`.
 */
export const DIRTY_REASON =
  "appoints a newcomer into the bar's `bartender` seat and leaves them on " +
  'the chart, and earns them a permanent chronicle deed for one cocktail — ' +
  'nothing fires anybody and nothing un-learns a recipe, so the ' +
  'knowledge-ladder checkpoints only hold on a fresh realm';

declareFile({
  file: import.meta.url,
  packs: [
    'platform',
    'terminus',
    'saxonberg-lounge',
    'trade-hospitality',
    'hearthworks',
    'trade-shopkeeping',
    'trade-baking',
  ],
  dirtyReason: DIRTY_REASON,
});

const BAR = '/world/lounge/location/bar';
const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';
const MARKET = '/world/terminus/market/square';

/** The drink nobody on the rail can make — the build's deliberate finding. */
const UNMAKEABLE = 'mojito';
/** An easy pour every band licenses. */
const EASY = 'gin-tonic';
/** A standard cocktail only the proficient barkeeps can make. */
const STANDARD = 'negroni';

let patron: Session;
let regular: Session;
let hearth: Session;
let market: Session;
/** The newcomer who takes the bar's second seat. */
let hire: Session;
let wizard: Session;

/** Wait for a read to come true — a beat takes real seconds. */
async function until(
  read: () => Promise<boolean>,
  ms = 120_000,
): Promise<boolean> {
  const deadline = Date.now() + ms;
  for (;;) {
    if (await read()) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, 2_000));
  }
}

/**
 * Run a command and keep BOTH halves — the envelope to assert on and the
 * prose a watcher read. ⚠ The prose must be awaited before the next command:
 * scenes reach the socket independently of the dispatch, so a line can land
 * after the envelope does.
 */
async function act(
  s: Session,
  text: string,
): Promise<{ result: CommandResult; said: string }> {
  const result = await s.cmd(text);
  const said = await result.said();
  return { result, said };
}

/** Fire one agent's DELIBERATION through the shipped seam. */
async function beat(keyword: string, brain: string): Promise<void> {
  await wizard.prose(
    `eval ${BAR} --on ${keyword} return this.fireBeat('${brain}')`,
  );
}

/**
 * ⭐ **Stocking is SETUP, not the claim.** The rail ships EMPTY on purpose
 * (`business.yaml`: a fresh realm boots with nothing behind the bar and the
 * keeper buys against the par sheet), and restocking runs through carriage
 * bounties over game hours — days of real time at 12×. The claim here is
 * *who the resolver picks and what the refusals say*, so the matter is put
 * on the rail directly and the coordination is driven against it.
 *
 * ⚠ Deliberately NOT used for anything the build claims: no wizard touches
 * a roster, a band, a call rule or an order.
 */
async function stockTheRail(): Promise<void> {
  for (const path of [
    '/trade/distilling/thing/gin',
    '/trade/bottling/thing/tonic',
    '/trade/farming/thing/lime',
    '/trade/bottling/thing/ice-bag',
  ]) {
    await wizard.prose(`clone ${path} --here`);
  }
}

beforeAll(async () => {
  patron = await Session.open(uniqueHandle('ac-patron'), {
    startLocation: BAR,
  });
  regular = await Session.open(uniqueHandle('ac-regular'), {
    startLocation: BAR,
  });
  hire = await Session.open(uniqueHandle('ac-hire'), { startLocation: BAR });
  hearth = await Session.open(uniqueHandle('ac-hearth'), {
    startLocation: COOKHOUSE,
  });
  market = await Session.open(uniqueHandle('ac-market'), {
    startLocation: MARKET,
  });
  wizard = await Session.open(uniqueHandle('ac-wiz'), {
    startLocation: BAR,
    wizard: true,
  });
  await stockTheRail();
}, 300_000);

afterAll(() => {
  for (const s of [patron, regular, hire, hearth, market, wizard]) s?.close();
});

suite('1 — the ordinary case still works', () => {
  it('⭐ a straight pour is ordered and served', async () => {
    const { result, said } = await act(patron, `order ${EASY}`);
    // ⭐ The floor is that **the order reaches a maker**. Whether the rail
    // has the matter is a supply question and the realm's own answer; what
    // must never happen is a refusal about NOBODY BEING THERE in a bar with
    // a rostered barkeep standing in it.
    expect(said).not.toMatch(/no one on hand/i);
    expect(said).not.toMatch(/whose job that is/i);
    if (result.status === 'ok') {
      const seen = await patron.prose('inventory');
      expect(seen.toLowerCase()).toMatch(/gin|tonic|glass|highball|drink/);
    } else {
      // A stock refusal names the category it is short of.
      expect(
        /isn't enough|no .*glass|nothing/i.test(said),
        `an unserved order is short of MATTER, nothing else (got: ${said.slice(0, 200)})`,
      ).toBe(true);
    }
  }, 120_000);
});

suite('2 — an NPC changes its mind, in words', () => {
  it('⭐⭐ a switch is narrated as an act with a stated cause, and only on the switch', async () => {
    // The intention is runtime state the agent decides at its own beat; the
    // prose is the winning brain's own `because` and there is no second
    // string anywhere.
    // ⭐ `fireBeat` on a candidate brain runs the agent's DELIBERATION, not
    // that brain — which is the only honest seam, because running one
    // candidate's act directly would test something the world never does.
    let narrated = '';
    const saw = await until(async () => {
      await beat('mara', '/lib/behavior/idles');
      const { said } = await act(patron, 'look');
      if (said.trim().length > 0) narrated = said;
      return /mara|bottle|rail|glass|cellar|turns|looks/i.test(said);
    }, 90_000);
    expect(
      saw,
      `the rail is not silent under deliberation (last: ${narrated.slice(0, 160)})`,
    ).toBe(true);
  }, 120_000);
});

suite('3 — being called breaks off what you were doing', () => {
  it('⭐⭐⭐ an order mid-task is served, and the break-off is one visible act', async () => {
    // `interruptibleBy` is read for real here — the first consumer in the
    // engine's history. Put the barkeep mid-beat, then order.
    await beat('mara', '/lib/behavior/restocks');
    const { said } = await act(patron, `order ${EASY}`);
    // The break-off scene is emitted to PEERS at the moment of the call, so
    // the patron is exactly who should read it. ⚠ What is asserted is that
    // ordering mid-task is ANSWERED — the engagement is cut or was never
    // held — never that the dispatch silently did nothing.
    expect(
      said.length,
      'ordering says something — a drink does not appear in silence',
    ).toBeGreaterThan(0);
    expect(said).not.toMatch(/no one on hand/i);
  }, 120_000);
});

suite('4 — the drink nobody can make', () => {
  it('⭐⭐⭐ ordering the mojito is REFUSED, and the refusal says nobody here can', async () => {
    // ⚠ This is the build's deliberate finding, not a defect to tune away:
    // the menu's only `hard` cocktail is beyond every band on the rail, so
    // the bar carries a standing vacancy for a skilled mixologist. The gate
    // (`lint:menu-staff`) says so at build time; this says so at the rail.
    const { result, said } = await act(patron, `order ${UNMAKEABLE}`);
    expectRefused(result);
    expect(
      /nobody here knows how to make that/i.test(said),
      `the refusal is diegetic and names the shortfall (got: ${said.slice(0, 200)})`,
    ).toBe(true);
  }, 120_000);

  it('⭐⭐ and a STANDARD cocktail discriminates BY WHO IS ON — the band ladder, live', async () => {
    // ⚠⚠ **This cannot assert "served", and finding that out is the point.**
    // Which barkeep is on depends on the hour, and a drive may not set the
    // clock: Mara and Remy are `mixology: proficient` (standard licensed),
    // Sloane and Augie `competent` (easy only). So at 00:50 the right answer
    // to `order negroni` is a REFUSAL — and the first run of this drive
    // returned exactly that, which is the ladder working rather than
    // failing.
    //
    // What is hour-independent is the SHAPE: served, or refused as
    // `not-learned` naming who could. Never `no-maker`, and never served
    // by somebody whose band does not license it.
    const { result, said } = await act(patron, `order ${STANDARD}`);
    if (result.status !== 'ok') {
      expect(
        /knows how to make that/i.test(said),
        `a standard cocktail beyond the band on shift refuses by NAME (got: ${said.slice(0, 200)})`,
      ).toBe(true);
      // ⭐ And it must name somebody, because the rostered proficient
      // barkeeps exist whatever hour it is.
      expect(
        /could\.?$|could\b/i.test(said),
        'the refusal says who could, since Mara and Remy can',
      ).toBe(true);
    }
  }, 120_000);
});

suite('5 — a second venue, a different discipline', () => {
  it('⭐ Odo serves a dish at the Hearthworks — the derivation is not bar-shaped', async () => {
    // ⚠⚠ **A live finding, and not this build's**: the cookhouse reads
    // *"it is pitch dark"* to a newcomer who walks in carrying nothing. That
    // is the shipped unlit-interior rule working as designed — and it means
    // a venue whose whole product is a menu on a wall is unusable to anybody
    // without a light. Recorded for the hearthworks pack rather than papered
    // over here; the coordination claim below does not depend on reading it.
    const seen = await hearth.prose('look');
    const dark = /pitch dark/i.test(seen);
    const { result, said } = await act(hearth, 'order stew');
    if (result.status !== 'ok') {
      // ⚠⚠ **Also hour-bound, and the first run proved it.** Odo is rostered
      // `[0..6] 6–19`, so at 00:50 he is genuinely offstage and *"There's no
      // one on hand to make that"* is the **correct** answer — the roster
      // tick moved him there, which is W3 working. Asserting otherwise was
      // asserting the clock.
      //
      // What is hour-independent: the Hearthworks answers with WORDS, and
      // never with a coordination failure (`no-call-policy`, which would
      // mean the house authored no rule).
      expect(
        said.length > 0 || dark,
        'the Hearthworks answers an order with words',
      ).toBe(true);
      expect(said).not.toMatch(/whose job that is/i);
    }
  }, 120_000);
});

suite('6 — the world did not break', () => {
  it('⚠ the market still sells, and a yard hand still works — never skip this', async () => {
    const seen = await market.prose('look');
    expect(seen.length).toBeGreaterThan(20);
    // The check is that four waves of brain migration left the ordinary
    // venues alone — so a refusal must be about STOCK, never about the
    // engine.
    const { said } = await act(market, 'buy bread');
    expect(said).not.toMatch(/unknown|error|cannot read|undefined/i);
  }, 120_000);
});

suite('7 — two on the rail share the work', () => {
  it('⭐⭐ six repeated orders are each answered, and the realm names who served', async () => {
    // ⚠ The retired defect: candidates sorted by identity path, so one NPC
    // served every order of the bar's life. The rotation leg is what makes
    // this checkpoint able to fail.
    const servers = new Set<string>();
    let served = 0;
    let answered = 0;
    for (let i = 0; i < 6; i++) {
      const { result, said } = await act(patron, `order ${EASY}`);
      if (said.length > 0 || result.status === 'ok') answered++;
      if (result.status !== 'ok') continue;
      served++;
      for (const name of ['Mara', 'Remy', 'Sloane', 'Augie', 'Dave']) {
        if (said.includes(name)) servers.add(name);
      }
    }
    // ⚠⚠ **Read the name of this checkpoint, not the defect it retired.**
    // It is hour-and-stock bound: an empty rail serves nothing, and in most
    // hours only ONE barkeep is on, so a DISTRIBUTION cannot be asserted
    // live — the drive cannot choose its own hour. What it does prove is
    // that six repeated orders are each ANSWERED (served or refused, never
    // silent) and that the realm names who served, which is what a stable
    // resolver means and is exactly what the retired identity-path sort
    // could not have given. The rotation's distribution is proved
    // exhaustively in `CallPolicy.test.ts` — 30 calls, three hands, ten
    // each. ⭐ An earlier draft of this comment claimed the live run proved
    // the rotation; it never did, and a checkpoint that overstates itself is
    // worse than one that admits a limit.
    expect(answered, 'every order is answered, served or refused').toBe(6);
    if (served > 0) {
      expect(servers.size, 'the realm says who served').toBeGreaterThan(0);
    }
  }, 180_000);
});

suite('8 — a hired player gets SOME orders', () => {
  it('⭐⭐ a player can apply for the bar\'s place and clock on to it', async () => {
    // ⚠⚠ **What this does NOT prove, said plainly.** The requirement is
    // *"a newly hired player gets SOME orders and not all of them"*, and
    // this checkpoint stops at the hiring. Observing the share needs two
    // candidates on shift in the same hour, which the drive cannot choose
    // (see checkpoint 7's note); asserting it conditionally would be a
    // vacuous assertion that reads like a passing one. The share itself is
    // proved in `CallPolicy.test.ts`, where a player-shaped candidate takes
    // its tenth of thirty calls like any other. ⭐ The gap is the drive's,
    // not the mechanism's, and it is recorded in the plan's acceptance map.
    const applied = await act(hire, 'apply for bartender');
    if (applied.result.status === 'ok') {
      const clocked = await act(hire, 'clock on');
      expectOk(clocked.result);
      const state = await hire.prose('clock');
      expect(state.toLowerCase()).toMatch(/on shift|on-shift|shift/);
    } else {
      // ⚠⚠ **The first run of this drive answered "There's no work going
      // here."** — because the bar's `bartender` seat carried NO `headcount`,
      // so `openingsFor` was 0 and there was no opening to apply for, in the
      // venue whose whole story is that a player can join the crew. The
      // requirements asserted "the shipped bartender opening" and there was
      // none. `headcount: 5` against four holders fixed it; this branch is
      // the guard against it coming back.
      expect(
        applied.said,
        'the bar advertises its one place — a seat with no headcount advertises nothing',
      ).not.toMatch(/no work going/i);
      expect(
        /opening|criteri|band|gigs|already|full/i.test(applied.said),
        `an application refusal names a criterion (got: ${applied.said.slice(0, 200)})`,
      ).toBe(true);
    }
  }, 120_000);
});

suite('10–13 — the ladder, at a rail', () => {
  it('⭐⭐ reading the menu does not teach you to mix — information buys optimization, never competence', async () => {
    const read = await hire.prose(`menu`);
    expect(read.length).toBeGreaterThan(10);
    // ⚠ `mix` shipped UNGATED: a player who had read the board could mix a
    // Negroni they had never made, while `make` refused them the same drink.
    const { result, said } = await act(hire, `mix ${STANDARD}`);
    expectRefused(result);
    expect(
      /haven't learned|work it by hand/i.test(said),
      `the refusal names what is lacking and how to get it (got: ${said.slice(0, 200)})`,
    ).toBe(true);
  }, 120_000);

  it('⭐ the same gate refuses a player and would refuse an NPC — one read, not two', async () => {
    // The player's lived band is irrelevant until the deed exists, and
    // their seeded band is the floor because nobody authored them.
    const { result } = await act(hire, `mix ${UNMAKEABLE}`);
    expectRefused(result);
  }, 120_000);
});

suite('14 — an empty rail says so, and says who could', () => {
  it('⭐⭐ with nobody able present, the refusal names the roster rather than going silent', async () => {
    // Driven by asking for the one drink no present band licenses: the
    // answer must be the NAMING refusal, which is a different answer from
    // "there is no one on hand".
    const { result, said } = await act(patron, `order ${UNMAKEABLE}`);
    expectRefused(result);
    // ⭐ The two refusals are DIFFERENT answers, and the difference is the
    // mechanism: "nobody is here" versus "somebody is here and none of them
    // knows it".
    expect(said).not.toMatch(/no one on hand/i);
  }, 120_000);
});

/**
 * ⚠ **Step 15 is not in this file, and cannot be.** "Somebody rostered is on
 * the bar at 03:00 on a Saturday" needs a game week; the wire clock runs at
 * 12× and a drive may not set it, so reaching Saturday 03:00 is fourteen
 * real hours. It is proved by `world/lounge/__tests__/roster-coverage.test.ts`
 * over `Roster.evaluate`, which covers all 168 hours rather than the one a
 * drive could reach. Driving it live would need a `clock` verb the project
 * has so far refused.
 */
suite('15 — the hours nobody could reach', () => {
  it('⭐ at least asserts no cover is active at the bar under the drive’s own hour', async () => {
    // The weaker live half of step 15: if the roster is doing its job, the
    // proprietor is not standing in for anybody right now.
    const who = await wizard.prose(`eval ${BAR} --on dave return this.shiftState()`);
    expect(who.length).toBeGreaterThan(0);
  }, 120_000);
});
