/**
 * ⭐ The crowd's clock — the timing half of D27, on the soak lane.
 *
 * Not a merge gate: a round trip is honest only on an idle box, so the bound is
 * generous (a 1 s p95, no 500 ms stall) and this runs post-merge under
 * `pnpm wire:soak`. The acceptance numbers themselves (250 ms, 100 ms) are read
 * off the printed record by a person; `crowd.dirty.wire.test.ts` holds the count.
 */

import { describe as suite, it, expect } from 'vitest';
import { declareFile, runCrowd, CROWD_SIZE } from '../src/harness';

declareFile({
  file: 'crowd.soak.wire.test.ts',
  packs: ['platform', 'terminus'],
});

suite(`a crowd of ${CROWD_SIZE} answers at the speed of an empty room`, () => {
  it('holds the round trip and the loop', async () => {
    const record = await runCrowd('soak');
    expect(record.sayOne.p95, 'p95 of one person saying hello').toBeLessThan(1_000);
    expect(record.sayRound.p95, 'p95 of everyone speaking in turn').toBeLessThan(1_000);
    expect(record.loop.over500, '/healthz samples over 500 ms').toBe(0);
  }, 900_000);
});
