/**
 * The economic bootstrap's drive — grown wave by wave; W4 lands the
 * reserve and the treasury. Every checkpoint is written to FAIL: it
 * asserts the completion line, never a word the refusal also contains.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectNote,
  expectRefused,
  detailOf,
} from '../src/harness';

export const DIRTY_REASON =
  'creates characters through char-gen (each signs an Arrival Note that stays on the book), ' +
  'moves the start location and the Governor\'s Schedule rows and restores them, ' +
  'and appropriates from the treasury — money that stays in the world';

declareFile({
  file: import.meta.url,
  packs: ['platform', 'terminus', 'saxonberg-lounge'],
  dirtyReason: DIRTY_REASON,
});

const HALL = '/world/terminus/counting-houses/banking-hall';
const COUNTING_HOUSES = '/world/terminus/counting-houses/business';
const DISTRIBUTOR = '/world/terminus/counting-houses/distributor/idea/business';
const FARM_YARD = '/world/terminus/goods-yards/farm/location/yard';
const PANTRY_FLOOR = '/world/terminus/goods-yards/pantry/location/floor';
const SHOP_FLOOR = '/world/terminus/general-store/shop-floor';
const STORE_COUNTER = '/world/terminus/general-store/counter';
/** The goods, by the keyword only a crate of limes / a sack of coffee carries. */
const LIMES = 'limes';
const COFFEE = 'coffee';
/** The eval jurisdiction: the realm — a governed eval may touch only what its parcel contains. */
const PARCEL = '--parcel /world/terminus';

/**
 * Fire one of an NPC's cadence beats NOW rather than waiting out its
 * timer — the wizard goes to where the NPC stands and evals the beat on
 * it. The beat itself is untouched: it walks, buys, borrows and shelves
 * exactly as it would at the top of its cadence; only the clock is ours.
 */
async function fire(npcRoom: string, npcKeyword: string, brain: string): Promise<void> {
  expectOk(await wizard.cmd(`goto ${npcRoom}`));
  const said = await wizard.prose(
    `eval ${PARCEL} --on ${npcKeyword} return this.fireBeat('${brain}')`,
  );
  expect(said).not.toMatch(/error|threw|denied/i);
}

/**
 * Walk a session through exits, letting each step's prose SETTLE before
 * the next command: a room description lands after the move's envelope,
 * and the harness files late frames under whatever command is in flight.
 */
async function walk(s: Session, ...directions: string[]): Promise<void> {
  for (const d of directions) {
    const r = await s.cmd(`go ${d}`);
    expectOk(r);
    await r.said();
  }
}

/** Wait for a read to come true — a beat walks the city and takes real seconds. */
async function until(read: () => Promise<boolean>, ms = 90_000): Promise<boolean> {
  const deadline = Date.now() + ms;
  for (;;) {
    if (await read()) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, 2_000));
  }
}
const CASH_AND_CARRY_COUNTER = '/world/terminus/counting-houses/distributor/thing/counter';

/**
 * Fire a hand's beat until a read comes true — a beat carries a dozen
 * goods off a floor of forty in whatever order they stand, so the crate
 * a step needs may take a few beats to come up.
 */
async function fireUntil(
  npcRoom: string,
  npcKeyword: string,
  brain: string,
  read: () => Promise<boolean>,
  beats = 5,
): Promise<boolean> {
  for (let i = 0; i < beats; i += 1) {
    if (await read()) return true;
    await fire(npcRoom, npcKeyword, brain);
    if (await until(read, 45_000)) return true;
  }
  return read();
}

/** How many goods carrying `keyword` a counter holds, read over the wire. */
async function onHand(counterPath: string, keyword: string): Promise<number> {
  return (await wizard.query(`${counterPath}:i:[keyword.${keyword}]`)).length;
}

let founder: Session;
let wizard: Session;
/** The newcomer of step 1 — embodied through char-gen itself, never provisioned. */
let a: Session;
let aHandle = '';
let aName = '';
let startLocationBefore = '';

beforeAll(async () => {
  founder = await Session.open('founder', { startLocation: HALL });
  wizard = await Session.open(uniqueHandle('eb-wizard'), { startLocation: HALL, wizard: true });
  // A newcomer arrives where the lounge's setting says; for the drive
  // they arrive in the banking hall, so the wage step can bank them.
  // Restored in afterAll.
  const said = await wizard.prose('config defaultStartLocation');
  startLocationBefore = said.match(/=\s*(\S+)/)?.[1] ?? '/world/lounge/idea/warren';
  expectOk(await wizard.cmd(`config defaultStartLocation ${HALL}`));
});

afterAll(async () => {
  if (startLocationBefore) await wizard.cmd(`config defaultStartLocation ${startLocationBefore}`);
  // The estate clocks and the edition window, back to the shipped Schedule.
  await wizard.cmd('config press.indexEditionGameHours 6');
  await wizard.cmd('config estate.dormantAfterDays 30');
  await wizard.cmd('config estate.escheatAfterDays 180');
  await wizard.cmd('config employment.absenceVacatesAfterDays 14');
  a?.close();
  wizard?.close();
  founder?.close();
});

describe('1. a new player creates a character', () => {
  it('⭐ at `embody confirm` the Treasury has advanced twenty against the Note; `wallet` lists it; the paper reads in words', async () => {
    aHandle = uniqueHandle('newcomer');
    aName = `Arriva${Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 5)}`;
    a = await Session.embody(aHandle, { name: aName });
    // Coin in hand — disbursed, not minted (the supply line does not move
    // for it; the perpetual's purchase is what moves it).
    const coins = await a.query('inventory:i:[keyword.coin]');
    expect(coins.length).toBeGreaterThan(0);
    // The wallet lists the paper, in words, with no digits in the terms.
    const wallet = await a.prose('wallet');
    expect(wallet).toMatch(/You hold an Arrival Note for twenty zorkmids, at no interest, to the Treasury/);
    // The paper is in the member's own record store — nothing carried, no
    // NPC handed it over — and reading it gives every term in words.
    // Which home is theirs: the one whose papers they may read (the
    // parcel-title gate refuses every other member's).
    const homes = (await a.prose('ls /home')).trim().split(/\s+/).filter((l) => l.startsWith('/home/'));
    expect(homes.length).toBeGreaterThan(0);
    let face = '';
    for (const home of homes) {
      const papers = await a.prose(`ls ${home}/papers`);
      if (!/arrival-note/.test(papers)) continue;
      const read = await a.prose(`cat ${home}/papers/arrival-note`);
      if (/An Arrival Note/.test(read)) {
        face = read;
        break;
      }
    }
    expect(face).toMatch(/An Arrival Note/);
    expect(face).toMatch(/Rate: none — the Compact's rate for newcomers/);
    expect(face).toMatch(/Discharge: forgiven on the first wage earned/);
    expect(face).toMatch(/Recourse: none beyond the security/);
    expect(face).toMatch(/No labor is ever owed/);
    expect(face).not.toMatch(/\d/);
  }, 120_000);
});

describe('2. the cash-and-carry', () => {
  it('⭐ the crates carry the SHOP\'s ask; `look` says whose terms; a buy credits the shop, whose book shows what it still owes the farm', async () => {
    // The farm hand's consigning beat, fired now: the crates go up on the
    // distributor's terms — the outfit's PRICE, the shop's own ask.
    expect(await fireUntil(FARM_YARD, 'hand', '/lib/behavior/consigns', async () => (await onHand(CASH_AND_CARRY_COUNTER, LIMES)) > 0)).toBe(true);
    // The newcomer banks the advance first — four fives cannot make eight
    // exactly, and the implant can — then walks: the hall → the avenue →
    // the cash-and-carry.
    expect(await a.prose('look')).toMatch(/banking hall/i);
    expectOk(await a.cmd('bank open'));
    expectOk(await a.cmd('bank deposit coins'));
    expect(await a.prose('bank')).toMatch(/Your balance is 20 zorkmids/);
    await walk(a, 'east', 'south');
    expect(await a.prose('look')).toMatch(/cash-and-carry/i);
    const crate = await a.prose('look limes:[1]');
    expect(crate).toMatch(/Held on the farm outfit's terms until sold; the shop asks 8 zorkmids/);
    // Twenty banked, eight for the crate.
    const bought = await a.prose('buy limes');
    expect(bought).toMatch(/You buy/);
    expect((await a.query('inventory:i:[keyword.limes]')).length).toBe(1);
    // The shop's book, as its keeper: the crates still up are what it owes
    // the farm — and the one just sold is not on it (the farm was paid).
    expectOk(await founder.cmd(`appoint me to keeper at ${DISTRIBUTOR}`));
    await walk(founder, 'east', 'south');
    const book = await founder.prose('house book');
    expect(book).toMatch(/owed to the farm outfit: \d+ zorkmids on \d+ unsold/);
    // The sale is the SHOP's: its P&L carries the sale and the terms it
    // paid the farm; nothing of it went to the farm directly.
    const pnl = await founder.prose('house pnl');
    expect(pnl).toMatch(/sales/i);
    expect(pnl).toMatch(/terms|cogs/i);
    await walk(founder, 'north', 'west');
    await walk(a, 'north', 'west');
  }, 300_000);
});

describe('3. the first wage discharges the Note', () => {
  it('⭐ the moment a wage lands the note discharges: a message, no note in the wallet, the balance theirs', async () => {
    // The newcomer banks (an account to be paid into), the founder puts
    // them on the Counting-Houses' chart and pays them a wage from the
    // house — a house that opened on the treasury's advance.
    // They arrived in the hall (the start location the drive set) and
    // introduce themselves — until they do, the founder sees "a human"
    // and has no name to appoint.
    expect(await a.prose('look')).toMatch(/banking hall/i);
    expectOk(await a.cmd('introduce'));
    expectOk(await founder.cmd(`appoint me to officer at ${COUNTING_HOUSES}`));
    expectOk(await founder.cmd(`appoint ${aName} to teller at ${COUNTING_HOUSES}`));
    const paid = await founder.prose(`house payroll ${aName} 5`);
    expect(paid).toMatch(/You pay .* a wage of 5 zorkmids/);
    const heard = await a.prose('wallet');
    expect(heard).not.toMatch(/Arrival Note/);
    // Twenty banked, eight spent on the crate, five earned.
    const bank = await a.prose('bank');
    expect(bank).toMatch(/Your balance is 17 zorkmids/);
  }, 120_000);
});

describe('4. the reserve', () => {
  it('the dashboard shows the two lanes and the three numbers; `reserve mint` is refused', async () => {
    const said = await founder.prose('reserve');
    expect(said).toMatch(/the perpetual, held/);
    expect(said).toMatch(/window advances outstanding/);
    expect(said).toMatch(/money per active member/);
    expect(said).toMatch(/price index/);
    expect(said).not.toMatch(/\btotal\b/i);
    // Refused at the BINDER — the subcommand no longer exists in the view.
    expectRefused(await founder.cmd('reserve mint 5'));
    expectRefused(await founder.cmd('reserve issue 5'));
  });

  it('the Governor writes a reserve row and no other', async () => {
    const before = await founder.prose('reserve set reserve.haircut 0.25');
    expect(before).toMatch(/now reads `reserve.haircut = 0.25`/);
    expectNote(await founder.cmd('reserve set treasury.arrivalPrincipal 99'), 'controller-rejected', { reason: 'not-a-reserve-row' });
    expectOk(await founder.cmd('reserve set reserve.haircut 0.20'));
  });
});

describe('5. the treasury', () => {
  it('appropriates to Dave\'s Bar; the bar rises, the treasury falls, the supply does not move', async () => {
    const supplyLine = (s: string) => s.match(/Money supply \(zorkmids\): [^\n]+/)?.[0] ?? '';
    // A treasury touch: the perpetual rule buys first.
    const book0 = await founder.prose('treasury');
    expect(book0).toMatch(/the perpetual, issued/);
    const supply0 = supplyLine(await founder.prose('reserve supply'));
    expect(supply0).not.toBe('');
    const said = await founder.prose('treasury appropriate 100 to bar');
    expect(said).toMatch(/appropriates 100 zorkmids to .*[Bb]ar/);
    const supply1 = supplyLine(await founder.prose('reserve supply'));
    expect(supply1).toBe(supply0);
    const book1 = await founder.prose('treasury');
    const held = (s: string) => Number(s.match(/holds:\s*(\d+)/)?.[1] ?? NaN);
    const advanced = (s: string) => Number(s.match(/opening advances outstanding:\s*(\d+)/)?.[1] ?? NaN);
    // The treasury falls by the appropriation — and by any opening float
    // it advanced a house that stood up between the two reads (the
    // standing facility runs on its own clock, and the book says so).
    expect(held(book0) - held(book1)).toBe(100 + (advanced(book1) - advanced(book0)));
  });
});

describe('6. an NPC shop borrows', () => {
  it('⭐ the general store, short of stock and of cash, completes its first terms on the float, then presents to Goodkin; the advance lands, the goods are shelved, the paper stands on the book', async () => {
    // Goods at the cash-and-carry for the keeper to buy: both hands' beats.
    // Counted at BOTH counters — the keeper's own clock is already
    // buying what the hands bring, crate by crate.
    const inTrade = async (kw: string): Promise<number> =>
      (await onHand(CASH_AND_CARRY_COUNTER, kw)) + (await onHand(STORE_COUNTER, kw));
    expect(await fireUntil(FARM_YARD, 'hand', '/lib/behavior/consigns', async () => (await inTrade(LIMES)) >= 3)).toBe(true);
    expect(await fireUntil(PANTRY_FLOOR, 'hand', '/lib/behavior/consigns', async () => (await inTrade(COFFEE)) >= 2)).toBe(true);
    // ⭐ WATCH — the keeper's own clock does the rest (a beat every
    // ninety seconds), and the drive only reads. Beat one: the store
    // opened on the treasury's float (fifty) — less than a restocking beat
    // costs. It presents to Goodkin and is REFUSED (no purchase history),
    // then buys what the float covers: three crates of limes. Three
    // completed terms on its ledger. Beat two: still short (the coffee),
    // still short of cash — and now with three terms behind it, Goodkin
    // lends; the advance lands, the coffee is bought and shelved.
    expect(
      await until(
        async () => (await onHand(STORE_COUNTER, LIMES)) === 3 && (await onHand(STORE_COUNTER, COFFEE)) === 2,
        480_000,
      ),
    ).toBe(true);
    // The paper: Goodkin holds it (the founder is Goodkin's officer), the
    // reserve's window shows the advance outstanding.
    const book = await founder.prose('bank book');
    expect(book).toMatch(/Goodkin holds:/);
    expect(book).toMatch(/the general store/);
    const reserve = await founder.prose('reserve');
    expect(reserve).toMatch(/window advances outstanding: (?!0 )\d+/);
    // The shop's ask moves with its shelf: three crates at par ask base;
    // the coffee, at par, its base.
    expectOk(await wizard.cmd(`goto ${SHOP_FLOOR}`));
    expect(await wizard.prose('look limes:[1]')).toMatch(/The shop asks 10 zorkmids/);
  }, 900_000);
});

describe('7. the ladder, from the counter', () => {
  it('`bank borrow` at Goodkin is refused with the NUMBER not met; `bank book` reads the paper', async () => {
    // The founder buys for a house (the founder-default seats), so the
    // LADDER GATE itself answers: three completed terms are required, and
    // the refusal names the number the house has.
    const refused = await founder.cmd('bank borrow 50');
    expectNote(refused, 'controller-rejected', { reason: 'ladder-gate' });
    const note = refused.notes.find((n) => n.kind === 'controller-rejected');
    expect(detailOf(note!)).toMatch(/completed supplier terms are required; you have (zero|one|two)/);
    const book = await founder.prose('bank book');
    expect(book).toMatch(/no paper here with your name|holds:/);
    // The rate board quotes per game-year with the real-month equivalent.
    const board = await founder.prose('look board');
    expect(board).toMatch(/FIVE PER CENT A GAME-YEAR \(A REAL MONTH\)/);
  });

  it('⭐⭐ a player opens a stall, is refused at Goodkin with the number, completes the Schedule\'s terms, and is lent', async () => {
    const stem = aName.toLowerCase();
    // The newcomer rents a stall on the square — five, from the wage they banked.
    await walk(a, 'east', 'southwest');
    expect(await a.prose('look')).toMatch(/square/i);
    const rented = await a.prose('stall rent');
    expect(rented).toMatch(/You rent a stall on the square/);
    // Straight to the window as the house: refused, with the NUMBER.
    await walk(a, 'northeast', 'west');
    expectOk(await a.cmd('wallet use house'));
    const refused = await a.cmd('bank borrow 20 --for stock');
    expectNote(refused, 'controller-rejected', { reason: 'ladder-gate' });
    expect(detailOf(refused.notes.find((n) => n.kind === 'controller-rejected')!)).toMatch(/you have zero/);

    // Three supplier terms, completed: the founder leaves a crate on the
    // stall's terms at six; a customer buys it at the stall's ask; the
    // stall pays the founder. Each sale is a `terms` leg out of the
    // stall's account — the ladder's own count.
    expectOk(await founder.cmd('bank open'));
    expectOk(await founder.cmd('reserve override 100 to founder "drive: the grower\'s float"'));
    expectOk(await wizard.cmd(`goto ${HALL}`));
    expectOk(await wizard.cmd('bank open'));
    expectOk(await founder.cmd(`reserve override 100 to ${wizard.handle} "drive: the customer\'s float"`));
    // Oranges, not limes: the farm grows four crates of each and the
    // general store's keeper has the limes.
    for (let i = 0; i < 3; i += 1) {
      expect(await fireUntil(FARM_YARD, 'hand', '/lib/behavior/consigns', async () => (await onHand(CASH_AND_CARRY_COUNTER, 'oranges')) > 0)).toBe(true);
      await walk(founder, 'east', 'south');
      expect(await founder.prose('buy oranges')).toMatch(/You buy/);
      await walk(founder, 'north', 'southwest');
      const left = await founder.prose(`consign oranges --ask 6 on ${stem}`);
      expect(left).toMatch(/on the shop's terms/);
      await walk(founder, 'northeast', 'west');
      expectOk(await wizard.cmd(`goto /world/terminus/market/square`));
      // The stall holds it (the terms line itself was read at step 2; the
      // customer's own crates from the last round come first in reach).
      expect(await wizard.prose(`look ${stem}`)).toMatch(/crate of oranges/);
      expect(await wizard.prose(`buy oranges from ${stem}`)).toMatch(/You buy/);
    }
    // Lent, now: the advance lands and the paper stands on both books.
    const lent = await a.cmd('bank borrow 20 --for stock');
    expectOk(lent);
    const mine = await a.prose('bank book');
    expect(mine).toMatch(/owes:/);
    expect(await founder.prose('bank book')).toMatch(new RegExp(`${aName}'s stall`, 'i'));
  }, 600_000);
});

describe('8. a house cannot meet payroll', () => {
  it('⭐ the wage is not paid into the red: refused with the reason, and it stands on the book in arrears', async () => {
    // The Counting-Houses paid the first wage at step 3 (the drive's
    // employer; the mechanism is every house's). Asked for more than it
    // holds, with no repayment history to earn a working-capital line, the
    // house refuses — and the wage is owed, not forgotten.
    // The founder is in the hall (step 7 walked them back).
    expect(await founder.prose('look')).toMatch(/banking hall/i);
    const refused = await founder.cmd(`house payroll ${aName} 100000`);
    expect(refused.status).not.toBe('ok');
    const said = await founder.prose(`house payroll ${aName} 100000`);
    expect(said).toMatch(/Payroll refused: the house holds .* no working-capital line/);
    const book = await founder.prose('house book');
    expect(book).toMatch(new RegExp(`Wages in arrears:\\s*\\n\\s*${aName}: 100000 zorkmids`));
  }, 120_000);
});

describe('9. a borrower stops trading', () => {
  it('⭐ past the default horizon with a balance outstanding, Goodkin repossesses the pledged stock and the reserve\'s default rate ticks', async () => {
    const stem = aName.toLowerCase();
    // The stall stocks on the advance: a crate bought as the house at the
    // cash-and-carry and put on the counter — the security the loan named.
    expect(await fireUntil(FARM_YARD, 'hand', '/lib/behavior/consigns', async () => (await onHand(CASH_AND_CARRY_COUNTER, 'oranges')) > 0)).toBe(true);
    await walk(a, 'east', 'south');
    expect(await a.prose('buy oranges')).toMatch(/You buy/);
    await walk(a, 'north', 'southwest');
    // On THEIR stall — `stall` alone binds the produce stalls first.
    expect(await a.prose(`put oranges in ${stem}`)).not.toMatch(/can't|cannot|don't/i);
    expect(await wizard.prose(`look ${stem}`)).toMatch(/crate of oranges/);
    // The horizon collapsed to now; the next read of the book reveals it.
    expectOk(await wizard.cmd('config reserve.defaultHorizonGameDays 0'));
    await a.prose('house book');
    expect(await until(async () => !/crate of oranges/.test(await wizard.prose(`look ${stem}`)), 30_000)).toBe(true);
    // The horizon back FIRST: the dashboard's read reconciles every open
    // loan, and at zero it would default the general store's too.
    expectOk(await wizard.cmd('config reserve.defaultHorizonGameDays 30'));
    // The officer's dashboard: the rate is no longer zero.
    const board = await founder.prose('reserve');
    expect(board).toMatch(/default rate on window paper: (?!zero)/);
    // Back to the hall for the estate steps.
    await walk(a, 'northeast', 'west');
  }, 300_000);
});

/** A few seconds, in days — the estate clocks are real days. */
const SECONDS_IN_DAYS = (n: number): string => String(n / 86_400);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('10. a player goes dormant', () => {
  it('⭐ logged out past the short clock: the seat is vacant, the stall shows the closed sign; a login lifts the freeze and the seat stays vacated', async () => {
    // The seat at the Counting-Houses they hold — on the chart while they
    // are here, beside the authored teller.
    expectOk(await wizard.cmd('goto /world/terminus/market/square'));
    expect(await founder.prose('house roster')).toMatch(new RegExp(`teller: ${aName}`));
    const before = await a.prose('bank');
    // The clocks, shortened to seconds; the newcomer logs out — the
    // capture on the way out is the row the clocks read.
    expectOk(await wizard.cmd(`config estate.dormantAfterDays ${SECONDS_IN_DAYS(3)}`));
    expectOk(await wizard.cmd(`config employment.absenceVacatesAfterDays ${SECONDS_IN_DAYS(3)}`));
    a.close();
    await sleep(8_000);
    // The stall: the operator brought current on a customer's approach
    // reads the keeper's clock and hangs the sign — nobody is served.
    const stem = aName.toLowerCase();
    const refused = await wizard.cmd(`buy oranges from ${stem}`);
    expectNote(refused, 'controller-rejected', { reason: 'unattended' });
    // Back: the balance whole, the freeze lifted by presence — and the
    // seat VACATED: the chart could not wait, and a return does not
    // restore what absence took.
    a = await Session.open(aHandle, { startLocation: HALL });
    await sleep(3_000);
    expect(await a.prose('bank')).toBe(before);
    expect(await founder.prose('house roster')).not.toMatch(new RegExp(`teller: ${aName}`));
    expectOk(await wizard.cmd(`config employment.absenceVacatesAfterDays 14`));
  }, 120_000);
});

describe('11. a player escheats', () => {
  it('⭐ past the long clock, on the next touch: the stall is retired, the balance sits in the treasury unclaimed; logging back in, the treasury pays', async () => {
    const stem = aName.toLowerCase();
    const heldBefore = Number((await a.prose('bank')).match(/balance is (\d+)/)?.[1] ?? NaN);
    expect(heldBefore).toBeGreaterThan(0);
    const book0 = await founder.prose('treasury');
    const unclaimed = (s: string) => Number(s.match(/unclaimed[^\d]*(\d+)/i)?.[1] ?? NaN);
    expectOk(await wizard.cmd(`config estate.escheatAfterDays ${SECONDS_IN_DAYS(3)}`));
    a.close();
    await sleep(8_000);
    // The next touch: a customer approaches the stall — the operator is
    // brought current, its keeper's clock read, and the estate passes.
    expectOk(await wizard.cmd('goto /world/terminus/market/square'));
    await wizard.cmd(`buy oranges from ${stem}`);
    const stall = new RegExp(`${stem}'s stall`, 'i');
    expect(await until(async () => !stall.test(await wizard.prose('look')), 60_000)).toBe(true);
    // The unclaimed row is the last act of the passing; wait for it.
    expect(await until(async () => unclaimed(await founder.prose('treasury')) >= unclaimed(book0) + heldBefore, 60_000)).toBe(true);
    // The return: the treasury pays what it held; the balance is theirs again.
    expectOk(await wizard.cmd(`config estate.escheatAfterDays 180`));
    expectOk(await wizard.cmd(`config estate.dormantAfterDays 30`));
    a = await Session.open(aHandle, { startLocation: HALL });
    expect(await until(async () => Number((await a.prose('bank')).match(/balance is (\d+)/)?.[1] ?? 0) >= heldBefore, 30_000)).toBe(true);
    expect(await a.prose('wallet')).not.toMatch(/unclaimed/);
  }, 180_000);
});

describe('12. the Gazette prints the index', () => {
  it('⭐ the editor prints the basket in words; buy out a shelf and the next edition\'s number moves', async () => {
    const AVENUE = '/world/terminus/counting-houses/avenue-block';
    // The edition window shortened so a second edition may follow the first.
    expectOk(await wizard.cmd('config press.indexEditionGameHours 0.001'));
    await fire(AVENUE, 'hesper', '/lib/behavior/prints');
    expect(await until(async () => /Prices: the basket stands at/.test(await wizard.prose('press')), 30_000)).toBe(true);
    const first = (await wizard.prose('press')).match(/Prices: the basket stands at [^\n]+/)?.[0] ?? '';
    // A shelf bought out: the general store's limes, three of them — the
    // stocking rule's ask climbs as the counter empties, and the index with it.
    expectOk(await wizard.cmd(`goto ${SHOP_FLOOR}`));
    for (let i = 0; i < 3; i += 1) {
      const bought = await wizard.cmd('buy limes');
      if (bought.status !== 'ok') break;
    }
    expect(await onHand(STORE_COUNTER, LIMES)).toBe(0);
    await fire(AVENUE, 'hesper', '/lib/behavior/prints');
    expect(
      await until(async () => {
        const page = await wizard.prose('press');
        const editions = page.match(/Prices: the basket stands at [^\n]+/g) ?? [];
        return editions.length >= 2 && editions.some((e) => e !== first);
      }, 30_000),
    ).toBe(true);
  }, 180_000);
});
