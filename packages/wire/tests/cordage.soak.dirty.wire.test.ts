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
 * The ropes are wet by the harness's weather pin — rain on the open
 * ropewalk, frozen for the span — and the clock moves in soak mode
 * (`WIRE_SOAK=1`, the jump past a day allowed).
 *
 * ⚠⚠ `.dirty.`: buys rope, leaves it out in the rain and moves the clock —
 * none of it produced again.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  advanceWorldClock,
  pinWeather,
  unpinWeather,
} from '../src/harness';

export const DIRTY_REASON =
  'buys rope at the ropewalk, leaves two lying out in pinned rain and ' +
  'moves the clock for days — none of it produced again';

declareFile({
  file: 'cordage.soak.dirty.wire.test.ts',
  packs: ['terminus', 'trade-cordage', 'trade-farming', 'trade-textiles', 'water', 'world-seed', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const WALK = '/world/terminus/wharfside/ropewalk/location/walk';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const open: Session[] = [];

afterAll(async () => {
  for (const s of open) s.close();
  await unpinWeather(WALK).catch(() => undefined);
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
    const dip = await s.cmd('dip rope in tub');
    expectOk(dip);
    const dipping = (dip.notes.find((n) => n.kind === 'engagement-started') as { engagementId?: string } | undefined)?.engagementId;
    if (dipping) await s.awaitActivity(dipping, 120_000);
    // ⭐ By id: once the ropes are on the ground, "first rope" is whatever
    // the walk shows first (the counter's painter, the soak's run 3).
    const ropes = (await s.query('me:i:rope', { fields: ['displayName'] })) as unknown as { stuffId: string }[];
    expect(ropes.length, JSON.stringify(ropes)).toBe(2);
    const [ropeA, ropeB] = ropes.map((r) => r.stuffId);
    const before = squash(await s.prose(`look #${ropeA}`));
    // Both laid out on the open walk, in rain that does not let up.
    expectOk(await s.cmd(`drop #${ropeA}`));
    expectOk(await s.cmd(`drop #${ropeB}`));
    await pinWeather('rain', WALK);
    await advanceWorldClock('6 days');
    const lookA = squash(await s.prose(`look #${ropeA}`));
    const lookB = squash(await s.prose(`look #${ropeB}`));
    const [untarredLook, tarredLook] = /tarred/.test(lookA) ? [lookB, lookA] : [lookA, lookB];
    expect(untarredLook + ' | ' + tarredLook, before).toMatch(/musty|rot/);
    expect(tarredLook, tarredLook).toMatch(/tarred/);
    expect(tarredLook, tarredLook).not.toMatch(/musty|rot/);
  }, 1_800_000);

  it.todo('18. hemp sown, the season jumped, harvested, retted and scutched into hemp line — wants the field-population shape (!480) and a pit near a bed');
});
