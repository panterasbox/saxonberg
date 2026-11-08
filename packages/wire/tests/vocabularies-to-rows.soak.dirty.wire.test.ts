/**
 * The soak half of the smell and taste drive (requirements steps 34-37): what only
 * the clock can show. Never run before merge; the soak lane runs it.
 *
 * Log bodies out across a long jump: an offline body is frozen, and needs no
 * feeding. Their staged twins are in the blocking drive and the unit tests.
 */

import { describe as suite, it, expect } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  hand,
  nourish,
  advanceLiving,
  advanceWorldClock,
} from '../src/harness';

export const DIRTY_REASON =
  'lets food rot and a corpse decay in a shipped place, and moves the world clock by weeks';

declareFile({
  file: 'vocabularies-to-rows.soak.dirty.wire.test.ts',
  packs: ['base-library', 'generic-objects', 'eternal-university', 'terminus', 'trade-baking'],
  dirtyReason: DIRTY_REASON,
});

const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const WIZARD = { wizard: true, committees: ['/world/terminus'] };
const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();

async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(line));
}

suite('smell and taste, on the clock', () => {
  it('34. eating a bitter food over game weeks raises its liking', async () => {
    const s = await Session.open(uniqueHandle('bitter'), { startLocation: LOBBY, ...WIZARD });
    const read = async () =>
      Number(/(-?[\d.]+)\s*$/.exec(await say(s, 'eval --parcel /world/terminus --on me --all return this.liking([{ type: "bitter", ou: 20 }]).score'))?.[1]);
    await nourish(s);
    const before = await read();
    for (let week = 0; week < 3; week++) {
      await hand(s, '/trade/baking/thing/lean-loaf');
      await s.cmd('eat me:i:loaf');
      await advanceLiving('7 days', [s]);
      await nourish(s);
    }
    expect(await read()).toBeGreaterThanOrEqual(before);
    s.close();
  });

  it('35. food left out goes off unstaged, and reaches the next room', async () => {
    const s = await Session.open(uniqueHandle('left'), { startLocation: LOBBY, ...WIZARD });
    await hand(s, '/trade/baking/thing/lean-loaf');
    await s.cmd('drop me:i:loaf');
    s.close();
    await advanceWorldClock('14 days');
    const next = await Session.open(uniqueHandle('next'), { startLocation: LOBBY });
    await next.cmd('go south');
    expect(await say(next, 'analyze aroma')).toMatch(/of rot/);
    next.close();
  });

  it('36. a corpse moves through its decay smell unstaged', async () => {
    const s = await Session.open(uniqueHandle('corpse'), { startLocation: LOBBY, ...WIZARD });
    await hand(s, '/stuff/thing/Corpse', { mass: 70 });
    await s.prose('eval --parcel /world/terminus --on me:i:corpse --all this.diedAtGameSec = 1');
    await s.cmd('drop me:i:corpse');
    s.close();
    await advanceWorldClock('14 days');
    const back = await Session.open(uniqueHandle('back'), { startLocation: LOBBY, ...WIZARD });
    expect(await say(back, 'measure aroma with gas')).toMatch(/decay/);
    back.close();
  });

  it('37. an aversion is still there after a long game time', async () => {
    const handle = uniqueHandle('averse');
    const s = await Session.open(handle, { startLocation: LOBBY, ...WIZARD });
    await s.prose('eval --parcel /world/terminus --on me --all this.recordAversion("kept-food", 0)');
    s.close();
    await advanceWorldClock('30 days');
    const back = await Session.open(handle, { startLocation: LOBBY, ...WIZARD });
    expect(await say(back, 'eval --parcel /world/terminus --on me --all return JSON.stringify(this.getAversions())')).toMatch(/kept-food/);
    back.close();
  });
});
