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

// ⭐ Clean (test-world-lifecycle D8): the two characters are minted fresh
// through char-gen each run (the default landing on purpose — nothing here
// asserts where they stand) and the run's purge takes them; a clock jump
// consumes nothing the world does not regenerate. The phone is the starting
// kit's (generic-objects), so no locality is named.
declareFile({
  file: 'aether-devices.soak.wire.test.ts',
  packs: ['platform', 'base-library', 'generic-objects', 'expression', 'energy', 'arcana'],
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
