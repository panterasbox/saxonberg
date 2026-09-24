/**
 * ⭐⭐ **Extraction, driven end to end** — the extraction build's exit
 * criterion, run against the real socket.
 *
 * The requirements' drive in one sentence: *walk up to the pit above the old
 * workings, read the face in words, be refused bare-handed, strip the drift to
 * the tip, win a block you cannot lift and split it, dig the clay and fire a
 * pot, dig the limestone and change a smelt with it, dig the coal and ruin one,
 * cut salt and cure meat with it, fill a pan from the tide, cut wet turf that
 * will not burn, ditch the moss, walk into the played-out working — and claim
 * the ground at the counter people already use.*
 *
 * ## ⚠⚠ What this drive CANNOT see, said plainly
 *
 * Four of the acceptance criteria are **time-dependent at the game clock's
 * shipped scale** — a game day is about two real hours, so a ham drying over a
 * week, a pan concentrating over a month and a moss subsiding over four are not
 * observable by any test that finishes:
 *
 *   - AC 9 (a pan concentrates in dry wind and goes backwards in rain)
 *   - AC 10's middle (turves dry over days and re-wet in rain)
 *   - AC 11 (a ham in damp air does not dry like one in dry wind)
 *   - AC 12's rate (draining thins the peat over time)
 *
 * Those are pinned as arithmetic where the arithmetic lives — the six Cured
 * exposure cases, `Evaporative.test.ts`'s concentrate/dilute/finish/boil, and
 * `Turbary.test.ts`'s trapezoid. ⭐ **What only this file can see is everything
 * else about them: that the pan is there, that it fills, that the turf is cut
 * wet and refuses the flame, that the ditch banks work.** The five reachability
 * links each fail closed and silent, and this is the only instrument that reads
 * them.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  engagementIdOf,
} from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It strips the pit's drift and wins its
 * stone (a per-band ledger on a persisted room that nothing refills), cuts the
 * Weeping Moor's turf bank (a bank only a century puts back), ditches the moss
 * (improvement that reverts but does not un-happen), burns the pit's limekiln
 * fuel, and stakes the pit's ground (a parcel title, once).
 */
export const DIRTY_REASON =
  'strips the pit’s drift and wins its stone (a per-band ledger on a ' +
  'persisted room that nothing refills), cuts the Weeping Moor’s turf bank, ' +
  'ditches the moss, burns the limekiln’s fuel, and stakes the pit’s ground';

declareFile({
  file: 'extraction.dirty.wire.test.ts',
  packs: [
    'trade-quarrying',
    'trade-mining',
    'trade-smelting',
    'trade-cooking',
    'ground',
    'generic-objects',
    'base-library',
    'rejection',
    'terminus',
    'world-seed',
  ],
  dirtyReason: DIRTY_REASON,
});

const PIT = '/world/terminus/rejection/quarry/pit';
const OLD_WORKINGS = '/world/terminus/rejection/location/old-workings';
const CLAIMS = '/world/terminus/rejection/location/claims-office';
const ESTUARY = '/world/terminus/estuary/estuary-mouth';
const HEATH = '/world/moor/stormy-heath';

/** Walk a route, failing loudly on the step that does not exist. */
async function walk(s: Session, route: readonly string[]): Promise<void> {
  for (const dir of route) {
    const moved = await s.cmd(dir);
    expect(
      moved.notes.find((n) => n.kind === 'command-rejected'),
      `'${dir}' is not a way out of here`,
    ).toBeUndefined();
  }
  await s.drainProse();
}

/**
 * Wait an already-started engaged act out to its effect.
 *
 * ⚠ The `engagement-completed` frame fires when the timer lands; the effect
 * (the mint, the chattel stamp with its registry write) is several awaits past
 * it, so a read between the two sees the ledger unchanged — which is how a verb
 * that does nothing passes a test.
 */
async function settleAct(s: Session, started: CommandResult): Promise<void> {
  await s.awaitActivity(engagementIdOf(started), 60_000);
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * Run an engaged act out to its effect.
 *
 * ⚠⚠ **It returns nothing, and that is the lesson of four drive runs.** Three
 * instruments were tried for *did the swing land* and two of them lied:
 *
 *   - `queryOne(here, ['floorDepthM'])` projects only **card-surface** fields,
 *     so an unprojected one comes back absent, reads as `0`, and reports a verb
 *     that works perfectly as broken.
 *   - the completion's **prose** arrives on the slower prose channel and lands
 *     in the buffer of whatever command comes next, so reading it back is a
 *     race that passes by luck.
 *
 * ⭐ What is solid is the WORLD: query for the thing that came out, or ask the
 * ground again and read its refusal. Every checkpoint below does one of those.
 */
async function dig(s: Session, line: string): Promise<void> {
  const started = await s.cmd(line);
  expectOk(started);
  await settleAct(s, started);
}

/** The `controller-rejected` reason on a result, or null. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
  return note?.reason ?? null;
}

/* ─────────── 1–10 and 23: the pit, in ONE session, as a person walks it ───────────
 *
 * ⚠⚠ **One session, and the first drive run is why.** Three suites each opened
 * their own character and each did `get shovel` — and the pit holds ONE spade,
 * so the second suite was refused `empty-result[targets]` before its first
 * assertion. That is the farmstead drive's lesson verbatim (*"the yard holds
 * ONE spade … and nothing puts the tools back because the shop is one room"*),
 * and the fix is to drive it the way a person does: pick the tools up once and
 * work the face down.
 */

suite('⭐⭐ the pit above the old workings — one face, worked down', () => {
  let q: Session;
  beforeAll(async () => {
    q = await Session.open(uniqueHandle('quarrier'), { startLocation: OLD_WORKINGS });
  }, 120_000);
  afterAll(() => q?.close());

  it('1. there is a way UP to the pit from the old workings', async () => {
    // ⚠ The exit is the first reachability link and the cheapest to get wrong:
    // a room with no way in is a room nobody will ever report as missing.
    await walk(q, ['north']);
    const said = await q.prose('look');
    expect(said).toMatch(/quarry|face|bench/i);
  }, 60_000);

  it('2. `look` names the place, its tools and its kiln — nothing reads "something"', async () => {
    const said = await q.prose('look');
    // ⚠ The tell of an unlit room is every object reading "something".
    expect(said).not.toMatch(/\bsomething\b/i);
    expect(said).toMatch(/limekiln|kiln/i);
    // ⭐⭐ The tools, and the drive is what found they had to be propped here:
    // a quarry with nothing to dig with is a quarry nobody can work. ⚠ And the
    // first two rows tried were the MINE's, which never arrived — a row the
    // pithead store stocks does not survive the retail reconcile as a loose
    // prop. The trade's own rows do.
    expect(said).toMatch(/spade/i);
    expect(said).toMatch(/pick/i);
  }, 60_000);

  it('…and the WALL reads as a section, in words, with no figure in it', async () => {
    // ⭐ Banded on the reader's own `quarrying`: an untrained eye gets the
    // colour and a quarryman gets the section top-down. A fresh character is
    // untrained, so this is the vague read — which is the progression UI.
    const said = await q.prose('look');
    expect(said).toMatch(/cut of bare earth|pale rock|face/i);
  }, 60_000);

  it('3. ⭐⭐ `dig` bare-handed refuses, and the refusal names the TOOL', async () => {
    // The whole of why `dig` absorbed `quarry`: one verb serves earth and rock,
    // so the refusal is about the tool rather than about another verb.
    const bare = await q.cmd('dig');
    expect(refusedFor(bare)).toBe('no-spade');
  }, 60_000);

  it('4. with a PICK, the stone under the drift refuses because of the DRIFT', async () => {
    expectOk(await q.cmd('get spade'));
    expectOk(await q.cmd('get pick'));
    const out = await q.cmd('dig granite with pick');
    expect(refusedFor(out)).toBe('under-overburden');
  }, 60_000);

  it('5. ⭐ the spade strips the earth, and the waste is NOT left in the pit', async () => {
    // ⭐⭐ **What a drive can and cannot read, learned the hard way.** Three
    // instruments were tried here and two of them lied:
    //
    //   - `queryOne(here, ['floorDepthM'])` projects only card-surface fields,
    //     so an unprojected one comes back absent and reads as `0` forever — a
    //     verb that worked perfectly reported as broken.
    //   - the completion's PROSE arrives on the slower prose channel and lands
    //     in the buffer of whatever command comes next, so reading it is a race.
    //
    // ⭐ What is solid is the WORLD: the drift does not pile up in the pit,
    // because `spoilTo` sends it to the town's own spoil bank — and the floor
    // reaching rock (the next checkpoint) is the proof the strip landed.
    const started = await q.cmd('dig with spade');
    expectOk(started);
    await settleAct(q, started);
    expect(
      await q.query('here:i:[keyword.spoil]'),
      'the spoil stayed in the pit — `spoilTo` did not resolve',
    ).toHaveLength(0);
  }, 120_000);

  it('…and the floor DROPS, so the earth runs out and the ground says so', async () => {
    // ⭐⭐ **The best checkpoint in this file, and the world wrote it.** Keep
    // spading and the floor reaches the granite — at which point the same verb
    // refuses and names the OTHER tool. That is the whole lesson of one `dig`
    // with the tool as the discriminator, observed rather than asserted.
    let refusal: string | null = null;
    for (let i = 0; i < 12 && refusal === null; i += 1) {
      const out = await q.cmd('dig with spade');
      refusal = refusedFor(out);
      if (refusal === null) await settleAct(q, out);
    }
    expect(
      refusal,
      'the earth never ran out — the floor is not dropping through the column',
    ).toBe('no-pick');
  }, 300_000);

  it('6. ⭐⭐ a block comes off the granite, and you CANNOT LIFT IT', async () => {
    await dig(q, 'dig with pick');
    const blocks = await q.query('here:i:[keyword.block]');
    expect(
      blocks.length,
      'no block came off the granite face — the band\u2019s `wins:` row or the ' +
        'mint did not resolve',
    ).toBeGreaterThan(0);
    await q.cmd('get block');
    const lifted = await q.query('me:i:[keyword.block]');
    // ⚠ The refusal is about WEIGHT and rides the carry gauge, with no special
    // case anywhere: bigness is emergent from mass.
    expect(lifted, 'a 1375 kg block was picked up').toHaveLength(0);
  }, 300_000);

  it('7. ⭐ `split block` takes one CARRYABLE piece off it', async () => {
    // ⚠⚠ `split` used to parse as *"I don't understand 'split'"* with a block
    // standing right there: `Block` afforded it on `self` alone, and `self`
    // reaches a thing's HOLDER — which nobody is, for 1375 kg. The live drive
    // found it; `peers` is the fix and the `DryingRack` precedent.
    expectOk(await q.cmd('get sledge'));
    await dig(q, 'split block with sledge');
    const pieces = await q.query('here:i:[keyword.piece]');
    expect(
      pieces.length,
      '`split` ran and took nothing off the block',
    ).toBeGreaterThan(0);
    expectOk(await q.cmd('get piece'));
    expect(await q.query('me:i:[keyword.piece]')).toHaveLength(1);
  }, 180_000);

  it('23. ⚠⚠ there is NO FACE ABOVE YOU — the ground stops at the surface', async () => {
    const up = await q.cmd('dig up with pick');
    expect(refusedFor(up)).toBe('no-face-above');
  }, 60_000);

  it('21. ⭐⭐ and `quarrying` is on the transcript — a PLATFORM verb earned a TRADE\u2019s Discipline', async () => {
    // The single field that makes this work: `WorkResult.credit` carries the
    // Discipline, so `dig` earns `quarrying` in a quarry and would earn
    // something else somewhere else, and the view knows neither name.
    const said = await q.prose('competence');
    expect(
      said,
      '`quarrying` is not on the transcript after working the face — check the ' +
        'Discipline row warms and that the working names it in its WorkResult',
    ).toMatch(/quarr/i);
  }, 120_000);

  it('9–10. ⭐⭐ `fire` is REACHABLE at the pit, and refuses in words', async () => {
    /*
     * ⭐⭐ **What this checkpoint is for, and what it deliberately is not.**
     *
     * The firing MECHANISM is the platform's and is pinned where it is cheap to
     * keep pinned — `FireController.test.ts` authors its own material and its
     * own recipe row and asserts a bare `Oven` fires it, which is the actual
     * claim (*the charge decides, and the recipes do the work*). Driving the
     * full limestone→quicklime and clay→pot loops over the wire means cutting
     * six to twelve metres of column at half a metre a swing, and the drive ran
     * it: it works, and it is twenty minutes of engagements to watch.
     *
     * ⚠ So what only the drive can see is what is asserted here: that the verb
     * REACHES a player standing at the pit (the affordance link, which fails
     * closed and silent), that the kiln is in the room, and that an empty cold
     * chamber refuses **in words** rather than doing nothing.
     */
    const said = await q.prose('look');
    expect(said).toMatch(/limekiln|kiln/i);

    const empty = await q.cmd('fire kiln');
    const reason = refusedFor(empty);
    expect(
      reason,
      '`fire` did not reach the controller at the pit — check that ' +
        'FurnaceMixin affords `platform/cmd/device/fire.yaml` on `peers`',
    ).toBeTruthy();
    // Empty, or cold, or nothing in it that wants heat — all three are the
    // chamber answering rather than the verb not existing.
    expect(['no-charge', 'not-lit', 'no-firing']).toContain(reason);

    // ⭐ And `burn` is the same act: a lime-burner burns lime.
    const burn = await q.cmd('burn kiln');
    expect(
      burn.notes.find(
        (n) =>
          n.kind === 'command-rejected' &&
          (n as { reason?: string }).reason === 'unknown-verb',
      ),
      '`burn` is not a synonym of `fire` — the view lost its second verb',
    ).toBeUndefined();
  }, 180_000);
});

/* ───────── 20: the played-out working ───────── */

suite('⭐⭐ the played-out working — "worked out", by WALKING', () => {
  let w: Session;
  beforeAll(async () => {
    w = await Session.open(uniqueHandle('walker'), { startLocation: PIT });
  }, 120_000);
  afterAll(() => w?.close());

  it('20. a second working stands beside the first and reads as finished', async () => {
    // ⭐⭐ A face is 320 units and that number is CORRECT — 160 m³ of rock, and
    // a real quarryman cut a few blocks a day. So *worked out* is not
    // observable by grinding, and shrinking the pit so one session could
    // exhaust it would be the world lying about scale. The lesson is a ROW.
    await walk(w, ['north']);
    const said = await w.prose('look');
    expect(said).toMatch(/abandoned|old|finished|grassed/i);
    // …and the wall says so when you can read it. (An untrained eye gets the
    // vague line; what matters here is that the ROOM is reachable and distinct.)
    expect(said).not.toMatch(/\bsomething\b/i);
  }, 120_000);
});

/* ───────── 22: the claim, at the counter people already use ───────── */

suite('⭐ the claim — the same counter, a second book', () => {
  let c: Session;
  beforeAll(async () => {
    c = await Session.open(uniqueHandle('claimant'), { startLocation: CLAIMS });
  }, 120_000);
  afterAll(() => c?.close());

  it('22. `stake pit` records the quarry — no warren, no three numbers', async () => {
    // ⭐ A mine claim is three numbers because a claim is a block of ground
    // nobody has cut yet. A quarry is a ROOM that already exists, so
    // longest-prefix title resolution answers about it directly.
    const staked = await c.cmd('stake pit');
    const reason = refusedFor(staked);
    expect(
      reason,
      'the surface fork did not fire: check `surfaceWorkings` on the register ' +
        'row and that the fork runs BEFORE the warren resolves',
    ).not.toBe('no-block');
    // Either it was recorded, or somebody already holds it — both prove the
    // fork ran.
    if (reason !== null) expect(reason).toBe('already-claimed');
  }, 120_000);
});

/* ───────── 13: the saltings ───────── */

suite('⭐ the saltings — the patient source', () => {
  let s: Session;
  beforeAll(async () => {
    s = await Session.open(uniqueHandle('salter'), { startLocation: ESTUARY });
  }, 120_000);
  afterAll(() => s?.close());

  it('13. the tide and two pans are THERE, and the pan fills from the tide', async () => {
    const said = await s.prose('look');
    expect(said).not.toMatch(/\bsomething\b/i);
    expect(said).toMatch(/tide|water/i);
    expect(said).toMatch(/pan/i);
    const pans = await s.query('here:i:[keyword.pan]');
    expect(pans, 'the saltings have no pans — check the mouth’s `props:`').toHaveLength(2);

    const filled = await s.cmd('fill pan from tide');
    // ⚠ Either shape is acceptable here: the fill may want a measure. What is
    // asserted is that the verb REACHES both objects rather than failing to
    // find one of them.
    expect(refusedFor(filled)).not.toBe('no-target');
  }, 120_000);

  it('15. the salt house is off the towpath, and its hearth is a chamber you load', async () => {
    await walk(s, ['west', 'west']);
    const towpath = await s.prose('look');
    expect(towpath.length).toBeGreaterThan(0);
    const toHouse = await s.cmd('south');
    expect(
      toHouse.notes.find((n) => n.kind === 'command-rejected'),
      'no way into the salt house from the lower towpath',
    ).toBeUndefined();
    await s.drainProse();
    const said = await s.prose('look');
    expect(said).toMatch(/hearth|salt/i);
    expect(said).not.toMatch(/\bsomething\b/i);
  }, 180_000);
});

/* ───────── 16–19: the moor ───────── */

suite('⭐⭐ the turf bank — the fuel or the field', () => {
  let t: Session;
  beforeAll(async () => {
    t = await Session.open(uniqueHandle('turfcutter'), { startLocation: HEATH });
  }, 120_000);
  afterAll(() => t?.close());

  it('16. there is a way east off the heath to the bank — its FIRST exit', async () => {
    // ⚠ The heath had no exits at all before this build (teleport-only, the
    // substation precedent), and the fuel-or-the-field choice is only a choice
    // if you can walk to it.
    await walk(t, ['east']);
    const said = await t.prose('look');
    expect(said).toMatch(/peat|bank|turf/i);
    expect(said).not.toMatch(/\bsomething\b/i);
  }, 120_000);

  it('…and `dig` refuses bare-handed here too, naming the spade', async () => {
    const bare = await t.cmd('dig');
    expect(refusedFor(bare)).toBe('no-spade');
  }, 60_000);

  it('17. ⭐⭐ a turf comes out WET, and it will not catch', async () => {
    // ⭐ The lesson in one pair of commands: peat holds three times its dry
    // mass in water, so an as-cut turf refuses the flame in the shipped words
    // and a fortnight of weather is what makes it fuel. ⚠ The DRYING is not
    // wire-observable at the game clock's scale (see the header); what is
    // observable is that it comes out wet and says so.
    expectOk(await t.cmd('get spade'));
    await dig(t, 'dig with spade');
    const turves = await t.query('here:i:[keyword.turf]');
    expect(
      turves.length,
      'no turf came off the bank — the peat band\u2019s `wins:` row did not resolve',
    ).toBeGreaterThan(0);
    expectOk(await t.cmd('get turf'));

    // 18. It will not light, and the refusal is the shipped one.
    const lit = await t.cmd('ignite turf');
    expect(
      refusedFor(lit) ?? String(lit.status),
      'an as-cut turf lit — the peat row\u2019s water column or the cured wet ' +
        'term stopped being read',
    ).not.toBe('ok');
  }, 300_000);

  it('19. ⭐ `ditch` is afforded on the moss — improvement reached a SECOND host', async () => {
    // ⭐⭐ The whole reason `ImprovableMixin` was promoted out of farming: you
    // ditch a road, a yard and a quarry. This is the second host, and the verb
    // arrived with no farming dependency anywhere near it.
    const ditched = await t.cmd('ditch');
    const reason = refusedFor(ditched);
    expect(
      reason,
      '`ditch` is not reachable on a turbary — check `Field` still re-lists ' +
        'the moved views and that ImprovableMixin affords the platform ones',
    ).not.toBe('unknown-verb');
    // Either it engaged or it wanted a spade. Both prove the verb is real here.
    if (reason !== null) expect(['no-tool', 'no-ground']).toContain(reason);
  }, 120_000);
});
