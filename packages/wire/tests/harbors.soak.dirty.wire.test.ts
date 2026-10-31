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
 * S1 (the hull's clock at a berth) and S2 (the deep-anchor sinking) are
 * Stage B's and join this file with it.
 *
 * ⚠⚠ `.dirty.`: it charters the Hesper, pays dues and days from a funded
 * player and moves her across the sea — none of it produced again.
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
} from '../src/harness';

export const DIRTY_REASON =
  'charters the Hesper, pays her dues and days from a funded player and ' +
  'sails her to Waponi Woo and home — none of it produced again';

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
