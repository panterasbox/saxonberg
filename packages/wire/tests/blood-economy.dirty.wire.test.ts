/**
 * ⭐⭐ The blood-economy drive — the exit criterion for the build.
 *
 * Tests build state; this USES it. Over the wire against a booted world it
 * proves the load-bearing claims only a live drive can: the window stands
 * up and reads its typed bank; the runner stocks it from the collection
 * floor; the window is visible under its dead Goodkin sign; the registrar
 * tells the Decree; the donor roll is a readable pull surface; the window
 * is NPC-run (a player cannot issue); and a standing `wont` directive is a
 * card the body carries. (The gift CREDIT — chronicle/trait/renown — and
 * the transfusion harm row are unit-proven in trade-medicine's
 * `donate.test` / `transfuse-consent.test`; the bleed/get/donate chain
 * itself is driven by `clinical-medicine`.)
 *
 * ⚠ `.dirty.`: it consumes units the spawn sweep regenerates only on its
 * cadence and registers a donor on the roll.
 *
 * ⚠ Run it with a world of its own (the ward is dark at a cold-boot hour
 * only until its lamp is lit, which the boot does):
 *   WIRE_BOOT=1 WIRE_PORT=<worktree port> pnpm -C packages/wire exec \
 *     vitest run tests/blood-economy.dirty.wire.test.ts
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle } from '../src/harness';

export const DIRTY_REASON =
  'consumes blood units the spawn sweep regenerates only on its cadence, ' +
  'and registers a donor on the window roll';

declareFile({
  file: 'blood-economy.dirty.wire.test.ts',
  packs: [
    'terminus',
    'trade-medicine',
    'corpo-goodkin',
    'energy',
    'newbie-wilds',
    'generic-objects',
    'species-and-names',
    'base-library',
  ],
  dirtyReason: DIRTY_REASON,
});

const WARD = '/world/terminus/infirmary/ward';
const COLLECTION = '/world/terminus/infirmary/collection';
const SUPPLIES = '/trade/medicine/behavior/supplies';

let wiz: Session; // wizard at the ward — eval driver + a proficient reader
let patient: Session; // plain
let donorP: Session; // plain — the donor roll

const lc = async (s: Session, text: string): Promise<string> =>
  (await (await s.cmd(text)).said()).toLowerCase();

async function practise(s: Session, discipline: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) await s.cmd(`practice ${discipline} hard success`);
}

/** Fire one NPC's deliberation through the shipped seam. */
async function beat(room: string, keyword: string, brain: string): Promise<void> {
  await wiz.prose(`eval ${room} --on ${keyword} return this.fireBeat('${brain}')`);
}

beforeAll(async () => {
  wiz = await Session.open(uniqueHandle('bloodwiz'), { startLocation: WARD, wizard: true });
  patient = await Session.open(uniqueHandle('bloodpt'), { startLocation: WARD });
  donorP = await Session.open(uniqueHandle('blooddnr'), { startLocation: WARD });
  // Proficient nursing so `analyze bank` reads the donor roll + custody.
  await practise(wiz, 'nursing', 8);
}, 420_000);

afterAll(() => {
  void wiz?.close?.();
  void patient?.close?.();
  void donorP?.close?.();
});

suite('blood economy — the window, read and stocked', () => {
  it('the ward shows the window under a dead Goodkin sign', async () => {
    const look = await lc(wiz, 'look');
    expect(look).toContain('window');
    expect(look).toMatch(/goodkin|dead|unlit/);
  });

  it('analyze bank reads the typed lots, and the runner stocks the fridge', async () => {
    // At boot the fridge (vault) is empty; the collection floor holds the
    // swept units. Fire the runner's beat a few times to carry some in.
    for (let i = 0; i < 4; i++) await beat(COLLECTION, 'runner', SUPPLIES);
    const bank = await lc(wiz, 'analyze bank window');
    expect(bank).toMatch(/\bo:\b|type o|\bo\b/);
    expect(bank).toMatch(/unit|litre|\bpar\b/);
  });

  it('the registrar is talkable — the Decree dialogue engages', async () => {
    // Whichever keeper is on shift answers — the day registrar (Miren) or
    // the night keeper (both carry the Decree dialogue). The boot hour is
    // not ours to choose, so try the night keeper, then the day one (the
    // fishing-drive pattern). ⚠ The dialogue BEAT arrives as a choice-wheel
    // card, not main prose, so the live assertion is that the conversation
    // ENGAGES; the Decree text is authored content read by a human.
    let r = await wiz.cmd('talk night');
    if (r.status !== 'ok') r = await wiz.cmd('talk miren');
    expect(r.status).toBe('ok');
  });
});

suite('blood economy — the donor roll (the pull surface)', () => {
  it('a player registers and appears on the readable roll', async () => {
    const reg = await lc(donorP, 'donor register');
    expect(reg).toMatch(/roll|registered|donor/);
    const card = await lc(donorP, 'donor');
    expect(card).toMatch(/roll|registered/);
    // The roll is read off `analyze bank` (proficient), never pushed.
    const roll = await lc(wiz, 'analyze bank window');
    expect(roll).toContain('roll');
    expect(roll).not.toMatch(/nobody registered is present/);
  });
});

suite('blood economy — NPC-run in v1', () => {
  it('a player cannot issue — they do not keep the window', async () => {
    const issue = await lc(patient, 'issue O');
    expect(issue).toMatch(/do not keep|not keep this window|no blood window/);
  });
});

suite('blood economy — consent is a card the body carries', () => {
  it('a standing `wont` directive is recorded and readable', async () => {
    await patient.cmd('donor refuse');
    const card = await lc(patient, 'donor');
    expect(card).toMatch(/refuse|wont|will not/);
  });
});
