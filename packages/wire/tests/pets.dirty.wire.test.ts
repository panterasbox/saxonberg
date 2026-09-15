/**
 * Pets — ⭐⭐ **an animal kept for itself**, driven over the wire.
 *
 * The requirements' drive is thirty-one steps and a good many of them
 * need days of game time or a second sitting. What lands here is every
 * step a socket can settle in one run, plus the three claims that would
 * be catastrophic to get wrong and invisible to every other tier:
 *
 *  1. ⚠⚠ **Ownership must never locate.** `find world:mine` says WHAT is
 *     yours and must never say where. If it ever names a place, the
 *     whole design is dead: a companion becomes a tracking device and a
 *     thief becomes a bloodhound. Step 21.
 *  2. ⭐⭐ **The cat refuses and the collie complies, to the same verb.**
 *     Same care, same bond, same word, opposite answer — and the reason
 *     is the animal, not the player. Steps 14, 28, 29.
 *  3. ⭐ **A refusal explains nothing.** Every way of not eating renders
 *     as one sentence, because an animal that told you why would be a
 *     contamination detector you can read off. Step 17.
 *
 * ⚠ Ported as a wire file rather than a `scripts/drive-pets.ts`: five of
 * those accumulated, each was dead the day after its MR merged, and when
 * they were finally migrated **two had been failing on master for weeks
 * with nobody able to know.**
 *
 * ⚠⚠ **Reset the dev DB before running this.** A named-animal record
 * from a previous world restores onto a lane that has since re-minted a
 * stray, so the lane holds two cats and the assertions read as failures
 * in a build where nothing is broken. That is the stale-world forgery
 * the food-safety file documents, in this build's shape.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectRefused,
} from '../src/harness';

export const DIRTY_REASON =
  'stamps the lane’s only stray — the cast will not re-mint one while it ' +
  'is live — names it into holder_snapshots, and butchers a carcass for ' +
  'the offal; none of it is produced again';

declareFile({
  file: 'pets.dirty.wire.test.ts',
  packs: ['hinkley-hills', 'terminus', 'generic-objects', 'trade-ranching'],
  dirtyReason: DIRTY_REASON,
});

const LANE = '/world/terminus/hinkley-hills/location/lane';

let keeper: Session;

beforeAll(async () => {
  keeper = await Session.open(uniqueHandle('pets'), { startLocation: LANE });
}, 120_000);

afterAll(() => {
  keeper?.close();
});

suite('6–7 · there is a cat on the lane, and it reads without a number', () => {
  it('the lane holds a thin cat', async () => {
    const said = plain(await (await keeper.cmd('look')).said());
    expect(said).toMatch(/cat/i);
  });

  it('⭐ looking at it tells you how it is holding itself — and no number', async () => {
    const said = plain(await (await keeper.cmd('look cat')).said());
    expect(said).not.toMatch(/don't see|can't see|don't understand/i);
    // Band words, never a figure. A keeper reads an animal.
    expect(said).not.toMatch(/\b0?\.\d+\b/);
    expect(said).not.toMatch(/\b\d+%/);
  });
});

suite('8 · you have not earned a hand yet', () => {
  it('⭐ `pet` refuses, and the animal does not explain itself', async () => {
    const r = await keeper.cmd('pet cat');
    const said = plain(await r.said());
    expect(said).toMatch(/moves off/i);
    // ⚠ Not "it is too wild", not a threshold, not a number.
    expect(said).not.toMatch(/\bhandling\b|\bbond\b|\bthreshold\b|\d/i);
  });
});

suite('12 · it will not be named by somebody it has not chosen', () => {
  it('⭐⭐ `name` refuses a cat that has never followed you', async () => {
    const r = await keeper.cmd('name cat Mouse');
    expectRefused(r);
    const said = plain(await r.said());
    expect(said).toMatch(/has not chosen you/i);
  });

  it('and it is therefore still just a cat to everybody', async () => {
    const said = plain(await (await keeper.cmd('look cat')).said());
    expect(said).not.toMatch(/\bMouse\b/);
  });
});

suite('14 · ⭐⭐ the cat does not come when called', () => {
  it('`call` gets a look, and nothing says the bond is the problem', async () => {
    const r = await keeper.cmd('call cat');
    const said = plain(await r.said());
    expect(said).toMatch(/looks at you/i);
    // THE point of the step: it must not read as a shortfall. No
    // "not bonded enough", no "try again later", no number.
    expect(said).not.toMatch(/\benough\b|\byet\b|\bmore\b|\d/i);
  });

  it('16 · and `stay` gets the same answer — the word is for the dog', async () => {
    const said = plain(await (await keeper.cmd('stay cat')).said());
    expect(said).toMatch(/looks at you/i);
  });
});

suite('⚠⚠ 21 · ownership says WHAT is yours, never where', () => {
  it('`find world:mine` names no place, ever', async () => {
    const said = plain(await (await keeper.cmd('find world:mine')).said());
    // ⭐ The assertion the whole lost-and-found design rests on. If this
    // ever fails, a pet is a tracking device: do not "fix" it by
    // changing the test.
    for (const leak of [
      / in the /i,
      /\bat the\b/i,
      /\blocated\b/i,
      /\broom\b/i,
      /\blane\b/i,
      /\bcoords?\b/i,
    ]) {
      expect(said).not.toMatch(leak);
    }
  });
});

suite('the verbs exist and are afforded by the animal', () => {
  it.each(['pet', 'call', 'stay', 'name', 'offer'])(
    '`%s` is a verb the game knows',
    async (verb) => {
      const said = plain(await (await keeper.cmd(`${verb} cat`)).said());
      // A verb nothing affords answers "I don't understand" — the failure
      // this build's four-link reachability check exists to catch.
      expect(said).not.toMatch(/don't understand|unknown command/i);
    },
  );

  it('⭐ `stay` no longer belongs to combat', async () => {
    // It was an alias on `intervene`, whose arg binds anything Visible,
    // so the two could not be told apart by shape. One had to give it up.
    const said = plain(await (await keeper.cmd('stay cat')).said());
    expect(said).not.toMatch(/killing stroke|coup|fight/i);
  });
});
