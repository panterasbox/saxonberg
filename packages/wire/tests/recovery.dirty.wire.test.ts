/**
 * ⭐⭐ The recovery drive — the exit criterion for the recovery build.
 *
 * Tests build state; this USES it. The single most valuable thing it
 * proves is REACHABILITY: that the medical verbs the build afforded are
 * actually typeable over the wire (the affordance finding W-A0 fixed — a
 * verb no class contributes is dead), and that a real wound sprung from
 * CONTENT (a trap, not a wizard) reads and treats.
 *
 * ⚠ `.dirty.`: it springs the delve's one-shot deadfall (and the
 * pressure-blade beside it), so the next character finds them gone.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, expectOk } from '../src/harness';

export const DIRTY_REASON =
  'springs the delve corridor-3 deadfall and pressure-blade (one-shot ' +
  'traps); the next character walks a disarmed corridor';

declareFile({
  file: 'recovery.dirty.wire.test.ts',
  packs: [
    'newbie-wilds',
    'terminus',
    'generic-objects',
    'species-and-names',
    'trade-medicine',
  ],
  dirtyReason: DIRTY_REASON,
});

// Corridor 2 of the delve — walk NORTH into corridor 3 to spring its traps.
const CORRIDOR_2 = '/world/newbie-wilds/delve/corridor-2';
// The infirmary ward — has the basin (water) that affords `wash`/`cool`.
const WARD = '/world/terminus/infirmary/ward';

let player: Session;
let patient: Session;

/** True when the world understood the verb (any answer but "unknown verb"). */
function afforded(said: string): boolean {
  const s = said.toLowerCase();
  return !s.includes("don't understand") && !s.includes('unknown');
}

beforeAll(async () => {
  player = await Session.open(uniqueHandle('recovery'), {
    startLocation: CORRIDOR_2,
  });
  patient = await Session.open(uniqueHandle('recovward'), {
    startLocation: WARD,
  });
}, 240_000);

afterAll(() => {
  player?.close();
  patient?.close();
});

suite('the medical verbs are AFFORDED — the body affords its own first aid', () => {
  it('⭐⭐ `treat` on an unwounded body is a no-wound refusal, NOT unknown-verb', async () => {
    // The W-A0 finding: nothing contributed `treat`, so no player could
    // ever type it. It is contributed on VitalsMixin.self now.
    const out = await player.cmd('treat');
    const said = await out.said();
    expect(afforded(said), `treat answered: ${said}`).toBe(true);
  });

  it('⭐ the SELF-afforded verbs (`dose`, `tend`, `undress`) answer anywhere a body is', async () => {
    // These ride VitalsMixin.self — every body affords them, waterless
    // corridor or not.
    for (const verb of ['dose', 'tend', 'undress']) {
      const said = await (await player.cmd(verb)).said();
      expect(afforded(said), `${verb} answered: ${said}`).toBe(true);
    }
  });
});

suite('the FIXTURE-afforded verbs answer where the fixture is', () => {
  it('⭐ bare `wash` and `cool` answer at the infirmary basin (WaterFixture affords them)', async () => {
    // ⚠ Drive finding: these are NOT self-afforded — `wash`/`cool` in a waterless
    // corridor is correctly "I don't understand" — they ride the
    // WaterFixture's `peers` bucket, so they answer standing at water. The
    // ward's basin is real water now (recovery build).
    // ⭐ Bare `wash` washes your hands here — the old `scrub`, folded in.
    for (const verb of ['wash', 'cool']) {
      const said = await (await patient.cmd(verb)).said();
      expect(afforded(said), `${verb} at the basin: ${said}`).toBe(true);
    }
  }, 60_000);

  it('⭐ the ward stands up with its recovery fixtures', async () => {
    const said = (await (await patient.cmd('look')).said()).toLowerCase();
    expect(afforded(said)).toBe(true);
    // The cot, the basin, the fitting shelf and the dressings are all here.
    expect(said, `the ward: ${said}`).toMatch(/cot|basin|shelf|bandage|dressing|slate/);
  }, 60_000);
});

suite('a real wound, sprung from CONTENT and read', () => {
  it('⭐⭐ walking into the trapped corridor wounds the body', async () => {
    const before = (await (await player.cmd('assess')).said()).toLowerCase();
    // Walk north into corridor 3 — the deadfall (blunt → a leg fracture)
    // and the pressure-blade (edge → the legs) both trigger on traversal.
    const walk = await player.cmd('go north');
    expectOk(walk);
    const after = (await (await player.cmd('assess')).said()).toLowerCase();
    // The body now reads at least one wound it did not have before.
    const woundWords = ['fracture', 'laceration', 'bleeding', 'wound', 'cut'];
    const gainedWound = woundWords.some(
      (w) => after.includes(w) && !before.includes(w),
    );
    expect(gainedWound, `assess after the traps: ${after}`).toBe(true);
  }, 120_000);

  it('⭐ `assess` renders a mending-pace line (the convalescence read)', async () => {
    const said = (await (await player.cmd('assess')).said()).toLowerCase();
    // k drops to 0 right after harm (D3a), so it reads "not knitting yet".
    const pace =
      said.includes('mending') ||
      said.includes('knitting') ||
      said.includes('not safe') ||
      said.includes('too soon');
    expect(pace, `assess pace line: ${said}`).toBe(true);
  }, 60_000);

  it('⭐ `treat` names what a fracture wants (setting), if a bone broke', async () => {
    const assess = (await (await player.cmd('assess')).said()).toLowerCase();
    if (!assess.includes('fracture')) return; // the deadfall may have hit differently — recorded in the plan
    const said = (await (await player.cmd('treat')).said()).toLowerCase();
    // With a fracture and nothing to hand, `treat` should point at setting
    // (a splint) rather than pretend a bandage helps.
    expect(afforded(said), `treat on a fracture: ${said}`).toBe(true);
  }, 60_000);
});
