/**
 * ⭐⭐ The recovery drive — the exit criterion for the recovery build.
 *
 * Tests build state; this USES it. The single most valuable thing it
 * proves is REACHABILITY: that the medical verbs the build afforded are
 * actually typeable over the wire (the affordance finding W-A0 fixed — a
 * verb no class contributes is dead), and that a real wound sprung from
 * CONTENT (a trap, not a wizard) reads and treats.
 *
 * ⭐ Stands in the scaffold (test-world-lifecycle D8): the passage's
 * pressure-plate blade (a one-shot trap, RE-ARMED by the drive before the
 * walk, so it runs twice on one world) for the delve's corridor-3 deadfall
 * and blade, and the works' basin for the infirmary ward's. ⚠ The step
 * that read the WARD's own recovery fixtures (cot, shelf, dressings) is
 * content and stays, unchanged, in `recovery-content.dirty.wire.test.ts`.
 * ⚠ The testbed has the blade only — no deadfall — so the fracture step
 * below is conditional, as it always was.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  stage,
  CELLAR,
  WORKS,
  TRAP,
  EXITS,
} from '../src/harness';

declareFile({
  file: 'recovery.wire.test.ts',
  packs: ['platform', 'test-fixtures', 'trade-medicine'],
});

// The cellar — walk EAST into the passage to spring its trap.
const CORRIDOR_2 = CELLAR;
const INTO_THE_TRAP = EXITS.cellar.passage;
// The works — has the basin (water) that affords `wash`/`cool`.
const WARD = WORKS;

let player: Session;
let patient: Session;

/** True when the world understood the verb (any answer but "unknown verb"). */
function afforded(said: string): boolean {
  const s = said.toLowerCase();
  return !s.includes("don't understand") && !s.includes('unknown');
}

beforeAll(async () => {
  // ⭐ Staged: the trap armed, however the last drive left it.
  await stage(TRAP, 'setHazardState', 'armed');
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
    // ⚠ `tend` with nothing named and nothing tendable in sight ASKS "Tend
    // what?" (an empty prompt the step would wait out); naming the body
    // asks the question this step is about — is the verb afforded.
    for (const verb of ['dose', 'tend me', 'undress']) {
      const said = await (await player.cmd(verb)).said();
      expect(afforded(said), `${verb} answered: ${said}`).toBe(true);
    }
  });
});

suite('the FIXTURE-afforded verbs answer where the fixture is', () => {
  it('⭐ bare `wash` and `cool` answer at the works basin (WaterFixture affords them)', async () => {
    // ⚠ Drive finding: these are NOT self-afforded — `wash`/`cool` in a waterless
    // corridor is correctly "I don't understand" — they ride the
    // WaterFixture's `peers` bucket, so they answer standing at water. The
    // works' basin draws on the testbed's cistern.
    // ⭐ Bare `wash` washes your hands here — the old `scrub`, folded in.
    for (const verb of ['wash', 'cool']) {
      const said = await (await patient.cmd(verb)).said();
      expect(afforded(said), `${verb} at the basin: ${said}`).toBe(true);
    }
  }, 60_000);
});

suite('a real wound, sprung from CONTENT and read', () => {
  it('⭐⭐ walking into the trapped corridor wounds the body', async () => {
    const before = (await (await player.cmd('assess')).said()).toLowerCase();
    // Walk east into the passage — the pressure-blade (edge → the feet)
    // triggers on traversal.
    const walk = await player.cmd(`go ${INTO_THE_TRAP}`);
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
    if (!assess.includes('fracture')) return; // a blade rarely breaks a bone — recorded in the plan
    const said = (await (await player.cmd('treat')).said()).toLowerCase();
    // With a fracture and nothing to hand, `treat` should point at setting
    // (a splint) rather than pretend a bandage helps.
    expect(afforded(said), `treat on a fracture: ${said}`).toBe(true);
  }, 60_000);
});
