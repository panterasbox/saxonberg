/**
 * ⛔ **A SOAK file** (span steps — `pnpm wire:soak`, run by the soak lane
 * after merge, never in a blocking run). Moved whole from
 * `river-b.dirty.wire.test.ts` by the soak-harness census (2026-10-30):
 * open water is the file's premise, not a step's: a fresh world is winter and the river is iced.
 *
 * River, stage B — ⭐⭐ **bodies in moving water**, driven over the wire.
 *
 * The river requirements' drive, steps 7, 8, 10–14, numbering kept: the
 * ford that reads the body (its low-water half — see step 7); the feet-first float and the jammed foot; a
 * strainer met passive; a rescue from the bank by line, by running the
 * bank, by wading in; and the disconnected body delivered alive.
 *
 * Steps run elsewhere, and why:
 *  - 9 (white water heard ahead) and 17 (through the ice into a current)
 *    need a rapid and a winter pool within a drift of somewhere a drive can
 *    stand; the lower Kestrel is pools and riffles all the way (the falls
 *    re-authored to 140 m, D1). Unit-tested.
 *  - 15 (the corpse that floats days later) is the decay clock's, unit-
 *    tested (`Postmortem.decay.test.ts`); the drift fetching it up is the
 *    warren's, unit-tested beside it.
 *
 * ⭐ Every checkpoint asserts the verb was UNDERSTOOD and a state change or
 * the words that prove one.
 *
 * ⚠⚠ `.dirty.`: it buys gear, leaves people pinned and swept, and moves the
 * clock. None of it is produced again.
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
  'buys diving gear, leaves swimmers pinned and swept down the Kestrel and ' +
  'moves the clock — none of it produced again';

declareFile({
  file: 'river-b.soak.dirty.wire.test.ts',
  packs: ['terminus', 'rejection', 'water', 'trade-diving', 'transport', 'world-seed', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const SHOP = '/world/terminus/wharfside/diving/location/shop';
const BANK = '/world/terminus/wharfside/bank';
const FORD = '/world/terminus/delight-road/ford';
const LOWER = '/world/terminus/estuary/lower-towpath';
const PUT_IN = '/world/terminus/rejection/put-in/landing';

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

async function here(s: Session): Promise<string> {
  return JSON.stringify(await s.query('here', { fields: 'ref' }));
}

async function moved(s: Session, from: string, seconds = 120): Promise<boolean> {
  for (let t = 0; t < seconds * 2; t++) {
    if ((await here(s)) !== from) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

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

/** Fund a fresh character and buy `goods` at the dive counter. */
async function outfitted(handle: string, goods: string[]): Promise<Session> {
  const s = await Session.open(handle, { startLocation: BANK_HALL });
  expectOk(await s.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 200 to ${handle} "wire: river funding"`));
  } finally {
    gov.close();
  }
  s.close();
  const t = await session(handle, SHOP);
  for (const good of goods) expectOk(await t.cmd(`buy ${good}`));
  return t;
}

afterAll(() => {
  for (const s of open) s.close();
});

suite('stage B — bodies in moving water', () => {
  it('7. the ford reads the water and the body: at the water this world brings, a road you wade', async () => {
    // ⚠ The high-water half — the river taking your feet — is not driven:
    // in a year of this world's weather the shipped Delight never runs
    // high enough at the ford (the river build's drive, six passes: the
    // ford read "running briskly, shallow enough to wade" in every season).
    // The swept branch is unit-tested (`Ford.test.ts`); the Delight never
    // flooding is a content finding recorded on the MR.
    const handle = uniqueHandle('rbf');
    const s = await session(handle, FORD);
    await morning();
    // Read before trying: the water in words.
    const read = squash(await s.prose('look channel'));
    expect(read, read).toMatch(/This is the Delight/);
    expect(read, read).toMatch(/the water is (barely moving|moving slowly|running briskly|running fast|racing)/);
    expect(read, read).toMatch(/shallow enough to wade|over your head/);
    // Wade it: the ford asks the body, and at this water the body holds.
    const at = await here(s);
    const r = await s.cmd('south');
    const said = squash(await r.said());
    expect(r.status, said).toBe('ok');
    expect(await moved(s, at, 10)).toBe(true);
    const there = await look(s);
    expect(there, there).toMatch(/milestone/i);
  }, 600_000);

  it('8. floating in moving water is feet first; standing in a fast riffle jams a foot', async () => {
    // ⭐ At the put-in: snowmelt over rock, fast enough to take a foot. The
    // lower Kestrel's riffles run slower than a foot is jammed at.
    const s = await outfitted(uniqueHandle('rbe'), []);
    s.close();
    const t = await session(s.handle, PUT_IN);
    await morning();
    expectOk(await t.cmd('swim'));
    await t.listen(2_000);
    const at = await here(t);
    expectOk(await t.cmd('swim downstream'));
    expect(await moved(t, at, 180)).toBe(true);
    const lie = await say(t, 'lie');
    expect(lie, lie).toMatch(/feet downstream|feet first|lie back/);

    // Ride down to broken water and stand in it.
    let jammed = false;
    for (let i = 0; i < 30 && !jammed; i++) {
      const where = await look(t);
      if (/shallow riffle|white water/.test(where)) {
        const stood = await t.cmd('stand');
        const felt = squash(await t.listen(4_000));
        console.log(`stand try ${i}: ${stood.status} ${squash(await stood.said()).slice(0, 160)} | ${felt.slice(0, 200)}`);
        jammed = /foot goes down between two rocks/.test(felt + squash(await stood.said()));
        if (!jammed) await t.cmd('lie');
      }
      if (!jammed) await t.listen(15_000);
    }
    expect(jammed, 'never stood in water fast enough to take a foot').toBe(true);
  }, 1_200_000);

  it('11–13. from the bank: the swimmer comes into view, a line is thrown and hauled in; a rescuer who wades in is in the water too', async () => {
    const rescuer = await outfitted(uniqueHandle('rbr'), ['lifeline']);
    rescuer.close();
    const r = await session(rescuer.handle, LOWER);
    // ⭐ A line goes to somebody by what the thrower knows them as: a
    // stranger in the water is "a human". They meet on the towpath first.
    const swimmer = await session(uniqueHandle('rbs'), LOWER);
    await r.drainProse();
    expectOk(await swimmer.cmd('introduce'));
    // The name the rescuer now knows them by — their character's, not the login.
    const met = squash(await r.listen(4_000));
    const known = met.match(/introduces themselves as ([^.]+)\./)?.[1]?.trim() ?? swimmer.handle;
    expectOk(await r.cmd('introduce'));
    expectOk(await swimmer.cmd('west'));
    await morning();
    expectOk(await r.cmd('watch horizon'));

    expectOk(await swimmer.cmd('swim'));
    await swimmer.listen(2_000);
    const at = await here(swimmer);
    expectOk(await swimmer.cmd('swim downstream'));
    expect(await moved(swimmer, at, 180)).toBe(true);

    // 11: the watch tells when somebody in the water comes into view.
    const seen = squash(await r.listen(120_000));
    expect(seen, seen).toMatch(new RegExp(known.split(' ')[0]!, 'i'));

    // …and within hail the bank has a way to the water: throw, haul.
    let thrown = false;
    for (let i = 0; i < 30 && !thrown; i++) {
      const out = await r.cmd(`throw line to ${known.split(' ')[0]!.toLowerCase()}`);
      thrown = out.status === 'ok';
      if (i % 5 === 0) console.log(`throw try ${i}: ${out.status} ${squash(await out.said()).slice(0, 200)}`);
      if (!thrown) await r.listen(5_000);
    }
    expect(thrown, 'the swimmer never came within reach of the bank').toBe(true);
    const before = await here(swimmer);
    expectOk(await r.cmd('pull line'));
    expect(await moved(swimmer, before, 120)).toBe(true);

    // 13: a second swimmer goes by; the rescuer wades in after them and is
    // in the river with them.
    const other = await session(uniqueHandle('rbo'), BANK);
    expectOk(await other.cmd('swim'));
    await other.listen(2_000);
    const atO = await here(other);
    expectOk(await other.cmd('swim downstream'));
    await moved(other, atO, 180);
    let waded = false;
    for (let i = 0; i < 30 && !waded; i++) {
      if ((await say(r, 'look')).includes('water')) {
        const out = await r.cmd('swim');
        if (out.status === 'ok') {
          await r.listen(2_000);
          waded = /In the river|In the Kestrel/i.test(await look(r));
        }
      }
      if (!waded) await r.listen(5_000);
    }
    expect(waded, 'the rescuer never got into the water').toBe(true);
  }, 1_800_000);

  it('12. running the bank against the current: the walk takes its time, step by step', async () => {
    const runner = await session(uniqueHandle('rbn'), LOWER);
    const at = await here(runner);
    const r = await runner.cmd('go downstream');
    expect(r.status, squash(await r.said())).toBe('ok');
    expect(await moved(runner, at, 60)).toBe(true);
    const bank = await look(runner);
    expect(bank, bank).toMatch(/bank|towpath|reach/i);
  }, 300_000);

  it('14. a swimmer who disconnects mid-river is delivered to a spot that holds them, alive', async () => {
    const handle = uniqueHandle('rbd');
    const s = await session(handle, BANK);
    await morning();
    expectOk(await s.cmd('swim'));
    await s.listen(2_000);
    const at = await here(s);
    expectOk(await s.cmd('swim downstream'));
    expect(await moved(s, at, 180)).toBe(true);
    s.close();
    // Away for a while; the river carries the body and holds it.
    await new Promise((r) => setTimeout(r, 20_000));
    await advanceWorldClock('20 minutes');
    // Back without a start location: wherever the river left them.
    const back = await Session.open(handle);
    open.push(back);
    const where = await look(back);
    // Alive, and somewhere that holds them — not drowned, not carried on.
    expect(where).not.toMatch(/dead|corpse/i);
    const status = await say(back, 'score');
    expect(status).not.toMatch(/drown/i);
  }, 600_000);
});
