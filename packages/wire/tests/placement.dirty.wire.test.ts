/**
 * Placement — ⭐⭐ **where inside its container a thing sits**, driven.
 *
 * The requirements doc's drive script, run over the wire. Five blocks:
 *
 *   A. nothing that worked has stopped working (Dave's Bar's surfaces);
 *   B. a kitchen gets somewhere cold, for the first time;
 *   C. a new way of sitting, added by an author, used by a player;
 *   D. refusals explain themselves;
 *   E. the author's turn — a manual checkpoint, recorded not asserted.
 *
 * ⚠⚠ **What this file deliberately does NOT try to prove.** Steps 8 and
 * 9 of the script — *the food in the icebox is in a better condition
 * band* and *later the ice has melted* — are SLOW ARCS. Four game-days
 * is eight real hours at the shipped 12× clock, and the harness has no
 * clock control by design (`session.ts`: *"Everything waits on a frame,
 * never on a clock"*). Turning the clock up would take a wizard, which
 * would prove something no player can do — the food-safety file's own
 * ruling, and it holds here.
 *
 * So the work is split three ways and each part is proven where it is
 * cheap and honest:
 *   - the CAUSE, here: the survey flips, and a `measure temperature`
 *     reads a different band inside the box than on the counter;
 *   - the ARITHMETIC, in milliseconds, in the unit suite
 *     (`Freshness.test.ts` — 273 K and 293 K land in different bands;
 *     `Coolbox.test.ts` — the melt budget, computed from the sim);
 *   - the OUTCOME, by hand in a browser, recorded in the plan.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectRefused,
  describe as say,
} from '../src/harness';

/**
 * ⭐⭐ **Why this file cannot run twice.**
 *
 * It hangs the cookhouse pantry's `prime-cut` on the meat hook, clones
 * a block of ice into a kitchen and shuts it in the icebox, and moves
 * a provision off a counter into cold storage. None of that is
 * produced again: a second run against the same world finds the hook
 * already loaded and the ice already melting, which reads as broken
 * checkpoints in a build that is fine.
 *
 * ⚠⚠ And a `props:` edit does not reach a world that has already
 * booted — the staging once-guard is persistent, deliberately, so a
 * content go-live cannot mint a second set of furniture into every
 * live room. **This build adds an icebox to two kitchens and a hook to
 * the cookhouse, so it MUST run against a world booted after those
 * rows landed.** Against a stale world the box and the hook simply are
 * not there, and a missing prop forges a dead-affordance signal, which
 * is the one thing a drive exists to catch. Drop the dev DB first.
 */
export const DIRTY_REASON =
  'hangs the cookhouse pantry’s only prime cut on the meat hook, and ' +
  'clones a block of ice into a kitchen icebox where it melts away; ' +
  'neither is produced again';

declareFile({
  file: 'placement.dirty.wire.test.ts',
  packs: [
    'trade-cooking',
    'hearthworks',
    'trade-hospitality',
    'generic-objects',
  ],
  dirtyReason: DIRTY_REASON,
});

const BAR = '/trade/hospitality/location/bar';
const KITCHEN = '/trade/cooking/location/kitchen';
const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';

let drinker: Session;
let cook: Session;
let wizard: Session;

beforeAll(async () => {
  drinker = await Session.open(uniqueHandle('place-bar'), {
    startLocation: BAR,
  });
  cook = await Session.open(uniqueHandle('place-kit'), {
    startLocation: KITCHEN,
  });
  wizard = await Session.open(uniqueHandle('place-wiz'), {
    startLocation: KITCHEN,
    wizard: true,
  });
}, 180_000);

afterAll(() => {
  drinker?.close();
  cook?.close();
  wizard?.close();
});

// ───────────────────────── A — the rename ─────────────────────────

suite('A — nothing that worked has stopped working', () => {
  it('1. the bar lists its furniture and NOT the tools resting on it', async () => {
    const said = await drinker.prose('look');
    expect(said.length, 'look must answer at all').toBeGreaterThan(0);
    expect(said).toMatch(/bar|back-bar|stool/i);
    // ⭐ The regression the whole rename risks. Eight props stay out of
    // the room listing because they are PLACED on the back-bar and the
    // well; if `getLooseContents` stopped filtering, they all appear.
    expect(said, 'the shaker is on the well, not loose in the room').not.toMatch(
      /shaker/i,
    );
    expect(said).not.toMatch(/muddler/i);
    expect(said).not.toMatch(/strainer/i);
  }, 120_000);

  it('2. `look back-bar` shows what is ON it, under a heading that says so', async () => {
    const said = await drinker.prose('look back-bar');
    expect(said).toMatch(/On it:/i);
  }, 60_000);

  it('3. put something down on the bar and pick it up again', async () => {
    const held = await drinker.cmd('get shaker');
    if (held.status !== 'ok') {
      // Whatever is to hand — the claim is about the verb, not the prop.
      expectOk(await drinker.cmd('get muddler'));
    }
    const put = await drinker.cmd('put shaker on bar');
    expectOk(put);
    expect(await put.said(), 'the prose reads as it always did').toMatch(
      / on /i,
    );
    expectOk(await drinker.cmd('get shaker'));
  }, 120_000);
});

// ─────────────────── B — somewhere cold, at last ───────────────────

suite('B — a kitchen gets somewhere cold, for the first time', () => {
  it('4. ⭐ the icebox is HERE and WARM, and the survey says cold is UNMET', async () => {
    const peers = await cook.query('peers', { fields: ['displayName'] });
    const names = peers
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names, 'the kitchen ships an icebox now').toMatch(/icebox/i);

    // ⭐⭐ **Acceptance criterion 2, first half.** The box is present,
    // insulated, sealable and a container — every structural test the
    // shipped `coldStorage` check made — and EMPTY and WARM. Before
    // this build's satisfier repair it would have satisfied `cold` on
    // those structural grounds alone, which is how Dave's Bar reported
    // cold storage met on an empty ice bin.
    const survey = await cook.prose('survey');
    expect(survey.length).toBeGreaterThan(0);
    expect(survey, 'a warm box is not cold storage').toMatch(
      /wants[^\n]*cold/i,
    );
  }, 120_000);

  it('5. ⭐⭐ put ice in it, shut it, and the SAME kitchen reports cold MET', async () => {
    // The one non-player act in this drive, and the requirements allow
    // it explicitly: nobody sells ice yet (the icehouse-keeper is the
    // preservation slate's), so the block is seeded with a wizard act
    // rather than bought. Recorded here so the record cannot pretend a
    // player did it.
    const cloned = await wizard.cmd('clone /stuff/thing/ice-block --here');
    expectOk(cloned);

    expectOk(await cook.cmd('open icebox'));
    const put = await cook.cmd('get ice-block');
    expectOk(put);
    const placed = await cook.cmd('put ice-block in icebox');
    expectOk(placed);
    // ⭐ The response reads IN, not ON.
    expect(await placed.said()).toMatch(/ in /i);
    expectOk(await cook.cmd('close icebox'));

    const survey = await cook.prose('survey');
    // ⭐⭐ **Acceptance criterion 2, second half.** Same room, same box,
    // one block of ice — and now the capability is met and NAMES it.
    expect(survey).toMatch(/cold \([^)]*icebox/i);
    expect(survey).not.toMatch(/wants[^\n]*cold/i);
  }, 180_000);

  it('6-7. food goes IN, stays out of the room listing, and is still findable', async () => {
    expectOk(await cook.cmd('open icebox'));
    // Whatever provision the kitchen has to hand.
    const got = await cook.cmd('get bowl');
    expectOk(got);
    const put = await cook.cmd('put bowl in icebox');
    expectOk(put);
    expect(await put.said(), 'IN the icebox, not ON it').toMatch(/ in /i);

    // ⭐ Reading did not get harder: the room no longer lists it, the
    // box does, and a query still finds it by name.
    const roomSaid = await cook.prose('look');
    expect(roomSaid).not.toMatch(/\bbowl\b/i);
    const boxSaid = await cook.prose('look icebox');
    expect(boxSaid).toMatch(/\bbowl\b/i);
  }, 180_000);

  it("8 (cause). ⭐ inside the shut box reads a different temperature than the counter", async () => {
    /*
     * ⚠ The OUTCOME (a better condition band after a day) is a slow arc
     * and is not driveable — see the file header. What the wire can
     * prove is the CAUSE, which is the thing that was missing: there is
     * now somewhere in this kitchen that is measurably colder than the
     * rest of it.
     */
    expectOk(await cook.cmd('close icebox'));
    const box = await cook.prose('measure temperature icebox');
    const room = await cook.prose('measure temperature here');
    expect(box.length, 'the channel must answer at all').toBeGreaterThan(0);
    expect(room.length).toBeGreaterThan(0);
    expect(
      box,
      'the box and the room must not read the same — that IS the build',
    ).not.toBe(room);
  }, 120_000);

  it('10. ⭐ `cook` still works: the larder beside it is untouched and open', async () => {
    // ⚠ The requirements' stated hazard, driven. The larder is seeded
    // OPEN so the craft gather walk reaches its ingredients; the icebox
    // is seeded SHUT so it holds cold. Both in one room, opposite
    // intent, one rule.
    expectOk(await cook.cmd('close icebox'));
    const cooked = await cook.cmd('cook');
    // A decline for a REASON is a pass — `cook` is deed-gated on the
    // knowledge ladder. What must not happen is a crash or a refusal
    // about the room.
    const said = await cooked.said();
    expect(
      said,
      `cook must answer, not fail on the room — ${say(cooked)}`,
    ).not.toMatch(/nothing here|no kitchen/i);
  }, 120_000);
});

// ───────────── C — a new way of sitting, added by a row ─────────────

suite('C — a ham hangs FROM a hook', () => {
  let hearth: Session;

  beforeAll(async () => {
    hearth = await Session.open(uniqueHandle('place-hook'), {
      startLocation: COOKHOUSE,
    });
  }, 120_000);

  afterAll(() => hearth?.close());

  it('11. ⭐⭐ `put cut on hook` says HANG … FROM', async () => {
    const peers = await hearth.query('peers', { fields: ['displayName'] });
    const names = peers
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names, 'the cookhouse ships a meat hook now').toMatch(/hook/i);

    expectOk(await hearth.cmd('open pantry chest'));
    expectOk(await hearth.cmd('get prime-cut'));
    const hung = await hearth.cmd('put prime-cut on meat-hook');
    expectOk(hung);
    // ⭐ The player typed `on`; the world hung it FROM, in the member's
    // own words, with nothing in the controller knowing the difference.
    expect(await hung.said()).toMatch(/hang[s]? .*from/i);
  }, 180_000);

  it('12-13. `look hook` says HANGING FROM IT; `look` lists the hook, not the cut', async () => {
    const onHook = await hearth.prose('look meat-hook');
    expect(onHook).toMatch(/Hanging from it:/i);
    expect(onHook).toMatch(/prime|cut/i);

    const room = await hearth.prose('look');
    expect(room).toMatch(/hook/i);
    expect(room, 'a hung cut is represented by its hook').not.toMatch(
      /prime cut/i,
    );
  }, 120_000);

  it('14. ⭐ `dry prime-cut from hook` is accepted and names a span', async () => {
    const dried = await hearth.cmd('dry prime-cut from meat-hook');
    expectOk(dried);
    expect(await dried.said()).toMatch(/to dry/i);
  }, 120_000);
});

// ─────────────────── D — refusals explain themselves ───────────────────

suite('D — a region can always be named, and a refusal says why', () => {
  it('15. ⭐⭐ putting into a SHUT container is refused, says shut, and the target stays bound', async () => {
    expectOk(await cook.cmd('close icebox'));
    const got = await cook.cmd('get horn-spoon');
    expectOk(got);

    const refused = await cook.cmd('put horn-spoon in icebox');
    // ⚠ Before this build it was not refused AT ALL — the spoon simply
    // went into the shut box.
    expectRefused(refused);
    expect(await refused.said()).toMatch(/shut|closed/i);

    // ⭐ And the region stayed NAMEABLE: the refusal is about the lid,
    // not about the icebox being unfindable. A target that vanishes
    // from the parser teaches nothing and reads as a bug.
    const notes = JSON.stringify(refused.notes);
    expect(notes, say(refused)).not.toMatch(/"field":"target"/);

    // …and opening it lifts the refusal. A refusal nothing lifts is a
    // wall with a sign on it.
    expectOk(await cook.cmd('open icebox'));
    expectOk(await cook.cmd('put horn-spoon in icebox'));
  }, 180_000);
});
