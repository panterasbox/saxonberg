/**
 * ⛔ **A SOAK file** (span steps — `pnpm wire:soak`, run by the soak lane
 * after merge, never in a blocking run). The span twin of
 * `tracts.dirty.wire.test.ts` (tracts build D37): a field marked on a
 * fresh valley farmstead grows a season and is cut — the crop a holder's
 * own `mark` made room for, through to the sickle.
 *
 * The body is logged out across every jump (an offline body is frozen,
 * so it needs no food and no shelter); the clock moves ten game days at a
 * step.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  engagementIdOf,
  isOwnedTestWorld,
  advanceWorldClock,
} from '../src/harness';

export const DIRTY_REASON =
  'buys a valley farmstead with issued coin, marks a field, ' +
  'ploughs it, sows it and cuts the crop a season later';

declareFile({
  file: 'tracts.soak.dirty.wire.test.ts',
  packs: ['platform', 'residence', 'trade-farming', 'hearts-delight', 'terminus'],
  dirtyReason: DIRTY_REASON,
});

const DAY = 86_400;
const VALLEY = '/world/terminus/hearts-delight/valley';
const VALLEY_LANE = '/world/terminus/hearts-delight/location/valley-lane';
const REALTY = '/world/terminus/realty/office';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const STORE = '/world/terminus/general-store/shop-floor';

const record: string[] = [];
function note(line: string): void {
  const flat = line.replace(/\s+/g, ' ').trim();
  record.push(flat);
  console.log(`[tracts soak] ${flat}`);
}

/** Every way a command dies before or inside its controller. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const n = (r.notes as Array<{ kind?: string; reason?: string; detail?: string }>).find(
    (x) =>
      x.kind === 'controller-rejected' ||
      x.kind === 'command-rejected' ||
      x.kind === 'validator-failed' ||
      x.kind === 'mql-error' ||
      x.kind === 'empty-result' ||
      x.kind === 'target-declined',
  );
  if (!n) return null;
  return n.reason ?? n.detail ?? n.kind ?? null;
}

async function act(s: Session, text: string): Promise<{ r: CommandResult; said: string }> {
  const r = await s.cmd(text);
  const engaged = (r.notes as Array<{ kind?: string }>).some((n) => n.kind === 'engagement-started');
  if (engaged) {
    await s.awaitActivity(engagementIdOf(r), 180_000);
    await new Promise((res) => setTimeout(res, 1_500));
  }
  const said = `${await r.said()} ${engaged ? await s.listen(800) : ''}`.trim();
  note(`${text} → ${refusedFor(r) ?? 'ok'} · ${said.slice(0, 300)}`);
  return { r, said };
}

async function doing(s: Session, text: string): Promise<string> {
  const { r, said } = await act(s, text);
  expect(refusedFor(r), `'${text}' was refused: ${said} ${JSON.stringify(r.notes)}`).toBeNull();
  return said;
}

async function refused(s: Session, text: string, reason: string): Promise<string> {
  const { r, said } = await act(s, text);
  expect(refusedFor(r), `'${text}' should be refused '${reason}': ${said}`).toBe(reason);
  return said;
}

async function read(s: Session, text: string): Promise<string> {
  const r = await s.cmd(text);
  const said = await r.said();
  note(`${text} → ${said.slice(0, 500)}`);
  return said;
}

/** A funded stranger: an account at the bank, and the Governor's override into it. */
async function funded(handle: string, zorkmids = 20000): Promise<void> {
  const s = await Session.open(handle, { startLocation: BANK_HALL });
  try {
    await s.drainProse();
    await act(s, 'bank open');
    const gov = await Session.open('founder', { startLocation: BANK_HALL });
    try {
      // A valley farmstead is 16 000; a Hinkley lot 4 000.
      await doing(gov, `reserve override ${zorkmids} to ${handle} "wire: tracts funding"`);
    } finally {
      gov.close();
    }
  } finally {
    s.close();
  }
}

/** The first lot on a book's listing that is not sold, from `title list`. */
function unsoldLot(book: string, wanted?: RegExp): string {
  for (const line of book.split('\n')) {
    const m = /^\s*([a-z][a-z-]*-\d+)\s+—\s+(.*)$/.exec(line);
    if (!m) continue;
    if (/sold|held|owned/i.test(m[2]!)) continue;
    if (wanted && !wanted.test(m[1]!)) continue;
    return m[1]!;
  }
  return '';
}

let farmer = '';
let lot = '';
let p: Session;

async function goTo(who: string, where: string): Promise<Session> {
  const s = await Session.open(who, { startLocation: where });
  await s.drainProse();
  return s;
}

/** Jump the clock ten game days at a step, the body logged out. */
async function season(days: number): Promise<void> {
  p?.close();
  let left = days * DAY;
  while (left > 0) {
    const step = Math.min(left, 10 * DAY);
    const { before, after } = await advanceWorldClock(`${Math.round(step / 60)} minutes`);
    expect(after - before, 'world-time did not move').toBeGreaterThan(step * 0.9);
    left -= step;
  }
}

async function toTheBench(): Promise<void> {
  p = await goTo(farmer, VALLEY_LANE);
  await doing(p, `go ${gateOf(lot)}`);
  await doing(p, 'go up');
}

beforeAll(async () => {
  farmer = uniqueHandle('farmer');
  await funded(farmer);
}, 600_000);

afterAll(() => {
  p?.close();
  if (record.length > 0) console.log(`\n[tracts soak record]\n${record.join('\n')}\n`);
});

suite.skipIf(!isOwnedTestWorld())('a marked field through a season', () => {
  it('a farmstead bought, a field marked, the seedbed staged, wheat sown', async () => {
    p = await goTo(farmer, STORE);
    await doing(p, 'buy "seed wheat"');
    await doing(p, 'buy sickle');
    p.close();
    p = await goTo(farmer, REALTY);
    const book = await read(p, 'title list');
    lot = unsoldLot(book, /^farmstead-/);
    expect(lot).toBeTruthy();
    await doing(p, `title buy ${lot}`);
    p.close();
    await toTheBench();
    await doing(p, 'mark wheat field as half');
    let said = '';
    for (let i = 0; i < 6 && !/ploughed for the season/i.test(said); i++) {
      said = (await act(p, 'plow at the "wheat field"')).said + ' ' + (await read(p, 'look at the "wheat field"'));
    }
    expect(said, 'the wheat field is ploughed').toMatch(/ploughed for the season/i);
    await doing(p, 'plant wheat --at "the wheat field"');
    expect(await read(p, 'look')).toMatch(/stand of wheat grows/i);
  }, 900_000);

  it('[span] a season on: the wheat on the marked field ripens, and is cut', async () => {
    await season(100);
    await toTheBench();
    const seen = await read(p, 'look');
    expect(seen).toMatch(/stand of wheat/i);
    let cut = false;
    for (let i = 0; i < 12 && !cut; i++) {
      const { r, said } = await act(p, 'harvest wheat --at "the wheat field"');
      cut = refusedFor(r) === null && /cut|reap|sheaf|grain/i.test(said);
      if (refusedFor(r) === 'not-ready') await season(10).then(toTheBench);
    }
    expect(cut, 'the wheat on the marked field was cut').toBe(true);
  }, 3_600_000);
});

/** The lane's gate direction for a valley lot — the plat's gate ring. */
function gateOf(leaf: string): string {
  return ({ 'farmstead-1': 'east', 'farmstead-2': 'west', 'farmstead-3': 'northeast', 'farmstead-4': 'northwest' } as Record<string, string>)[leaf] ?? 'east';
}

