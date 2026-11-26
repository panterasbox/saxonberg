/**
 * ⭐ The crowd — thirty people in the plaza (controllers-are-io D27).
 *
 * Stands in the scaffold (test-world-lifecycle D8): the plaza's greeter, the
 * hall's host, the approach. Every character is fresh, so a greeter's memory
 * of the last run greets nobody twice — it runs twice on one world.
 *
 * The greeting COUNT blocks: an arriver is greeted once by each greeter, and
 * when the room stands nobody is greeted. The timing is printed here and
 * bounded in `crowd.soak.wire.test.ts`, because a round trip is honest only on
 * an idle box.
 */

import { describe as suite, it, expect } from 'vitest';
import {
  declareFile,
  runCrowd,
  CROWD_SIZE,
  Session,
  uniqueHandle,
  hand,
  standIn,
  APPROACH,
  PLAZA,
  EXITS,
  NOTEBOOK,
} from '../src/harness';

declareFile({ file: 'crowd.wire.test.ts', packs: ['platform', 'test-fixtures'] });

suite(`a crowd of ${CROWD_SIZE} in the plaza`, () => {
  it('greets each arriver once, and greets nobody when nobody arrives', async () => {
    const record = await runCrowd(process.env.WIRE_CROWD_LABEL ?? 'blocking');
    for (const [speaker, most] of Object.entries(record.greetedOwnMax)) {
      expect(most, `${speaker} greeted one arriver ${most} times`).toBe(1);
    }
    expect(record.greetingsInQuiet, 'a greeting with nobody arriving').toBe(0);
  }, 600_000);
});

/**
 * ⚠ A greeter's count can pass having greeted nobody, so this one asserts the
 * greeting is THERE: the hall's host, rostered at the door around the clock.
 */
suite('somebody who stays put', () => {
  it('greets each of three arrivals once', async () => {
    const heard: string[] = [];
    const sessions: Session[] = [];
    for (let i = 0; i < 3; i++) {
      const s = await standIn(PLAZA, `crowd-regular${i}`);
      sessions.push(s);
      await s.drainProse();
      await s.cmd(`go ${EXITS.plaza.hall}`);
      heard.push(await s.listen(6_000, { sinceDrain: true }));
    }
    for (const said of heard) {
      const greeted = said.split('\n').filter((l) => l.includes(' says to you'));
      expect(greeted.length, `greeted on arrival: ${said.slice(0, 300)}`).toBeGreaterThan(0);
      const bySpeaker = new Set(greeted.map((l) => l.slice(0, l.indexOf(' says to you'))));
      expect(bySpeaker.size, `once by each: ${greeted.join(' | ')}`).toBe(greeted.length);
    }
    for (const s of sessions) s.close();
  }, 180_000);
});

/**
 * ⭐⭐ Signed out, the body leaves the world; dropped, it stays (owner, D30). Both
 * read from a second person standing in the room.
 */
suite('who is still standing there', () => {
  const ROOM = APPROACH;
  /** Is this body standing where `witness` is? Asked by id: a stranger reads as "a human". */
  const standing = async (witness: Session, stuffId: string): Promise<boolean> =>
    (await witness.query('~here:i', { fields: 'ref' })).some((r) => r.stuffId === stuffId);

  it('signing out takes the body and what it carried, and logging in brings both back once', async () => {
    const witness = await Session.open(uniqueHandle('crowd-witness'), { startLocation: ROOM });
    const handle = uniqueHandle('crowd-leaver');
    const leaver = await Session.open(handle, { startLocation: ROOM });
    await leaver.drainProse();
    const notebook = await hand(leaver, NOTEBOOK);
    expect(notebook).toBeTruthy();
    expect(await leaver.prose('inventory')).toMatch(/notebook/i);
    const body = (await leaver.queryOne('me', 'ref'))?.stuffId ?? '';
    expect(await standing(witness, body), 'seen while playing').toBe(true);

    leaver.close();
    await expect.poll(() => standing(witness, body), { timeout: 20_000, interval: 1_000 }).toBe(false);
    expect(await witness.prose('look'), 'nothing it carried fell on the floor').not.toMatch(/\bnotebook\b/i);

    const back = await Session.open(handle);
    const carried = await back.prose('inventory');
    expect(carried.match(/\bnotebook\b/gi)?.length ?? 0, `the notebook, once: ${carried}`).toBe(1);
    const returned = (await back.queryOne('me', 'ref'))?.stuffId ?? '';
    expect(returned, 'a return is a fresh body').not.toBe(body);
    expect(await standing(witness, returned), 'back where it stood').toBe(true);
    back.close();
    witness.close();
  }, 180_000);

  it('losing the connection leaves the body where it stands, and a new socket finds it', async () => {
    const witness = await Session.open(uniqueHandle('crowd-witness'), { startLocation: ROOM });
    const handle = uniqueHandle('crowd-dropper');
    const dropper = await Session.open(handle, { startLocation: ROOM });
    const body = (await dropper.queryOne('me', 'ref'))?.stuffId ?? '';
    dropper.drop();
    await new Promise((r) => setTimeout(r, 8_000));
    expect(await standing(witness, body), 'still standing there').toBe(true);
    const back = await Session.open(handle);
    expect((await back.queryOne('me', 'ref'))?.stuffId, 'the same body').toBe(body);
    back.close();
    witness.close();
  }, 180_000);
});
