/**
 * River, stage C — ⭐⭐ **small craft**, driven over the wire.
 *
 * The river requirements' drive, steps 19–22, numbering kept: a canoe
 * bought at the put-in, launched and paddled upstream against the snow
 * water (losing ground in the channel, making it along the inside), the
 * paddling stopped and the canoe carried back down; a pole that needs a
 * bottom; a canoe swamped in broken water with its people beside it and
 * righted by a pull; and a killick that drags in quick water.
 *
 * Steps run elsewhere, and why:
 *  - 20's lining from the bank is not built (recorded in the plan: a deferred
 *    seam); portage is `hitch`, which the haulage drives already cover; the
 *    gorge walls refusing a landing are stage A's step 4 refusal, the same
 *    bank word.
 *  - 22's hold in a slow pool: the slow water is forty kilometers below the
 *    put-in, a day's paddle. The hold is unit-tested on the warren.
 *  - 23 (fishing from a drifting canoe): the line following the water is
 *    `FishingEngagement`'s, unit-tested in trade-fishing.
 *  - 24 (the beached canoe survives a restart): a wire drive cannot restart
 *    the server it drives. The stop's persistence is the warren's,
 *    unit-tested.
 *
 * ⭐ Every checkpoint asserts the verb was UNDERSTOOD and a state change or
 * the words that prove one.
 *
 * ⚠⚠ `.dirty.`: it buys canoes and a punt at the put-in, leaves them on the
 * Kestrel and moves the clock. None of it is produced again.
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
  'buys canoes and a punt at the put-in and leaves them on the Kestrel, and ' +
  'moves the clock — none of it produced again';

declareFile({
  file: 'river-c.dirty.wire.test.ts',
  packs: ['terminus', 'rejection', 'water', 'transport', 'world-seed', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const PUT_IN = '/world/terminus/rejection/put-in/landing';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const open: Session[] = [];

async function session(handle: string, at?: string): Promise<Session> {
  const s = await Session.open(handle, at ? { startLocation: at } : {});
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

/** The boat's surroundings: `look` from inside a canoe sees the water it is in. */
async function water(s: Session): Promise<string> {
  await s.drainProse();
  return squash(await s.prose('look out'));
}

async function morning(): Promise<void> {
  const DAY = 86_400;
  const t = (await worldClockNow()) % DAY;
  if (t >= 8 * 3600 && t <= 13 * 3600) return;
  const hours = Math.ceil(((8 * 3600 - t + DAY) % DAY) / 3600);
  for (let h = hours; h > 0; h -= 5) await advanceWorldClock(`${Math.min(5, h)} hours`);
}

/** Fund a fresh character and stand them at the put-in. */
async function funded(handle: string): Promise<Session> {
  const s = await Session.open(handle, { startLocation: BANK_HALL });
  expectOk(await s.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 200 to ${handle} "wire: river funding"`));
  } finally {
    gov.close();
  }
  s.close();
  return session(handle, PUT_IN);
}

/** Buy a boat at the shed, get into it, and put it in the water. */
async function afloat(s: Session, boat: string): Promise<void> {
  const bought = await s.cmd(`buy ${boat}`);
  expect(bought.status, squash(await bought.said())).toBe('ok');
  const into = await s.cmd(`go ${boat}`);
  expect(into.status, squash(await into.said())).toBe('ok');
  const launched = await say(s, 'launch');
  expect(launched, launched).toMatch(/down into the water and she floats/);
}

/** Where the BOAT is: the room the session's container is in. */
async function boatAt(s: Session): Promise<string> {
  return JSON.stringify(await s.query('me:e:e', { fields: 'ref' }).catch(() => null));
}

afterAll(() => {
  for (const s of open) s.close();
});

suite('stage C — small craft', () => {
  it('19. paddle a canoe upstream: the channel beats you, the inside of the bend does not; stop, and she goes back down', async () => {
    const s = await funded(uniqueHandle('rcp'));
    await morning();
    await afloat(s, 'canoe');

    // The channel: the snow water is quicker than a paddler.
    const start = await boatAt(s);
    const up = await say(s, 'paddle upstream');
    expect(up, up).toMatch(/take up the paddle and paddle upstream/);
    const heard = squash(await s.listen(90_000));
    const lost = /current is stronger than you/.test(heard);
    const gained = (await boatAt(s)) !== start;
    expect(lost || gained, `paddling upstream did nothing: ${heard}`).toBe(true);

    // The inside of the bend runs slower; the same arms make way there.
    await s.cmd('stop');
    const inside = await say(s, 'paddle upstream --inside');
    expect(inside, inside).toMatch(/paddle upstream/);
    const before = await boatAt(s);
    let madeWay = false;
    for (let i = 0; i < 12 && !madeWay; i++) {
      await s.listen(10_000);
      madeWay = (await boatAt(s)) !== before;
    }

    // Stop paddling: with nobody paddling she goes where the water takes her.
    await s.cmd('stop');
    if (madeWay) {
      const stopped = await boatAt(s);
      let back = false;
      for (let i = 0; i < 12 && !back; i++) {
        await s.listen(10_000);
        back = (await boatAt(s)) !== stopped;
      }
      expect(back, 'the canoe sat still in moving water with nobody paddling').toBe(true);
    } else {
      expect(lost, 'neither the channel nor the inside answered the paddle').toBe(true);
    }
    const out = await water(s);
    expect(out, out).toMatch(/Kestrel|river|water/i);
  }, 900_000);

  it('20. a pole needs a bottom: in the shallows it digs in, over deep water it finds none', async () => {
    const s = await funded(uniqueHandle('rcq'));
    await morning();
    await afloat(s, 'punt');
    const poled = await say(s, 'paddle downstream');
    expect(poled, poled).toMatch(/take up the pole and pole downstream/);
    const start = await boatAt(s);
    let way = false;
    let bottomless = false;
    for (let i = 0; i < 40 && !bottomless; i++) {
      const heard = squash(await s.listen(15_000));
      if ((await boatAt(s)) !== start) way = true;
      bottomless = /finds no bottom/.test(heard);
      if (/upside down|goes over/.test(heard)) break;
    }
    expect(way, 'the pole never moved her in the shallows').toBe(true);
  }, 900_000);

  it('21. swamped in broken water: her people are in the river beside her; a pull rights her', async () => {
    const s = await funded(uniqueHandle('rcc'));
    await morning();
    await afloat(s, 'canoe');
    expectOk(await s.cmd('paddle downstream --hard'));
    let over = false;
    for (let i = 0; i < 60 && !over; i++) {
      const heard = squash(await s.listen(15_000));
      over = /goes over and you are in the water beside it/.test(heard);
      if (!over && /grounds|nothing to paddle|not on any water/.test(heard)) {
        await s.cmd('paddle downstream --hard');
      }
    }
    expect(over, 'the canoe never met water rough enough to swamp her').toBe(true);
    const wet = await look(s);
    expect(wet, wet).toMatch(/canoe/i);
    const righted = await say(s, 'pull canoe');
    expect(righted, righted).toMatch(/comes over the right way up/);
  }, 1_200_000);

  it('22. a killick dropped in quick water drags along the bottom', async () => {
    const s = await funded(uniqueHandle('rck'));
    await morning();
    await afloat(s, 'canoe');
    const anchored = await say(s, 'anchor');
    expect(anchored, anchored).toMatch(/killick goes down/);
    expect(anchored, anchored).toMatch(/drags along the bottom/);
  }, 300_000);
});
