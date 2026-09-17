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
 * ⭐ **Clean, and that is a finding.** This file was shipped as `.dirty.`
 * with a reason claiming it stamped, named and butchered — it does none
 * of those: `name` refuses (step 12 asserts exactly that), and `offer`
 * asks *what* because the keeper holds no food. Every act here is a
 * refusal or a read, so the world after a run is the world before it.
 * ⚠ The reason it cannot feed the cat is a **producer gap**: nothing on
 * the lane, or reachable from it without a butcher, yields the offal a
 * stray would take. Offered to `hinkley-hills` as a finding. The lift
 * itself — a ground feed raising handling — is `Bonded.test`'s; it needs
 * the feeds cadence and cannot settle on one socket.
 *
 * ⚠ The restart half of the drive — a named cat stood back up at boot
 * with her owner offline, seen by a stranger, resolved (not duplicated)
 * by her owner's login — is a two-boot run and lives in the plan's drive
 * record, not here: a wire file is one boot.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectRefused,
  expectNote,
} from '../src/harness';

declareFile({
  file: 'pets.wire.test.ts',
  packs: ['hinkley-hills', 'terminus', 'generic-objects', 'trade-ranching'],
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

suite('9 · the rung the ladder stood on — and what a socket can see of it', () => {
  /**
   * ⚠⚠ **The assertion this file shipped without, and the bug it hid.**
   *
   * The first version asserted that `pet` refuses and stopped there — it
   * tested the closed door and called it a feature. It was green while
   * the cat was **untameable**: handling could only decay, because `pet`
   * refuses below `wary`, `offer` below the band set food down without
   * crediting anything, and `KeptAnimal` composes no `HandledMixin` so
   * ranching's `handle` cannot reach it.
   *
   * ⭐ A refusal is only honest if something lifts it. The lift — a ground
   * feed raising handling once you step back — is `Bonded.test`'s: it
   * needs the feeds cadence and a second beat, which one socket cannot
   * settle. ⚠ And this file was shipped claiming this suite proved it,
   * when its one assertion only checked that `offer` was a word: the
   * keeper holds no food, so the verb asks *what*. What a socket CAN see
   * is asserted below, exactly; what it cannot is named, not implied.
   */
  it('`offer` with nothing in hand asks WHAT — a refusal by shape, not by the animal', async () => {
    const r = await keeper.cmd('offer offal to cat');
    expectRefused(r);
    expectNote(r, 'controller-rejected', { reason: 'no-food' });
    const said = plain(await r.said());
    // Never "it won't take that": the animal has not been asked anything.
    expect(said).not.toMatch(/won't|refuses|moves off/i);
  });

  it('⚠ producer gap: nothing on the lane yields food a stray would take', async () => {
    // The stray's ladder starts with food on the ground. A keeper arriving
    // on the lane can reach none: offal comes from a butcher, and there
    // is no butcher on Hinkley Lane. This is the drive's finding for the
    // `hinkley-hills` pack, kept green so it stays visible.
    const said = plain(await (await keeper.cmd('look')).said());
    expect(said).not.toMatch(/\boffal\b|\bscraps\b|\bmeat\b/i);
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

  it('⭐ `call` is a NOISE — it takes no target and still reaches the cat', async () => {
    // It is an emission over the acoustic graph, not a query: calling
    // with no name reaches everything in earshot that knows you, which
    // is what shouting in a yard does. A bare `call` must not read as a
    // parse error or a missing argument.
    const said = plain(await (await keeper.cmd('call')).said());
    expect(said).not.toMatch(/don't understand|which|what do you/i);
  });

  it('16 · and `stay` gets the same answer — the word is for the dog', async () => {
    const said = plain(await (await keeper.cmd('stay cat')).said());
    expect(said).toMatch(/looks at you|not looking at you/i);
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
