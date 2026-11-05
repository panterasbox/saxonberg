/**
 * ⛔ **A SOAK file** (span steps — `pnpm wire:soak`, run by the soak lane
 * after merge, never in a blocking run). Harbors — the requirements' soak
 * drive.
 *
 * - **S3** *(span)* The two voyages, sailed in full: chartered at Terminus
 *   and out to Waponi Woo — hailed, berthed at its quay, the charter ended
 *   and paid — then chartered again from Waponi Woo home over the bar.
 *   (Sugar's step 20 with its charter is sugar's own soak file.) Its
 *   blocking twins are steps 8–10 of `harbors.dirty.wire.test.ts`, which
 *   STAGE the Hesper where these voyages sail her.
 *
 * - **S1** *(span)* A smack bought at the yard and left asleep at its quay
 *   weathers from sound to worn at the house's rate (the hull clock is the
 *   residence's) and is found SETTLED there forty days on, not vanished.
 *   Blocking twins: steps 16 and 19 (the hull and the sleep staged).
 * - **S2** *(span)* A smack left at anchor in the roads with nobody aboard
 *   goes down over a forty-day absence and lies on the bottom, still in her
 *   owner's name; her pumped twin — a weathered hull at the same anchorage,
 *   her owner aboard sounding and pumping her every day — does not sink.
 *   Blocking twin: step 21 (the bilge staged near the line).
 *
 * ⚠⚠ `.dirty.`: it charters the Hesper, pays dues and days from a funded
 * player and moves her across the sea, and buys three smacks into the
 * register — none of it produced again.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  advanceWorldClock,
  worldClockNow,
  stageShip,
  hand,
} from '../src/harness';

export const DIRTY_REASON =
  'charters the Hesper, pays her dues and days from a funded player and ' +
  'sails her to Waponi Woo and home, and buys three smacks into the ' +
  'register — none of it produced again';

declareFile({
  file: 'harbors.soak.dirty.wire.test.ts',
  packs: ['platform', 'terminus', 'water', 'transport', 'world-seed', 'trade-diving', 'waponi-woo', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const MOUTH = '/world/terminus/estuary/estuary-mouth';
const HESPER_CO = '/world/terminus/hesper/idea/outfit';

const DAY = 86_400;
const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const open: Session[] = [];
const SAILOR = uniqueHandle('hss');
let sailor: Session;

async function say(s: Session, text: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(text);
  return squash(await r.said());
}

/** Move the clock forward to the next `hour` o'clock. */
async function toHour(hour: number): Promise<void> {
  const now = await worldClockNow();
  const h = ((now % DAY) + DAY) % DAY / 3600;
  const ahead = (hour - h + 24) % 24;
  if (ahead >= 0.05) await advanceWorldClock(`${Math.round(ahead * 60)} minutes`);
}

/** Hail the office until its answer matches `want`, an hour at a time. */
async function hailUntil(s: Session, want: RegExp, tries = 16): Promise<string> {
  let said = '';
  for (let i = 0; i < tries; i++) {
    if (i > 0) await advanceWorldClock('1 hour');
    said = await say(s, 'hail office');
    if (want.test(said)) return said;
  }
  return said;
}

/**
 * ⭐ Sail for `node` until she raises it — navigated, not merely steered
 * (the sugar drive's loop): every watch the landmark is in sight a bearing
 * fixes her and the course is laid again, so the set does not carry her
 * past.
 */
async function sailFor(s: Session, node: string, raised: RegExp, landmark: RegExp, mark: string): Promise<string> {
  let heard = '';
  for (let i = 0; i < 18 && !raised.test(heard); i++) {
    await advanceWorldClock('4 hours');
    heard += ' ' + squash(await s.listen(7_000).catch(() => ''));
    if (raised.test(heard)) break;
    const horizon = await s.cmd('look horizon').then((r) => r.said());
    heard += ' ' + squash(horizon) + ' ' + squash(await s.listen(2_000).catch(() => ''));
    if (raised.test(heard)) break;
    if (landmark.test(horizon)) {
      heard += ' ' + (await say(s, `measure bearing ${mark}`));
      const laid = await say(s, `course ${node}`);
      // Lying off it already: its name brings her in (or the keeper wants a hail).
      if (/already|given her a berth|bring her in/i.test(laid)) break;
    }
  }
  return heard;
}

beforeAll(async () => {
  const s = await Session.open(SAILOR, { startLocation: BANK_HALL });
  open.push(s);
  expectOk(await s.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  expectOk(await gov.cmd(`reserve override 200 to ${SAILOR} "wire: harbors soak funding"`));
  await gov.cmd(`dismiss me at ${HESPER_CO}`);
  gov.close();
  s.close();
  await toHour(6);
  sailor = await Session.open(SAILOR, { startLocation: MOUTH });
  open.push(sailor);
}, 600_000);

afterAll(() => {
  for (const s of open) s.close();
});

suite('S3 — the two voyages, sailed in full', () => {
  it('S3. (span · player) chartered at Terminus, out to Waponi Woo: hailed, berthed at its quay, the charter ended and paid; chartered again and home over the bar', async () => {
    // Out: chartered from the book in her hold, at the estuary mouth.
    expectOk(await sailor.cmd('go hesper'));
    expectOk(await sailor.cmd('go down'));
    expect(await say(sailor, 'charter')).toMatch(/You charter the Hesper/);
    expectOk(await sailor.cmd('go up'));
    expect(await say(sailor, 'course roads')).toMatch(/lay a course/i);
    await advanceWorldClock('1 hour');
    expect(await say(sailor, 'course waponi woo')).toMatch(/lay a course/i);
    const out = await sailFor(sailor, 'waponi woo', /You raise Waponi Woo/, /peak of Waponi Woo/i, 'peak');
    expect(out, 'she never raised the island').toMatch(/You raise Waponi Woo|already|given her a berth/);
    // Lying off: the estate store gives her the jetty, and she comes in.
    const given = await hailUntil(sailor, /Berth at/);
    expect(given, given).toMatch(/Berth at/);
    const alongside = await say(sailor, 'course waponi woo');
    expect(alongside, alongside).toMatch(/bring her in.*made fast/);
    expect(alongside, alongside).toMatch(/charter of the Hesper ends as she makes fast: \d+ days? at 2/);
    expectOk(await sailor.cmd('go ashore'));
    expectOk(await sailor.cmd('go north'));
    expectOk(await sailor.cmd('go north'));
    expect(await say(sailor, 'pay office')).toMatch(/You pay .*charter of the Hesper.*Nothing more is owed/);

    // Home: chartered again aboard, over the sea to the bar.
    expectOk(await sailor.cmd('go south'));
    expectOk(await sailor.cmd('go south'));
    expectOk(await sailor.cmd('go hesper'));
    expectOk(await sailor.cmd('go down'));
    expect(await say(sailor, 'charter')).toMatch(/You charter the Hesper/);
    expectOk(await sailor.cmd('go up'));
    expect(await say(sailor, 'course bar')).toMatch(/lay a course/i);
    let home = '';
    for (let i = 0; i < 18 && !/You raise the bar/i.test(home); i++) {
      await advanceWorldClock('4 hours');
      home += ' ' + squash(await sailor.listen(3_000).catch(() => ''));
    }
    expect(home, 'she never raised the bar').toMatch(/You raise the bar/i);
    expectOk(await sailor.cmd('go ashore'));
  }, 18_000_000);
});

/* ══════════════════════════ Stage B — the hull's clock ══════════════════════════ */

const SHED = '/world/terminus/harbor/yard/shed';
const YARD = '/world/terminus/harbor/yard/quay';
const SEA = '/stuff/idea/WaterExpanse/greywater';
const ROADS = `${SEA}/the-roads`;
const AIR_TANK = '/stuff/thing/gear/air-tank';

const tag = (): string =>
  Array.from({ length: 4 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');

/** A funded player: an account and `amount` in it. */
async function fundedOwner(handle: string, amount: number): Promise<void> {
  const s = await Session.open(handle, { startLocation: BANK_HALL });
  open.push(s);
  expectOk(await s.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  expectOk(await gov.cmd(`reserve override ${amount} to ${handle} "wire: harbors soak smack"`));
  gov.close();
  s.close();
}

/** `buy smack` at the yard, named `name` at the register's prompt. */
async function buySmack(s: Session, name: string): Promise<string> {
  await s.drainProse();
  let done = false;
  const pending = s.cmd('buy smack').finally(() => {
    done = true;
  });
  void (async () => {
    while (!done) {
      const p = (await s.awaitPrompt(250).catch(() => null)) as
        | { promptId?: string; payload?: { promptId?: string } }
        | null;
      if (p === null || done) continue;
      const id = p.payload?.promptId ?? p.promptId;
      if (id) s.answerPrompt(id, name);
    }
  })();
  return squash(await (await pending).said());
}

/** Advance the world `days` game days, a day a jump (soak mode lets a span through). */
async function absent(days: number): Promise<void> {
  for (let d = 0; d < days; d++) await advanceWorldClock('1 day');
}

suite('S1 — the hull clock at her berth', () => {
  it('S1. (span · player) a smack left asleep at the yard quay weathers from sound to worn at the house’s rate, and is found settled there, not vanished', async () => {
    const handle = uniqueHandle('hs1');
    const name = `Skua${tag()}`;
    await fundedOwner(handle, 6_000);
    await toHour(8);
    const s = await Session.open(handle, { startLocation: SHED });
    open.push(s);
    const bought = await buySmack(s, name);
    expect(bought, bought).toMatch(new RegExp(`as the ${name}`));
    expectOk(await s.cmd('go north'));
    expectOk(await s.cmd(`go ${name.toLowerCase()}`));
    expect(await say(s, 'survey')).toMatch(/fabric of the place is sound/);
    expectOk(await s.cmd('go ashore'));
    s.close();
    // Away forty days: nobody aboard, she sleeps; her hull keeps the house's clock.
    await absent(40);
    const back = await Session.open(handle, { startLocation: YARD });
    open.push(back);
    const quay = squash(await back.prose('look here'));
    expect(quay, quay).toMatch(new RegExp(`Alongside: [^.]*the ${name}`));
    expectOk(await back.cmd(`go ${name.toLowerCase()}`));
    const survey = await say(back, 'survey');
    expect(survey, survey).toMatch(/fabric of the place is (worn|badly worn)/);
    const held = await say(back, 'course roads');
    expect(held, held).toMatch(/settled onto the mud/);
  }, 7_200_000);
});

suite('S2 — at anchor in deep water', () => {
  it('S2. (span · player) a worn smack left at anchor in the roads goes down over the absence and lies on the bottom, still hers; her pumped twin does not sink', async () => {
    const handle = uniqueHandle('hs2');
    const left = `Gannet${tag()}`;
    const kept = `Shag${tag()}`;
    await fundedOwner(handle, 12_000);
    await toHour(8);
    const s = await Session.open(handle, { startLocation: SHED });
    open.push(s);
    expect(await buySmack(s, left)).toMatch(new RegExp(`as the ${left}`));
    expect(await buySmack(s, kept)).toMatch(new RegExp(`as the ${kept}`));
    // (staged) Both at the anchorage: the one left, empty and worn; the twin
    // weathered, her owner aboard. Sailing them there is step 14's.
    await stageShip(left, { at: { node: ROADS }, hull: 'worn', bilgeL: 0 });
    expectOk(await s.cmd('go north'));
    expectOk(await s.cmd(`go ${kept.toLowerCase()}`));
    await stageShip(kept, { at: { node: ROADS }, hull: 'weathered', bilgeL: 0 });
    // Twenty days: every day her owner sounds the well and pumps her dry.
    for (let d = 0; d < 20; d++) {
      await advanceWorldClock('1 day');
      for (let stroke = 0; stroke < 60; stroke++) {
        const read = await say(s, 'measure bilge');
        if (/well is dry|little water sloshing/.test(read)) break;
        await say(s, 'pump well');
        await s.listen(22_000);
      }
    }
    // The twin floats; her sister has gone down.
    const twin = await say(s, 'measure bilge');
    expect(twin, twin).not.toMatch(/full of water/);
    expect(await say(s, 'course roads')).not.toMatch(/settl/);
    // Over her side, and down to the bottom: the one left alone lies there.
    const tank = await hand(s, AIR_TANK);
    expectOk(await s.cmd(`wear #${tank}`));
    expectOk(await s.cmd('go side'));
    for (let i = 0; i < 10; i++) {
      const r = await s.cmd('descend');
      if (r.status !== 'ok') break;
      await s.listen(4_000);
    }
    const bed = squash(await s.prose('look here'));
    expect(bed, bed).toMatch(new RegExp(`\\b${left.toLowerCase()}\\b`));
    expectOk(await s.cmd(`go ${left.toLowerCase()}`));
    expect(squash(await s.prose('look here'))).toMatch(/She lies on the bottom, and the sea fills her/);
  }, 18_000_000);
});
