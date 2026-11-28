/**
 * ⛔ **A SOAK file** (span steps — `pnpm wire:soak`, run by the soak lane
 * after merge, never in a blocking run). Moved whole from
 * `river-e.dirty.wire.test.ts` by the soak-harness census (2026-10-30):
 * the crossings at Nesbit and the ferryman's shift need the season walked to open water.
 *
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
  stageShip,
} from '../src/harness';

export const DIRTY_REASON =
  'moves Nesbit’s ferry and her ferryman across the Kestrel, puts the ' +
  'Hesper’s boat in the sea and moves the clock — none of it produced again';

declareFile({
  file: 'river-e.soak.dirty.wire.test.ts',
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
  const ref = (await s.query('~here', { fields: 'ref' })) as Array<{ displayName?: string }>;
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
  // ⚠ Few, large jumps to the season's first morning (soak run cc6de0972):
  // climbed in 5-day steps, a fresh world took 10–38 s to settle each, the
  // step overran its budget and the abandoned climb kept jumping into the
  // steps after it. A jump past a game day is a span — this is a soak file, and
  // the harness sends the soak flag under `pnpm wire:soak`. The drive's
  // first call comes before any drive body is made, so nobody lives
  // through the gap unfed.
  const DAY = 86_400;
  const now = await worldClockNow();
  const day = Math.floor(now / DAY) % 360;
  if (day < 60 || day > 100) {
    const toDay = (60 - day + 360) % 360;
    // ⚠ In fortnights, not one jump: a jump of a month or more blocks the
    // world's event loop and never returns (#137); a fortnight did.
    let left = Math.ceil(toDay * DAY + 8 * 3600 - (now % DAY));
    while (left > 0) {
      const step = Math.min(left, 14 * DAY);
      await advanceWorldClock(`${step} seconds`);
      left -= step;
    }
    return;
  }
  const t = now % DAY;
  if (t >= 8 * 3600 && t <= 13 * 3600) return;
  const hours = Math.ceil(((8 * 3600 - t + DAY) % DAY) / 3600);
  for (let h = hours; h > 0; h -= 5) await advanceWorldClock(`${Math.min(5, h)} hours`);
}

/**
 * Jump the clock to the absolute game second `target`, in chunks of five
 * hours at most. ⚠ (soak repair, 2026-11-17) Each chunk overshoots by the
 * minutes the world takes to settle it (~2 min a jump), so the clock is
 * read again before every chunk and the last one lands on the target —
 * "06:40" had become 06:47, and "+15 minutes" past the 07:00 boat.
 */
async function jumpTo(target: number): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const left = target - (await worldClockNow());
    if (left <= 0) return;
    await advanceWorldClock(`${Math.min(left, 5 * 3600)} seconds`);
  }
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
    // The season first: nobody of the drive's is made until it has turned.
    await morning();
    await funded(RIDER);
    const s = await session(RIDER, TOWPATH);
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
  }, 1_200_000); // the season climb (morning) runs in this step

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

  it('36. the market boat runs to its timetable: between boats you are told the next; at boarding you go', async () => {
    // ⭐ (river W12) The first mover whose trajectory is rows: Nesbit's
    // ferry runs at six and seven from the towpath, and is on call after.
    const handle = uniqueHandle('ret');
    await funded(handle);
    const rider = await session(handle, TOWPATH);
    const DAY = 86_400;
    // To 06:40 — tomorrow's, if the morning is past it.
    const now = await worldClockNow();
    const t = now % DAY;
    const at0640 = now + ((6 * 3600 + 40 * 60 - t + DAY) % DAY);
    await jumpTo(at0640);
    const between = await rider.cmd('go across');
    const no = squash(await between.said());
    console.log(`06:40 go across: ${between.status} ${no}`);
    expect(between.status, no).not.toBe('ok');
    expect(no, no).toMatch(/next boat from here leaves at 07:00/);
    // Boarding for the seven o'clock: at 06:55 you go — once the ferryman
    // has her over, if the six o'clock left her across.
    await jumpTo(at0640 + 15 * 60);
    let went = false;
    let last = '';
    for (let i = 0; i < 12 && !went; i++) {
      const r = await rider.cmd('go across');
      last = squash(await r.said());
      went = r.status === 'ok';
      if (!went) {
        console.log(`06:55 try ${i}: ${last.slice(0, 160)}`);
        await rider.listen(5_000);
      }
    }
    expect(went, last).toBe(true);
    await rider.listen(15_000);
    expect(await roomName(rider)).toMatch(/landing|nesbit/i);
  }, 600_000);

  it('35. the Hesper stopped at sea: her boat into the water beside her; over the side, and her course waits', async () => {
    // ⭐ Her rooms are a copy she stands (zone-instancing D12): stand her up
    // before opening a session in one by its row.
    await stageShip('/world/terminus/hesper/structure', {});
    const master = await session(uniqueHandle('rem'), DECK);
    const hand = await session(uniqueHandle('reh'), DECK);
    // ⭐ Only her master takes the helm: the founder, who holds
    // the office that appoints her company, puts this player in command —
    // and dismisses them after, so the seat is free for the next drive.
    // ⚠ (soak run cc6de0972) The appointee is named by what the founder
    // KNOWS them as: a stranger is "a human", and `house appoint` found
    // no such person. They meet on her deck first.
    const me = await master.query('me', { fields: ['displayName'] });
    const self = String((me[0] as { displayName?: unknown } | undefined)?.displayName ?? '');
    const gov = await Session.open('founder', { startLocation: DECK });
    await gov.drainProse();
    expectOk(await master.cmd('introduce'));
    const met = squash(await gov.listen(4_000));
    const name = met.match(/introduces themselves as ([^.]+)\./)?.[1]?.trim() ?? self;
    expectOk(await gov.cmd(`house appoint "${name}" to master at /world/terminus/hesper/idea/outfit`));
    await look(master);
    expectOk(await master.cmd('go dinghy'));
    const launched = await say(master, 'launch');
    expect(launched, launched).toMatch(/into the water and she floats/);
    // `locate` retired (navigation-server W0): where the boat lies rides the
    // where-you-are subscription (navigation-server drive), not a verb.
    expectOk(await master.cmd('recover'));
    expectOk(await master.cmd('go out'));

    // Over the side is into the water: swum, not walked.
    // Over her side, as on the Ostrander (D28): the deck's `side` way.
    const over = await hand.cmd('go side');
    expect(over.status, squash(await over.said())).toBe('ok');
    expect(await look(hand)).toMatch(/In the sea|open sea/i);
    // ⚠ (soak repair, 2026-11-17) She lies in the bar, a confined linear
    // passage: only its two ends are a course (`course gannet` was refused
    // "only runs two ways"). The roads are its other end.
    const waits = await say(master, 'course roads');
    expect(waits, waits).toMatch(/people in the water/);
    const up = await hand.cmd('go hesper');
    expect(up.status, squash(await up.said())).toBe('ok');
    expect(await look(hand)).toMatch(/Hesper's deck/i);
    await gov.cmd(`house dismiss "${name}" at /world/terminus/hesper/idea/outfit`);
    gov.close();
  }, 300_000);
});
