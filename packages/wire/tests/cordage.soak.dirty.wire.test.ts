/**
 * Cordage — the SOAK drive: the span steps of the cordage requirements'
 * drive (numbering kept), run by the soak lane after merge, never by a
 * review or a merge (no merge waits on the clock).
 *
 *  14. An untarred rope and a tarred rope left wet for several days: the
 *      untarred one reads weaker, the tarred one not.
 *  18. Hemp sown, the season jumped, harvested, retted and scutched: hemp
 *      line, which spins and twists like the bought line.
 *
 * ⚠ Written before the soak harness landed (build-4): it moves the clock
 * with `advanceWorldClock` in jumps of a day. When the harness lands, wet
 * the ropes with its weather pin (rain) instead of the ford.
 *
 * ⚠⚠ `.dirty.`: buys rope and seed, leaves ropes in the water, sows a bed and
 * moves the clock — none of it produced again.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  advanceWorldClock,
} from '../src/harness';

export const DIRTY_REASON =
  'buys rope and hemp seed, leaves ropes soaking in the ford, sows a bed and ' +
  'moves the clock for days — none of it produced again';

declareFile({
  file: 'cordage.soak.dirty.wire.test.ts',
  packs: ['terminus', 'trade-cordage', 'trade-farming', 'trade-textiles', 'water', 'world-seed', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const WALK = '/world/terminus/wharfside/ropewalk/location/walk';
const FORD = '/world/terminus/delight-road/ford';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const open: Session[] = [];

afterAll(() => {
  for (const s of open) s.close();
});

suite('cordage — the soak drive', () => {
  it('14. wet for days: the untarred rope reads weaker, the tarred one not', async () => {
    const handle = uniqueHandle('cds');
    const b = await Session.open(handle, { startLocation: BANK_HALL });
    expectOk(await b.cmd('bank open'));
    const gov = await Session.open('founder', { startLocation: BANK_HALL });
    expectOk(await gov.cmd(`reserve override 100 to ${handle} "wire: cordage soak"`));
    gov.close();
    b.close();
    const s = await Session.open(handle, { startLocation: WALK });
    open.push(s);
    expectOk(await s.cmd('buy rope'));
    expectOk(await s.cmd('buy rope'));
    expectOk(await s.cmd('dip 2.rope in tub'));
    const before = squash(await s.prose('look 1.rope'));
    s.close();
    const f = await Session.open(handle, { startLocation: FORD });
    open.push(f);
    expectOk(await f.cmd('drop 1.rope'));
    expectOk(await f.cmd('drop 1.rope'));
    for (let d = 0; d < 6; d++) await advanceWorldClock('1 day');
    const bare = squash(await f.prose('look 1.rope'));
    const tarred = squash(await f.prose('look 2.rope'));
    expect(bare + ' | ' + tarred, before).toMatch(/musty|rot/);
    expect(tarred, tarred).toMatch(/tarred/);
    expect(tarred, tarred).not.toMatch(/musty|rot/);
  }, 1_800_000);

  it.todo('18. hemp sown, the season jumped, harvested, retted and scutched into hemp line — wants the field-population shape (!480) and a pit near a bed');
});
