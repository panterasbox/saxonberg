/**
 * ⭐ The crowd — thirty people in the square (controllers-are-io D27).
 *
 * The greeting COUNT blocks: an arriver is greeted once by each greeter, and
 * when the room stands nobody is greeted. The timing is printed here and
 * bounded in `crowd.soak.wire.test.ts`, because a round trip is honest only on
 * an idle box.
 */

import { describe as suite, it, expect } from 'vitest';
import { declareFile, runCrowd, CROWD_SIZE, Session, uniqueHandle, hand, expectOk } from '../src/harness';

declareFile({
  file: 'crowd.dirty.wire.test.ts',
  packs: ['platform', 'terminus'],
  dirtyReason:
    'thirty characters are created and walk into the market square; each is ' +
    'greeted and each is remembered by the greeters who saw them.',
});

suite(`a crowd of ${CROWD_SIZE} in the square`, () => {
  it('greets each arriver once, and greets nobody when nobody arrives', async () => {
    const record = await runCrowd(process.env.WIRE_CROWD_LABEL ?? 'blocking');
    for (const [speaker, most] of Object.entries(record.greetedOwnMax)) {
      expect(most, `${speaker} greeted one arriver ${most} times`).toBe(1);
    }
    expect(record.greetingsInQuiet, 'a greeting with nobody arriving').toBe(0);
  }, 600_000);
});

/**
 * ⭐⭐ Signed out, the body leaves the world; dropped, it stays (owner, D30). Both
 * read from a second person standing in the room.
 */
suite('who is still standing there', () => {
  const ROOM = '/world/terminus/counting-houses/avenue-block';
  const nameIn = (prose: string, name: string): boolean => prose.toLowerCase().includes(name.toLowerCase());

  it('signing out takes the body and what it carried, and logging in brings both back once', async () => {
    const witness = await Session.open(uniqueHandle('crowd-witness'), { startLocation: ROOM, wizard: true, committees: ['/world/terminus'] });
    const handle = uniqueHandle('crowd-leaver');
    const leaver = await Session.open(handle, { startLocation: ROOM, wizard: true, committees: ['/world/terminus'] });
    await leaver.drainProse();
    const rag = await hand(leaver, '/stuff/thing/rag');
    expect(rag).toBeTruthy();
    expect(await leaver.prose('inventory')).toMatch(/rag/i);
    const me = await leaver.queryOne('me', ['name']);
    const name = String((me as { name?: unknown } | null)?.name ?? '');
    expect(name, 'the body has a name a witness can look for').not.toBe('');
    expect(nameIn(await witness.prose('look'), name), 'seen while playing').toBe(true);

    leaver.close();
    await expect.poll(async () => nameIn(await witness.prose('look'), name), { timeout: 20_000, interval: 1_000 }).toBe(false);
    expect(await witness.prose('look'), 'nothing it carried fell on the floor').not.toMatch(/\brag\b/i);

    const back = await Session.open(handle);
    const carried = await back.prose('inventory');
    expect(carried.match(/\brag\b/gi)?.length ?? 0, `the rag, once: ${carried}`).toBe(1);
    expect(nameIn(await witness.prose('look'), name), 'back where it stood').toBe(true);
    back.close();
    witness.close();
  }, 180_000);

  it('losing the connection leaves the body where it stands, and a new socket finds it', async () => {
    const witness = await Session.open(uniqueHandle('crowd-witness'), { startLocation: ROOM });
    const handle = uniqueHandle('crowd-dropper');
    const dropper = await Session.open(handle, { startLocation: ROOM });
    const me = await dropper.queryOne('me', ['name']);
    const name = String((me as { name?: unknown } | null)?.name ?? '');
    dropper.drop();
    await new Promise((r) => setTimeout(r, 8_000));
    expect(nameIn(await witness.prose('look'), name), 'still standing there').toBe(true);
    const back = await Session.open(handle);
    expectOk(await back.cmd('look'));
    back.close();
    witness.close();
  }, 180_000);
});
