/**
 * The scaffold drive (test-world-lifecycle, drive steps 1 and 7; W3/W4).
 *
 * ⭐ It lives in the fixture pack it drives, so the runner finding it at all
 * is step 7 (a pack's drive runs with the suite). Step 1: a test character
 * stands in every place, walks every exit, looks in its own light (the cellar
 * and the passage are dark; the yard at night too), opens an account at the
 * bank, reads the venue's openings and finds each NPC at its post. Then each
 * staging helper is run TWICE on the same world — a helper that only works on
 * a fresh world is the bug this build exists to remove.
 *
 * Runs twice in a row on one world: nothing here is consumed.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  expectOk,
  isOwnedTestWorld,
  advanceWorldClock,
  worldClockNow,
  stage,
  standIn,
  fundedAccount,
  standInNpc,
  uniqueHandle,
  TESTBED,
  PLAZA,
  APPROACH,
  YARD,
  HUT,
  WORKS,
  CELLAR,
  PASSAGE,
  SHAFT_HEAD,
  SHAFT_FOOT,
  LOT,
  BANK,
  HALL,
  SHOP,
  CELLAR_DOOR,
  EXITS,
} from '@saxonberg/wire/harness';

declareFile({ file: 'scaffold.wire.test.ts', packs: ['test-fixtures', 'trade-shopkeeping'] });

const squash = (t: string): string => t.replace(/\s+/g, ' ').trim();
const DARK = /pitch dark|too dark|can't see|cannot see/i;

const open: Session[] = [];
afterAll(() => {
  for (const s of open) s.close();
});

async function at(place: string, prefix = 'scaffold'): Promise<Session> {
  const s = await standIn(place, prefix);
  open.push(s);
  return s;
}

/** Each place, and the words that take you to each neighbour. */
const PLACES: Array<{ path: string; key: keyof typeof EXITS; lit: boolean }> = [
  { path: PLAZA, key: 'plaza', lit: true },
  { path: APPROACH, key: 'approach', lit: true },
  { path: YARD, key: 'yard', lit: true },
  { path: HUT, key: 'hut', lit: true },
  { path: WORKS, key: 'works', lit: true },
  { path: SHAFT_HEAD, key: 'shaftHead', lit: true },
  { path: SHAFT_FOOT, key: 'shaftFoot', lit: true },
  { path: LOT, key: 'lot', lit: true },
  { path: BANK, key: 'bank', lit: true },
  { path: HALL, key: 'hall', lit: true },
  { path: SHOP, key: 'shop', lit: true },
  { path: CELLAR, key: 'cellar', lit: false },
  { path: PASSAGE, key: 'passage', lit: false },
];

/** Ways a body cannot take by design: the keyless gate and the window (the cellar door is staged open). */
const SHUT = new Set(['yard>shop', 'shop>yard', 'plaza>hut', 'hut>plaza']);

suite.skipIf(!isOwnedTestWorld())('the scaffold is there (step 1)', () => {
  it('⭐ by day: every place answers a login, and looks as lit as it is', async () => {
    const DAY = 86_400;
    const sec = (await worldClockNow()) % DAY;
    const toNoon = sec <= 43_200 ? 43_200 - sec : DAY + 43_200 - sec;
    if (toNoon > 60) await advanceWorldClock(`${Math.round(toNoon / 60)} minutes`);
    for (const p of PLACES) {
      const s = await at(p.path);
      const look = squash(await s.prose('look'));
      if (p.lit) expect(look, `${p.path} by day`).not.toMatch(DARK);
      else expect(look, `${p.path} is unlit`).toMatch(DARK);
      s.close();
    }
  });

  it('every open way can be walked, both ends', async () => {
    // The cellar door is locked from the shop side; stage it open for the walk,
    // and put it back — a drive stages a door before it relies on it (D3).
    await stage(CELLAR_DOOR, 'setLocked', false);
    await stage(CELLAR_DOOR, 'setOpen', true);
    try {
      for (const p of PLACES) {
        for (const [to, word] of Object.entries(EXITS[p.key])) {
          if (SHUT.has(`${p.key}>${to}`)) continue;
          const s = await at(p.path, 'walker');
          const r = await s.cmd(`go ${word}`);
          expectOk(r);
          s.close();
        }
      }
    } finally {
      await stage(CELLAR_DOOR, 'setOpen', false);
      await stage(CELLAR_DOOR, 'setLocked', true);
    }
  });

  it('the keyless gate and the window refuse a body', async () => {
    const yard = await at(YARD, 'gate');
    expect(squash(await yard.prose(`go ${EXITS.yard.shop}`))).toMatch(/locked|closed|shut/i);
    const hut = await at(HUT, 'window');
    expect(squash(await hut.prose(`go ${EXITS.hut.plaza}`))).not.toMatch(/testbed plaza/i);
  });

  it('a test character opens an account at the bank', async () => {
    const s = await at(BANK, 'banker');
    expect(squash(await s.prose('bank open'))).toMatch(/account/i);
  });

  it("the venue's openings read in the hall", async () => {
    const s = await at(HALL, 'seeker');
    expect(squash(await s.prose('job apply'))).toMatch(/host|attendant|hand|opening|position/i);
  });

  it('every NPC is at its post', async () => {
    const posts: Array<[string, RegExp]> = [
      [PLAZA, /greeter/i],
      [BANK, /teller/i],
      [HALL, /host/i],
      [SHOP, /attendant/i],
    ];
    for (const [place, who] of posts) {
      const s = await at(place, 'counter');
      expect(squash(await s.prose('look')), `${who} at ${place}`).toMatch(who);
      s.close();
    }
  });

  it('by night: the yard is dark, the lit rooms are not', async () => {
    const DAY = 86_400;
    const sec = (await worldClockNow()) % DAY;
    const toOne = sec <= 3_600 ? 3_600 - sec : DAY + 3_600 - sec;
    await advanceWorldClock(`${Math.round(toOne / 60)} minutes`);
    const yard = await at(YARD, 'night');
    expect(squash(await yard.prose('look')), 'the yard at night').toMatch(DARK);
    const bank = await at(BANK, 'night');
    expect(squash(await bank.prose('look')), 'the bank at night').not.toMatch(DARK);
  });
});

suite.skipIf(!isOwnedTestWorld())('staging works twice on one world (W4)', () => {
  it('⭐ fundedAccount leaves a balance, again', async () => {
    for (const round of [1, 2]) {
      const handle = uniqueHandle('funded');
      await fundedAccount(handle, 500, `scaffold drive, round ${round}`);
      const s = await Session.open(handle, { startLocation: BANK });
      open.push(s);
      expect(squash(await s.prose('bank')), `round ${round}`).toMatch(/\b500\b/);
    }
  });

  it('standInNpc clones an NPC to harm, again', async () => {
    for (const round of [1, 2]) {
      const s = await standIn(PLAZA, 'cloner', { committees: [TESTBED] });
      open.push(s);
      const id = await standInNpc(s);
      expect(id, `round ${round}`).toBeTruthy();
      expect(squash(await s.prose(`look #${id}`))).not.toMatch(/don't see|no such/i);
    }
  });

  it('a committee seat appoints a test character at the venue, again', async () => {
    for (const round of [1, 2]) {
      const s = await standIn(HALL, 'appointee', { committees: [TESTBED] });
      open.push(s);
      expectOk(await s.cmd(`house appoint me to host at /world/testbed/idea/venue`));
      void round;
    }
  });
});
