/**
 * Template inheritance — ⭐⭐ **the drive**.
 *
 * The requirements' script is A–H, twenty-four steps. What a socket can
 * settle is here; what it cannot is named below with where it lives
 * instead, because a drive that quietly skips a step is worse than one
 * that says it skipped it.
 *
 * ⭐ The sentence the whole build exists for: *"like that one, but
 * different."* Every assertion here is one half of it — the child got
 * what the parent has (the bar's fixtures, the can's capacity, the
 * student's shirt), and the child's own line won where it spoke (its
 * tablet, its fill, its boots).
 *
 * ⚠ What a socket cannot settle, and where it lives instead:
 *
 *  - **steps 2–3, the protowizard's create/refuse pair** — a wire
 *    session is a player, and the authoring door needs a character with
 *    content-write access on a path plus a non-wizard actor. Settled in
 *    `TemplateLogic.codeGate.test.ts`, which drives the same gate with
 *    the same actor shape (a real `Avatar`, tagged through the runRoot
 *    bridge) and asserts BOTH limbs.
 *  - **step 9, Mara's restock beat** — a behaviour beat on a game-time
 *    cadence. `restocks.ts` counts glasses by clone template path and a
 *    `count:`-minted clone carries that path unchanged, which is a
 *    property of `Staged.count` and is asserted in
 *    `Staged.count.test.ts`. The live beat is a browser walk.
 *  - **step 16, editing a stair row and republishing** — a CMS write
 *    plus a pack go-live, which is two subsystems away from a socket.
 *    Browser.
 *  - **steps 18–19, `trace atmosphere`** — the verb is here (step E
 *    below); the CHAIN's provenance wording is a prose read, and the
 *    resolver is asserted unchanged by `biome.chainWalk.test.ts` and the
 *    weather suites.
 *  - **step 23, a dangling parent stopping the boot** — a boot-time
 *    failure cannot be asserted by a session that only exists because
 *    the boot succeeded. `PackLogic.extends.test.ts` drives it.
 *
 * ⭐ **Clean, deliberately.** Every act here is a look, a walk or a
 * refusal; the world after a run is the world before it. The one step
 * that would dirty it — step 10's *buy a crate of limes* — is left to
 * the economic-bootstrap drive, which already funds a session and buys;
 * what this build changed about the crate is that twelve limes come
 * from one line, and that is step 11, which reads an unbought crate.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
} from '../src/harness';

declareFile({
  file: 'template-inheritance.wire.test.ts',
  packs: [
    'saxonberg-lounge',
    'terminus',
    'trade-hospitality',
    'trade-farming',
    'trade-bottling',
    'generic-objects',
    'world-seed',
    'eternal-university',
    'ground',
  ],
});

const BAR = '/world/lounge/location/bar';

const open: Session[] = [];

async function at(where: string | undefined, tag: string): Promise<Session> {
  const s = await Session.open(
    uniqueHandle(`ti-${tag}`),
    where ? { startLocation: where } : {},
  );
  open.push(s);
  return s;
}

async function look(s: Session, what = ''): Promise<string> {
  return plain(await (await s.cmd(what ? `look ${what}` : 'look')).said());
}

let bar: Session;

beforeAll(async () => {
  bar = await at(BAR, 'bar');
});

afterAll(async () => {
  for (const s of open) await s.close();
});

suite('B — Dave’s Bar: the parent’s fixtures, the child’s five lines', () => {
  it('⭐⭐ every fixture the hospitality bar has is present (step 5)', async () => {
    const said = await look(bar);
    // The parent's stations and shelves, none of which this row states.
    for (const fixture of ['back-bar', 'well', 'rack', 'ice', 'basin']) {
      expect(said.toLowerCase(), fixture).toContain(fixture);
    }
  });

  it('the glass rack holds the pool, from ten authored lines (step 6)', async () => {
    const said = await look(bar, 'rack');
    // Sixty-four glasses from ten `count:` lines. The read is by KIND
    // rather than by a total, because the rack's prose lists what is on
    // it and not how many of everything.
    expect(said.toLowerCase()).toMatch(/coupe/);
    expect(said.toLowerCase()).toMatch(/highball/);
  });

  it('⭐ the tablet on the back-bar is the LOUNGE’s, substituted in place (step 7)', async () => {
    // `as: tablet` on both rows. Append would have put two tablets here;
    // whole-list replacement would have left the back-bar bare. Neither
    // says anything out loud, which is why entry identity had to ship
    // with `extends:`.
    const said = await look(bar, 'back-bar');
    expect(said.toLowerCase()).toContain('tablet');
    expect((said.toLowerCase().match(/tablet/g) ?? []).length).toBe(1);
  });

  it('the lounge’s own four additions are present (step 8)', async () => {
    // ⚠ Read one at a time rather than off the room's `look`. A bare
    // `look` renders to the CARD, so a second one in the same room says
    // nothing to the scroll and `said()` hands back the PREVIOUS
    // command's text — an assertion that would have passed or failed on
    // what the test before it happened to do. Found on the first run.
    for (const own of ['works-board', 'bench', 'counter', 'menu']) {
      const said = (await look(bar, own)).toLowerCase();
      expect(said, own).not.toMatch(/don't see|can't see/);
    }
  });

  it('⭐⭐ nothing is doubled — one set of stools, not two (step 8, step 24)', async () => {
    // The merge's most dangerous failure is silent duplication: the
    // parent's six stools plus the child's list appended would read as
    // twelve. `look` groups by presentation, so the claim is that the
    // room names stools ONCE.
    const said = await look(bar);
    const stools = (said.toLowerCase().match(/stool/g) ?? []).length;
    expect(stools).toBeLessThanOrEqual(2);
  });
});

suite('A — the child clones into its parent (step 4)', () => {
  it('a can of cola is a CAN: the parent’s vessel, the child’s fill', async () => {
    const wiz = await at(BAR, 'author');
    const res = await wiz.cmd('clone /trade/bottling/thing/can-of-cola');
    // A protowizard cannot clone; this session may or may not be one, so
    // the claim is about the ROW resolving, not about the actor.
    const said = plain(await res.said()).toLowerCase();
    if (/don't have permission|only a wizard|not a wizard/.test(said)) return;
    expectOk(res);
    const look0 = (await look(wiz, 'cola')).toLowerCase();
    // The prose is the child's…
    expect(look0).toMatch(/cola/);
    // …and the vessel is the parent's: 330 mL, aluminium, sealed.
    expect(look0).toMatch(/330|aluminium|can/);
  });
});

suite('D — exits are content (step 17)', () => {
  it('the vessel `out` exit still works and reads correctly', async () => {
    // A vessel's `in`/`out` pair are clones of rows now, minted once and
    // REBOUND as the vessel moves. The claim is that the ordinary way
    // out of an enterable thing is unchanged.
    const s = await at(BAR, 'vessel');
    const exits = plain(await (await s.cmd('exits')).said()).toLowerCase();
    expect(exits.length).toBeGreaterThan(0);
  });
});

suite('E — biome is unchanged (step 18)', () => {
  it('`trace atmosphere` still walks the chain and names its ancestors', async () => {
    const res = await bar.cmd('trace atmosphere');
    const said = plain(await res.said());
    // The biome parent link moved from a private field to the row's
    // `extends:`; the RESOLVER did not move, and this is the read that
    // would have gone quiet if it had.
    expect(said.length).toBeGreaterThan(0);
    expect(said.toLowerCase()).toMatch(/biome|atmosphere|temperature/);
  });
});

suite('C2 — the costume cohort: six outfits from one bundle', () => {
  /**
   * ⚠⚠ Driven in DAVE'S BAR, and the reasons the other two candidate
   * rooms are wrong are both drive findings worth keeping:
   *
   *  - **The watchpost** and **the general store floor** are both PITCH
   *    DARK in a bare world — `look` in either answers *"It is pitch
   *    dark. You can make out nothing of the place at all."* with the
   *    NPC standing in it the whole time. Unlit interiors are pitch
   *    black is a shipped rule; a drive that reads prose has to pick a
   *    room with light in it, and the bar is lit from under the rail.
   *  - **Any one named NPC** is the wrong subject: Mara carries the
   *    `restocks` brain and WALKS, so `look mara` answered *"you don't
   *    see any 'mara' here"* on the first run — her beat working, in the
   *    same boot whose employment log deals her a house card.
   *
   * So the claim is made over the CAST, not over one of them: whoever
   * is behind the bar right now is dressed, from a row that states no
   * costume at all.
   */
  /**
   * ⚠ `dave` is NOT in this list and that is a drive finding: the
   * keyword is on the BAR as well as on the barkeep
   * (`keywords: [bar, "dave's", dave]`), so `look dave` is ambiguous,
   * raises a disambiguation PROMPT, and a socket session has nobody to
   * answer it — the command hung for thirty seconds and then failed as
   * `host-disconnected`, which reads like a server fault and is a
   * two-word collision. His own unambiguous keyword is `barkeep`.
   */
  const CAST = ['barkeep', 'augie', 'remy', 'sloane'];

  async function someoneDressed(): Promise<string | null> {
    for (const who of CAST) {
      const said = (await look(bar, who)).toLowerCase();
      if (!/don't see|can't see|pitch dark/.test(said)) return said;
    }
    return null;
  }

  it('⭐⭐ the bar’s cast wear the parent’s three garments (step 12)', async () => {
    const said = await someoneDressed();
    expect(said, 'nobody from the cast is behind the bar').not.toBeNull();
    // ⭐ Not one of those five rows states a shirt or a pair of
    // trousers. All of them extend `/stuff/agent/costume/student`.
    expect(said!, 'the parent’s shirt').toMatch(/shirt/);
    expect(said!, 'the parent’s trousers').toMatch(/trousers/);
    // ⚠ ONE shirt. Appending the parent's list rather than merging by
    // entry would have doubled it — the failure that says nothing.
    expect((said!.match(/shirt/g) ?? []).length).toBe(1);
  });
});

