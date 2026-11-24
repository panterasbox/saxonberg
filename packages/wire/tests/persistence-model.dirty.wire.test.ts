/**
 * ⭐ The persistence-model drive (persistence-model requirements § The
 * drive), on the testbed. What a player can predict when they walk away:
 *
 *   1. [instant · player] a notebook set down in the hall (a plain place):
 *      the kept line once; a second notebook the same day says nothing;
 *      `look` says the hall is not kept
 *   2. [instant · player] a notebook checked into the hall's lockers (a
 *      kept container in a plain place)
 *   6. [instant · staged] one save refused: only it fails in its batch,
 *      the batch-mate is saved, the refused player is told once
 *   9. [short · staged] the day clerk's shift ends — he is out of the
 *      narrative — and next shift he is at the counter again
 *  4/11. [short · staged] restart (killed === false): the hall is as
 *      authored (the dropped notebook is gone), the lockers are as left
 *      (`rack reclaim` returns the notebook)
 *
 * Steps 2's dorm/shelf/cat, 3 (ledgers), 5 (sizes), 7 (lease end), 8 (the
 * ship's stow) and 10 (the lounge) run as their own suites in the content
 * drives that already stand that content up.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  hand,
  advanceWorldClock,
  worldClockNow,
  restartWorld,
  failSavesOf,
  saveBatch,
  PLAZA,
  EXITS,
  NOTEBOOK,
} from '../src/harness';

export const DIRTY_REASON =
  'leaves notebooks in the testbed hall and its lockers, refuses a save, ' +
  'advances the clock across the day clerk\'s shift and restarts the world';

declareFile({
  file: 'persistence-model.dirty.wire.test.ts',
  packs: ['platform', 'test-fixtures', 'generic-objects', 'species-and-names'],
  dirtyReason: DIRTY_REASON,
});

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

let ada: Session;
let bea: Session;
let adaHandle: string;
let beaHandle: string;

beforeAll(async () => {
  adaHandle = uniqueHandle('pm-ada');
  beaHandle = uniqueHandle('pm-bea');
  ada = await Session.open(adaHandle, { startLocation: PLAZA });
  bea = await Session.open(beaHandle, { startLocation: PLAZA });
}, 120_000);

afterAll(() => {
  ada?.close();
  bea?.close();
});

suite('1 — not kept, said once', () => {
  it('⭐ the hall says it is not kept; the first notebook set down there teaches the line; the second does not', async () => {
    expect((await ada.cmd(`go ${EXITS.plaza.hall}`)).status).toBe('ok');
    const look = squash(plain(await ada.prose('look')));
    expect(look, '`look` in a plain place says it is not kept').toMatch(/Not kept: what is left in this place is gone at the next restage/);

    await hand(ada, NOTEBOOK);
    await ada.drainProse();
    const first = await ada.cmd('drop notebook');
    expect(first.status).toBe('ok');
    const said = squash(plain(await ada.listen(1_500)));
    expect(said, 'the first set-down teaches the kept line').toMatch(/Not kept: .* lies somewhere that does not keep what is left in it/);

    await hand(ada, NOTEBOOK);
    await ada.drainProse();
    expect((await ada.cmd('drop notebook')).status).toBe('ok');
    const again = squash(plain(await ada.listen(1_500)));
    expect(again, 'never twice in a day').not.toMatch(/Not kept: .* lies somewhere/);
  });
});

suite('2 — a kept container in a plain place', () => {
  it('⭐ a notebook checked into the hall’s lockers is held, ticketed', async () => {
    await hand(ada, NOTEBOOK);
    const r = await ada.cmd('rack check notebook');
    expect(r.status, squash(plain(await r.said()))).toBe('ok');
    const inside = squash(plain(await ada.prose('look in lockers')));
    expect(inside, 'the lockers keep what is in them').toMatch(/Kept: what is left in its inside stays/);
  });
});

suite('6 — a refused save', () => {
  it('⭐ fails alone in its batch; the batch-mate is saved; the player is told', async () => {
    await failSavesOf(adaHandle, true);
    try {
      await ada.drainProse();
      const r = await saveBatch([adaHandle, beaHandle]);
      expect(r.refused.length, JSON.stringify(r)).toBe(1);
      expect(r.refused[0]).toContain('/platform/agent/Avatar/');
      expect(r.captured).toBe(1);
      const told = squash(plain(await ada.listen(1_500)));
      expect(told).toMatch(/Something went wrong saving you just now/);
    } finally {
      await failSavesOf(adaHandle, false);
    }
  });
});

suite('9 — off shift is out of the narrative', () => {
  it('⭐ the day clerk leaves at the end of his shift and is behind the counter again the next morning', async () => {
    expect((await bea.cmd(`go ${EXITS.plaza.shop}`)).status).toBe('ok');
    // To 19:00 today (or tomorrow), then to 09:00 the next morning — from
    // the world's own clock, not a guess at where it stands.
    const hourNow = (s: number): number => (s % 86_400) / 3_600;
    const toHour = (target: number, s: number): number => ((target - hourNow(s) + 24) % 24) || 24;
    await advanceWorldClock(`${Math.ceil(toHour(19, await worldClockNow()) * 60)}m`);
    await bea.drainProse();
    const evening = squash(plain(await bea.prose('look')));
    expect(evening, 'off shift the clerk is nowhere').not.toMatch(/\bclerk\b/i);
    await advanceWorldClock(`${Math.ceil(toHour(9, await worldClockNow()) * 60)}m`);
    const morning = squash(plain(await bea.prose('look')));
    expect(morning, 'on shift the clerk is at the counter').toMatch(/\bclerk\b/i);
  });
});

suite('4/11 — restart: staged places as authored, kept containers as left', () => {
  it('⭐ the hall restages (the notebooks set down are gone); the lockers keep theirs', async () => {
    ada.close();
    bea.close();
    const stop = await restartWorld();
    expect(stop?.killed ?? false, 'the shutdown sweep finished inside its grace').toBe(false);
    ada = await Session.open(adaHandle, { startLocation: PLAZA });
    expect((await ada.cmd(`go ${EXITS.plaza.hall}`)).status).toBe('ok');
    const r = await ada.cmd('rack reclaim notebook');
    expect(r.status, squash(plain(await r.said()))).toBe('ok');
    // What was dropped on the hall floor did not survive the restage: the
    // shelf's three authored notebooks are all the hall has.
    const loose = squash(plain(await ada.prose('look')));
    expect(loose).not.toMatch(/\b(?:two|three|four|five) notebooks?\b.*\bon the floor\b/i);
  }, 900_000);
});
