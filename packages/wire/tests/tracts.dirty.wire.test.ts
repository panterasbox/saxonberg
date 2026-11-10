/**
 * ⭐ The tracts drive (tracts build D37) — the addendum's script: a farm
 * is a holding sold off a plat, laid out in TRACTS of open ground; its
 * holder MARKS FIELDS on a tract; a house lot's garden takes beds, not
 * fields. Every step instant or short (a blocking drive never jumps more
 * than a game day); the season on the marked field is the soak twin's.
 *
 *   1. a valley farmstead bought at the land board; the yard's ways name
 *      the tracts
 *   2. `look upper bench` from the yard: rough ground, nothing marked
 *   3. on the bench: it reads its own ground
 *   4. `mark barley field as a third of it`
 *   5. `mark wheat field as two-thirds of it`; a third mark refused
 *   6. [staged seedbed] wheat sown on the wheat field; its line will not
 *      move through the crop
 *   7. a second farmstead across the lane is the same layout, mirrored
 *   8. Quist's bench, read from his yard: its three fields
 *   9. a Hinkley lot's garden: `mark` refused by zoning, in its words
 *  10. herds graze fields: the pasture's herd, the campus herd's field
 *  11. the farm archetype, asked at Quist's farm (a finding if no verb
 *      reaches it)
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
  worldClockNow,
} from '../src/harness';

export const DIRTY_REASON =
  'buys two valley farmsteads and a Hinkley lot with issued coin (none ' +
  'can be sold back), marks fields on one, ploughs it and sows it';

declareFile({
  file: 'tracts.dirty.wire.test.ts',
  packs: [
    'platform',
    'residence',
    'trade-farming',
    'trade-ranching',
    'hearts-delight',
    'hinkley-hills',
    'eternal-university',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const VALLEY = '/world/terminus/hearts-delight/valley';
const VALLEY_LANE = '/world/terminus/hearts-delight/location/valley-lane';
const QUIST_YARD = '/world/terminus/hearts-delight/location/farmstead-yard';
const PASTURE = '/world/terminus/hearts-delight/dairy/location/pasture';
const YARD = '/world/terminus/eternal/campus-farm/location/yard';
const REALTY = '/world/terminus/realty/office';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const STORE = '/world/terminus/general-store/shop-floor';
const HINKLEY_LANE = '/world/terminus/hinkley-hills/location/lane';

const record: string[] = [];
function note(line: string): void {
  const flat = line.replace(/\s+/g, ' ').trim();
  record.push(flat);
  console.log(`[tracts drive] ${flat}`);
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

const DAY = 86_400;

/**
 * Make it daylight — on to 10 o'clock when it is not — with every body
 * logged out (an offline body is frozen). Under a day: a short step.
 */
async function daylight(): Promise<void> {
  const now = await worldClockNow();
  const into = ((now % DAY) + DAY) % DAY;
  const hour = into / 3_600;
  if (hour >= 8 && hour <= 16) return;
  const wait = into < 10 * 3_600 ? 10 * 3_600 - into : DAY - into + 10 * 3_600;
  await advanceWorldClock(`${Math.max(1, Math.round(wait / 60))} minutes`);
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
let neighbor = '';
let p: Session;
let lot = '';

async function goTo(who: string, where: string): Promise<Session> {
  const s = await Session.open(who, { startLocation: where });
  await s.drainProse();
  return s;
}

beforeAll(async () => {
  farmer = uniqueHandle('farmer');
  neighbor = uniqueHandle('neighbor');
  await funded(farmer);
  await funded(neighbor);
  await daylight();
}, 600_000);

afterAll(() => {
  p?.close();
  if (record.length > 0) console.log(`\n[tracts drive record]\n${record.join('\n')}\n`);
});

suite.skipIf(!isOwnedTestWorld())('the valley farmstead — tracts and fields', () => {
  it('1. a farmstead bought at the land board; its yard\'s ways name the tracts', async () => {
    // Land changes hands at a deed desk: the Terminus realty office.
    p = await goTo(farmer, REALTY);
    const book = await read(p, 'title list');
    lot = unsoldLot(book, /^farmstead-1$/) || unsoldLot(book, /^farmstead-/);
    expect(lot, `an unsold farmstead on the valley book: ${book.slice(0, 300)}`).toBeTruthy();
    await doing(p, `title buy ${lot}`);
    p.close();
    p = await goTo(farmer, VALLEY_LANE);
    await doing(p, `go ${gateOf(lot)}`);
    const yard = await read(p, 'look');
    expect(yard).toMatch(/farmyard/i);
    expect(yard).toMatch(/\bup\b/i);
  }, 600_000);

  it('2. `look upper bench` from the yard: rough ground, nothing marked yet', async () => {
    const seen = await read(p, 'look "upper bench"');
    expect(seen).toMatch(/Nobody has marked a field on it/i);
  }, 300_000);

  it('3. on the bench, it reads its own ground', async () => {
    await doing(p, 'go up');
    const here = await read(p, 'look');
    expect(here).toMatch(/upper bench/i);
    expect(here).toMatch(/rough ground/i);
  }, 300_000);

  it('4. `mark barley field as a third of it`', async () => {
    const said = await doing(p, 'mark barley field as a third of it');
    expect(said).toMatch(/barley field — a third of the upper bench/i);
  }, 300_000);

  it('5. the wheat field takes the rest; there is none left for a third', async () => {
    const said = await doing(p, 'mark wheat field as two-thirds of it');
    expect(said).toMatch(/two-thirds of the upper bench/i);
    const none = await refused(p, 'mark oat field as a quarter', 'all-marked');
    expect(none).toMatch(/marked already/i);
    expect(await read(p, 'look')).toMatch(/At the barley field .*At the wheat field|At the wheat field .*At the barley field/is);
  }, 300_000);

  it('6. [staged seedbed] wheat sown on the wheat field; the line will not move through it', async () => {
    p.close();
    p = await goTo(farmer, STORE);
    await doing(p, 'buy "seed wheat"');
    p.close();
    // ⭐ The farmstead's plough lies at the bench's headland: the wheat
    // field is ploughed by the farmer, for real.
    const gate = gateOf(lot);
    p = await goTo(farmer, VALLEY_LANE);
    await doing(p, `go ${gate}`);
    await doing(p, 'go up');
    let said = '';
    for (let i = 0; i < 6 && !/ploughed for the season/i.test(said); i++) {
      said = (await act(p, 'plow at the "wheat field"')).said + ' ' + (await read(p, 'look at the "wheat field"'));
    }
    expect(said, 'the wheat field is ploughed').toMatch(/ploughed for the season/i);
    const sown = await act(p, 'plant wheat --at "the wheat field"');
    expect(refusedFor(sown.r), sown.said).toBeNull();
    expect(await read(p, 'look')).toMatch(/stand of wheat grows/i);
    const moved = await refused(p, 'mark wheat field as half', 'crop-stands');
    expect(moved).toMatch(/cannot move a boundary through standing wheat/i);
  }, 600_000);

  it('7. a farmstead across the lane is the same layout, mirrored', async () => {
    const desk = await goTo(neighbor, REALTY);
    let other = '';
    try {
      // The book lists what sold and the NEXT free lot; buying walks it on.
      const book = await read(desk, 'title list');
      other = unsoldLot(book, /^farmstead-/);
      expect(other, 'the next farmstead is for sale').toBeTruthy();
      await doing(desk, `title buy ${other}`);
    } finally {
      desk.close();
    }
    const n = await goTo(neighbor, VALLEY_LANE);
    try {
      await doing(n, `go ${gateOf(other)}`);
      // ⭐ The meadow lies AWAY from the lane on both sides: east of an
      // east-side yard, west of a west-side one.
      const meadow = ['farmstead-1', 'farmstead-3'].includes(other) ? 'east' : 'west';
      await doing(n, `go ${meadow}`);
      expect(await read(n, 'look')).toMatch(/lower meadow/i);
    } finally {
      n.close();
    }
  }, 600_000);
});

suite.skipIf(!isOwnedTestWorld())('the authored farms, and the house lot', () => {
  it("8. Quist's bench, read from his yard: its three fields", async () => {
    const q = await goTo(farmer, QUIST_YARD);
    try {
      const seen = await read(q, 'look "upper bench"');
      expect(seen).toMatch(/top end/i);
      expect(seen).toMatch(/lane end/i);
    } finally {
      q.close();
    }
  }, 300_000);

  it("9. a Hinkley lot's garden takes beds, not fields — in the zoning's words", async () => {
    const h = uniqueHandle('householder');
    await funded(h, 5000);
    const reg = await goTo(h, REALTY);
    let house = '';
    let side = '';
    try {
      const book = await read(reg, 'title list');
      house = unsoldLot(book, /^lot-/);
      expect(house, 'an unsold Hinkley lot').toBeTruthy();
      const bought = await doing(reg, `title buy ${house}`);
      // ⭐ The registrar says which side of the lane the gate is on.
      side = /gate is on the (\w+) side/i.exec(bought)?.[1] ?? '';
      expect(side, `the sale names the gate side: ${bought}`).toBeTruthy();
    } finally {
      reg.close();
    }
    const s = await goTo(h, HINKLEY_LANE);
    try {
      expect(await doing(s, `go ${side}`)).toMatch(/yard behind the house/i);
      await doing(s, 'go west');
      expect(await read(s, 'look')).toMatch(/garden/i);
      const said = await refused(s, 'mark vegetable field as half', 'zoned-against-fields');
      expect(said).toMatch(/zoned residential — dwelling, companions and small cultivation — and takes beds, not fields/i);
      expect(await read(s, 'look bed')).toMatch(/bed/i);
    } finally {
      s.close();
    }
  }, 900_000);

  it('10. herds graze fields: the pasture\'s herd, and the campus herd on its field', async () => {
    const a = await goTo(farmer, PASTURE);
    try {
      expect(await read(a, 'look')).toMatch(/grazing it/i);
    } finally {
      a.close();
    }
    // The campus herd's book says which FIELD of which tract it is on —
    // wherever the cover drive (same world) has moved it since.
    const b = await goTo(farmer, YARD);
    try {
      expect(await read(b, 'look herdbook')).toMatch(/grazing (the \w[\w ]* of )?the (home field|back paddock)/i);
    } finally {
      b.close();
    }
  }, 300_000);

  it("11. the farm archetype, asked at Quist's farm", async () => {
    const q = await goTo(farmer, QUIST_YARD);
    try {
      const said = await read(q, 'survey');
      note(`survey at Quist's yard (D36 — a finding if it names no farm): ${said.slice(0, 300)}`);
    } finally {
      q.close();
    }
  }, 300_000);
});

/** The lane's gate direction for a valley lot — the plat's gate ring. */
function gateOf(leaf: string): string {
  return ({ 'farmstead-1': 'east', 'farmstead-2': 'west', 'farmstead-3': 'northeast', 'farmstead-4': 'northwest' } as Record<string, string>)[leaf] ?? 'east';
}

