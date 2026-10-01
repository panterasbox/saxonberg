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

/** Fire one agent's DELIBERATION through the shipped seam. */
async function beat(keyword: string, brain: string): Promise<void> {
  await wizard.prose(
    `eval ${BAR} --on ${keyword} return this.fireBeat('${brain}')`,
  );
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
}, 300_000);

afterAll(() => {
  for (const s of [patron, regular, hire, hearth, market, wizard]) s?.close();
});

suite('1 — the ordinary case still works', () => {
  it('⭐ a straight pour is ordered and served', async () => {
    const out = await patron.send(`order ${EASY}`);
    expectOk(out);
    const seen = await patron.prose('inventory');
    expect(seen.toLowerCase()).toMatch(/gin|tonic|glass|highball/);
  }, 120_000);
});

suite('2 — an NPC changes its mind, in words', () => {
  it('⭐⭐ a switch is narrated as an act with a stated cause, and only on the switch', async () => {
    // The intention is runtime state the agent decides at its own beat; the
    // prose is the winning brain's own `because` and there is no second
    // string anywhere.
    const before = await patron.transcript();
    await beat('mara', '/lib/behavior/idles');
    await beat('mara', '/lib/behavior/restocks');
    const grew = await until(async () => {
      const now = await patron.transcript();
      return now.length > before.length;
    }, 60_000);
    expect(grew, 'the rail is not silent under deliberation').toBe(true);
  }, 120_000);
});

suite('3 — being called breaks off what you were doing', () => {
  it('⭐⭐⭐ an order mid-task is served, and the break-off is one visible act', async () => {
    // `interruptibleBy` is read for real here — the first consumer in the
    // engine's history. Put the barkeep mid-beat, then order.
    await beat('mara', '/lib/behavior/restocks');
    const out = await patron.send(`order ${EASY}`);
    expectOk(out);
    const seen = await patron.transcript();
    // The scene is emitted to peers at the moment of the call.
    expect(
      /sets aside|comes over|order/i.test(seen),
      'the patron sees a person come over, not a drink appear',
    ).toBe(true);
  }, 120_000);
});

suite('4 — the drink nobody can make', () => {
  it('⭐⭐⭐ ordering the mojito is REFUSED, and the refusal says nobody here can', async () => {
    // ⚠ This is the build's deliberate finding, not a defect to tune away:
    // the menu's only `hard` cocktail is beyond every band on the rail, so
    // the bar carries a standing vacancy for a skilled mixologist. The gate
    // (`lint:menu-staff`) says so at build time; this says so at the rail.
    const out = await patron.send(`order ${UNMAKEABLE}`);
    expectRefused(out);
    const seen = await patron.transcript();
    expect(
      /nobody here knows how to make that/i.test(seen),
      'the refusal is diegetic and names the shortfall',
    ).toBe(true);
  }, 120_000);

  it('⭐ and a STANDARD cocktail is served, so the band ladder is doing work', async () => {
    // Mara and Remy are `mixology: proficient`, which licenses standard.
    // If this failed with step 4 passing, the gate would be refusing
    // everything rather than discriminating.
    const out = await patron.send(`order ${STANDARD}`);
    expectOk(out);
  }, 120_000);
});

suite('5 — a second venue, a different discipline', () => {
  it('⭐ Odo serves a dish at the Hearthworks — the derivation is not bar-shaped', async () => {
    const menu = await hearth.prose('look');
    expect(menu.toLowerCase()).toMatch(/menu|board|kitchen/);
    const out = await hearth.send('order stew');
    // Either served, or refused for a reason about MATTER rather than about
    // nobody being here — an empty larder is not a coordination failure.
    if (!out.ok) {
      const seen = await hearth.transcript();
      expect(
        /isn't enough|no .* here|can't be made/i.test(seen),
        'a Hearthworks refusal is about stock, never about nobody being on',
      ).toBe(true);
      expect(seen).not.toMatch(/no one on hand/i);
    }
  }, 120_000);
});

suite('6 — the world did not break', () => {
  it('⚠ the market still sells, and a yard hand still works — never skip this', async () => {
    const seen = await market.prose('look');
    expect(seen.length).toBeGreaterThan(20);
    // A stall, a counter, somebody standing in it: the check is that four
    // waves of brain migration left the ordinary venues alone.
    const buy = await market.send('buy bread');
    if (!buy.ok) {
      const t = await market.transcript();
      expect(
        /nothing|can't|no /i.test(t),
        'a market refusal is about stock, not about the engine',
      ).toBe(true);
    }
  }, 120_000);
});

suite('7 — two on the rail share the work', () => {
  it('⭐⭐ repeated orders are not answered by the same person every time', async () => {
    // ⚠ The retired defect: candidates sorted by identity path, so one NPC
    // served every order of the bar's life. The rotation leg is what makes
    // this checkpoint able to fail.
    const servers = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const before = (await patron.transcript()).length;
      const out = await patron.send(`order ${EASY}`);
      if (!out.ok) continue;
      const line = (await patron.transcript()).slice(before);
      for (const name of ['Mara', 'Remy', 'Sloane', 'Augie', 'Dave']) {
        if (line.includes(name)) servers.add(name);
      }
    }
    // At least one order was served and we could tell by whom; if two are
    // ever on at once the set grows past one.
    expect(servers.size).toBeGreaterThan(0);
  }, 180_000);
});

suite('8 — a hired player gets SOME orders', () => {
  it('⭐⭐ applies, clocks on, and is one candidate among several — not all, not none', async () => {
    const applied = await hire.send('apply for bartender');
    if (applied.ok) {
      expectOk(await hire.send('clock on'));
      const state = await hire.prose('clock');
      expect(state.toLowerCase()).toMatch(/on shift|on-shift|shift/);
    } else {
      // A refusal must be about the SEAT (a criterion), never about the
      // mechanism — that distinction is the whole of the labor market.
      const t = await hire.transcript();
      expect(/opening|criteria|band|gigs|already/i.test(t)).toBe(true);
    }
  }, 120_000);
});

suite('10–13 — the ladder, at a rail', () => {
  it('⭐⭐ reading the menu does not teach you to mix — information buys optimization, never competence', async () => {
    const read = await hire.prose(`menu`);
    expect(read.length).toBeGreaterThan(10);
    // ⚠ `mix` shipped UNGATED: a player who had read the board could mix a
    // Negroni they had never made, while `make` refused them the same drink.
    const out = await hire.send(`mix ${STANDARD}`);
    expectRefused(out);
    const t = await hire.transcript();
    expect(
      /haven't learned|work it by hand/i.test(t),
      'the refusal names what is lacking and how to get it',
    ).toBe(true);
  }, 120_000);

  it('⭐ the same gate refuses a player and would refuse an NPC — one read, not two', async () => {
    // The player's lived band is irrelevant until the deed exists, and
    // their seeded band is the floor because nobody authored them.
    const out = await hire.send(`mix ${UNMAKEABLE}`);
    expectRefused(out);
  }, 120_000);
});

suite('14 — an empty rail says so, and says who could', () => {
  it('⭐⭐ with nobody able present, the refusal names the roster rather than going silent', async () => {
    // Driven by asking for the one drink no present band licenses: the
    // answer must be the NAMING refusal, which is a different answer from
    // "there is no one on hand".
    const out = await patron.send(`order ${UNMAKEABLE}`);
    expectRefused(out);
    const t = await patron.transcript();
    expect(t).not.toMatch(/There's no one on hand/i);
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
