/**
 * Placement — ⭐⭐ **where inside its container a thing sits**, driven.
 *
 * The requirements doc's drive script, run over the wire. Block A — nothing
 * that worked has stopped working: a surface lists as furniture, what rests
 * ON it stays out of the room listing, `look` at it says what is on it, and
 * a thing put down on it and picked up again reads as it always did.
 *
 * Stands in the scaffold (test-world-lifecycle D8): the testbed hall's shelf,
 * with notebooks placed on it. The notebook a step moves is HANDED to the
 * drive's own character first and ends back in its hands, so the shelf is
 * left as it was found and the file runs twice on one world.
 *
 * Blocks B–E stand in the Hearthworks cookhouse (an icebox, ice, a meat hook,
 * the cooking archetype), which is content:
 * `placement-content.dirty.wire.test.ts`.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  expectOk,
  hand,
  standIn,
  HALL,
  NOTEBOOK,
} from '../src/harness';

declareFile({
  file: 'placement.wire.test.ts',
  packs: ['platform', 'test-fixtures'],
});

let drinker: Session;

beforeAll(async () => {
  drinker = await standIn(HALL, 'place-hall');
  // ⭐ Staged: a notebook of the drive's own, set on the shelf, so the shelf
  // holds something whatever an earlier drive took off it. Step 3 takes one
  // back, so the shelf ends as it began.
  await hand(drinker, NOTEBOOK);
  expectOk(await drinker.cmd('put notebook on shelf'));
}, 180_000);

afterAll(() => {
  drinker?.close();
});

// ───────────────────────── A — the rename ─────────────────────────

suite('A — nothing that worked has stopped working', () => {
  it('1. the hall lists its furniture and NOT the things resting on the shelf', async () => {
    const said = await drinker.prose('look');
    expect(said.length, 'look must answer at all').toBeGreaterThan(0);
    expect(said).toMatch(/shelf|chair|tablet/i);
    // ⭐ The regression the whole rename risks. The notebooks stay out of
    // the room listing because they are PLACED on the shelf; if
    // `getLooseContents` stopped filtering, they appear.
    expect(said, 'the notebooks are on the shelf, not loose in the room').not.toMatch(
      /notebook/i,
    );
  }, 120_000);

  it('2. `look shelf` shows what is ON it, under a heading that says so', async () => {
    const said = await drinker.prose('look shelf');
    expect(said).toMatch(/On it:/i);
  }, 60_000);

  it('3. put something down on the shelf and pick it up again', async () => {
    expectOk(await drinker.cmd('get notebook'));
    const put = await drinker.cmd('put notebook on shelf');
    expectOk(put);
    expect(await put.said(), 'the prose reads as it always did').toMatch(
      / on /i,
    );
    expectOk(await drinker.cmd('get notebook'));
  }, 120_000);
});
