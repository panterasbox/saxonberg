/**
 * Paint — the SOAK drive: the span steps the blocking drive stages
 * (`paint.dirty.wire.test.ts`), run on the real clock by the soak lane
 * after merge. No merge waits on these.
 *
 *  - 7. a year of weather takes the cottage's limewash, then the fabric
 *    wears (pinned rain, the clock moved a game year in five-hour steps
 *    would be too slow — the soak moves it in long jumps);
 *  - 14. a heap of oily rags in the colorman's shed warms over days and
 *    catches;
 *
 * ⚠⚠ `.dirty.`: it moves the clock for a season and burns rags in the
 * colorman's shed — none of it produced again.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  nourish,
  advanceWorldClock,
  pinWeather,
  unpinWeather,
} from '../src/harness';

export const DIRTY_REASON =
  "moves the clock for a season over the towpath cottage and burns oily rags in the colorman's " +
  'shed — none of it produced again';

declareFile({
  file: 'paint.soak.dirty.wire.test.ts',
  packs: [
    'terminus', 'residence', 'trade-painting', 'trade-chandlery', 'trade-milling', 'trade-farming',
    'trade-quarrying', 'trade-shopkeeping', 'water', 'world-seed', 'generic-objects', 'base-library',
  ],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const SHOP = '/world/terminus/wharfside/colorman/location/shop';
const SHED = '/world/terminus/wharfside/colorman/location/shed';
const TOWPATH = '/world/terminus/valley-road/towpath';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const open: Session[] = [];

async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(line);
  const said = squash(await r.said());
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [soak] ${line} → ${r.status}: ${said.slice(0, 300)}`);
  return said;
}

async function days(n: number): Promise<void> {
  for (let d = 0; d < n; d++) {
    for (let h = 0; h < 24; h += 6) await advanceWorldClock('6 hours');
  }
}

afterAll(async () => {
  for (const s of open) s.close();
  await unpinWeather(TOWPATH).catch(() => {});
});

suite('paint — the soak drive', () => {
  it('7. the weather takes the limewash, and then the fabric', async () => {
    await pinWeather('rain', TOWPATH, 'alive');
    const s = await Session.open(uniqueHandle('pns'), { startLocation: TOWPATH });
    open.push(s);
    await nourish(s).catch(() => {});
    const before = await say(s, 'look cottage');
    expect(before, before).toMatch(/limewash/i);
    await days(300);
    const after = await say(s, 'analyze condition cottage');
    expect(after, after).toMatch(/paint has gone/i);
  }, 6 * 3_600_000);

  it('14. a heap of oily rags warms over days and catches', async () => {
    const handle = uniqueHandle('pnr');
    const s0 = await Session.open(handle, { startLocation: BANK_HALL });
    expectOk(await s0.cmd('bank open'));
    const gov = await Session.open('founder', { startLocation: BANK_HALL });
    expectOk(await gov.cmd(`reserve override 100 to ${handle} "wire: paint soak"`));
    gov.close();
    s0.close();
    const s = await Session.open(handle, { startLocation: SHOP });
    open.push(s);
    await nourish(s).catch(() => {});
    await say(s, 'buy "pot of ochre paint"');
    for (let i = 0; i < 6; i++) await say(s, 'buy rag');
    await say(s, 'dip rags in ochre paint');
    await say(s, 'north');
    await say(s, 'north');
    expect(JSON.stringify(await s.query('here', { fields: 'ref' }))).toContain(SHED);
    await say(s, 'drop rags');
    s.close();
    await days(40);
    const back = await Session.open(handle, { startLocation: SHED });
    open.push(back);
    const l = await say(back, 'look rags');
    expect(l, l).toMatch(/burn|fire|flame|alight|ash/i);
  }, 6 * 3_600_000);
});
