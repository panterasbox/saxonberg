/**
 * ⭐⭐ **Forestry, driven end to end** — the forestry build's exit
 * criterion, run against the real socket.
 *
 * The requirements' drive in one sentence: *cut the yard's coppice with
 * the billhook, char it, walk up into the Hanging Wood, read the stand,
 * fell an oak and find the trunk on the ground too big to lift, cross-cut
 * it, shore the mine and light a hearth with the same tree, plant its
 * acorn, and run the clearing out until the wood says there is nothing
 * left worth the axe — and find the wood still a wood.*
 *
 * ⚠ Every checkpoint here is one a unit test cannot see: a verb nothing
 * affords, a row nothing warms, a stand line nothing renders, a bole that
 * binds to nothing. The five reachability links each fail closed and
 * silent, and this is the only instrument that reads them.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectOkOr,
  expectNote,
  engagementIdOf,
} from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It cuts the yard's and the wood's
 * coppice panels (a game-year rotation nothing resets), fells the Hanging
 * Wood's clearings (a stand only the increment refills), plants a
 * standard (a chronicle deed, once per tree), and burns cordwood in the
 * clamp. Every one of those is a change to a place, which is what a wood
 * is for.
 */
export const DIRTY_REASON =
  'cuts the yard’s and the wood’s coppice panels (a game-year rotation ' +
  'nothing resets), fells the Hanging Wood’s clearings (a stand only the ' +
  'increment refills), plants a standard (a chronicle deed), and burns ' +
  'cordwood in the clamp';

declareFile({
  file: 'forestry.dirty.wire.test.ts',
  packs: [
    'trade-forestry',
    'trade-fuel',
    'trade-mining',
    'trade-smelting',
    'generic-objects',
    'base-library',
    'rejection',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const FUEL_YARD = '/world/terminus/rejection/location/fuel-yard';
const HAZEL = '/stuff/idea/material/wood/hazel';
const OAK = '/stuff/idea/material/wood/oak';
const RIDE = '/world/terminus/rejection/hanging-wood/ride';

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
 * Run an engaged act to its completion frame — and then to its EFFECT.
 * ⚠ The `engagement-completed` frame fires when the timer lands; the
 * effect (the mint, four chattel stamps with their registry writes) is
 * an async completion that finishes a beat later. The drive queried the
 * floor between the two once and counted three logs.
 */
async function act(s: Session, line: string, landed?: () => Promise<boolean>): Promise<void> {
  const started = await s.cmd(line);
  expectOk(started);
  await s.awaitActivity(engagementIdOf(started), 60_000);
  await s.drainProse();
  if (landed) {
    const deadline = Date.now() + 10_000;
    while (!(await landed())) {
      if (Date.now() > deadline) throw new Error(`the effect of '${line}' never landed`);
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

/** The whole-number count a stand line reads for `species`, in words → number. */
function standCount(prose: string, species: string): number | null {
  const m = prose.match(new RegExp(`${species}[^.]*?about ([a-z-]+) trees' worth`, 'i'));
  if (!m) return prose.match(new RegExp(`${species}[^.]*?one tree's worth`, 'i')) ? 1 : null;
  return WORDS[m[1]!] ?? null;
}
const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
};

type MaterialSummary = { templatePath?: string; name?: string } | null;
async function materialOf(s: Session, query: string): Promise<MaterialSummary> {
  const rec = await s.queryOne(query, ['bulkMaterial']);
  return ((rec as { bulkMaterial?: MaterialSummary } | null)?.bulkMaterial ?? null);
}

/* ────────────────────── 1–4: the fuel yard ────────────────────── */

suite('⭐ the fuel yard — the coppice is ready, and it is hazel', () => {
  let c: Session;
  beforeAll(async () => {
    c = await Session.open(uniqueHandle('coppicer'), { startLocation: FUEL_YARD });
  }, 120_000);
  afterAll(() => c?.close());

  it('1. `look` by day: every object has a name, and the prose names the wood above', async () => {
    const said = await c.prose('look');
    // ⚠ The tell of an unlit room is every object reading "something".
    expect(said).not.toMatch(/\bsomething\b/i);
    expect(said).toMatch(/Hanging Wood/);
    expect(said).toMatch(/clamp/i);
    expect(said).toMatch(/panel/i);
    expect(said).toMatch(/billhook/i);
    expect(said).toMatch(/axe/i);
  }, 60_000);

  it('2. `look panel`: six stools, mature, READY to cut — not seedlings', async () => {
    const said = await c.prose('look panel');
    expect(said).toMatch(/The stools are ready to cut\./);
    expect(said).not.toMatch(/seedling/i);
    const stools = await c.query('here:i:panel:i');
    expect(stools).toHaveLength(6);
  }, 60_000);

  it('3. `harvest panel with billhook` → eight lengths of cordwood, made of hazel; the panel says when it is ready again', async () => {
    // ⚠ Bare hands refuse: the stool names its tool, and the billhook is
    // on the ground, not in reach of the view's `[capability.cutting]`
    // default… except that `reachable` includes the room, so it binds.
    // The bare-hand refusal is unit-tested; here the instrument is real.
    expectOk(await c.cmd('get billhook'));
    expectOk(await c.cmd('harvest panel'));
    const lengths = await c.query('me:i:[keyword.cordwood]');
    expect(lengths).toHaveLength(8);
    const mat = await materialOf(c, 'me:i:[keyword.cordwood]:[1]');
    expect(mat?.templatePath).toBe(HAZEL);
    // (`look cordwood` with eight in hand PROMPTS which one; the ordinal
    // form names the first — `look first cordwood` is not a shape today)
    const said = await c.prose('look cordwood:[1]');
    expect(said).toMatch(/hazel/i);

    const panel = await c.prose('look panel');
    expect(panel).toMatch(/cut to the stool and regrowing/);
    expect(panel).toMatch(/a year, near enough/);
  }, 120_000);

  it('…and the second stool refuses NOTHING RIPE while the first regrows — the rotation is real', async () => {
    // Every stool was cut by the pick (`harvest panel` takes the first
    // ripe one; each stool is its own plant). Cut the rest.
    for (let i = 0; i < 5; i += 1) expectOk(await c.cmd('harvest panel with billhook'));
    const lengths = await c.query('me:i:[keyword.cordwood]');
    expect(lengths).toHaveLength(48);
    const again = await c.cmd('harvest panel with billhook');
    expectNote(again, 'controller-rejected', { reason: 'nothing-ripe' });
  }, 180_000);

  it('4. the clamp takes the cordwood and `char` starts the burn — the chain the metallurgy drive walked still walks', async () => {
    for (let i = 0; i < 8; i += 1) expectOk(await c.cmd('put cordwood in clamp'));
    const burn = await c.cmd('char');
    expectOk(burn);
    expect(engagementIdOf(burn)).toBeTruthy();
  }, 120_000);
});

/* ────────────────────── 5–13: the Hanging Wood ────────────────────── */

suite('⭐⭐ the Hanging Wood — a place that is a stand', () => {
  let f: Session;
  let clearingProse = '';
  beforeAll(async () => {
    f = await Session.open(uniqueHandle('forester'), { startLocation: FUEL_YARD });
    // The instruments come up from the yard. (The coppicer took the
    // billhook; the axe is still on the ground.)
    expectOk(await f.cmd('get axe'));
  }, 120_000);
  afterAll(() => f?.close());

  it('5. up from the hillside: a new exit leads into the wood; the treeline names its objects and has NO stand line', async () => {
    await walk(f, ['southwest', 'north', 'north', 'north']);
    const said = await f.prose('look');
    expect(said).toMatch(/treeline/i);
    expect(said).not.toMatch(/\bsomething\b/i);
    expect(said).toMatch(/smoke/i);
    // ⚠ The treeline is NOT a Wood — nothing stands here worth the axe,
    // and the class says so: no reading, and no `fell`.
    expect(said).not.toMatch(/stands here/);
    const bare = await f.cmd('fell oak');
    expectNote(bare, 'command-rejected', { reason: 'unknown-verb' });
  }, 120_000);

  it('6. the ride: the stand reads species, how much, and that they are old — planted by nobody alive', async () => {
    await walk(f, ['north']);
    const said = await f.prose('look');
    expect(said).toMatch(/main ride/i);
    expect(said).not.toMatch(/\bsomething\b/i);
    expect(said).toMatch(/Oak stands here — about eight trees' worth, old, planted by nobody alive\. Ash — about four trees' worth\./);
    expect(said).not.toMatch(/\b\d+\b trees/);
    await walk(f, ['north']);
    const clearing = await f.prose('look');
    expect(clearing).toMatch(/oak clearing/i);
    expect(clearing).toMatch(/about twelve trees' worth/);
    expect(clearing).toMatch(/Ash — about four trees' worth/);
    // Remember the authored paragraph — step 12 asserts it never changes.
    clearingProse = clearing.split('Oak stands here')[0]!;
    expect(clearingProse.length).toBeGreaterThan(200);
    await walk(f, ['south']);
  }, 120_000);

  it('7. ⭐⭐ `fell oak` — an engaged act; the TRUNK on the ground, too heavy to lift; logs; an acorn in hand; the stand smaller by one', async () => {
    // The acorn is the LAST thing the felling mints, so it is the landed
    // predicate — the logs land before it.
    await act(f, 'fell oak with axe', async () => (await f.query('me:i:[keyword.acorn]')).length >= 1);
    const bole = await f.queryOne('here:i:[keyword.bole]', ['bulkMaterial', 'mass']);
    expect(bole, 'no bole on the floor').not.toBeNull();
    expect((bole as { bulkMaterial?: { templatePath?: string } }).bulkMaterial?.templatePath).toBe(OAK);
    expect((bole as { mass?: { value: number } }).mass?.value).toBe(675);
    const logs = await f.query('here:i:[keyword.log]');
    expect(logs).toHaveLength(4);
    const acorn = await f.query('me:i:[keyword.acorn]');
    expect(acorn).toHaveLength(1);
    const said = await f.prose('look');
    expect(standCount(said, 'Oak')).toBe(7);
    // Too much for any one back — a mass gate, never a flag.
    const lift = await f.cmd('get bole');
    expectNote(lift, 'controller-rejected', { reason: 'too-heavy-to-lift' });
  }, 180_000);

  it('…and cross-cutting: `fell bole` yields a length of green oak timber and the bole says what is left', async () => {
    await act(f, 'fell bole', async () => (await f.query('me:i:[keyword.timber]')).length >= 1);
    await act(f, 'fell bole', async () => (await f.query('me:i:[keyword.timber]')).length >= 2);
    const timber = await f.query('me:i:[keyword.timber]', { fields: ['bulkMaterial', 'mass'] });
    expect(timber).toHaveLength(2);
    expect((timber[0] as { bulkMaterial?: { templatePath?: string } }).bulkMaterial?.templatePath).toBe(OAK);
    expect((timber[0] as { mass?: { value: number } }).mass?.value).toBe(24);
    const said = await f.prose('look bole');
    expect(said).toMatch(/Four lengths in it yet\./);
  }, 180_000);

  it('8. carry the timber down to the mine and `shore` — the mine is a customer', async () => {
    /*
     * ⚠ FINDING (pre-existing, the metal chain's): the timber-set RECIPE
     * exists and this timber satisfies its slot (`wood`, ungraded reads
     * fair — pinned in wood-vocabulary.test.ts), but no by-hand path
     * mints a tangible recipe with no vessel and no anvil: `make timber
     * set` answers *"work it by hand first"* and there is nothing to
     * work it with. The mine has always BOUGHT its sets. So what is
     * driven is the carry and the mine's own act; the set-from-timber is
     * the sawing build's seam.
     */
    await walk(f, ['south', 'south', 'southwest', 'south', 'south', 'south', 'west']);
    const here = await f.queryOne('here', ['displayName']);
    expect(String((here as { displayName?: string })?.displayName)).toMatch(/drift/i);
    const carried = await f.query('me:i:[keyword.timber]');
    expect(carried).toHaveLength(2);
    // The timber stays at the mine — and two lengths plus a 40 kg set is
    // more than a body carries (the load ceiling is real, and it bit
    // here twice: once with a log, once with the set).
    expectOk(await f.cmd('drop timber'));
    // ⚠ `shore` wants a SET in hand (the drift stacks them). The first cut
    // of this step matched `/timber/i` and passed on the refusal *"You
    // have no timber to set"* — found by driving it in a browser.
    expectOk(await f.cmd('get set'));
    // …and `shore` is an ENGAGED act: the set is consumed at completion,
    // and walking out mid-engagement leaves 40 kg in your hands (which
    // is how the log up the hill would not lift on the next step).
    await act(f, 'shore', async () => (await f.query('me:i:[keyword.set]')).length === 0);
  }, 180_000);

  it('9. a log from the same tree LIGHTS beside a fire — the smelter’s furnace affords it', async () => {
    // Back up for a log (the crown's are on the ride floor), then to the
    // smelter: `ignite` is afforded by a fire appliance, and a Firewood
    // reads its ignition off its Material, which the mint stamped oak.
    await walk(f, ['east', 'north', 'north', 'north', 'north', 'north', 'north']);
    expectOk(await f.cmd('get log'));
    await walk(f, ['south', 'south', 'southwest', 'south', 'northeast', 'east']);
    const here = await f.queryOne('here', ['displayName']);
    expect(String((here as { displayName?: string })?.displayName)).toMatch(/smelter/i);
    const lit = await f.cmd('ignite log');
    expectOkOr(lit, 'already-burning');
  }, 240_000);

  it('10. a panel in the wood: cut it too, with the billhook off the yard floor… which is gone — the coppicer has it', async () => {
    // ⚠ One billhook in the realm, and the coppicer carried it off in
    // step 3 — which is the honest state of the yard, not a test gap.
    // The wood's OWN panel is cut with the felling axe (`cutting` is
    // one of its capabilities: it takes a stool off, badly).
    await walk(f, ['west', 'southwest', 'north', 'north', 'north', 'north', 'west']);
    const said = await f.prose('look');
    expect(said).toMatch(/hazel cant/i);
    expect(standCount(said, 'Oak')).toBe(4);
    expect(standCount(said, 'Ash')).toBe(4);
    expect(await f.prose('look panel')).toMatch(/The stools are ready to cut\./);
    expectOk(await f.cmd('harvest panel with axe'));
    const lengths = await f.query('me:i:[keyword.cordwood]');
    expect(lengths).toHaveLength(8);
    expect(await f.prose('look panel')).toMatch(/cut to the stool and regrowing/);
  }, 180_000);

  it('11. ⭐ `plant acorn in panel`: the stand records the sapling, your name and the game day; the chronicle shows the deed', async () => {
    await walk(f, ['east', 'north']);
    expectOk(await f.cmd('plant acorn in panel'));
    const said = await f.prose('look');
    expect(said).toMatch(new RegExp(`An oak sapling, planted by ${f.handle} on the \\d+(st|nd|rd|th) day of the \\d+(st|nd|rd|th) year\\.`));
    const chronicle = await f.prose('chronicle');
    expect(chronicle).toMatch(/Planted an oak sapling in the oak clearing\./);
    // Fifteen game years is stated, not promised: a seedling is not a tree.
    const early = await f.cmd('fell sapling');
    expectNote(early, 'controller-rejected', { reason: 'not-yet-a-tree' });
  }, 120_000);

  it('12. ⭐⭐ run it out: fell until the clearing refuses in words about the wood; the prose is byte-identical; the ride is untouched', async () => {
    for (let i = 0; i < 12; i += 1) {
      const before = (await f.query('here:i:[keyword.bole]')).length;
      await act(f, 'fell oak with axe', async () => (await f.query('here:i:[keyword.bole]')).length > before);
    }
    const refused = await f.cmd('fell oak with axe');
    expectNote(refused, 'controller-rejected', { reason: 'stand-empty' });
    expect(await refused.said()).toMatch(/nothing left here that is worth the axe/i);
    // The ash still stands — the stands are per SPECIES…
    let said = await f.prose('look');
    expect(said).not.toMatch(/Oak stands here/);
    expect(standCount(said, 'Ash')).toBe(4);
    // …until it does not.
    for (let i = 0; i < 4; i += 1) {
      const before = (await f.query('here:i:[keyword.bole]')).length;
      await act(f, 'fell ash with axe', async () => (await f.query('here:i:[keyword.bole]')).length > before);
    }
    expectNote(await f.cmd('fell ash'), 'controller-rejected', { reason: 'stand-empty' });
    expectNote(await f.cmd('fell'), 'controller-rejected', { reason: 'stand-empty' });
    said = await f.prose('look');
    expect(said).toMatch(/Nothing stands here that is worth the axe — stumps, brash, and the saplings somebody planted\./);
    expect(said).toMatch(/An oak sapling, planted by/);
    // …the wood is still the wood: the authored paragraph did not move…
    expect(said.split(/Nothing stands here/)[0]).toBe(clearingProse);
    // …and the stands are per CLEARING: the ride's oaks are untouched.
    await walk(f, ['south']);
    expect(standCount(await f.prose('look'), 'Oak')).toBe(7);
  }, 300_000);

  it('13. re-login in the same boot: the clearing is still empty, the sapling still there, the yard panel still regrowing', async () => {
    /*
     * ⚠ The harness boots ONE world per run, so the true restart is
     * asserted by HAND (forestry.md § The second instance — the restart procedure; a server restart
     * between two runs of this file's steps 12→13). What a re-login
     * proves is that nothing here lived in the session.
     */
    f.close();
    f = await Session.open(uniqueHandle('forester-again'), { startLocation: RIDE });
    await walk(f, ['north']);
    const said = await f.prose('look');
    expect(said).toMatch(/Nothing stands here that is worth the axe/);
    expect(said).toMatch(/An oak sapling, planted by/);
    await walk(f, ['south', 'south', 'south', 'southwest', 'south', 'northeast']);
    expect(await f.prose('look panel')).toMatch(/cut to the stool and regrowing/);
  }, 180_000);
});
