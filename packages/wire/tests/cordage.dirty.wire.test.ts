/**
 * Cordage — ⭐⭐ **one rope, and where its ends are tied**, driven over the
 * wire (the cordage requirements' drive; numbering kept).
 *
 * The blocking drive: steps 1–13, 15–17 and 19 (+7a). Steps 14 (an
 * untarred and a tarred rope left wet for days) and 18 (hemp's season) are
 * SPAN steps and live in `cordage.soak.dirty.wire.test.ts` (no merge waits
 * on the clock).
 *
 * Steps narrowed, and why:
 *  - 2 buys the yarn rather than spinning hemp line: the ropewalk props no
 *    wheel (a deferred row), and spinning hemp is the soak drive's step 18.
 *  - 11 (fray before part) raises `cordage.chafePerUse` for the climb so a
 *    handful of climbs show the whole wear ladder — the staged twin of
 *    "climb it until it frays"; the dial is put back after.
 *  - 19 reads that `ropework` is on the transcript; a practised knot
 *    keeping more is unit-tested (the band ladder needs many deeds).
 *
 * ⭐ Every checkpoint asserts the verb was UNDERSTOOD and a state change or
 * the words that prove one.
 *
 * ⚠⚠ `.dirty.`: it buys rope and yarn, ties ropes off in the Sunken Delve
 * that stay tied, cuts, splices and tars them — none of it produced again.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  nourish,
  hand,
  dress,
  advanceWorldClock,
  worldClockNow,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

export const DIRTY_REASON =
  'buys rope and yarn at the ropewalk, leaves ropes tied off and parted in ' +
  'the Sunken Delve, cuts, splices and tars them — none of it produced again';

declareFile({
  file: 'cordage.dirty.wire.test.ts',
  packs: ['terminus', 'rejection', 'newbie-wilds', 'trade-cordage', 'trade-diving', 'trade-textiles', 'water', 'world-seed', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const WALK = '/world/terminus/wharfside/ropewalk/location/walk';
const SHOP = '/world/terminus/wharfside/diving/location/shop';
const BANK = '/world/terminus/wharfside/bank';
const PUT_IN = '/world/terminus/rejection/put-in/landing';
const LIP = '/world/newbie-wilds/delve/corridor-2';
const LANTERN = '/world/terminus/general-store/thing/lantern';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const open: Session[] = [];

function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command|unknown-verb/i.test(said);
}

/** A command, answering any prompt it raises with the first choice. */
async function run(s: Session, line: string): Promise<CommandResult> {
  let done = false;
  const pending = s.cmd(line).finally(() => {
    done = true;
  });
  void (async () => {
    while (!done) {
      const p = (await s.awaitPrompt(250).catch(() => null)) as
        | { payload?: { promptId?: string; outcome?: { notes?: { kind?: string; matches?: { stuffId?: string }[]; choices?: { response?: string }[] }[] } }; promptId?: string; outcome?: { notes?: { kind?: string; matches?: { stuffId?: string }[]; choices?: { response?: string }[] }[] } }
        | null;
      if (!p || done) continue;
      const payload = p.payload?.promptId ? p.payload : p;
      const id = payload.promptId;
      if (!id) continue;
      const note = payload.outcome?.notes?.find((n) => n.kind?.startsWith('prompt-'));
      if (note?.kind === 'prompt-mql-object') s.answerPrompt(id, note.matches?.[0]?.stuffId ?? '');
      else if (note?.kind === 'prompt-mql-many') s.answerPrompt(id, JSON.stringify(note.matches?.[0]?.stuffId ? [note.matches[0].stuffId] : []));
      else if (note?.kind === 'prompt-choice') s.answerPrompt(id, note.choices?.[0]?.response ?? '');
      else s.answerPrompt(id, 'yes');
    }
  })();
  const r = await pending;
  await new Promise((res) => setTimeout(res, 300));
  return r;
}

async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  const r = await run(s, line);
  const said = squash(await r.said());
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${line} → ${r.status}: ${said.slice(0, 300)}`);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  return said;
}

/** A durative act: wait for its engagement, then what it said and what followed. */
async function act(s: Session, line: string, timeoutMs = 240_000): Promise<string> {
  await s.drainProse();
  const r = await run(s, line);
  const said = squash(await r.said());
  const started = r.notes.find((n) => n.kind === 'engagement-started') as { engagementId?: string } | undefined;
  if (started?.engagementId) await s.awaitActivity(started.engagementId, timeoutMs);
  await new Promise((res) => setTimeout(res, 500));
  const later = squash(await s.listen(1_500).catch(() => ''));
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${line} → ${r.status}: ${said.slice(0, 200)} … ${later.slice(0, 250)}`);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  return `${said} ${later}`.trim();
}

/** `look`, answering a "which one?" with the first. */
async function look(s: Session, what = 'here'): Promise<string> {
  await s.drainProse();
  const r = await run(s, `look ${what}`);
  return squash(await r.said());
}

async function where(s: Session): Promise<string> {
  return JSON.stringify(await s.query('here', { fields: 'ref' }));
}

const dressed = new Set<string>();

async function session(handle: string, at: string): Promise<Session> {
  const s = await Session.open(handle, { startLocation: at });
  open.push(s);
  await nourish(s).catch(() => {});
  // The delve is cold: a shivering body is told so on every command.
  if (!dressed.has(handle)) {
    dressed.add(handle);
    await dress(s).catch(() => {});
  }
  return s;
}

/** Daytime: the ropewalk is worked by daylight (D28). */
async function daytime(): Promise<void> {
  const DAY = 86_400;
  const t = (await worldClockNow()) % DAY;
  if (t >= 8 * 3600 && t <= 14 * 3600) return;
  const hours = Math.ceil(((9 * 3600 - t + DAY) % DAY) / 3600);
  for (let h = hours; h > 0; h -= 5) await advanceWorldClock(`${Math.min(5, h)} hours`);
}

/** A fresh character with money in the bank. */
async function funded(prefix: string, amount = 300): Promise<string> {
  const handle = uniqueHandle(prefix);
  const s = await Session.open(handle, { startLocation: BANK_HALL });
  expectOk(await s.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override ${amount} to ${handle} "wire: cordage funding"`));
  } finally {
    gov.close();
  }
  s.close();
  return handle;
}

/** How many of `keyword` the session carries. */
async function carried(s: Session, keyword: string): Promise<number> {
  return (await s.query(`me:i:${keyword}`, { fields: ['displayName'] }).catch(() => [])).length;
}

/**
 * At the lip of the pit in the Sunken Delve, with a light: the delve is
 * pitch dark, and the way down is hidden until it is searched for.
 */
async function atTheLip(handle: string): Promise<Session> {
  const s = await session(handle, LIP);
  if ((await carried(s, 'lantern')) === 0) {
    await hand(s, LANTERN, { interiorAmount: 0.5 });
    await say(s, 'light me:i:lantern');
  }
  await act(s, 'search');
  return s;
}

async function setDial(key: string, value: string): Promise<void> {
  const wiz = await Session.open('founder', { startLocation: WALK, wizard: true });
  try {
    expectOk(await wiz.cmd(`config ${key} ${value}`));
  } finally {
    wiz.close();
  }
}

afterAll(async () => {
  for (const s of open) s.close();
  // Put back the staging dial (the delve's hidden way down, see setup).
  await setDial('concealment.level.hidden', '4').catch(() => {});
});

let maker = '';
let climber = '';

suite('cordage — the blocking drive', () => {
  it('setup: a rope-maker and a climber with money, by day', async () => {
    maker = await funded('cdm');
    climber = await funded('cdc');
    await daytime();
    // ⭐ Staged: the pit's way down is a `hidden` exit, and a fresh body's
    // awareness never finds it; the drive lowers the band for the delve
    // steps (concealment's own drive owns finding it) and puts it back.
    await setDial('concealment.level.hidden', '0');
  }, 300_000);

  it('1. the ropewalk: a long walk and its keeper', async () => {
    const s = await session(maker, WALK);
    const l = await look(s);
    expect(l, l).toMatch(/ropewalk/i);
    expect(l, l).toMatch(/so long|far end/i);
    expect(l, l).toMatch(/ropekeeper|Agnes/i);
    expect(l, l).toMatch(/rope jack|jack/i);
  }, 120_000);

  it('2. buy hemp yarn (and a knife) from the ropekeeper', async () => {
    const s = await session(maker, WALK);
    for (let i = 0; i < 16; i++) {
      const b = await say(s, 'buy hemp yarn');
      expect(b, b).not.toMatch(/bare|cannot|can't|no one/i);
    }
    const k = await say(s, 'buy rigging knife');
    expect(k, k).not.toMatch(/bare|cannot|can't/i);
    expect(await carried(s, 'yarn')).toBeGreaterThanOrEqual(16);
    expect(await carried(s, 'knife')).toBe(1);
  }, 300_000);

  it('3. twist yarn: it becomes a strand', async () => {
    const s = await session(maker, WALK);
    // ⭐ Laying is work (the review's lens pass): a strand is its length ×
    // its yarns of walking — so the drive lays short ones.
    const first = await act(s, 'twist yarn --yarns 40 --length 10', 900_000);
    expect(first, first).toMatch(/turning the wheel/);
    for (let i = 0; i < 2; i++) await act(s, 'twist yarn --yarns 40 --length 10', 900_000);
    expect(await carried(s, 'strand')).toBe(3);
    const st = await look(s, 'first strand');
    expect(st, st).toMatch(/10 meters of hemp strand/);
    // A fresh hand's twist bunches: the strand says so.
    expect(st, st).toMatch(/hockles|wanders/);
  }, 1_800_000);

  it('4. twist the strands: they become rope — fiber, length, thickness, strength in words', async () => {
    const s = await session(maker, WALK);
    await act(s, 'twist strands', 900_000);
    expect(await carried(s, 'strand')).toBe(0);
    const r = await look(s, 'rope');
    expect(r, r).toMatch(/10 meters of hemp rope, about \d+ mm thick; it would hold/);
    const read = await say(s, 'analyze lay rope');
    expect(read, read).toMatch(/laid from \w+ yarn/);
  }, 1_800_000);

  it('3a. a crew: a second hand takes the wheel (or the keeper has it) and the layer walks at full pace', async () => {
    const hand = await session(climber, WALK);
    const took = await say(hand, 'turn jack');
    expect(took, took).toMatch(/crank|already has the wheel/);
    const s = await session(maker, WALK);
    const lay = await act(s, 'twist yarn --yarns 10 --length 5', 900_000);
    expect(lay, lay).toMatch(/turning the wheel/);
    expect(lay, lay).not.toMatch(/turning the wheel yourself/);
    if (/crank/.test(took)) await say(hand, 'turn back jack');
    // Its strand is laid up with step 5's.
  }, 1_800_000);

  it('5. more yarns make a thicker, stronger rope', async () => {
    const s = await session(maker, WALK);
    for (let i = 0; i < 3; i++) await act(s, 'twist yarn --yarns 80 --length 5', 900_000);
    await act(s, 'twist strands', 900_000);
    expect(await carried(s, 'rope')).toBeGreaterThanOrEqual(2);
    const all = (await look(s, 'first rope')) + ' | ' + (await look(s, 'second rope'));
    // The 5 m rope of 80-yarn strands is thicker, and holds more, than the 10 m one.
    const thin = /10 meters of hemp rope, about (\d+) mm/.exec(all);
    const thick = /5 meters of hemp rope, about (\d+) mm/.exec(all);
    expect(thin !== null && thick !== null, all).toBe(true);
    expect(Number(thick![1]), all).toBeGreaterThan(Number(thin![1]));
  }, 1_800_000);

  it('6. no rope longer than the walk — and the refusal says why', async () => {
    const s = await session(maker, WALK);
    const t = await say(s, 'twist yarn --length 400');
    expect(t, t).toMatch(/The walk is 300 m long; a rope cannot be laid longer than it/);
  }, 120_000);

  it('7. cut a length off, coil one', async () => {
    const s = await session(maker, WALK);
    const before = await carried(s, 'rope');
    await act(s, 'cut first rope at 2 m');
    expect(await carried(s, 'rope')).toBe(before + 1);
    await act(s, 'coil first rope');
    const coiled = squash(await s.prose('look first rope'));
    expect(coiled, coiled).toMatch(/coiled down/);
  }, 300_000);

  it('7a. the rogue\'s yarn: not on the outside, in the heart, and at a cut', async () => {
    // A fresh hand with nothing else in it: a rope-maker's arms full of rope
    // make "rope" a question.
    const marker = await funded('cdr', 60);
    const s = await session(marker, WALK);
    for (let i = 0; i < 4; i++) await say(s, 'buy hemp yarn');
    await say(s, 'buy rigging knife');
    await act(s, 'twist yarn --yarns 20 --length 6 --mark red', 900_000);
    await act(s, 'twist yarn --yarns 20 --length 6', 900_000);
    await act(s, 'twist yarn --yarns 20 --length 6', 900_000);
    await act(s, 'twist strands', 900_000);
    const plainLook = await look(s, 'rope');
    expect(plainLook, plainLook).not.toMatch(/red yarn/);
    const close = await say(s, 'analyze lay rope');
    expect(close, close).toMatch(/a red yarn runs in the heart/);
    await act(s, 'cut rope at 2 m');
    const both = (await look(s, 'first rope')) + ' | ' + (await look(s, 'second rope'));
    expect(both, both).toMatch(/red yarn runs in the heart/);
  }, 1_800_000);

  it('8. tar a rope in the tar tub: it reads tarred', async () => {
    const tarrer = await funded('cdt', 60);
    const s = await session(tarrer, WALK);
    await say(s, 'buy rope');
    // A fresh body may still be shrugging its coat on (hands busy).
    const dipped = await act(s, 'dip rope in tub');
    if (/hands are busy/i.test(dipped)) {
      await new Promise((r) => setTimeout(r, 5_000));
      await act(s, 'dip rope in tub');
    }
    const r = await look(s, 'rope');
    expect(r, r).toMatch(/tarred/i);
  }, 300_000);

  // ⭐ The delve's ropes are bought by hands holding nothing else, so "rope"
  // means the one rope there is.
  let rigger = '';

  it('9–10. at the Sunken Delve: tie off at the post, it hangs; climb down and back up', async () => {
    rigger = await funded('cdg', 80);
    const w = await session(rigger, WALK);
    await say(w, 'buy rope');
    const s = await atTheLip(rigger);
    const tied = await say(s, 'tie rope to post with bowline');
    expect(tied, tied).toMatch(/hangs down/);
    const from = await where(s);
    const down = await say(s, 'climb down');
    expect(await where(s), down).not.toBe(from);
    const up = await say(s, 'climb up');
    expect(await where(s), up).toBe(from);
  }, 300_000);

  it('11. climbed until it frays — it frays before it parts (the chafe dial raised)', async () => {
    await setDial('cordage.chafePerUse', '3.0');
    try {
      const s = await atTheLip(rigger);
      const seen: string[] = [];
      let parted = false;
      for (let i = 0; i < 10 && !parted; i++) {
        const d = await say(s, 'climb down');
        const d2 = d + ' ' + squash(await s.listen(800).catch(() => ''));
        if (/parts above you/.test(d2)) { parted = true; break; }
        const u = await say(s, 'climb up');
        const u2 = u + ' ' + squash(await s.listen(800).catch(() => ''));
        if (/parts above you/.test(u2)) { parted = true; break; }
        seen.push(await look(s, 'rope'));
      }
      expect(seen.join(' '), seen.join(' | ')).toMatch(/scuffed|fraying|yarns have parted/);
      expect(parted, seen.join(' | ')).toBe(true);
    } finally {
      await setDial('cordage.chafePerUse', '0.06');
    }
  }, 1_800_000);

  it('12. a reef knot spills under an uneven load, and you fall', async () => {
    const loader = await funded('cdl', 80);
    const w = await session(loader, WALK);
    await say(w, 'buy rope');
    for (let i = 0; i < 28; i++) await say(w, 'buy hemp yarn');
    const s = await atTheLip(loader);
    const tied = await say(s, 'tie rope to post with reef knot');
    expect(tied, tied).toMatch(/reef knot/);
    const d = await say(s, 'climb down');
    const all = d + ' ' + squash(await s.listen(1_500).catch(() => ''));
    expect(all, all).toMatch(/spills/);
    expect(all, all).toMatch(/hit the bottom/);
  }, 1_800_000);

  it('13. splice two lengths into one, nearly as strong', async () => {
    const splicer = await funded('cdp', 60);
    const s = await session(splicer, WALK);
    for (let i = 0; i < 4; i++) await say(s, 'buy hemp yarn');
    await say(s, 'buy rigging knife');
    for (let i = 0; i < 3; i++) await act(s, 'twist yarn --yarns 20 --length 10', 900_000);
    await act(s, 'twist strands', 900_000);
    await act(s, 'cut rope at 4 m');
    const sp = await say(s, 'splice first rope to second rope');
    expect(sp, sp).toMatch(/one rope now, 10 meters long/);
    const r = await look(s, 'first rope');
    expect(r, r).toMatch(/splice/);
  }, 1_800_000);

  it('15–16. a worn rope parts under a belayed climber: caught; unbelayed: dropped', async () => {
    // The belayer holds one coil and a thin strand that will not hold a man.
    const holder = await funded('cdb', 80);
    const w = await session(holder, WALK);
    await say(w, 'buy rope');
    for (let i = 0; i < 2; i++) await say(w, 'buy hemp yarn');
    await act(w, 'twist yarn --yarns 6 --length 8', 900_000);
    await act(w, 'twist yarn --yarns 6 --length 8', 900_000);
    const belayer = await atTheLip(holder);
    const c = await atTheLip(climber);
    // They meet: a rope is tied round somebody by what the tier knows them as.
    await belayer.drainProse();
    expectOk(await c.cmd('introduce'));
    const met = squash(await belayer.listen(4_000));
    const known = met.match(/introduces themselves as ([^.]+)\./)?.[1]?.trim() ?? climber;
    const tieThin = await say(belayer, 'tie first strand to post with bowline');
    expect(tieThin, tieThin).toMatch(/hangs down/);
    const tieOn = await say(belayer, `tie rope to ${known}`);
    expect(tieOn, tieOn).toMatch(/round/);
    const bel = await say(belayer, `belay ${known} with rope`);
    expect(bel, bel).toMatch(/hold the rope/);
    const fall = await say(c, 'climb down');
    const after = fall + ' ' + squash(await c.listen(1_500).catch(() => ''));
    expect(after, after).toMatch(/parts above you/);
    expect(after, after).toMatch(/hauled in/);
    expect(await where(c), after).toBe(await where(belayer));

    // Unbelayed: the second strand, and nobody holding.
    await say(belayer, 'belay off');
    await say(belayer, `untie rope`);
    const tie2 = await say(belayer, 'tie strand to post with bowline');
    expect(tie2, tie2).toMatch(/hangs down/);
    const fall2 = await say(c, 'climb down');
    const after2 = fall2 + ' ' + squash(await c.listen(1_500).catch(() => ''));
    expect(after2, after2).toMatch(/parts above you/);
    expect(after2, after2).toMatch(/hit the bottom/);
  }, 1_800_000);

  // ⚠ 17's sale is cut: the ropewalk buys no rope back (a house bids per
  // row, so a coil cut into five would sell as five) — retail's seam.
  it('17. the lifeline, the heaving line and a painter read as rope', async () => {
    const shop = await session(maker, SHOP);
    const life = await look(shop, 'first lifeline');
    expect(life, life).toMatch(/20 meters of hemp rope/);
    const bank = await session(maker, BANK);
    const heave = await look(bank, 'heaving line');
    expect(heave, heave).toMatch(/15 meters of hemp rope/);
    const putIn = await session(maker, PUT_IN);
    await say(putIn, 'buy painter');
    const painter = await look(putIn, 'painter');
    expect(painter, painter).toMatch(/15 meters of hemp rope/);
  }, 300_000);

  it('19. ropework is on the transcript', async () => {
    const s = await session(maker, WALK);
    const comp = squash(await s.prose('competence'));
    expect(comp, comp).toMatch(/ropework/i);
  }, 120_000);
});
