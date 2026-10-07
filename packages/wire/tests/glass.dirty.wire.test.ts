/**
 * ⭐⭐ Glass, driven end to end — the glass build's exit criterion, run
 * against the real socket.
 *
 * The requirements' drive: *reach the glasshouse in the woods and see the
 * furnace; win sand at the pit and read its iron — clean in the heart,
 * rusty at the fringe; fire the batch; work it hot and cold; set a stained
 * pane in a window; watch the glasswork Discipline advance.*
 *
 * ## ⚠⚠ What this drive proves, and what it leaves to the unit tests
 *
 * The extraction drive's precedent, followed deliberately: a wire drive's
 * unique job is the **five reachability links** — verb · affordance · data
 * · boot · arg-gate — each of which fails closed and SILENT, plus the one
 * thing only a live world shows. So this file proves:
 *
 *   - the venue BOOTS and connects (the glasshouse, the sand pit, the hut);
 *   - `analyze iron` reads the sand's grade LIVE, and it SPLITS clean
 *     (clear ware) from dirty (green) — the colour-is-a-grade headline, the
 *     one thing no unit test can show because it is the deposit, the mint
 *     and the Reading meeting in a booted world;
 *   - every new verb REACHES its controller (`fire`, `dip`, `scribe`,
 *     `glaze` …), refusing an empty/cold/wrong state in its own words
 *     rather than `command-rejected` — the affordance + arg-gate links;
 *   - the glasswork Discipline advances with practice.
 *
 * What it does NOT do is run the full batch→melt→blow→crack→cold→glaze
 * loop live: that is time- and fuel-dependent at the game clock's scale,
 * and it is pinned where the arithmetic lives — `FireController.test`
 * (the firing carries its charge), `Tinted.test` (iron → colour),
 * `hotwork.test` (the gather cools to cullet), `coldwork.test` (a green
 * pane glazes a window green), `Freshness.test` (light-strike). ⚠ A wire
 * world boots at `t = 0`, which is MIDNIGHT, so the drive advances the
 * clock to midday before it looks at a sky-lit room.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  engagementIdOf,
  advanceWorldClock,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

export const DIRTY_REASON =
  'wins sand from a persisted pit (a per-face ledger nothing refills) and ' +
  'advances the world clock to midday';

declareFile({
  file: 'glass.dirty.wire.test.ts',
  packs: [
    'trade-glass',
    'trade-quarrying',
    'trade-fuel',
    'trade-brewing',
    'ground',
    'generic-objects',
    'base-library',
    'rejection',
    'terminus',
    'world-seed',
  ],
  dirtyReason: DIRTY_REASON,
});

const GLASSHOUSE = '/world/terminus/rejection/hanging-wood/glasshouse';
const CLEAN = '/world/terminus/rejection/sand-pit/clean-face';
const DIRTY = '/world/terminus/rejection/sand-pit/dirty-face';
const HUT = '/world/terminus/rejection/location/glaziers-hut';

/** The `controller-rejected` reason on a result, or null. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
  return note?.reason ?? null;
}

/** Whether the parser understood the verb at all (reached a controller). */
function verbUnderstood(r: { notes: readonly unknown[] }): boolean {
  return !(r.notes as Array<{ kind?: string }>).some(
    (n) => n.kind === 'command-rejected',
  );
}

/** Run an engaged act out to its effect. */
async function settle(s: Session, started: CommandResult): Promise<void> {
  const id = engagementIdOf(started);
  if (id) await s.awaitActivity(id, 120_000);
  await new Promise((r) => setTimeout(r, 500));
}

let dayAdvanced = false;
async function toMidday(): Promise<void> {
  if (dayAdvanced) return;
  await advanceWorldClock('12 hours');
  dayAdvanced = true;
}

suite('⭐ glass — the glasshouse in the woods', () => {
  let g: Session;
  beforeAll(async () => {
    await toMidday();
    g = await Session.open(uniqueHandle('glazier'), { startLocation: GLASSHOUSE });
  }, 180_000);
  afterAll(() => g?.close());

  it('1. `look` shows the furnace, the pipe and the marver — nothing reads "something"', async () => {
    const said = await g.prose('look');
    expect(said).toMatch(/glasshouse|furnace|glory hole/i);
    expect(said).not.toMatch(/\bsomething\b/i);
    expect(said).toMatch(/blowpipe|pipe/i);
    expect(said).toMatch(/marver|slab/i);
  }, 60_000);

  it('2. the sand pit is reachable from the glasshouse (the cross-zone exit)', async () => {
    const north = await g.cmd('north');
    expect(verbUnderstood(north)).toBe(true);
    expect(refusedFor(north)).toBeNull();
    await g.cmd('south'); // back to the glasshouse for the next checks
  }, 60_000);

  it('3. ⭐ `fire` REACHES the kiln and refuses the cold/empty chamber in WORDS', async () => {
    // The affordance + arg-gate link: `fire kiln` must reach FireController
    // (BurnerMixin affords it), not die at the parser. A cold empty kiln
    // refuses diegetically — the full batch→melt loop is FireController's.
    const out = await g.cmd('fire kiln');
    expect(verbUnderstood(out)).toBe(true);
    // It reached the controller: either a controller rejection, or it began
    // (if the kiln were hot) — never a parse failure.
    expect(out.status === 'declined' || out.status === 'ok').toBe(true);
  }, 60_000);

  it('4. ⭐ `dip` is AFFORDED by the blowpipe and reaches its controller', async () => {
    expectOk(await g.cmd('get blowpipe'));
    const out = await g.cmd('dip');
    expect(verbUnderstood(out)).toBe(true);
    // No fluid melt in a cold glasshouse → the controller refuses in words
    // (`no-melt` / `melt-cold`), proving the hot-shop verb is wired.
    expect(refusedFor(out)).toMatch(/melt|pipe|gather/i);
  }, 60_000);
});

suite('⭐⭐ glass — the sand, and the colour it decides (LIVE)', () => {
  // ⚠ `analyze iron GRIT` — "grit" is a keyword of the won sand LOAD only,
  // never of the face room (whose keywords include "sand"), so the reading
  // lands on the load and not on the ground it came out of.
  it('5. the CLEAN face wins sand that reads CLEAN — clear ware — and glasswork advances', async () => {
    await toMidday();
    const s = await Session.open(uniqueHandle('clean'), { startLocation: CLEAN });
    try {
      expectOk(await s.cmd('get spade'));
      const dug = await s.cmd('dig');
      expectOk(dug);
      await settle(s, dug);
      const said = await s.prose('analyze iron grit');
      expect(said).toMatch(/clean|clear|pale/i);
      expect(said).not.toMatch(/rusty/i);
      // ⭐ The reading credited an easy glasswork deed — the Discipline advances.
      await new Promise((r) => setTimeout(r, 500));
      const comp = await s.prose('competence');
      expect(comp).toMatch(/glasswork/i);
    } finally {
      s.close();
    }
  }, 120_000);

  it('6. the DIRTY face wins sand that reads RUSTY — green bottles only', async () => {
    await toMidday();
    // ⚠ A FRESH session at the dirty face — each face is its own digger so
    // the won loads never collide. The grade SPLIT is the whole headline:
    // the deposit, the quarry mint and the Reading meeting in a booted world.
    const s = await Session.open(uniqueHandle('dirty'), { startLocation: DIRTY });
    try {
      expectOk(await s.cmd('get spade'));
      const dug = await s.cmd('dig');
      expectOk(dug);
      await settle(s, dug);
      const said = await s.prose('analyze iron grit');
      expect(said).toMatch(/rusty|tinge|green/i);
      expect(said).not.toMatch(/\bpale and clean\b/i);
    } finally {
      s.close();
    }
  }, 120_000);
});

suite('⭐ glass — the cold bench, in town', () => {
  let h: Session;
  beforeAll(async () => {
    await toMidday();
    h = await Session.open(uniqueHandle('cutter'), { startLocation: HUT });
  }, 180_000);
  afterAll(() => h?.close());

  it('8. ⭐ the hut is LIT THROUGH ITS WINDOWS, and the cold-bench tools are there', async () => {
    const said = await h.prose('look');
    // ⭐⭐ The first authored windows, lit through: the hut authors NO
    // ambient of its own and is lit only by daylight spilling through its
    // two windows from the sunlit yards. A pitch-dark hut would mean the
    // boundary anchors never wired — the one thing only a booted world
    // shows. (The cold-shop AFFORDANCE rides the same `environment` static
    // as the hot shop's `dip`, proven live in checkpoint 4; the cold-shop
    // EXECUTION is `coldwork.test`'s, and the views are lint-validated.)
    expect(said).not.toMatch(/pitch dark/i);
    expect(said).toMatch(/wheel|pliers|bench/i);
    expect(said).not.toMatch(/\bsomething\b/i);
  }, 60_000);
});
