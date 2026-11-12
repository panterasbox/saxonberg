/**
 * ⛔ **A SOAK file** (a span step — `pnpm wire:soak`, run by the soak lane
 * after merge, never in a blocking run). The span twin of
 * `size-and-carrying.dirty.wire.test.ts`, per testing.md § The soak lane.
 *
 * The size-and-carrying soak drive (requirements § The drive, Soak drive):
 *
 *   1. *span* — Two real hours of an expedition at 12× (a game day): the
 *      food and water carried are consumed on the body's own clock, and the
 *      pack lightens; the burden line follows.
 *
 * The walker sets out from the Old Steading with two days' food and water
 * in a backpack on their back and walks the steading's ground through the
 * day, taking a meal and a drink at each stop the way a walker does — out
 * of the pack (`remove backpack`, `eat`, `drink`, `wear backpack`). The day
 * runs on the world's own clock at 12×: real time, not a jump. What the
 * drive holds the world to is that what was eaten and drunk is GONE from
 * the pack and the weight `inventory --weight` gives falls stop by stop,
 * with the burden line in words never heavier than it was.
 *
 * Its staged twin is the blocking drive's step 17 (a four-hour clock jump).
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  hand,
  isOwnedTestWorld,
  advanceWorldClock,
  worldClockNow,
} from '../src/harness';

export const DIRTY_REASON =
  'hands a walker two days of rations and water and leaves the empty ' +
  'pack and its scraps at the Old Steading';

declareFile({
  file: 'size-and-carrying.soak.dirty.wire.test.ts',
  packs: ['platform', 'generic-objects', 'newbie-wilds', 'species-and-names'],
  dirtyReason: DIRTY_REASON,
});

const YARD = '/world/newbie-wilds/steading/yard';
const WAYS = ['west', 'east', 'south', 'north'] as const;
const BACK = { west: 'east', east: 'west', south: 'north', north: 'south' } as const;

const BURDEN_ORDER = ['light', 'a fair load', 'well laden', 'heavily burdened', 'more than you can bear'];
const record: string[] = [];
let walker: Session;

const squash = (t: string): string => plain(t).replace(/\s+/g, ' ').trim();

async function say(text: string): Promise<string> {
  const r = await walker.cmd(text);
  const w = squash(await r.said());
  record.push(`${text} → ${r.status} · ${w.slice(0, 200)}`);
  return w;
}

/** The pack's weight as `inventory --weight` gives it, and the burden word. */
async function packRead(): Promise<{ kg: number; burden: number }> {
  const w = await say('inventory --weight --all');
  const kg = Number(/backpack[^:]*:?[^.]*?([0-9.]+) kg/i.exec(w)?.[1] ?? NaN);
  const word = BURDEN_ORDER.findIndex((b) => new RegExp(b, 'i').test(w));
  return { kg, burden: word };
}

afterAll(() => {
  walker?.close();
  // eslint-disable-next-line no-console
  console.log(`\n[size-and-carrying soak] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

suite.skipIf(!isOwnedTestWorld())('size and carrying — the soak drive', () => {
  beforeAll(async () => {
    // Set out at first light.
    const now = await worldClockNow();
    const tod = (((now % 86_400) + 86_400) % 86_400) / 3600;
    const wait = ((6 - tod + 24) % 24) * 3600;
    if (wait > 60) await advanceWorldClock(`${Math.ceil(wait / 60)} minutes`);
    walker = await Session.open(uniqueHandle('scsoak'), { startLocation: YARD });
    await walker.drainProse();
    const pack = await hand(walker, '/stuff/thing/gear/backpack');
    for (let i = 0; i < 6; i++) await hand(walker, '/stuff/thing/items/ration-stock');
    for (let i = 0; i < 2; i++) await hand(walker, '/stuff/thing/vessel/pail', { interiorMaterial: '/stuff/idea/material/liquid/water', interiorAmount: 2 });
    for (let i = 0; i < 6; i++) await say(`put ration in #${pack}`);
    for (let i = 0; i < 2; i++) await say(`put pail in #${pack}`);
    await say(`wear #${pack}`);
  }, 600_000);

  it('1. [span · player] a game day walking at 12×: what was eaten and drunk is gone from the pack, and the burden line follows', async () => {
    const start = await packRead();
    expect(Number.isFinite(start.kg), 'the pack has a weight').toBe(true);
    let last = start;
    // Six stops through the day: every two real minutes is 24 game minutes;
    // ten minutes of walking between stops is two game hours.
    for (let stop = 0; stop < 6; stop++) {
      const way = WAYS[stop % WAYS.length]!;
      await say(`go ${way}`);
      await new Promise((r) => setTimeout(r, 10 * 60_000));
      await say(`go ${BACK[way]}`);
      await say('remove backpack');
      await say('eat ration');
      await say('drink from pail');
      await say('wear backpack');
      const now = await packRead();
      expect(now.kg, `stop ${stop + 1}: the pack lightens`).toBeLessThan(last.kg);
      expect(now.burden, `stop ${stop + 1}: the burden line is never heavier`).toBeLessThanOrEqual(last.burden);
      last = now;
    }
    expect(last.kg).toBeLessThan(start.kg);
  }, 9_000_000);
});
