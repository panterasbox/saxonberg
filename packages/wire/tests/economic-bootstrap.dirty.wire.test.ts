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
    const home = (await a.prose('ls /home')).trim().split('\n').find((l) => l.startsWith('/home/')) ?? '';
    expect(home).toMatch(/^\/home\/\S+$/);
    const papers = await a.prose(`ls ${home}/papers`);
    expect(papers).toMatch(/arrival-note/);
    const face = await a.prose(`cat ${home}/papers/arrival-note`);
    expect(face).toMatch(/An Arrival Note/);
    expect(face).toMatch(/Rate: none — the Compact's rate for newcomers/);
    expect(face).toMatch(/Discharge: forgiven on the first wage earned/);
    expect(face).toMatch(/Recourse: none beyond the security/);
    expect(face).toMatch(/No labor is ever owed/);
    expect(face).not.toMatch(/\d/);
  }, 120_000);
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
    expectOk(await a.cmd('bank open'));
    expectOk(await founder.cmd(`appoint me to officer at ${COUNTING_HOUSES}`));
    expectOk(await founder.cmd(`appoint ${aName} to teller at ${COUNTING_HOUSES}`));
    const paid = await founder.prose(`house payroll ${aName} 5`);
    expect(paid).toMatch(/You pay .* a wage of 5 zorkmids/);
    const heard = await a.prose('wallet');
    expect(heard).not.toMatch(/Arrival Note/);
    const bank = await a.prose('bank');
    expect(bank).toMatch(/Your balance is 5 zorkmids/);
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
    expect(held(book0) - held(book1)).toBe(100);
  });
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
});
