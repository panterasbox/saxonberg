/**
 * ⭐ **Aether devices — the soak drive** (requirements § Soak drive, step 1):
 * *a session's battery* — a new player plays game days of mixed use
 * without charging, and the phone is alive at the end. A SPAN step: run by
 * the soak lane after merge, never by `/build`, a review round or
 * `/finalize`. Its staged twin is the blocking drive's step 10 plus the
 * unit arithmetic (`Battery.test.ts`).
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, plain, advanceWorldClock } from '../src/harness';

export const DIRTY_REASON = 'mints a new character and spends game days of the world clock';

declareFile({
  file: 'aether-devices.soak.dirty.wire.test.ts',
  packs: ['base-library', 'generic-objects', 'expression', 'eternal-university', 'terminus', 'world-seed', 'energy', 'arcana'],
  dirtyReason: DIRTY_REASON,
});

suite('aether devices — a session\'s battery (soak)', () => {
  let A: Session;
  let B: Session;
  afterAll(() => {
    A?.close();
    B?.close();
  });

  it('a phone outlasts a long session of mixed use without charging', async () => {
    A = await Session.embody(uniqueHandle('ads-ana'), { name: 'Anasoak' });
    B = await Session.embody(uniqueHandle('ads-bo'), { name: 'Bosoak' });
    // Four game days, a message an hour, online throughout.
    for (let h = 0; h < 96; h++) {
      await A.cmd(`dm Bosoak hour ${h}`);
      await advanceWorldClock('1 hour');
    }
    const look = plain(await A.prose('look phone'));
    expect(look).toMatch(/battery reads \d+%/);
    expect(look).not.toMatch(/battery is dead/);
  }, 3_600_000);
});
