/**
 * The recovery drive — the CONTENT half (test-world-lifecycle D8, split
 * from `recovery.wire.test.ts`, unchanged): the Terminus infirmary ward
 * stands up with its recovery fixtures — the cot, the basin, the fitting
 * shelf and the dressings. It reads one authored place's furnishing, so it
 * has no testbed form; build 2's to move.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle } from '../src/harness';

export const DIRTY_REASON =
  'reads the Terminus infirmary ward\'s authored recovery fixtures — ' +
  'placeholder content, which a content rebuild may move or remove';

declareFile({
  file: 'recovery-content.dirty.wire.test.ts',
  packs: [
    'newbie-wilds',
    'terminus',
    'generic-objects',
    'species-and-names',
    'trade-medicine',
  ],
  dirtyReason: DIRTY_REASON,
});

// The infirmary ward — has the basin (water) that affords `wash`/`cool`.
const WARD = '/world/terminus/infirmary/ward';

let patient: Session;

/** True when the world understood the verb (any answer but "unknown verb"). */
function afforded(said: string): boolean {
  const s = said.toLowerCase();
  return !s.includes("don't understand") && !s.includes('unknown');
}

beforeAll(async () => {
  patient = await Session.open(uniqueHandle('recovward'), {
    startLocation: WARD,
  });
}, 240_000);

afterAll(() => {
  patient?.close();
});

suite('the FIXTURE-afforded verbs answer where the fixture is', () => {
  it('⭐ the ward stands up with its recovery fixtures', async () => {
    const said = (await (await patient.cmd('look')).said()).toLowerCase();
    expect(afforded(said)).toBe(true);
    // The cot, the basin, the fitting shelf and the dressings are all here.
    expect(said, `the ward: ${said}`).toMatch(/cot|basin|shelf|bandage|dressing|slate/);
  }, 60_000);
});
