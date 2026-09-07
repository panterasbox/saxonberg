/**
 * Food safety — the SILENT second population, and the counterplay.
 *
 * Ported from `packages/server/scripts/drive-food-safety.ts`. Two of its
 * checkpoints are ones the unit suite structurally cannot reach, and
 * they are the reason the build existed:
 *
 *   - the hazard reports to NO sense. A cut off a gut-spilled carcass is
 *     carrying three organisms, curing suspended every one of them, and
 *     `look` / `smell` / `taste` must all answer and say nothing about
 *     it. A suite can assert the model; only the wire proves the
 *     renderer stays quiet.
 *   - `wash` reaches a KNIFE. It was `instanceof CraftVessel` until the
 *     build, so a knife could not be washed anywhere, ever.
 *
 * ⚠⚠ **The illness itself is NOT driveable and must not be faked.**
 * Salmonella incubates for 6 game-hours — half an hour of real time at
 * the shipped 12× clock — and turning the clock up would need a wizard,
 * which would be proving something no player can do. The arc is proven
 * exactly, in milliseconds, by `Vitals.infection.test.ts` (growth,
 * incubation, resistance, clearance, the far-past guard). What the wire
 * adds is that the act is reachable and NOTHING about it warns you.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectOkOr,
} from '../src/harness';

/**
 * ⭐⭐ **Why this file cannot run twice.**
 *
 * It BUTCHERS the carcass the cookhouse ships, pockets the knife and
 * eats what it makes; none of that comes back on its own. A second run
 * against the same world finds an empty hook, no knife and no meat, and
 * reads as six broken checkpoints in a build that is fine. (Observed.
 * Twice.)
 *
 * ⚠⚠ And a `props:` edit does not reach a world that has already booted.
 * `PopulatesMixin`'s once-guard is *persistent* — it exists so a content
 * go-live cannot mint a second set of furniture into every live room —
 * so a cookhouse furnished on Monday keeps Monday's props whatever the
 * YAML says on Tuesday. Adding the four larder stations and re-driving
 * without a reset reported THIRTEEN missed checkpoints on a build in
 * which nothing was broken: the room simply had no block, no trough, no
 * rack and no chimney, and `butcher` was unafforded for want of the
 * thing that affords it. **A stale world forges a dead-affordance
 * signal, which is the one thing this file exists to catch.**
 */
export const DIRTY_REASON =
  'butchers the cookhouse’s only carcass, pockets the boning knife and ' +
  'eats the cuts; none of it is produced again';

declareFile({
  file: 'food-safety.dirty.wire.test.ts',
  packs: ['trade-cooking', 'hearthworks'],
  dirtyReason: DIRTY_REASON,
});

const COOKHOUSE = '/world/hearthworks/location/cookhouse';

let cook: Session;

beforeAll(async () => {
  cook = await Session.open(uniqueHandle('safety'), { startLocation: COOKHOUSE });
}, 120_000);

afterAll(() => cook?.close());

suite('the larder, as shipped', () => {
  it('a carcass hangs there, and a knife to take it apart with', async () => {
    const rows = await cook.query('peers', { fields: ['displayName'] });
    const names = rows
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names).toMatch(/carcass|hog/i);
    expect(names).toMatch(/knife/i);
  });

  it('the preserving verbs are ones the world knows', async () => {
    for (const verb of ['butcher', 'cure', 'dry', 'smoke', 'wash']) {
      const help = await cook.cmd(`help ${verb}`);
      expectOk(help);
    }
  }, 120_000);
});

suite('butchering is the one source of the silent population', () => {
  it('the carcass comes apart into several CUTS — more meat than one meal', async () => {
    expectOk(await cook.cmd('get boning knife'));
    const butchered = await cook.cmd('butcher carcass');
    expectOk(butchered);
    const said = butchered.said();
    const m = /work it down to (\d+) cuts/i.exec(said);
    expect(m, `expected a cut count — saw: ${said.slice(0, 200)}`).toBeTruthy();
    expect(Number(m![1]), 'genuinely several').toBeGreaterThanOrEqual(4);
  }, 120_000);

  it('curing resolves — salt in reach, at the hearth', async () => {
    /*
     * ⭐ Untargeted on purpose. After a butchering the room holds five
     * things keyed `meat` and two keyed `prime` (the pantry chest ships
     * one of its own), and an ambiguous object arg opens a prompt. A
     * bare `cure` takes a cut from reach and hands back the one thing in
     * the world keyed `treated` — which every step below can then name
     * without guessing.
     */
    const cured = await cook.cmd('cure');
    expectOk(cured);
    expect(cured.said()).toMatch(/in salt/i);
  }, 60_000);
});

suite('⭐⭐ the hazard reports to no sense', () => {
  it('the CURE is legible and the contamination is not', async () => {
    /*
     * **The checkpoint the whole build exists for.** That cut came off a
     * gut-spilled carcass minutes ago and is carrying three organisms.
     * Curing preserved every one of them — *curing suspends the
     * population, it does not kill it* — so this is genuinely dangerous
     * meat.
     *
     * ⭐ The same three verbs are the CONTROL. They must report the CURE
     * (a treatment is legible, in band words) and report nothing at all
     * about the contamination. An assertion that only checked for
     * silence would pass over a renderer that had stopped saying
     * anything.
     */
    const look = await cook.prose('look treated');
    expect(look, 'band words, never a number').toMatch(/salted|dried|smoked/i);
    expect(look).not.toMatch(/0\.\d/);

    for (const sense of ['look', 'smell', 'taste'] as const) {
      const said = await cook.prose(`${sense} treated`);
      expect(said.length, `${sense} must answer at all`).toBeGreaterThan(0);
      expect(
        said,
        `${sense} must say NOTHING about what is on it`
      ).not.toMatch(/gone bad|rotten|foul|tainted|contaminat|spoil|unsafe|sick/i);
    }
  }, 120_000);
});

suite('the other hurdle, and a proper cook', () => {
  it('drying resolves — no salt, no fire', async () => {
    const dried = await cook.cmd('dry');
    expectOk(dried);
    expect(dried.said()).toMatch(/to dry/i);
  }, 60_000);

  it('the sear resolves, or declines for a reason a player can act on', async () => {
    /*
     * ⭐ A decline is a PASS here, and it should be: `cook` is deed-gated
     * on the knowledge ladder, so a cook who has never worked a sear by
     * hand is told to work it by hand first. That is the shipped design
     * answering, not the build failing — and the preserving verbs
     * deliberately do NOT carry that gate, because their by-hand path
     * does not exist.
     */
    // ⚠ The hearth may already be lit — `cooking.dirty` runs before this
    // file and works the same cookhouse. The requirement is that the
    // hearth IS lit, not that this test lit it.
    expectOkOr(await cook.cmd('ignite oven'), 'already-burning');
    const seared = await cook.cmd('cook seared-cut');
    expect(seared.said()).toMatch(/you cook|haven't learned|work it by hand/i);
  }, 120_000);
});

suite('⭐⭐ the counterplay is reachable', () => {
  it('`wash` reaches a KNIFE, not just glassware', async () => {
    // Requirement 17. `wash` was `instanceof CraftVessel` until the
    // build, so a knife could not be washed anywhere, ever.
    const washed = await cook.cmd('wash boning');
    expectOk(washed);
    expect(washed.said()).toMatch(/you (wash|take)/i);
  }, 60_000);
});

suite('eating it', () => {
  it('the act is reachable and the world says NOTHING about what was on it', async () => {
    const ate = await cook.cmd('eat treated');
    expectOk(ate);
    const said = ate.said();
    expect(said).toMatch(/you eat/i);
    expect(said, 'no warning — that is the design').not.toMatch(
      /sick|ill\b|poison|contaminat|wrong/i
    );
  }, 60_000);
});
