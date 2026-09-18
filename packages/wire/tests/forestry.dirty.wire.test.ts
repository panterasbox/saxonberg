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

const FUEL_YARD = '/world/rejection/location/fuel-yard';
const HAZEL = '/stuff/idea/material/wood/hazel';

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
