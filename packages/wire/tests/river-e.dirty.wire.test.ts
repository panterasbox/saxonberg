/**
 * River, stage E — ⭐⭐ **the ferry, and the sea brought into line**,
 * driven over the wire.
 *
 * The river requirements' drive, steps 32–35, numbering kept: Nesbit's
 * ferry poled across with her bow held upstream; the ferry summoned back
 * by the bell on the far landing; the route planner taking a journey across
 * by the ferry; and the Hesper stopped at sea — her boat launched into the
 * water beside her, somebody over her side, and her course waiting for
 * them.
 *
 * Steps run elsewhere, and why:
 *  - 32's novice who lands downstream: the ferryman is on shift at the
 *    landing whenever the drive stands there, and he poles. The glide is
 *    unit-tested (`FerryExit.test.ts`).
 *  - 33's refusal at high water: the drive cannot raise the river; the
 *    brain's shout is unit-tested (`ferries.test.ts`).
 *  - 34's wagon aboard: the crossing is the ordinary traverse, which tows a
 *    hitched rig; the planner's leg is driven here.
 *  - 35's row to another ship stopped within hail: there is no second ship
 *    stopped within hail of the Hesper in the shipped sea. Two ships sharing
 *    one water is unit-tested (`SeaWarren.test.ts`).
 *
 * ⭐ Every checkpoint asserts the verb was UNDERSTOOD and a state change or
 * the words that prove one.
 *
 * ⚠⚠ `.dirty.`: it moves the ferry and the ferryman across the river, puts
 * the Hesper's boat in the sea and moves the clock. None of it is produced
 * again.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  advanceWorldClock,
  worldClockNow,
} from '../src/harness';

export const DIRTY_REASON =
  'moves Nesbit’s ferry and her ferryman across the Kestrel, puts the ' +
  'Hesper’s boat in the sea and moves the clock — none of it produced again';

declareFile({
  file: 'river-e.dirty.wire.test.ts',
  packs: ['terminus', 'water', 'transport', 'trade-haulage', 'trade-diving', 'world-seed', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const TOWPATH = '/world/terminus/estuary/lower-towpath';
const NESBIT = '/world/terminus/nesbit-ferry/landing';
const DECK = '/world/terminus/hesper/deck';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const open: Session[] = [];

async function session(handle: string, at: string): Promise<Session> {
  const s = await Session.open(handle, { startLocation: at });
  open.push(s);
  return s;
}

async function say(s: Session, text: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(text);
  return squash(await r.said());
}

/** The name of the room a session is in — never its prose, which names neighbors. */
async function roomName(s: Session): Promise<string> {
  const ref = (await s.query('here', { fields: 'ref' })) as Array<{ displayName?: string }>;
  return ref[0]?.displayName ?? '';
}

async function look(s: Session): Promise<string> {
  await s.drainProse();
  return squash(await s.prose('look here'));
}

/** Day shift: the ferryman works six to eight. */
async function morning(): Promise<void> {
  // ⭐ Late spring (days 60–100 of the 360-day year): the snowmelt is in the
  // river and the pools are open — the drive swims and steams in it.
  for (let i = 0; i < 40; i++) {
    const day = Math.floor((await worldClockNow()) / 86_400) % 360;
    if (day >= 60 && day <= 100) break;
    await advanceWorldClock('5 days');
    await advanceWorldClock('5 days');
  }
  const DAY = 86_400;
  const t = (await worldClockNow()) % DAY;
  if (t >= 8 * 3600 && t <= 13 * 3600) return;
  const hours = Math.ceil(((8 * 3600 - t + DAY) % DAY) / 3600);
  for (let h = hours; h > 0; h -= 5) await advanceWorldClock(`${Math.min(5, h)} hours`);
}

async function funded(handle: string): Promise<void> {
  const s = await Session.open(handle, { startLocation: BANK_HALL });
  expectOk(await s.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 20 to ${handle} "wire: ferry fare"`));
  } finally {
    gov.close();
  }
  s.close();
}

afterAll(() => {
  for (const s of open) s.close();
});

suite('stage E — the ferry, and the sea', () => {
  const RIDER = uniqueHandle('ref');

  it('32. the ferryman poles across with her bow held upstream, and lands at the far landing', async () => {
    await funded(RIDER);
    const s = await session(RIDER, TOWPATH);
    await morning();
    const here = await look(s);
    expect(here, here).toMatch(/ferry/i);
    const r = await s.cmd('go across');
    const said = squash(await r.said());
    expect(r.status, said).toBe('ok');
    // The crossing takes as long as a pole takes her over.
    let there = '';
    for (let i = 0; i < 12; i++) {
      await s.listen(5_000);
      there = await look(s);
      if (/Nesbit's landing/i.test(await roomName(s))) break;
    }
    expect(there, there).toMatch(/Nesbit's landing|hard of packed gravel/i);
  }, 300_000);

  it('33. from the far bank the ferry is across; ring the bell, and the ferryman brings her over', async () => {
    // The rider goes back across with him, and a second person on the
    // far bank calls the ferry over.
    const rider = open[0]!;
    expect((await rider.cmd('go across')).status).toBe('ok');
    for (let i = 0; i < 12 && !/lower towpath/i.test(await roomName(rider)); i++) await rider.listen(5_000);
    const caller = await session(uniqueHandle('reb'), NESBIT);
    const refused = await caller.cmd('go across');
    expect(squash(await refused.said())).toMatch(/Ring the bell/);
    const rung = await say(caller, 'ring bell');
    expect(rung, rung).toMatch(/strike|bell/i);
    let over = false;
    for (let i = 0; i < 20 && !over; i++) {
      await caller.listen(15_000);
      over = /ferry/i.test(await look(caller)) && (await caller.cmd('go across')).status === 'ok';
    }
    expect(over, 'the ferryman never brought her over').toBe(true);
  }, 600_000);

  it('34. the route planner takes a journey across by the ferry, and says it is not always passable', async () => {
    // The rider has crossed both ways: their own map knows the far landing.
    const s = open[0]!;
    const r = await s.cmd('route to nesbit');
    const said = squash(await r.said());
    expect(r.status, said).toBe('ok');
    expect(said, said).toMatch(/not always passable/);
  }, 120_000);

  it('35. the Hesper stopped at sea: her boat into the water beside her; over the side, and her course waits', async () => {
    const master = await session(uniqueHandle('rem'), DECK);
    const hand = await session(uniqueHandle('reh'), DECK);
    await look(master);
    expectOk(await master.cmd('go dinghy'));
    const launched = await say(master, 'launch');
    expect(launched, launched).toMatch(/into the water and she floats/);
    const where = squash(await master.prose('locate me'));
    expect(where, where).toMatch(/at sea, by reckoning/);
    expectOk(await master.cmd('recover'));
    expectOk(await master.cmd('go out'));

    // Over the side is into the water: swum, not walked.
    const over = await hand.cmd('swim side');
    expect(over.status, squash(await over.said())).toBe('ok');
    expect(await look(hand)).toMatch(/In the sea|open sea/i);
    const waits = await say(master, 'course gannet');
    expect(waits, waits).toMatch(/people in the water/);
    const up = await hand.cmd('go hesper');
    expect(up.status, squash(await up.said())).toBe('ok');
    expect(await look(hand)).toMatch(/Hesper's deck/i);
  }, 300_000);
});
