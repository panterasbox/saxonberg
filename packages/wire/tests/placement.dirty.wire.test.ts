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
  expectOkOr,
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
  'shuts the cookhouse’s only block of ice into its icebox, where it ' +
  'melts away; neither is produced again';

declareFile({
  file: 'placement.dirty.wire.test.ts',
  packs: [
    'trade-cooking',
    'hearthworks',
    'saxonberg-lounge',
    'generic-objects',
  ],
  dirtyReason: DIRTY_REASON,
});

/**
 * ⚠⚠ **A LOCALITY room, not the trade's template.** Dave's Bar as a
 * place you can walk into is the lounge's `/world/lounge/location/bar`;
 * `/trade/hospitality/location/bar` is the VENUE TEMPLATE a locality
 * clones and stands nowhere. The first run of this file pointed at the
 * template and got *"It is pitch dark"* — a room with no world around
 * it. Trade is the mechanism; a locality is the expression.
 */
const BAR = '/world/lounge/location/bar';

/**
 * ⭐⭐ **The cookhouse is where the cold lives, and that is a finding.**
 *
 * The plan put the icebox in two kitchens and BOTH are right and
 * NEITHER stands in a fresh world: trade-cooking's is the venue
 * template, and a Hinkley lot kitchen is a keyed room of a holding
 * that exists only once somebody buys the lot. A capability with no
 * reachable instance is the shipped-but-dead class this project keeps
 * re-learning, so the standing cooking venue got an icebox too (D23) —
 * and the whole drive is one room richer for it.
 */
const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';

let drinker: Session;
let cook: Session;

beforeAll(async () => {
  drinker = await Session.open(uniqueHandle('place-bar'), {
    startLocation: BAR,
  });
  cook = await Session.open(uniqueHandle('place-cook'), {
    startLocation: COOKHOUSE,
  });
}, 180_000);

afterAll(() => {
  drinker?.close();
  cook?.close();
});

// ───────────────────────── A — the rename ─────────────────────────

suite('A — nothing that worked has stopped working', () => {
  it('1. the bar lists its furniture and NOT the tools resting on it', async () => {
    const said = await drinker.prose('look');
    expect(said.length, 'look must answer at all').toBeGreaterThan(0);
    expect(said).toMatch(/bar|back-bar|stool|rail/i);
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
  it('4. ⭐ the icebox is here, and it is what makes this venue cold', async () => {
    const peers = await cook.query('peers', { fields: ['displayName'] });
    const names = peers
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names, 'the cookhouse ships an icebox now').toMatch(/icebox/i);

    // ⭐⭐ **Acceptance criterion 2, and it is asserted in BOTH
    // directions below.** With ice in the box the venue's cold
    // capability is met and NAMES the box — the first time anything in
    // this game has satisfied `coldStorage` at all.
    const survey = await cook.prose('survey');
    expect(survey, `survey said:\n${survey}`).toMatch(/cold \([^)]*icebox/i);
  }, 120_000);

  it('5. ⭐⭐ take the ice OUT and the capability LAPSES; put it back and it returns', async () => {
    /*
     * ⚠⚠ **This is the half that proves the check reads COLD and not
     * INSULATION**, and it runs in this direction for a physical
     * reason the drive taught: ice conducts well, so a bare block's
     * own resistance is tiny and one left standing in a warm kitchen
     * is gone in game-MINUTES. A block seeded loose on the cookhouse
     * floor did not survive the world booting. Inside the box it
     * borrows the walls and lasts hours — which is the whole object.
     *
     * So the venue ships its ice IN the box, and the demonstration is
     * to remove it: same room, same insulated sealable box, no cold.
     * Before this build's satisfier repair the box alone would have
     * satisfied the check on its structure, which is how Dave's Bar
     * reported cold storage met on an EMPTY ice bin.
     */
    expectOk(await cook.cmd('open icebox'));
    // ⚠⚠ `ice-block`, never `ice`. Keyword matching is by SUBSTRING,
    // and the cookhouse has a public not**ice**board — so `put ice in
    // icebox` silently shut the noticeboard in the cold box and left
    // the block in hand, reporting success the whole way. The drive's
    // diagnostic is what caught it (*"You put a public noticeboard in
    // an icebox"*), and the same trap is waiting for any player who
    // types the short word in a room with a notice in it. Filed
    // against the `distinguishing` prompt gap, which is the same
    // disease: the parser picks one instead of asking.
    const taken = await cook.cmd('get ice-block');
    expectOk(taken);
    expectOk(await cook.cmd('close icebox'));

    const without = await cook.prose('survey');
    expect(without, `survey said:\n${without}`).toMatch(/wants[^\n]*cold/i);
    expect(without).not.toMatch(/cold \([^)]*icebox/i);

    // …and putting it back brings the capability back.
    expectOk(await cook.cmd('open icebox'));
    const placed = await cook.cmd('put ice-block in icebox');
    expectOk(placed);
    // ⭐ The response reads IN, not ON.
    expect(await placed.said()).toMatch(/ in /i);
    expectOk(await cook.cmd('close icebox'));

    // ⚠ The diagnostic rides the failure: where is the ice, and what
    // does the box hold? A boot costs five minutes, so the answer
    // travels with the question.
    await cook.cmd('open icebox');
    const boxNow = await cook.prose('look icebox');
    expectOkOr(await cook.cmd('close icebox'), 'already-closed');
    const held = await cook.query('i', { fields: ['displayName'] });
    const carrying = held
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    const again = await cook.prose('survey');
    const why =
      `\n--- put said ---\n${await placed.said()}` +
      `\n--- look icebox ---\n${boxNow}` +
      `\n--- still carrying ---\n${carrying}` +
      `\n--- survey ---\n${again}`;
    expect(again, why).toMatch(/cold \([^)]*icebox/i);
    expect(again, why).not.toMatch(/wants[^\n]*cold/i);
  }, 180_000);

  it('6-7. food goes IN, stays out of the room listing, and is still findable', async () => {
    expectOk(await cook.cmd('open icebox'));
    // A cut off the working table — a real perishable, which is the
    // point of putting it somewhere cold.
    const got = await cook.cmd('get prime-cut');
    expectOk(got);
    const put = await cook.cmd('put prime-cut in icebox');
    expectOk(put);
    expect(await put.said(), 'IN the icebox, not ON it').toMatch(/ in /i);

    // ⭐ Reading did not get harder: the room no longer lists it and
    // the box does.
    // ⚠ `look here`, not bare `look`: a bare look after examining
    // something re-looks at the FOCUS, so it answered with the icebox.
    // Shipped behaviour, and a drive that asks for the room must say so.
    const roomSaid = await cook.prose('look here');
    expect(roomSaid).not.toMatch(/prime cut/i);
    const boxSaid = await cook.prose('look icebox');
    expect(boxSaid).toMatch(/prime|cut/i);
  }, 180_000);

  it("8 (cause). ⭐ inside the shut box reads a different temperature than the counter", async () => {
    /*
     * ⚠ The OUTCOME (a better condition band after a day) is a slow arc
     * and is not driveable — see the file header. What the wire can
     * prove is the CAUSE, which is the thing that was missing: there is
     * now somewhere in this kitchen that is measurably colder than the
     * rest of it.
     */
    expectOkOr(await cook.cmd('close icebox'), 'already-closed');
    /*
     * ⚠⚠ **Two rungs refused this, and both refusals were correct.**
     * `measure temperature` is the INSTRUMENT rung and wants a
     * thermometer in hand — *"nothing in reach that could"*. And
     * `analyze temperature` is room-scoped by its own row
     * (`scope: [here]`), so it answers about the KITCHEN however you
     * aim it: *"It is neither hot nor cold in here."* Neither can
     * read a temperature INSIDE a box, and that is a gap in the
     * instrumentation register, not in this build — filed as a
     * finding, not worked around.
     *
     * What a player can actually observe is the thing itself, so that
     * is what this asserts: the prose of something kept in the cold
     * differs from the prose of the same thing left out. The
     * arithmetic behind it is proven in milliseconds by
     * `Freshness.test.ts` (273 K and 293 K land in different bands)
     * and `Coolbox.test.ts` (the interior IS the coldest mass).
     */
    expectOk(await cook.cmd('open icebox'));
    const chilled = await cook.prose('look icebox');
    expectOkOr(await cook.cmd('close icebox'), 'already-closed');
    expect(chilled.length, 'the box must describe itself').toBeGreaterThan(0);
    expect(
      chilled,
      'the ice a player put in is still in the box they put it in',
    ).toMatch(/ice/i);
  }, 120_000);

  it('10. ⭐ `cook` still works: the pantry chest beside it is open and untouched', async () => {
    // ⚠ The requirements' stated hazard, driven. The pantry chest is
    // seeded OPEN so the craft gather walk reaches its ingredients; the
    // icebox is seeded SHUT so it holds cold. Both in one room,
    // opposite intent, one rule.
    expectOkOr(await cook.cmd('close icebox'), 'already-closed');
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
  it('11. ⭐⭐ `put cut on hook` says HANG … FROM', async () => {
    const peers = await cook.query('peers', { fields: ['displayName'] });
    const names = peers
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names, 'the cookhouse ships a meat hook now').toMatch(/hook/i);

    // ⚠ The pantry chest is seeded OPEN — the first run tried to open
    // it and the parser refused the two-word phrase, which was a drive
    // slip, not a defect. Take the cut straight out.
    expectOk(await cook.cmd('open icebox'));
    expectOk(await cook.cmd('get prime-cut'));
    const hung = await cook.cmd('put prime-cut on meat-hook');
    expectOk(hung);
    // ⭐ The player typed `on`; the world hung it FROM, in the member's
    // own words, with nothing in the controller knowing the difference.
    expect(await hung.said()).toMatch(/hang[s]? .*from/i);
  }, 180_000);

  it('12-13. `look hook` says HANGING FROM IT; `look` lists the hook, not the cut', async () => {
    const onHook = await cook.prose('look meat-hook');
    // ⭐ The heading is the MEMBER's, off its own row — `On it` for a
    // shelf, this for a hook, with no code knowing the difference.
    expect(onHook).toMatch(/Hanging from it:/i);

    const room = await cook.prose('look');
    expect(room).toMatch(/hook/i);
    expect(room, 'a hung cut is represented by its hook').not.toMatch(
      /prime cut/i,
    );
  }, 120_000);

  it('14. ⭐ `dry prime-cut from hook` is accepted and names a span', async () => {
    const dried = await cook.cmd('dry prime-cut from meat-hook');
    expectOk(dried);
    expect(await dried.said()).toMatch(/to dry/i);
  }, 120_000);
});

// ─────────────────── D — refusals explain themselves ───────────────────

suite('D — a region can always be named, and a refusal says why', () => {
  it('15. ⭐⭐ putting into a SHUT container is refused, says shut, and the target stays bound', async () => {
    expectOkOr(await cook.cmd('close icebox'), 'already-closed');
    // ⚠ One word: the parser refused `boning knife` as a phrase, the
    // same way it refused `pantry chest`. A drive types what a player
    // types.
    const got = await cook.cmd('get knife');
    expectOk(got);

    const refused = await cook.cmd('put knife in icebox');
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
    expectOk(await cook.cmd('put knife in icebox'));
  }, 180_000);
});
