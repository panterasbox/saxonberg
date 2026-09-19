/**
 * The economic bootstrap's drive — grown wave by wave; W4 lands the
 * reserve and the treasury. Every checkpoint is written to FAIL: it
 * asserts the completion line, never a word the refusal also contains.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  expectOk,
  expectNote,
  expectRefused,
} from '../src/harness';

export const DIRTY_REASON =
  'moves the Governor\'s Schedule rows and restores them, mints by recorded override, ' +
  'and appropriates from the treasury — money that stays in the world';

declareFile({
  file: import.meta.url,
  packs: ['platform', 'terminus', 'saxonberg-lounge'],
  dirtyReason: DIRTY_REASON,
});

const HALL = '/world/terminus/counting-houses/banking-hall';

let founder: Session;

beforeAll(async () => {
  founder = await Session.open('founder', { startLocation: HALL });
});

afterAll(() => {
  founder?.close();
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
