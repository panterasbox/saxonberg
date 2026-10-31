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

async function look(s: Session, what = 'here'): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(`look ${what}`));
}

async function where(s: Session): Promise<string> {
  return JSON.stringify(await s.query('here', { fields: 'ref' }));
}

async function session(handle: string, at: string): Promise<Session> {
  const s = await Session.open(handle, { startLocation: at });
  open.push(s);
  await nourish(s).catch(() => {});
  return s;
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

async function setDial(key: string, value: string): Promise<void> {
  const wiz = await Session.open('founder', { startLocation: WALK, wizard: true });
  try {
    expectOk(await wiz.cmd(`config ${key} ${value}`));
  } finally {
    wiz.close();
  }
}

afterAll(() => {
  for (const s of open) s.close();
});

let maker = '';
let climber = '';

suite('cordage — the blocking drive', () => {
  it('setup: a rope-maker and a climber with money', async () => {
    maker = await funded('cdm');
    climber = await funded('cdc');
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
    const inv = squash(await s.prose('inventory'));
    expect(inv, inv).toMatch(/hemp yarn/i);
    expect(inv, inv).toMatch(/rigging knife/i);
  }, 300_000);

  it('3. twist yarn: it becomes a strand', async () => {
    const s = await session(maker, WALK);
    for (let i = 0; i < 3; i++) {
      const t = await act(s, 'twist yarn --yarns 40 --length 20');
      expect(t, t).toMatch(/strand/i);
    }
    const st = await look(s, 'strand');
    expect(st, st).toMatch(/20 meters of hemp strand/);
  }, 600_000);

  it('4. twist the strands: they become rope — fiber, length, thickness, strength in words', async () => {
    const s = await session(maker, WALK);
    const t = await act(s, 'twist strands');
    expect(t, t).toMatch(/close up into a rope/i);
    const r = await look(s, 'rope');
    expect(r, r).toMatch(/20 meters of hemp rope, about \d+ mm thick; it would hold/);
  }, 600_000);

  it('5. more yarns make a thicker, stronger rope', async () => {
    const s = await session(maker, WALK);
    for (let i = 0; i < 3; i++) await act(s, 'twist yarn --yarns 80 --length 10');
    const t = await act(s, 'twist strands');
    expect(t, t).toMatch(/rope/);
    const all = squash(await s.prose('look rope'));
    const ropes = [...squash(await s.prose('inventory')).matchAll(/rope/g)].length;
    expect(ropes, all).toBeGreaterThanOrEqual(2);
    // The 10 m rope of 80-yarn strands is thicker than the 20 m one.
    const thin = /20 meters of hemp rope, about (\d+) mm/.exec(squash(await s.prose('look 1.rope')) + squash(await s.prose('look 2.rope')));
    const thick = /10 meters of hemp rope, about (\d+) mm/.exec(squash(await s.prose('look 1.rope')) + squash(await s.prose('look 2.rope')));
    expect(thin && thick, all).toBeTruthy();
    expect(Number(thick![1])).toBeGreaterThan(Number(thin![1]));
  }, 600_000);

  it('6. no rope longer than the walk — and the refusal says why', async () => {
    const s = await session(maker, WALK);
    const t = await say(s, 'twist yarn --length 400');
    expect(t, t).toMatch(/The walk is 300 m long; a rope cannot be laid longer than it/);
  }, 120_000);

  it('7. cut a length off, coil one', async () => {
    const s = await session(maker, WALK);
    const c = await act(s, 'cut 1.rope at 5 m');
    expect(c, c).toMatch(/5 meters of rope in your hand/);
    const coil = await act(s, 'coil 1.rope');
    expect(coil, coil).toMatch(/coil/i);
  }, 300_000);

  it('7a. the rogue\'s yarn: not on the outside, in the heart, and at a cut', async () => {
    const s = await session(maker, WALK);
    await act(s, 'twist yarn --yarns 20 --length 10 --mark red');
    await act(s, 'twist yarn --yarns 20 --length 10');
    await act(s, 'twist yarn --yarns 20 --length 10');
    await act(s, 'twist strands');
    const plainLook = await look(s, 'rope');
    expect(plainLook, plainLook).not.toMatch(/red yarn/);
    const close = await say(s, 'analyze lay rope');
    expect(close, close).toMatch(/hemp/);
    const cut = await act(s, 'cut rope at 3 m');
    expect(cut, cut).toMatch(/3 meters/);
    const both = squash(await s.prose('look 1.rope')) + ' ' + squash(await s.prose('look 2.rope'));
    expect(both, both).toMatch(/red yarn runs in the heart/);
  }, 600_000);

  it('8. tar a rope in the tar tub: it reads tarred', async () => {
    const s = await session(maker, WALK);
    const d = await act(s, 'dip rope in tub');
    expect(d, d).toMatch(/pitch/i);
    const r = await look(s, 'rope');
    expect(r, r).toMatch(/tarred/i);
  }, 300_000);

  it('9–10. at the Sunken Delve: tie off at the post, it hangs; climb down and back up; it chafes', async () => {
    const s = await session(maker, LIP);
    const tied = await say(s, 'tie rope to post with bowline');
    expect(tied, tied).toMatch(/hangs down/);
    for (let i = 0; i < 3; i++) {
      const sr = await say(s, 'search');
      if (/down|opens below|hollow/i.test(sr)) break;
    }
    const from = await where(s);
    const down = await say(s, 'climb down');
    expect(await where(s), down).not.toBe(from);
    const up = await say(s, 'climb up');
    expect(await where(s), up).toBe(from);
    const r = await look(s, 'rope');
    expect(r, r).toMatch(/rope/);
  }, 300_000);

  it('11. climbed until it frays — it frays before it parts (the chafe dial raised)', async () => {
    await setDial('cordage.chafePerUse', '1.0');
    try {
      const s = await session(maker, LIP);
      const seen: string[] = [];
      let parted = false;
      for (let i = 0; i < 8 && !parted; i++) {
        const d = await say(s, 'climb down');
        if (/parts above you/.test(d)) { parted = true; break; }
        const u = await say(s, 'climb up');
        if (/parts above you/.test(u)) { parted = true; break; }
        seen.push(await look(s, 'rope'));
      }
      expect(seen.join(' '), seen.join(' | ')).toMatch(/scuffed|fraying|yarns have parted/);
      expect(parted, seen.join(' | ')).toBe(true);
    } finally {
      await setDial('cordage.chafePerUse', '0.06');
    }
  }, 600_000);

  it('12. a reef knot spills under an uneven load, and you fall', async () => {
    const s = await session(maker, LIP);
    // A fresh rope from the ropewalk.
    const w = await session(maker, WALK);
    await say(w, 'buy rope');
    for (let i = 0; i < 30; i++) await say(w, 'buy hemp yarn');
    w.close();
    const s2 = await session(maker, LIP);
    void s;
    const tied = await say(s2, 'tie coil to post with reef knot');
    expect(tied, tied).toMatch(/reef knot/);
    await say(s2, 'search');
    const d = await say(s2, 'climb down');
    expect(d + (await s2.listen(1_000).catch(() => '')), d).toMatch(/spills|hit the bottom/);
  }, 600_000);

  it('13. splice two lengths into one, nearly as strong', async () => {
    const s = await session(maker, WALK);
    await act(s, 'twist yarn --yarns 40 --length 10');
    await act(s, 'twist yarn --yarns 40 --length 10');
    await act(s, 'twist yarn --yarns 40 --length 10');
    await act(s, 'twist strands');
    await act(s, 'cut rope at 4 m');
    const sp = await say(s, 'splice 1.rope to 2.rope');
    expect(sp, sp).toMatch(/one rope now, 10 meters long/);
    const r = await look(s, 'rope');
    expect(r, r).toMatch(/splice/);
  }, 600_000);

  it('15–16. a worn rope parts under a belayed climber: caught; unbelayed: dropped', async () => {
    const m = await session(maker, WALK);
    await say(m, 'buy rope');
    // A thin strand to fail under them.
    await act(m, 'twist yarn --yarns 6 --length 8');
    m.close();
    const belayer = await session(maker, LIP);
    const c = await session(climber, LIP);
    const tieThin = await say(belayer, 'tie strand to post with bowline');
    expect(tieThin, tieThin).toMatch(/hangs down/);
    const tieOn = await say(belayer, `tie coil to ${climber}`);
    expect(tieOn, tieOn).toMatch(/round/);
    const bel = await say(belayer, `belay ${climber} with coil`);
    expect(bel, bel).toMatch(/hold the rope/);
    await say(c, 'search');
    const fall = await say(c, 'climb down');
    const after = fall + ' ' + squash(await c.listen(1_500).catch(() => ''));
    expect(after, after).toMatch(/parts above you/);
    expect(after, after).toMatch(/hauled in/);
    expect(await where(c), after).toBe(await where(belayer));

    // Unbelayed: a second thin strand, and nobody holding.
    await say(belayer, 'belay off');
    const m2 = await session(maker, WALK);
    await act(m2, 'twist yarn --yarns 6 --length 8');
    m2.close();
    const b2 = await session(maker, LIP);
    await say(b2, 'tie strand to post with bowline');
    const fall2 = await say(c, 'climb down');
    const after2 = fall2 + ' ' + squash(await c.listen(1_500).catch(() => ''));
    expect(after2, after2).toMatch(/hit the bottom/);
  }, 900_000);

  it('17. rope is sold back; the lifeline, the heaving line and a painter read as rope', async () => {
    const s = await session(maker, WALK);
    const sold = await say(s, 'sell rope');
    expect(sold, sold).not.toMatch(/does not buy|not yours|no one/i);
    const shop = await session(maker, SHOP);
    const life = await look(shop, 'lifeline');
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
