/**
 * River, stage D — ⭐⭐ **a ship on the river**, driven over the wire.
 *
 * The river requirements' drive, steps 25, 26 and 28–31, numbering kept:
 * the *Ostrander* boarded at the city quay and under way upstream; wooding
 * up at the woodyard landing; over her side into the river where she is;
 * a sounding; a course past the falls refused; and down to the mouth and
 * out over the bar onto the sea — and back in.
 *
 * Steps run elsewhere, and why:
 *  - 27 (a canoe swamped by her wake): a canoe in the channel within hail
 *    of her as she passes is a meeting the drive cannot arrange in the
 *    clock it has; the wake's arithmetic is unit-tested on the warren.
 *  - 29's grounding in a dry August below Hob's Bend: the month a drive
 *    finds the world in decides it; the ground, lightening and the kedge
 *    are unit-tested (`Voyaging.line.test.ts`, `RiverRead.test.ts`).
 *
 * ⭐ Every checkpoint asserts the verb was UNDERSTOOD and a state change or
 * the words that prove one.
 *
 * ⚠⚠ `.dirty.`: it moves the Ostrander off her berth, burns her wood and
 * moves the clock. None of it is produced again.
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
  'takes the Ostrander off her berth, burns her cordwood, puts her out on ' +
  'the sea and moves the clock — none of it produced again';

declareFile({
  file: 'river-d.dirty.wire.test.ts',
  packs: ['terminus', 'water', 'transport', 'world-seed', 'trade-forestry', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const QUAY = '/world/terminus/wharfside/bank';
const DECK = '/world/terminus/ostrander/deck';

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

async function look(s: Session): Promise<string> {
  await s.drainProse();
  return squash(await s.prose('look here'));
}

async function morning(): Promise<void> {
  const DAY = 86_400;
  const t = (await worldClockNow()) % DAY;
  if (t >= 8 * 3600 && t <= 13 * 3600) return;
  const hours = Math.ceil(((8 * 3600 - t + DAY) % DAY) / 3600);
  for (let h = hours; h > 0; h -= 5) await advanceWorldClock(`${Math.min(5, h)} hours`);
}

/** The km the readout gives: `She is 8.8 km above the mouth`. */
function kmOf(readout: string): number | null {
  const m = readout.match(/(\d+(?:\.\d+)?) km above the mouth/);
  if (m) return Number(m[1]);
  const meters = readout.match(/(\d+) meters above the mouth/);
  return meters ? Number(meters[1]) / 1000 : null;
}

/** Wait until the readout says she is not under way, moving the clock. */
async function lies(s: Session, tries = 12): Promise<string> {
  let said = '';
  for (let i = 0; i < tries; i++) {
    await advanceWorldClock('30 minutes');
    await s.listen(3_000);
    said = await say(s, 'course');
    if (/not under way/.test(said)) return said;
  }
  return said;
}

let master: Session;
const MASTER = uniqueHandle('rdm');

afterAll(() => {
  for (const s of open) s.close();
});

suite('stage D — a ship on the river', () => {
  it('25. aboard the Ostrander at the city quay; under way upstream, she makes ground against the current', async () => {
    master = await session(MASTER, QUAY);
    await morning();
    const aboard = await master.cmd('aboard');
    expect(aboard.status, squash(await aboard.said())).toBe('ok');
    const deck = await look(master);
    expect(deck, deck).toMatch(/wheelhouse|stack|wheel/i);

    const before = kmOf(await say(master, 'course'));
    expect(before, 'the readout gave no km').not.toBeNull();
    const steam = await say(master, 'course upstream');
    expect(steam, steam).toMatch(/under way upstream/);
    await advanceWorldClock('20 minutes');
    await master.listen(3_000);
    const after = kmOf(await say(master, 'course'));
    expect(after!, 'she did not move up the river').toBeGreaterThan(before!);
  }, 600_000);

  it('26. course for the woodyard: she comes alongside; ashore, buy cordwood, and feed her bin', async () => {
    const set = await say(master, 'course woodyard');
    expect(set, set).toMatch(/for the woodyard|woodyard landing/i);
    const at = await lies(master);
    expect(at, at).toMatch(/woodyard/i);
    // Ashore at the woodyard, and back aboard with a length of wood.
    const s = await Session.open(uniqueHandle('rdw'), { startLocation: BANK_HALL });
    expectOk(await s.cmd('bank open'));
    const gov = await Session.open('founder', { startLocation: BANK_HALL });
    try {
      expectOk(await gov.cmd(`reserve override 50 to ${s.handle} "wire: river funding"`));
    } finally {
      gov.close();
    }
    s.close();
    const ashore = await master.cmd('ashore');
    expect(ashore.status, squash(await ashore.said())).toBe('ok');
    expect(await look(master)).toMatch(/woodyard|rick|cordwood/i);
    // The master has no money; the hand who does buys and carries.
    const hand = await session(s.handle, '/world/terminus/woodyard/landing');
    expectOk(await hand.cmd('buy "length of cordwood"'));
    const aboard = await hand.cmd('aboard');
    expect(aboard.status, squash(await aboard.said())).toBe('ok');
    const fed = await say(hand, 'put cordwood in bin');
    expect(fed, fed).toMatch(/put|bin/i);
    expectOk(await master.cmd('aboard'));
  }, 900_000);

  it('30. a course for a landing above the falls is refused before she moves', async () => {
    const r = await master.cmd('course put-in');
    const said = squash(await r.said());
    expect(said, said).toMatch(/Nothing goes past the falls/);
  }, 120_000);

  it('29. a sounding: the lead finds the bottom under her', async () => {
    const r = await master.cmd('measure depth');
    const said = squash(await r.said());
    expect(said, said).toMatch(/lead finds bottom at/);
  }, 120_000);

  it('28. over her side under way: you are in the river where she is; her course waits for you unless she leaves you', async () => {
    const steam = await say(master, 'course downstream slow');
    expect(steam, steam).toMatch(/under way downstream/);
    const swimmer = await session(uniqueHandle('rds'), DECK);
    const over = await swimmer.cmd('go side');
    expect(over.status, squash(await over.said())).toBe('ok');
    const wet = await look(swimmer);
    expect(wet, wet).toMatch(/In the river|In the Kestrel|water/i);
    const still = await say(master, 'course');
    expect(still, still).toMatch(/Your course: downstream/);
    // Her course waits for her people in the water — unless she leaves them.
    const waits = await say(master, 'course downstream slow');
    expect(waits, waits).toMatch(/people in the water/);
    const leaves = await say(master, 'course downstream slow --leaving-them');
    expect(leaves, leaves).toMatch(/You leave .* in the water/);
  }, 300_000);

  it('31. down to the mouth and out over the bar: she is on the sea; at the bar, the river’s name takes her back in', async () => {
    const out = await say(master, 'course bar');
    expect(out, out).toMatch(/under way downstream/);
    let sea = '';
    for (let i = 0; i < 16; i++) {
      await advanceWorldClock('30 minutes');
      sea = squash(await master.listen(3_000));
      if (/out over the bar/.test(sea)) break;
    }
    expect(sea, 'she never came out over the bar').toMatch(/out over the bar/);
    const readout = await say(master, 'course');
    expect(readout, readout).toMatch(/by reckoning/);
    const back = await say(master, 'course kestrel');
    expect(back, back).toMatch(/in over the bar/);
    const onRiver = await say(master, 'course');
    expect(onRiver, onRiver).toMatch(/above the mouth/);
  }, 900_000);
});
